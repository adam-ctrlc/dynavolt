use std::sync::Arc;

use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_secret: Arc<str>,
    pub simulator_enabled: bool,
    pub sample_interval_ms: i64,
    pub device_api_key: Option<Arc<str>>,
}
