use chrono::Utc;
use sqlx::PgPool;

use crate::device::model::{DeviceStatus, Heartbeat, NetworkInput, WifiNetwork};
use crate::error::{AppError, AppResult};
use crate::readings::service as readings_service;
use crate::settings::service as settings_service;
use crate::time::local_label;

/// The admin app may store at most this many networks. The board's own default can
/// still be registered beyond it, so the ceiling applies only to operator adds.
const MAX_NETWORKS: i64 = 5;

type Telemetry = (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<i32>,
    Option<i64>,
);

/// Records a firmware heartbeat into the singleton telemetry row. Absent fields
/// coalesce to the stored value, so a partial heartbeat never clears what it omits.
pub async fn record_heartbeat(pool: &PgPool, heartbeat: &Heartbeat) -> AppResult<()> {
    sqlx::query(
        "update device_telemetry set
             device_id = coalesce($1, device_id),
             firmware = coalesce($2, firmware),
             ssid = coalesce($3, ssid),
             ip_address = coalesce($4, ip_address),
             signal_dbm = coalesce($5, signal_dbm),
             uptime_seconds = coalesce($6, uptime_seconds),
             reported_at = now()
         where id = 1",
    )
    .bind(&heartbeat.device_id)
    .bind(&heartbeat.firmware)
    .bind(&heartbeat.ssid)
    .bind(&heartbeat.ip_address)
    .bind(heartbeat.signal_dbm)
    .bind(heartbeat.uptime_seconds)
    .execute(pool)
    .await?;

    Ok(())
}

/// Live link state. The identity fields come from the newest reported telemetry and
/// are null until the firmware has reported in; `connected` and the last-seen fields
/// are driven by the newest hardware reading; `simulated` follows the source mode.
pub async fn status(pool: &PgPool) -> AppResult<DeviceStatus> {
    let telemetry: Option<Telemetry> = sqlx::query_as(
        "select device_id, firmware, ssid, ip_address, signal_dbm, uptime_seconds
         from device_telemetry where id = 1",
    )
    .fetch_optional(pool)
    .await?;
    let (device_id, firmware, ssid, ip_address, signal_dbm, uptime_seconds) =
        telemetry.unwrap_or((None, None, None, None, None, None));

    let settings = settings_service::load(pool).await?;
    let now = Utc::now();

    let latest_hardware = readings_service::latest_hardware(pool).await?;
    let connected = latest_hardware.as_ref().is_some_and(|reading| {
        readings_service::is_within_connected_window(reading.recorded_at, now)
    });
    let (last_seen_at, last_seen_label) = match latest_hardware {
        Some(reading) => (
            Some(reading.recorded_at),
            Some(local_label(reading.recorded_at)),
        ),
        None => (None, None),
    };

    Ok(DeviceStatus {
        connected,
        device_id,
        firmware,
        ip_address,
        signal_dbm,
        uptime_seconds,
        ssid,
        last_seen_at,
        last_seen_label,
        simulated: settings.source_mode != "hardware",
    })
}

/// The stored networks in the board's failover priority: selected first, then the
/// compiled-in default, then the rest by name. This ordering is the contract the
/// firmware reads from `/config`.
pub async fn list_networks(pool: &PgPool) -> AppResult<Vec<WifiNetwork>> {
    let rows = sqlx::query_as::<_, WifiNetwork>(
        "select id, ssid, password, is_default, selected, updated_at
         from wifi_networks
         order by selected desc, is_default desc, ssid",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Adds an operator network. Neither default nor selected. Rejected once the cap is
/// reached; a duplicate ssid falls through to the 23505 -> 409 mapping in `error.rs`.
pub async fn add_network(pool: &PgPool, input: &NetworkInput) -> AppResult<WifiNetwork> {
    let count: i64 = sqlx::query_scalar("select count(*) from wifi_networks")
        .fetch_one(pool)
        .await?;
    if count >= MAX_NETWORKS {
        return Err(AppError::BadRequest(
            "A maximum of 5 networks can be stored".to_owned(),
        ));
    }

    let network = sqlx::query_as::<_, WifiNetwork>(
        "insert into wifi_networks (ssid, password, is_default, selected)
         values ($1, $2, false, false)
         returning id, ssid, password, is_default, selected, updated_at",
    )
    .bind(input.ssid.trim())
    .bind(&input.password)
    .fetch_one(pool)
    .await?;

    Ok(network)
}

/// Deletes a network by id. The default and the in-use network are protected so the
/// board is never left without credentials or with a selection pointing at nothing.
pub async fn delete_network(pool: &PgPool, id: i64) -> AppResult<()> {
    let network = sqlx::query_as::<_, WifiNetwork>(
        "select id, ssid, password, is_default, selected, updated_at
         from wifi_networks where id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    let network = match network {
        Some(network) if network.is_default => {
            return Err(AppError::BadRequest(
                "The default network cannot be deleted".to_owned(),
            ));
        }
        Some(network) if network.selected => {
            return Err(AppError::BadRequest(
                "The network in use cannot be deleted; select another first".to_owned(),
            ));
        }
        Some(network) => network,
        None => return Err(AppError::NotFound),
    };

    sqlx::query("delete from wifi_networks where id = $1")
        .bind(network.id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Edits a stored network's ssid and password. The default is refused: it mirrors
/// the board's compiled-in credentials, which only the firmware may re-register.
/// Bumping `updated_at` is the change signal the board watches to re-sync and apply
/// with try-then-revert. A duplicate ssid falls through to the 23505 -> 409 mapping.
pub async fn update_network(pool: &PgPool, id: i64, input: &NetworkInput) -> AppResult<WifiNetwork> {
    let existing = sqlx::query_as::<_, WifiNetwork>(
        "select id, ssid, password, is_default, selected, updated_at
         from wifi_networks where id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    match existing {
        Some(network) if network.is_default => {
            return Err(AppError::BadRequest(
                "The default network cannot be edited".to_owned(),
            ));
        }
        Some(_) => {}
        None => return Err(AppError::NotFound),
    }

    let network = sqlx::query_as::<_, WifiNetwork>(
        "update wifi_networks
         set ssid = $1, password = $2, updated_at = now()
         where id = $3
         returning id, ssid, password, is_default, selected, updated_at",
    )
    .bind(input.ssid.trim())
    .bind(&input.password)
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(network)
}

/// Selects a network as preferred. The partial unique index forbids two selected
/// rows, so the flip is two statements in a transaction: clear, then set.
pub async fn select_network(pool: &PgPool, id: i64) -> AppResult<WifiNetwork> {
    let mut tx = pool.begin().await?;

    sqlx::query("update wifi_networks set selected = false where selected")
        .execute(&mut *tx)
        .await?;

    let network = sqlx::query_as::<_, WifiNetwork>(
        "update wifi_networks set selected = true, updated_at = now() where id = $1
         returning id, ssid, password, is_default, selected, updated_at",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(network) = network else {
        return Err(AppError::NotFound);
    };

    tx.commit().await?;

    Ok(network)
}

/// Self-registration of the board's compiled-in default, called by the firmware at
/// runtime so the credentials never live in a migration of this public repo. Moves
/// the default flag onto this ssid, upserts it, and selects it only when nothing is
/// selected yet. The `is distinct from` guard keeps `updated_at` still when the
/// password is unchanged, so every-boot re-registration does not re-trigger the
/// board's apply cycle. May exceed the 5 cap only by updating an existing row, or
/// inserting the default itself, which must always be storable.
pub async fn register_default(pool: &PgPool, input: &NetworkInput) -> AppResult<()> {
    let ssid = input.ssid.trim();
    let mut tx = pool.begin().await?;

    sqlx::query("update wifi_networks set is_default = false where is_default and ssid <> $1")
        .bind(ssid)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "insert into wifi_networks (ssid, password, is_default)
         values ($1, $2, true)
         on conflict (ssid) do update
           set password = excluded.password,
               is_default = true,
               updated_at = case
                   when wifi_networks.password is distinct from excluded.password then now()
                   else wifi_networks.updated_at
               end",
    )
    .bind(ssid)
    .bind(&input.password)
    .execute(&mut *tx)
    .await?;

    let selected: i64 = sqlx::query_scalar("select count(*) from wifi_networks where selected")
        .fetch_one(&mut *tx)
        .await?;
    if selected == 0 {
        sqlx::query("update wifi_networks set selected = true where ssid = $1")
            .bind(ssid)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    Ok(())
}
