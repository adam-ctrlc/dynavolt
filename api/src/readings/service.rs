use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;

use crate::alerts;
use crate::error::AppResult;
use crate::readings::model;
use crate::readings::model::{LiveReading, Reading, ReadingInput, Status};
use crate::readings::simulate;
use crate::readings::units;
use crate::settings::model::Settings;
use crate::settings::service as settings_service;

#[must_use]
pub fn evaluate(input: &ReadingInput, settings: &Settings) -> (Option<f64>, Status) {
    let apparent_power_va = match (input.voltage_v, input.current_a) {
        (Some(voltage), Some(current)) => Some(voltage * current),
        _ => None,
    };
    let status = match apparent_power_va {
        Some(apparent) if apparent >= settings.load_threshold_va => Status::Overload,
        _ => Status::Normal,
    };

    (apparent_power_va, status)
}

/// Stores a measurement and opens any alerts it triggers.
pub async fn record(pool: &PgPool, input: ReadingInput, source: &str) -> AppResult<Reading> {
    let settings = settings_service::load(pool).await?;
    let (apparent_power_va, status) = evaluate(&input, &settings);

    let reading = sqlx::query_as::<_, Reading>(
        "insert into readings
            (voltage_v, current_a, temperature_c, apparent_power_va, status, source,
             power_w, power_factor, frequency_hz, energy_kwh, humidity_pct)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id, voltage_v, current_a, temperature_c, apparent_power_va, status, source,
                   power_w, power_factor, frequency_hz, energy_kwh, humidity_pct, recorded_at",
    )
    .bind(input.voltage_v)
    .bind(input.current_a)
    .bind(input.temperature_c)
    .bind(apparent_power_va)
    .bind(status.as_str())
    .bind(source)
    .bind(input.power_w)
    .bind(input.power_factor)
    .bind(input.frequency_hz)
    .bind(input.energy_kwh)
    .bind(input.humidity_pct)
    .fetch_one(pool)
    .await?;

    alerts::service::evaluate(pool, &reading, &settings).await?;

    Ok(reading)
}

/// How recently a hardware reading must have arrived for the link to count as live.
const CONNECTED_WINDOW_SECONDS: i64 = 30;

/// Whether a hardware reading recorded at `recorded_at` is recent enough to count as connected.
#[must_use]
pub fn is_within_connected_window(recorded_at: DateTime<Utc>, now: DateTime<Utc>) -> bool {
    now - recorded_at <= Duration::seconds(CONNECTED_WINDOW_SECONDS)
}

fn input_from(reading: &Reading) -> ReadingInput {
    ReadingInput {
        voltage_v: reading.voltage_v,
        current_a: reading.current_a,
        temperature_c: reading.temperature_c,
        power_w: reading.power_w,
        power_factor: reading.power_factor,
        frequency_hz: reading.frequency_hz,
        energy_kwh: reading.energy_kwh,
        humidity_pct: reading.humidity_pct,
    }
}

/// The dashboard heartbeat.
///
/// In simulation mode the value is derived from the clock so no background task is
/// needed, and a sample is persisted only when the newest stored row is older than
/// `sample_interval_ms`, so polling fast does not flood the database. In hardware
/// mode nothing is simulated or recorded: the latest pushed reading is served, and
/// the link counts as connected only while that reading stays inside the window.
pub async fn live(pool: &PgPool, sample_interval_ms: i64) -> AppResult<LiveReading> {
    let settings = settings_service::load(pool).await?;
    let now = Utc::now();

    let (input, recorded_at, simulated, connected) = match settings.source_mode.as_str() {
        "hardware" => match latest_hardware(pool).await? {
            Some(reading) => {
                let recorded_at = reading.recorded_at;
                let connected = is_within_connected_window(recorded_at, now);
                (input_from(&reading), recorded_at, false, connected)
            }
            None => (ReadingInput::empty(), now, false, false),
        },
        _ => {
            let input = simulate::at(now.timestamp_millis());
            if is_sample_due(pool, sample_interval_ms).await? {
                record(pool, input, "simulator").await?;
            }
            (input, now, true, false)
        }
    };

    let (apparent_power_va, status) = evaluate(&input, &settings);

    Ok(LiveReading {
        voltage_v: input.voltage_v,
        current_a: input.current_a,
        temperature_c: input.temperature_c,
        temperature_f: input.temperature_c.map(units::celsius_to_fahrenheit),
        apparent_power_va,
        status,
        load_threshold_va: settings.load_threshold_va,
        temp_threshold_c: settings.temp_threshold_c,
        temp_threshold_f: units::celsius_to_fahrenheit(settings.temp_threshold_c),
        load_percent: apparent_power_va.map(|apparent| apparent / settings.load_threshold_va * 100.0),
        // Compared in Celsius, the unit the sensor reports and the threshold is set in.
        over_temperature: input.temperature_c.is_some_and(|t| t >= settings.temp_threshold_c),
        power_w: input.power_w,
        power_factor: input.power_factor,
        frequency_hz: input.frequency_hz,
        energy_kwh: input.energy_kwh,
        humidity_pct: input.humidity_pct,
        reactive_power_var: model::reactive_power(apparent_power_va, input.power_w),
        headroom_va: apparent_power_va.map(|apparent| settings.load_threshold_va - apparent),
        recorded_at,
        simulated,
        connected,
    })
}

pub async fn latest(pool: &PgPool) -> AppResult<Option<Reading>> {
    let reading = sqlx::query_as::<_, Reading>(
        "select id, voltage_v, current_a, temperature_c, apparent_power_va, status, source,
                power_w, power_factor, frequency_hz, energy_kwh, humidity_pct, recorded_at
         from readings order by recorded_at desc limit 1",
    )
    .fetch_optional(pool)
    .await?;

    Ok(reading)
}

pub async fn latest_hardware(pool: &PgPool) -> AppResult<Option<Reading>> {
    let reading = sqlx::query_as::<_, Reading>(
        "select id, voltage_v, current_a, temperature_c, apparent_power_va, status, source,
                power_w, power_factor, frequency_hz, energy_kwh, humidity_pct, recorded_at
         from readings where source = 'hardware' order by recorded_at desc limit 1",
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
