use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub load_threshold_va: f64,
    pub temp_threshold_c: f64,
    pub source_mode: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsUpdate {
    pub load_threshold_va: f64,
    pub temp_threshold_c: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceUpdate {
    pub source_mode: String,
}
