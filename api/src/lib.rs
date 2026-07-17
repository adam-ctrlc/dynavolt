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

use axum::Router;
use axum::routing::get;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::Serialize;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::error::AppResult;
use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: &'static str,
    pub checked_at: DateTime<Utc>,
}

pub async fn build(config: &Config) -> AppResult<Router> {
    let pool = db::connect(&config.database_url).await?;
    users::service::seed(&pool).await?;

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

    Ok(Router::new()
        .nest("/api/v1", v1)
        .layer(cors)
        .layer(TraceLayer::new_for_http()))
}

async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        checked_at: Utc::now(),
    })
}
