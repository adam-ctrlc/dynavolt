use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use uuid::Uuid;

use crate::auth::extract::AdminUser;
use crate::error::{AppError, AppResult};
use crate::state::AppState;
use crate::users::model::{CreateUser, User};
use crate::users::service;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list).post(create))
        .route("/{id}", axum::routing::delete(remove))
}

async fn list(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<User>>> {
    let users = sqlx::query_as::<_, User>(
        "select id, email, role, created_at from users order by created_at",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(users))
}

async fn create(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(body): Json<CreateUser>,
) -> AppResult<StatusCode> {
    if body.password.len() < 8 {
        return Err(AppError::BadRequest(
            "password must be at least 8 characters".to_owned(),
        ));
    }
    if !body.email.contains('@') {
        return Err(AppError::BadRequest("invalid email".to_owned()));
    }

    let taken: Option<Uuid> = sqlx::query_scalar("select id from users where email = $1")
        .bind(body.email.trim().to_lowercase())
        .fetch_optional(&state.pool)
        .await?;

    if taken.is_some() {
        return Err(AppError::BadRequest("email already registered".to_owned()));
    }

    service::create(&state.pool, &body.email, &body.password, body.role).await?;

    Ok(StatusCode::CREATED)
}

async fn remove(
    State(state): State<AppState>,
    admin: AdminUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    if admin.0.id == id {
        return Err(AppError::BadRequest(
            "you cannot delete your own account".to_owned(),
        ));
    }

    let affected = sqlx::query("delete from users where id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}
