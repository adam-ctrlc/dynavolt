use chrono::{Duration, Utc};
use sqlx::PgPool;

use crate::device::model::{
    ConnectionEvent, ConnectionEventKind, DeviceStatus, NetworkInput, WifiNetwork,
};
use crate::error::{AppError, AppResult};
use crate::readings::service as readings_service;
use crate::settings::service as settings_service;
use crate::time::local_label;

/// Placeholder identity until the firmware reports its own.
const DEVICE_ID: &str = "esp32-dynavolt-01";
const FIRMWARE: &str = "0.1.0-placeholder";
const IP_ADDRESS: &str = "192.168.1.42";
const SIGNAL_DBM: i32 = -58;
const UPTIME_SECONDS: i64 = 4 * 3600 + 12 * 60;

/// The admin app may store at most this many networks. The board's own default can
/// still be registered beyond it, so the ceiling applies only to operator adds.
const MAX_NETWORKS: i64 = 5;

/// Live link state. `connected` and the last-seen fields are driven by the newest
/// hardware reading; `simulated` follows the settings source mode. The identity
/// fields remain placeholders until the firmware reports them.
pub async fn status(pool: &PgPool) -> AppResult<DeviceStatus> {
    let ssid = top_ssid(pool).await?;
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
        device_id: DEVICE_ID.to_owned(),
        firmware: FIRMWARE.to_owned(),
        ip_address: Some(IP_ADDRESS.to_owned()),
        signal_dbm: Some(SIGNAL_DBM),
        uptime_seconds: Some(UPTIME_SECONDS),
        ssid,
        last_seen_at,
        last_seen_label,
        simulated: settings.source_mode != "hardware",
    })
}

/// Hardcoded history, spaced relative to now so the list stays plausible as time
/// passes instead of freezing at fixed dates.
pub async fn history(pool: &PgPool) -> AppResult<Vec<ConnectionEvent>> {
    let ssid = top_ssid(pool).await?;
    let now = Utc::now();

    let entries = [
        (ConnectionEventKind::Connected, 9i64, "Link established"),
        (ConnectionEventKind::Disconnected, 4 * 60 + 21, "Signal lost"),
        (ConnectionEventKind::Connected, 5 * 60 + 2, "Link established"),
        (ConnectionEventKind::Disconnected, 9 * 60 + 47, "Router rebooted"),
        (ConnectionEventKind::Connected, 10 * 60 + 3, "Link established"),
        (ConnectionEventKind::Disconnected, 26 * 60, "Power cycled"),
    ];

    Ok(entries
        .into_iter()
        .enumerate()
        .map(|(index, (kind, minutes_ago, detail))| {
            let at = now - Duration::minutes(minutes_ago);

            ConnectionEvent {
                id: index as i64 + 1,
                kind,
                detail: detail.to_owned(),
                ssid: ssid.clone(),
                at,
                at_label: local_label(at),
            }
        })
        .collect())
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

/// The highest-priority network's ssid, or an empty string when none are stored.
async fn top_ssid(pool: &PgPool) -> AppResult<String> {
    Ok(list_networks(pool)
        .await?
        .into_iter()
        .next()
        .map_or_else(String::new, |network| network.ssid))
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
