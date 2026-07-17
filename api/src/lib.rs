pub mod alerts;
pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod readings;
pub mod settings;
pub mod state;
pub mod users;

use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::routing::get;
use chrono::{DateTime, FixedOffset, Utc};
use serde::Serialize;
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::error::AppResult;
use crate::state::AppState;

/// Philippine time (UTC+8). Fixed offset: the country does not observe DST.
const LOCAL_OFFSET_SECONDS: i32 = 8 * 3600;
const LOCAL_LABEL_FORMAT: &str = "%B %-d, %Y %-I:%M %p";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: &'static str,
    pub checked_at: DateTime<Utc>,
    pub checked_at_label: String,
}

/// Renders the instant in local time for people; `checked_at` stays UTC for machines.
fn local_label(now: DateTime<Utc>) -> String {
    FixedOffset::east_opt(LOCAL_OFFSET_SECONDS).map_or_else(
        || now.format(LOCAL_LABEL_FORMAT).to_string(),
        |offset| now.with_timezone(&offset).format(LOCAL_LABEL_FORMAT).to_string(),
    )
}

/// Production entrypoint. Connects and serves; never migrates or seeds, because
/// serverless would repeat that work on every cold start.
pub async fn build(config: &Config) -> AppResult<Router> {
    let pool = db::connect(&config.database_url).await?;

    Ok(router(pool, config))
}

/// Local development entrypoint. Applies migrations and seeds the starter
/// accounts against the shared database, then serves.
pub async fn build_for_dev(config: &Config) -> AppResult<Router> {
    let pool = db::connect(&config.database_url).await?;
    db::migrate(&pool).await?;
    users::service::seed(&pool).await?;

    Ok(router(pool, config))
}

fn router(pool: PgPool, config: &Config) -> Router {
    let state = AppState {
        pool,
        jwt_secret: Arc::from(config.jwt_secret.as_str()),
        simulator_enabled: config.simulator_enabled,
        sample_interval_ms: config.sample_interval_ms,
    };

    let v1 = Router::new()
        .route("/health", get(health))
        .nest("/auth", auth::routes::router())
        .nest("/readings", readings::routes::router())
        .nest("/alerts", alerts::routes::router())
        .nest("/settings", settings::routes::router())
        .nest("/users", users::routes::router())
        .with_state(state);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .nest("/api/v1", v1)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

async fn health() -> Json<Health> {
    let now = Utc::now();

    Json(Health {
        status: "ok",
        checked_at: now,
        checked_at_label: local_label(now),
    })
}
