use sqlx::PgPool;

use crate::auth::{Role, password};
use crate::error::AppResult;

const SEED_ADMIN_EMAIL: &str = "admin@dynavolt.local";
const SEED_ADMIN_PASSWORD: &str = "admin1234";
const SEED_USER_EMAIL: &str = "user@dynavolt.local";
const SEED_USER_PASSWORD: &str = "user1234";

/// Creates the starter accounts on an empty database so the app can be logged into.
pub async fn seed(pool: &PgPool) -> AppResult<()> {
    let count: i64 = sqlx::query_scalar("select count(*) from users")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        return Ok(());
    }

    create(pool, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, Role::Admin).await?;
    create(pool, SEED_USER_EMAIL, SEED_USER_PASSWORD, Role::User).await?;

    tracing::info!(
        admin = SEED_ADMIN_EMAIL,
        user = SEED_USER_EMAIL,
        "seeded starter accounts"
    );

    Ok(())
}

pub async fn create(pool: &PgPool, email: &str, plaintext: &str, role: Role) -> AppResult<()> {
    let password_hash = password::hash(plaintext)?;

    sqlx::query("insert into users (email, password_hash, role) values ($1, $2, $3)")
        .bind(email.trim().to_lowercase())
        .bind(password_hash)
        .bind(role.as_str())
        .execute(pool)
        .await?;

    Ok(())
}
