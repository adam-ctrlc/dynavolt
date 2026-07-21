use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::auth::{Role, jwt};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Copy)]
pub struct AuthUser {
    pub id: Uuid,
    pub role: Role,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized)?
            .trim();

        let claims = jwt::decode(&state.jwt_secret, token)?;

        Ok(Self {
            id: claims.sub,
            role: claims.role,
        })
    }
}

/// Guards the admin-only screens: user management, historical logs and threshold config.
#[derive(Debug, Clone, Copy)]
pub struct AdminUser(pub AuthUser);

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;

        if !user.role.is_admin() {
            return Err(AppError::Forbidden);
        }

        Ok(Self(user))
    }
}

/// Authenticates the ESP32 by its shared `x-device-key` header. Fails closed: an
/// unset, missing, or mismatched key is rejected, and the comparison is constant
/// time so a wrong key leaks nothing through timing.
#[derive(Debug, Clone, Copy)]
pub struct DeviceAuth;

impl FromRequestParts<AppState> for DeviceAuth {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let Some(expected) = state.device_api_key.as_deref() else {
            return Err(AppError::Unauthorized);
        };
        let Some(provided) = parts
            .headers
            .get("x-device-key")
            .and_then(|value| value.to_str().ok())
        else {
            return Err(AppError::Unauthorized);
        };
        if !constant_time_eq(expected.as_bytes(), provided.as_bytes()) {
            return Err(AppError::Unauthorized);
        }

        Ok(Self)
    }
}

/// Compares two byte strings without leaking their contents through timing.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}
