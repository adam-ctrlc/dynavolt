use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use serde_json::{Map, Value};

use crate::auth::extract::{AdminUser, AuthUser, DeviceAuth};
use crate::device::model::{DeviceStatus, Heartbeat, HeartbeatAck, NetworkInput, WifiNetwork};
use crate::device::service;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// WPA2 requires 8..=63 characters; an open network uses an empty passphrase.
const WPA2_MIN: usize = 8;
const WPA2_MAX: usize = 63;
const SSID_MAX: usize = 32;

/// The board reads at most this many networks from `/config`.
const CONFIG_MAX: usize = 5;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/status", get(status))
        .route("/heartbeat", post(heartbeat))
        .route("/config", get(config))
        .route("/networks", get(networks).post(add_network))
        .route("/networks/{id}", delete(delete_network).put(update_network))
        .route("/networks/{id}/select", put(select_network))
        .route("/networks/register-default", post(register_default))
}

/// Validates operator and firmware input alike. Quotes and backslashes are rejected
/// outright: the firmware config parser is a naive substring scanner, so allowing
/// them would let a value forge a neighbouring `"key":"value"` pair.
fn validate_network(input: &NetworkInput) -> AppResult<()> {
    let ssid = input.ssid.trim();

    // Already sentence cased: "Wi-Fi" would otherwise render as "Wi-fi".
    if ssid.is_empty() {
        return Err(AppError::BadRequest("Wi-Fi network name is required".to_owned()));
    }
    if ssid.chars().count() > SSID_MAX {
        return Err(AppError::BadRequest(format!(
            "Wi-Fi network name must be at most {SSID_MAX} characters"
        )));
    }

    let length = input.password.chars().count();
    if length != 0 && !(WPA2_MIN..=WPA2_MAX).contains(&length) {
        return Err(AppError::BadRequest(format!(
            "Wi-Fi password must be {WPA2_MIN} to {WPA2_MAX} characters, or empty for an open network"
        )));
    }

    let forbidden = |value: &str| value.contains('"') || value.contains('\\');
    if forbidden(ssid) || forbidden(&input.password) {
        return Err(AppError::BadRequest(
            "Quotes and backslashes are not allowed".to_owned(),
        ));
    }

    Ok(())
}

async fn status(State(state): State<AppState>, _auth: AuthUser) -> AppResult<Json<DeviceStatus>> {
    Ok(Json(service::status(&state.pool).await?))
}

/// Device only: the firmware self-reports its identity and link telemetry here, and
/// gets the current alarm thresholds back so it can adopt any operator change.
async fn heartbeat(
    State(state): State<AppState>,
    _device: DeviceAuth,
    Json(body): Json<Heartbeat>,
) -> AppResult<Json<HeartbeatAck>> {
    Ok(Json(service::record_heartbeat(&state.pool, &body).await?))
}

/// Admin only: the response carries the passphrases in clear text.
async fn networks(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> AppResult<Json<Vec<WifiNetwork>>> {
    Ok(Json(service::list_networks(&state.pool).await?))
}

async fn add_network(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(body): Json<NetworkInput>,
) -> AppResult<(StatusCode, Json<WifiNetwork>)> {
    validate_network(&body)?;

    let network = service::add_network(&state.pool, &body).await?;

    Ok((StatusCode::CREATED, Json(network)))
}

async fn delete_network(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    service::delete_network(&state.pool, id).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Edits a stored network's credentials. The default is refused in the service; a
/// bumped `updated_at` is the signal the board watches to re-sync.
async fn update_network(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(id): Path<i64>,
    Json(body): Json<NetworkInput>,
) -> AppResult<Json<WifiNetwork>> {
    validate_network(&body)?;

    Ok(Json(service::update_network(&state.pool, id, &body).await?))
}

/// No online guard: with list failover the board picks up the new priority at its
/// next sync, so the selection is safe to change while it is offline.
async fn select_network(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(id): Path<i64>,
) -> AppResult<Json<WifiNetwork>> {
    Ok(Json(service::select_network(&state.pool, id).await?))
}

/// Device only: the firmware self-registers its compiled-in default here.
async fn register_default(
    State(state): State<AppState>,
    _device: DeviceAuth,
    Json(body): Json<NetworkInput>,
) -> AppResult<StatusCode> {
    validate_network(&body)?;

    service::register_default(&state.pool, &body).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// The firmware config feed. Flat JSON with string-only values, because the board's
/// parser handles only `"key":"string"` pairs. Networks come in failover priority as
/// `ssid1`/`pass1`, `ssid2`/`pass2`, up to five. `count` is that same number as a
/// string; `updatedAt` is the newest change across all rows, empty when none exist.
async fn config(State(state): State<AppState>, _device: DeviceAuth) -> AppResult<Json<Value>> {
    let networks = service::list_networks(&state.pool).await?;

    let updated_at = networks
        .iter()
        .map(|network| network.updated_at)
        .max()
        .map_or_else(String::new, |at| at.to_rfc3339());

    let entries = &networks[..networks.len().min(CONFIG_MAX)];

    let mut map = Map::new();
    map.insert("updatedAt".to_owned(), Value::String(updated_at));
    map.insert("count".to_owned(), Value::String(entries.len().to_string()));
    for (index, network) in entries.iter().enumerate() {
        let position = index + 1;
        map.insert(format!("ssid{position}"), Value::String(network.ssid.clone()));
        map.insert(format!("pass{position}"), Value::String(network.password.clone()));
    }

    Ok(Json(Value::Object(map)))
}
