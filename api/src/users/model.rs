use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::Role;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub full_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUser {
    pub email: String,
    pub password: String,
    pub role: Role,
    pub first_name: String,
    #[serde(default)]
    pub middle_name: Option<String>,
    pub last_name: String,
}

/// Composes the display name the same way `full_name` is composed in SQL, so a
/// caller that only has the parts renders the identical string.
#[must_use]
pub fn full_name(first: &str, middle: Option<&str>, last: &str) -> String {
    [first, middle.unwrap_or_default(), last]
        .into_iter()
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Trims a name part and treats blank as absent.
#[must_use]
pub fn clean_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(ToOwned::to_owned)
}
