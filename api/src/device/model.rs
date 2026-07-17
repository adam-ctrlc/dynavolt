use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Live link state for the ESP32. Hardcoded until the firmware reports in.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub connected: bool,
    pub device_id: String,
    pub firmware: String,
    pub ip_address: Option<String>,
    pub signal_dbm: Option<i32>,
    pub uptime_seconds: Option<i64>,
    pub ssid: String,
    pub last_seen_at: Option<DateTime<Utc>>,
    pub last_seen_label: Option<String>,
    /// True while the values above are placeholders rather than device reports.
    pub simulated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionEventKind {
    Connected,
    Disconnected,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionEvent {
    pub id: i64,
    pub kind: ConnectionEventKind,
    pub detail: String,
    pub ssid: String,
    pub at: DateTime<Utc>,
    pub at_label: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WifiConfig {
    pub wifi_ssid: String,
    pub wifi_password: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWifi {
    pub wifi_ssid: String,
    pub wifi_password: String,
}
