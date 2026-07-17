use sqlx::PgPool;

use crate::auth::password;
use crate::error::AppResult;
use crate::users::model::{CreateUser, clean_optional};

pub async fn create(pool: &PgPool, body: &CreateUser) -> AppResult<()> {
    let password_hash = password::hash(&body.password)?;

    sqlx::query(
        "insert into users (email, password_hash, role, first_name, middle_name, last_name)
         values ($1, $2, $3, $4, $5, $6)",
    )
    .bind(body.email.trim().to_lowercase())
    .bind(password_hash)
    .bind(body.role.as_str())
    .bind(body.first_name.trim())
    .bind(clean_optional(body.middle_name.as_deref()))
    .bind(body.last_name.trim())
    .execute(pool)
    .await?;

    Ok(())
}
