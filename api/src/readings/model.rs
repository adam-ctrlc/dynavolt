use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Normal,
    Overload,
}

impl Status {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Overload => "overload",
        }
    }
}

impl fmt::Display for Status {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for Status {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "normal" => Ok(Self::Normal),
            "overload" => Ok(Self::Overload),
            other => Err(AppError::BadRequest(format!("invalid status: {other}"))),
        }
    }
}

/// A raw measurement, either simulated or pushed by hardware.
///
/// Everything past the first three is optional: a board without a PZEM still
/// reports voltage, current and temperature.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingInput {
    pub voltage_v: f64,
    pub current_a: f64,
    pub temperature_c: f64,
    #[serde(default)]
    pub power_w: Option<f64>,
    #[serde(default)]
    pub power_factor: Option<f64>,
    #[serde(default)]
    pub frequency_hz: Option<f64>,
    #[serde(default)]
    pub energy_kwh: Option<f64>,
    #[serde(default)]
    pub humidity_pct: Option<f64>,
}

impl ReadingInput {
    /// A reading with only the three core sensors present.
    #[must_use]
    pub const fn core(voltage_v: f64, current_a: f64, temperature_c: f64) -> Self {
        Self {
            voltage_v,
            current_a,
            temperature_c,
            power_w: None,
            power_factor: None,
            frequency_hz: None,
            energy_kwh: None,
            humidity_pct: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub id: i64,
    pub voltage_v: f64,
    pub current_a: f64,
    pub temperature_c: f64,
    pub apparent_power_va: f64,
    pub status: String,
    pub source: String,
    pub power_w: Option<f64>,
    pub power_factor: Option<f64>,
    pub frequency_hz: Option<f64>,
    pub energy_kwh: Option<f64>,
    pub humidity_pct: Option<f64>,
    pub recorded_at: DateTime<Utc>,
}

/// The dashboard heartbeat payload: live values plus the thresholds they are judged against.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveReading {
    pub voltage_v: f64,
    pub current_a: f64,
    pub temperature_c: f64,
    /// Derived from `temperature_c` on the way out; never stored, so the two cannot drift.
    pub temperature_f: f64,
    pub apparent_power_va: f64,
    pub status: Status,
    pub load_threshold_va: f64,
    pub temp_threshold_c: f64,
    pub temp_threshold_f: f64,
    pub load_percent: f64,
    pub over_temperature: bool,
    pub power_w: Option<f64>,
    pub power_factor: Option<f64>,
    pub frequency_hz: Option<f64>,
    pub energy_kwh: Option<f64>,
    pub humidity_pct: Option<f64>,
    /// Q = sqrt(S^2 - P^2). Present only when real power is, since it cannot be
    /// recovered from apparent power alone.
    pub reactive_power_var: Option<f64>,
    /// VA left before the load threshold. Negative once over.
    pub headroom_va: f64,
    pub recorded_at: DateTime<Utc>,
}

/// Reactive power from the power triangle. `None` unless real power was measured.
#[must_use]
pub fn reactive_power(apparent_power_va: f64, power_w: Option<f64>) -> Option<f64> {
    power_w.map(|real| {
        // Clamped at zero: sensor noise can make P marginally exceed S.
        (apparent_power_va.mul_add(apparent_power_va, -(real * real)))
            .max(0.0)
            .sqrt()
    })
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TrendPoint {
    pub day: DateTime<Utc>,
    pub avg_power_va: f64,
    pub max_power_va: f64,
    pub avg_temperature_c: f64,
    pub samples: i64,
}
