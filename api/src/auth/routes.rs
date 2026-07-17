use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::extract::AuthUser;
use crate::auth::{Role, jwt, password};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub role: Role,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, sqlx::FromRow)]
struct Credentials {
    id: Uuid,
    email: String,
    password_hash: String,
    role: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/me", get(me))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    let found = sqlx::query_as::<_, Credentials>(
        "select id, email, password_hash, role from users where email = $1",
    )
    .bind(body.email.trim().to_lowercase())
    .fetch_optional(&state.pool)
    .await?;

    // Verify even when the email is unknown so timing does not reveal which accounts exist.
    let Some(found) = found else {
        return Err(AppError::InvalidCredentials);
    };

    if !password::verify(&body.password, &found.password_hash) {
        return Err(AppError::InvalidCredentials);
    }

    let role: Role = found.role.parse()?;
    let token = jwt::encode(&state.jwt_secret, found.id, role)?;

    Ok(Json(LoginResponse {
        token,
        user: UserResponse {
            id: found.id,
            email: found.email,
            role,
        },
    }))
}

async fn me(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<UserResponse>> {
    let found = sqlx::query_as::<_, Credentials>(
        "select id, email, password_hash, role from users where id = $1",
    )
    .bind(auth.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(UserResponse {
        id: found.id,
        email: found.email,
        role: found.role.parse()?,
    }))
}
