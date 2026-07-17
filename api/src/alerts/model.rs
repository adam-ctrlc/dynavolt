use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: i64,
    pub reading_id: Option<i64>,
    pub kind: String,
    pub message: String,
    pub value: f64,
    pub threshold: f64,
    pub created_at: DateTime<Utc>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub acknowledged_by: Option<Uuid>,
    pub response_ms: Option<i64>,
}

pub const KIND_OVERLOAD: &str = "overload";
pub const KIND_TEMPERATURE: &str = "temperature";
