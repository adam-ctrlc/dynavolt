use sqlx::PgPool;

use crate::alerts::model::{Alert, KIND_OVERLOAD, KIND_TEMPERATURE};
use crate::error::AppResult;
use crate::notifications;
use crate::readings::model::Reading;
use crate::settings::model::Settings;

/// Opens alerts for any threshold the reading crosses.
pub async fn evaluate(pool: &PgPool, reading: &Reading, settings: &Settings) -> AppResult<()> {
    if reading.apparent_power_va >= settings.load_threshold_va {
        raise(
            pool,
            reading.id,
            KIND_OVERLOAD,
            &format!("Load reached {:.0} VA", reading.apparent_power_va),
            reading.apparent_power_va,
            settings.load_threshold_va,
        )
        .await?;
    }

    if reading.temperature_c >= settings.temp_threshold_c {
        raise(
            pool,
            reading.id,
            KIND_TEMPERATURE,
            &format!("Temperature reached {:.1} °C", reading.temperature_c),
            reading.temperature_c,
            settings.temp_threshold_c,
        )
        .await?;
    }

    Ok(())
}

/// Opens an alert only when nothing of the same kind is still unacknowledged, so a fast
/// heartbeat cannot flood the alert list with duplicates of one ongoing condition.
///
/// The same guard is what keeps push quiet: a device is notified once per condition,
/// not once per reading for as long as it lasts.
async fn raise(
    pool: &PgPool,
    reading_id: i64,
    kind: &str,
    message: &str,
    value: f64,
    threshold: f64,
) -> AppResult<()> {
    let active: Option<i64> =
        sqlx::query_scalar("select id from alerts where kind = $1 and acknowledged_at is null limit 1")
            .bind(kind)
            .fetch_optional(pool)
            .await?;

    if active.is_some() {
        return Ok(());
    }

    let alert = sqlx::query_as::<_, Alert>(
        "insert into alerts (reading_id, kind, message, value, threshold)
         values ($1, $2, $3, $4, $5)
         returning id, reading_id, kind, message, value, threshold, created_at,
                   acknowledged_at, acknowledged_by, response_ms",
    )
    .bind(reading_id)
    .bind(kind)
    .bind(message)
    .bind(value)
    .bind(threshold)
    .fetch_one(pool)
    .await?;

    tracing::info!(kind, value, threshold, "alert raised");

    // Awaited rather than spawned: a serverless function may be frozen the moment it
    // responds, which would cut a detached task off mid-flight. This only runs when a
    // new alert is opened, so it is not on the common path.
    notifications::service::notify_alert(pool, &alert).await;

    Ok(())
}
