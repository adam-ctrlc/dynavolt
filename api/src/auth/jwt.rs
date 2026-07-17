use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::Role;
use crate::error::{AppError, AppResult};

const TOKEN_TTL_HOURS: i64 = 12;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub role: Role,
    pub exp: i64,
}

pub fn encode(secret: &str, user_id: Uuid, role: Role) -> AppResult<String> {
    let claims = Claims {
        sub: user_id,
        role,
        exp: (Utc::now() + Duration::hours(TOKEN_TTL_HOURS)).timestamp(),
    };

    jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Token)
}

pub fn decode(secret: &str, token: &str) -> AppResult<Claims> {
    jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}
