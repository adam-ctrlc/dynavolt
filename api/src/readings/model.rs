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
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingInput {
    pub voltage_v: f64,
    pub current_a: f64,
    pub temperature_c: f64,
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
    pub recorded_at: DateTime<Utc>,
}

/// The dashboard heartbeat payload: live values plus the thresholds they are judged against.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveReading {
    pub voltage_v: f64,
    pub current_a: f64,
    pub temperature_c: f64,
    pub apparent_power_va: f64,
    pub status: Status,
    pub load_threshold_va: f64,
    pub temp_threshold_c: f64,
    pub load_percent: f64,
    pub over_temperature: bool,
    pub recorded_at: DateTime<Utc>,
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
