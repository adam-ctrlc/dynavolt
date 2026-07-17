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
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub full_name: String,
}

impl UserResponse {
    fn from_credentials(found: Credentials, role: Role) -> Self {
        Self {
            id: found.id,
            email: found.email,
            role,
            full_name: found.full_name,
            first_name: found.first_name,
            middle_name: found.middle_name,
            last_name: found.last_name,
        }
    }
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
    first_name: String,
    middle_name: Option<String>,
    last_name: String,
    full_name: String,
}

/// Shared tail of every account lookup. `concat!` keeps the SQL a compile-time
/// literal, so no query is ever assembled from runtime strings.
macro_rules! credentials_select {
    ($predicate:literal) => {
        concat!(
            "select id, email, password_hash, role,
                    first_name, middle_name, last_name,
                    trim(concat_ws(' ', first_name, middle_name, last_name)) as full_name
             from users where ",
            $predicate
        )
    };
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
    let found = sqlx::query_as::<_, Credentials>(credentials_select!("email = $1"))
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
        user: UserResponse::from_credentials(found, role),
    }))
}

async fn me(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<UserResponse>> {
    let found = sqlx::query_as::<_, Credentials>(credentials_select!("id = $1"))
        .bind(auth.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    let role: Role = found.role.parse()?;

    Ok(Json(UserResponse::from_credentials(found, role)))
}
