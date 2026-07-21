use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Live link state for the ESP32. Connection and last-seen come from hardware
/// readings; the identity fields stay hardcoded until the firmware reports in.
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
    /// True when the live feed is simulated rather than driven by hardware.
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

/// One stored Wi-Fi network. `password` is returned in clear text on the admin and
/// device endpoints, which are guarded accordingly. `is_default` marks the board's
/// compiled-in credentials; `selected` marks the operator's preferred network. The
/// partial unique indexes allow at most one of each across the table.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WifiNetwork {
    pub id: i64,
    pub ssid: String,
    pub password: String,
    pub is_default: bool,
    pub selected: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInput {
    pub ssid: String,
    pub password: String,
}
