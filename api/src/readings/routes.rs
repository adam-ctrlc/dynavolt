use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::auth::extract::{AdminUser, AuthUser};
use crate::error::{AppError, AppResult};
use crate::readings::model::{LiveReading, Reading, ReadingInput, TrendPoint};
use crate::readings::service;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub status: Option<String>,
}

const fn default_limit() -> i64 {
    100
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendQuery {
    #[serde(default = "default_days")]
    pub days: i64,
}

const fn default_days() -> i64 {
    7
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/latest", get(latest))
        .route("/", get(history).post(ingest))
        .route("/trend", get(trend))
}

/// Dashboard heartbeat. Poll this as fast as you like.
async fn latest(State(state): State<AppState>, _auth: AuthUser) -> AppResult<Json<LiveReading>> {
    let reading = service::live(
        &state.pool,
        state.simulator_enabled,
        state.sample_interval_ms,
    )
    .await?;

    Ok(Json(reading))
}

/// Hardware ingest. Real sensors push measurements here.
async fn ingest(
    State(state): State<AppState>,
    Json(body): Json<ReadingInput>,
) -> AppResult<Json<Reading>> {
    if body.voltage_v < 0.0 || body.current_a < 0.0 {
        return Err(AppError::BadRequest(
            "voltage and current must not be negative".to_owned(),
        ));
    }

    let reading = service::record(&state.pool, body, "hardware").await?;

    Ok(Json(reading))
}

async fn history(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(query): Query<HistoryQuery>,
) -> AppResult<Json<Vec<Reading>>> {
    let limit = query.limit.clamp(1, 500);
    let offset = query.offset.max(0);

    let readings = sqlx::query_as::<_, Reading>(
        "select id, voltage_v, current_a, temperature_c, apparent_power_va, status, source, recorded_at
         from readings
         where ($1::text is null or status = $1)
         order by recorded_at desc
         limit $2 offset $3",
    )
    .bind(query.status)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(readings))
}

async fn trend(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(query): Query<TrendQuery>,
) -> AppResult<Json<Vec<TrendPoint>>> {
    let days = query.days.clamp(1, 90);

    let points = sqlx::query_as::<_, TrendPoint>(
        "select date_trunc('day', recorded_at) as day,
                avg(apparent_power_va) as avg_power_va,
                max(apparent_power_va) as max_power_va,
                avg(temperature_c) as avg_temperature_c,
                count(*) as samples
         from readings
         where recorded_at >= now() - ($1 || ' days')::interval
         group by 1
         order by 1",
    )
    .bind(days.to_string())
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(points))
}
