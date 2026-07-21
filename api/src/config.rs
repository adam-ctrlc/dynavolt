use crate::error::{AppError, AppResult};

/// How often a reading is written to storage.
///
/// Not how often the dashboard updates: that polls every second and stays live.
/// A transformer's thermal behaviour moves over minutes, so storing every 1.5s
/// bought no insight and filled the database roughly ten times faster.
const DEFAULT_SAMPLE_INTERVAL_MS: i64 = 15_000;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub simulator_enabled: bool,
    pub sample_interval_ms: i64,
    pub device_api_key: Option<String>,
}

fn required(key: &str) -> AppResult<String> {
    std::env::var(key).map_err(|_| AppError::MissingEnv(key.to_owned()))
}

fn parsed<T: std::str::FromStr>(key: &str, fallback: T) -> AppResult<T> {
    match std::env::var(key) {
        Err(_) => Ok(fallback),
        Ok(raw) => raw
            .parse::<T>()
            .map_err(|_| AppError::InvalidEnv(key.to_owned())),
    }
}

impl Config {
    pub fn from_env() -> AppResult<Self> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            jwt_secret: required("JWT_SECRET")?,
            port: parsed("PORT", 8080)?,
            simulator_enabled: parsed("SIMULATOR_ENABLED", true)?,
            sample_interval_ms: parsed("SAMPLE_INTERVAL_MS", DEFAULT_SAMPLE_INTERVAL_MS)?,
            device_api_key: std::env::var("DEVICE_API_KEY").ok(),
        })
    }
}
