use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::error::AppResult;

pub async fn connect(database_url: &str) -> AppResult<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    Ok(pool)
}

/// Applies pending migrations. Only the local dev server calls this: production
/// runs serverless, where this would fire on every cold start. Dev and production
/// share the same database, so migrating from dev is what production picks up.
pub async fn migrate(pool: &PgPool) -> AppResult<()> {
    sqlx::migrate!("./migrations").run(pool).await?;

    Ok(())
}
