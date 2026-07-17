use chrono::Utc;
use sqlx::PgPool;

use crate::alerts;
use crate::error::AppResult;
use crate::readings::model::{LiveReading, Reading, ReadingInput, Status};
use crate::readings::simulate;
use crate::settings::model::Settings;
use crate::settings::service as settings_service;

#[must_use]
pub fn evaluate(input: &ReadingInput, settings: &Settings) -> (f64, Status) {
    let apparent_power_va = input.voltage_v * input.current_a;
    let status = if apparent_power_va >= settings.load_threshold_va {
        Status::Overload
    } else {
        Status::Normal
    };

    (apparent_power_va, status)
}

/// Stores a measurement and opens any alerts it triggers.
pub async fn record(pool: &PgPool, input: ReadingInput, source: &str) -> AppResult<Reading> {
    let settings = settings_service::load(pool).await?;
    let (apparent_power_va, status) = evaluate(&input, &settings);

    let reading = sqlx::query_as::<_, Reading>(
        "insert into readings (voltage_v, current_a, temperature_c, apparent_power_va, status, source)
         values ($1, $2, $3, $4, $5, $6)
         returning id, voltage_v, current_a, temperature_c, apparent_power_va, status, source, recorded_at",
    )
    .bind(input.voltage_v)
    .bind(input.current_a)
    .bind(input.temperature_c)
    .bind(apparent_power_va)
    .bind(status.as_str())
    .bind(source)
    .fetch_one(pool)
    .await?;

    alerts::service::evaluate(pool, &reading, &settings).await?;

    Ok(reading)
}

/// The dashboard heartbeat.
///
/// With the simulator on, the value is derived from the clock so no background task is
/// needed. A sample is persisted only when the newest stored row is older than
/// `sample_interval_ms`, so polling fast does not flood the database.
pub async fn live(
    pool: &PgPool,
    simulator_enabled: bool,
    sample_interval_ms: i64,
) -> AppResult<LiveReading> {
    let settings = settings_service::load(pool).await?;
    let now = Utc::now();

    let input = if simulator_enabled {
        simulate::at(now.timestamp_millis())
    } else {
        latest(pool).await?.map_or(
            ReadingInput {
                voltage_v: 0.0,
                current_a: 0.0,
                temperature_c: 0.0,
            },
            |reading| ReadingInput {
                voltage_v: reading.voltage_v,
                current_a: reading.current_a,
                temperature_c: reading.temperature_c,
            },
        )
    };

    let (apparent_power_va, status) = evaluate(&input, &settings);

    if simulator_enabled && is_sample_due(pool, sample_interval_ms).await? {
        record(pool, input, "simulator").await?;
    }

    Ok(LiveReading {
        voltage_v: input.voltage_v,
        current_a: input.current_a,
        temperature_c: input.temperature_c,
        apparent_power_va,
        status,
        load_threshold_va: settings.load_threshold_va,
        temp_threshold_c: settings.temp_threshold_c,
        load_percent: apparent_power_va / settings.load_threshold_va * 100.0,
        over_temperature: input.temperature_c >= settings.temp_threshold_c,
        recorded_at: now,
    })
}

pub async fn latest(pool: &PgPool) -> AppResult<Option<Reading>> {
    let reading = sqlx::query_as::<_, Reading>(
        "select id, voltage_v, current_a, temperature_c, apparent_power_va, status, source, recorded_at
         from readings order by recorded_at desc limit 1",
    )
    .fetch_optional(pool)
    .await?;

    Ok(reading)
}

async fn is_sample_due(pool: &PgPool, sample_interval_ms: i64) -> AppResult<bool> {
    let latest_ms: Option<i64> = sqlx::query_scalar(
        "select (extract(epoch from recorded_at) * 1000)::bigint
         from readings order by recorded_at desc limit 1",
    )
    .fetch_optional(pool)
    .await?
    .flatten();

    let due = latest_ms.is_none_or(|ms| Utc::now().timestamp_millis() - ms >= sample_interval_ms);

    Ok(due)
}
