use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::extract::AuthUser;
use crate::auth::{Role, jwt, password};
use crate::error::{AppError, AppResult};
use crate::state::AppState;
use crate::users::model::clean_optional;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    /// Email or username. Accepts either so people can sign in with whichever they
    /// remember. `email` is still read for older clients.
    #[serde(alias = "email")]
    pub identifier: String,
    pub password: String,
    /// The portal the caller chose. Enforced here, not just in the app: the account's
    /// real role must match, so a user account cannot enter through the admin portal.
    #[serde(default)]
    pub role: Option<Role>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub username: String,
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
            username: found.username,
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
    username: String,
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
            "select id, email, username, password_hash, role,
                    first_name, middle_name, last_name,
                    trim(concat_ws(' ', first_name, middle_name, last_name)) as full_name
             from users where ",
            $predicate
        )
    };
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfile {
    pub first_name: String,
    #[serde(default)]
    pub middle_name: Option<String>,
    pub last_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePassword {
    pub current_password: String,
    pub new_password: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/me", get(me).put(update_me))
        .route("/password", put(change_password))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    // Email is stored lowercased and usernames are always lowercase, so one
    // lowercased needle matches either column.
    let found = sqlx::query_as::<_, Credentials>(credentials_select!("email = $1 or username = $1"))
        .bind(body.identifier.trim().to_lowercase())
        .fetch_optional(&state.pool)
        .await?;

    // When no account matches, still spend one argon2 verification against a dummy
    // hash so timing does not reveal which accounts exist.
    let Some(found) = found else {
        password::verify_dummy(&body.password);
        return Err(AppError::InvalidCredentials);
    };

    if !password::verify(&body.password, &found.password_hash) {
        return Err(AppError::InvalidCredentials);
    }

    let role: Role = found.role.parse()?;

    // Checked only after the password, so a wrong portal on a bad password still
    // reads "invalid credentials" and reveals neither the account nor its role.
    if let Some(chosen) = body.role
        && chosen != role
    {
        return Err(AppError::PortalMismatch(role));
    }

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

/// Updates the caller's own name. Email and role are deliberately not editable
/// here: email is the login identity, and letting an account raise its own role
/// would defeat the point of having roles.
async fn update_me(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<UpdateProfile>,
) -> AppResult<Json<UserResponse>> {
    if body.first_name.trim().is_empty() {
        return Err(AppError::BadRequest("First name is required".to_owned()));
    }
    if body.last_name.trim().is_empty() {
        return Err(AppError::BadRequest("Last name is required".to_owned()));
    }

    // RETURNING reflects the new values, so full_name is composed post-update.
    let found = sqlx::query_as::<_, Credentials>(
        "update users
         set first_name = $1, middle_name = $2, last_name = $3
         where id = $4
         returning id, email, username, password_hash, role,
                   first_name, middle_name, last_name,
                   trim(concat_ws(' ', first_name, middle_name, last_name)) as full_name",
    )
    .bind(body.first_name.trim())
    .bind(clean_optional(body.middle_name.as_deref()))
    .bind(body.last_name.trim())
    .bind(auth.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let role: Role = found.role.parse()?;

    Ok(Json(UserResponse::from_credentials(found, role)))
}

async fn change_password(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<ChangePassword>,
) -> AppResult<StatusCode> {
    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest(
            "New password must be at least 8 characters".to_owned(),
        ));
    }

    let found = sqlx::query_as::<_, Credentials>(credentials_select!("id = $1"))
        .bind(auth.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    // Proves the person holding the token also knows the password, so a stolen
    // token cannot be used to lock the owner out.
    if !password::verify(&body.current_password, &found.password_hash) {
        return Err(AppError::InvalidCredentials);
    }

    sqlx::query("update users set password_hash = $1 where id = $2")
        .bind(password::hash(&body.new_password)?)
        .bind(auth.id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
