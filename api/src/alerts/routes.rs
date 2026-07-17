use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;

use crate::alerts::model::Alert;
use crate::auth::extract::AuthUser;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    #[serde(default)]
    pub active: bool,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

const fn default_limit() -> i64 {
    50
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list))
        .route("/{id}/ack", post(acknowledge))
}

async fn list(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(query): Query<ListQuery>,
) -> AppResult<Json<Vec<Alert>>> {
    let limit = query.limit.clamp(1, 200);

    let sql = if query.active {
        "select id, reading_id, kind, message, value, threshold, created_at,
                acknowledged_at, acknowledged_by, response_ms
         from alerts where acknowledged_at is null order by created_at desc limit $1"
    } else {
        "select id, reading_id, kind, message, value, threshold, created_at,
                acknowledged_at, acknowledged_by, response_ms
         from alerts order by created_at desc limit $1"
    };

    let alerts = sqlx::query_as::<_, Alert>(sql)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(alerts))
}

/// Acknowledges an alert and records how long the responder took.
async fn acknowledge(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<i64>,
) -> AppResult<Json<Alert>> {
    let alert = sqlx::query_as::<_, Alert>(
        "update alerts
         set acknowledged_at = now(),
             acknowledged_by = $1,
             response_ms = (extract(epoch from (now() - created_at)) * 1000)::bigint
         where id = $2 and acknowledged_at is null
         returning id, reading_id, kind, message, value, threshold, created_at,
                   acknowledged_at, acknowledged_by, response_ms",
    )
    .bind(auth.id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(alert))
}
