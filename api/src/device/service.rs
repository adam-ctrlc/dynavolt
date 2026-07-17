use chrono::{Duration, Utc};
use sqlx::PgPool;

use crate::device::model::{
    ConnectionEvent, ConnectionEventKind, DeviceStatus, UpdateWifi, WifiConfig,
};
use crate::error::AppResult;
use crate::time::local_label;

/// Placeholder identity until the firmware reports its own.
const DEVICE_ID: &str = "esp32-dynavolt-01";
const FIRMWARE: &str = "0.1.0-placeholder";
const IP_ADDRESS: &str = "192.168.1.42";
const SIGNAL_DBM: i32 = -58;
const UPTIME_SECONDS: i64 = 4 * 3600 + 12 * 60;

/// Hardcoded link state. Every field is a placeholder, so `simulated` is always
/// true here; it flips only once real device reports drive this.
pub async fn status(pool: &PgPool) -> AppResult<DeviceStatus> {
    let config = wifi(pool).await?;
    let last_seen = Utc::now() - Duration::seconds(9);

    Ok(DeviceStatus {
        connected: true,
        device_id: DEVICE_ID.to_owned(),
        firmware: FIRMWARE.to_owned(),
        ip_address: Some(IP_ADDRESS.to_owned()),
        signal_dbm: Some(SIGNAL_DBM),
        uptime_seconds: Some(UPTIME_SECONDS),
        ssid: config.wifi_ssid,
        last_seen_at: Some(last_seen),
        last_seen_label: Some(local_label(last_seen)),
        simulated: true,
    })
}

/// Hardcoded history, spaced relative to now so the list stays plausible as time
/// passes instead of freezing at fixed dates.
pub async fn history(pool: &PgPool) -> AppResult<Vec<ConnectionEvent>> {
    let config = wifi(pool).await?;
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
                ssid: config.wifi_ssid.clone(),
                at,
                at_label: local_label(at),
            }
        })
        .collect())
}

pub async fn wifi(pool: &PgPool) -> AppResult<WifiConfig> {
    let config = sqlx::query_as::<_, WifiConfig>(
        "select wifi_ssid, wifi_password, updated_at from device_config where id = 1",
    )
    .fetch_one(pool)
    .await?;

    Ok(config)
}

pub async fn update_wifi(pool: &PgPool, body: &UpdateWifi) -> AppResult<WifiConfig> {
    let config = sqlx::query_as::<_, WifiConfig>(
        "update device_config
         set wifi_ssid = $1, wifi_password = $2, updated_at = now()
         where id = 1
         returning wifi_ssid, wifi_password, updated_at",
    )
    .bind(body.wifi_ssid.trim())
    .bind(&body.wifi_password)
    .fetch_one(pool)
    .await?;

    Ok(config)
}
