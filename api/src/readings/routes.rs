use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::auth::extract::{AdminUser, AuthUser};
use crate::error::{AppError, AppResult};
use crate::page::{Page, Paging};
use crate::readings::model::{LiveReading, Reading, ReadingInput, Status, TrendPoint};
use crate::readings::service;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryQuery {
    pub status: Option<String>,
    /// Free-text search over status, source, power and the local timestamp.
    pub q: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

const DEFAULT_LIMIT: i64 = 20;
const MAX_LIMIT: i64 = 500;

/// Trims a filter and treats blank as "no filter", so `?q=` behaves like an absent param.
fn filter(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_owned())
        .filter(|trimmed| !trimmed.is_empty())
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
    if body.power_factor.is_some_and(|pf| !(0.0..=1.0).contains(&pf)) {
        return Err(AppError::BadRequest(
            "power factor must be between 0 and 1".to_owned(),
        ));
    }
    if body.humidity_pct.is_some_and(|h| !(0.0..=100.0).contains(&h)) {
        return Err(AppError::BadRequest(
            "humidity must be between 0 and 100 percent".to_owned(),
        ));
    }
    if body.energy_kwh.is_some_and(|e| e < 0.0) || body.frequency_hz.is_some_and(|f| f < 0.0) {
        return Err(AppError::BadRequest(
            "energy and frequency must not be negative".to_owned(),
        ));
    }

    let reading = service::record(&state.pool, body, "hardware").await?;

    Ok(Json(reading))
}

async fn history(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(query): Query<HistoryQuery>,
) -> AppResult<Json<Page<Reading>>> {
    let (limit, offset) =
        Paging::new(query.limit, query.offset).resolve(DEFAULT_LIMIT, MAX_LIMIT);
    let status = filter(query.status);
    let q = filter(query.q);

    if let Some(status) = status.as_deref() {
        status.parse::<Status>()?;
    }

    // Counted separately so `total` covers every match, not just this window.
    let total: i64 = sqlx::query_scalar(
        "select count(*) from readings
         where ($1::text is null or status = $1)
           and ($2::text is null
                or status ilike '%' || $2 || '%'
                or source ilike '%' || $2 || '%'
                or round(apparent_power_va::numeric)::text ilike '%' || $2 || '%'
                or to_char(recorded_at + interval '8 hours', 'YYYY-MM-DD HH24:MI') ilike '%' || $2 || '%')",
    )
    .bind(status.clone())
    .bind(q.clone())
    .fetch_one(&state.pool)
    .await?;

    // The searchable timestamp is rendered at UTC+8 so a query matches what the app shows.
    let rows = sqlx::query_as::<_, Reading>(
        "select id, voltage_v, current_a, temperature_c, apparent_power_va, status, source,
                power_w, power_factor, frequency_hz, energy_kwh, humidity_pct, recorded_at
         from readings
         where ($1::text is null or status = $1)
           and ($2::text is null
                or status ilike '%' || $2 || '%'
                or source ilike '%' || $2 || '%'
                or round(apparent_power_va::numeric)::text ilike '%' || $2 || '%'
                or to_char(recorded_at + interval '8 hours', 'YYYY-MM-DD HH24:MI') ilike '%' || $2 || '%')
         order by recorded_at desc
         limit $3 offset $4",
    )
    .bind(status)
    .bind(q)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(Page::new(rows, total, limit, offset)))
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
