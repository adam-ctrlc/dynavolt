use sqlx::PgPool;

use crate::auth::password;
use crate::error::AppResult;
use crate::users::model::{CreateUser, clean_optional, clean_username};

/// Asks the database for an available username derived from a name.
pub async fn suggest_username(pool: &PgPool, first: &str, last: &str) -> AppResult<String> {
    let username: String = sqlx::query_scalar("select generate_username($1, $2)")
        .bind(first.trim())
        .bind(last.trim())
        .fetch_one(pool)
        .await?;

    Ok(username)
}

pub async fn create(pool: &PgPool, body: &CreateUser) -> AppResult<()> {
    let password_hash = password::hash(&body.password)?;

    // A blank or absent username defers to the database formula, so the generation
    // rule has one home whether the admin typed a name or left it to autogenerate.
    let username = match body.username.as_deref().map(clean_username) {
        Some(name) if !name.is_empty() => name,
        _ => suggest_username(pool, &body.first_name, &body.last_name).await?,
    };

    sqlx::query(
        "insert into users (email, username, password_hash, role, first_name, middle_name, last_name)
         values ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(body.email.trim().to_lowercase())
    .bind(username)
    .bind(password_hash)
    .bind(body.role.as_str())
    .bind(body.first_name.trim())
    .bind(clean_optional(body.middle_name.as_deref()))
    .bind(body.last_name.trim())
    .execute(pool)
    .await?;

    Ok(())
}
