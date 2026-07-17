use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::error::AppResult;

/// Small on purpose: every serverless instance opens its own pool, and a pooled
/// database counts each of those against one shared connection limit.
const MAX_CONNECTIONS: u32 = 5;

/// Connects the pool.
///
/// `DATABASE_URL` must point at a **session** pooler, not a transaction pooler.
/// sqlx names its prepared statements per connection (`sqlx_s_1`, `sqlx_s_2`, ...).
/// A transaction pooler multiplexes many connections onto shared backends, so two
/// connections both issue `sqlx_s_1` against the same backend and it fails with
/// `42P05 prepared statement "sqlx_s_1" already exists`, intermittently, on roughly
/// half of all requests. Disabling sqlx's statement cache does not help: it stops
/// statements being reused, not being named. A session pooler gives each connection
/// its own backend, which is what makes the names unique again.
pub async fn connect(database_url: &str) -> AppResult<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(MAX_CONNECTIONS)
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
