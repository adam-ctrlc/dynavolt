use sqlx::PgPool;

use crate::error::AppResult;
use crate::settings::model::Settings;

pub async fn load(pool: &PgPool) -> AppResult<Settings> {
    let settings = sqlx::query_as::<_, Settings>(
        "select load_threshold_va, temp_threshold_c, updated_at from settings where id = 1",
    )
    .fetch_one(pool)
    .await?;

    Ok(settings)
}
