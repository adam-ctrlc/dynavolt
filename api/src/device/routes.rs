use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};

use crate::auth::extract::{AdminUser, AuthUser};
use crate::device::model::{ConnectionEvent, DeviceStatus, UpdateWifi, WifiConfig};
use crate::device::service;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// WPA2 requires 8..=63 characters; an open network uses an empty passphrase.
const WPA2_MIN: usize = 8;
const WPA2_MAX: usize = 63;
const SSID_MAX: usize = 32;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/status", get(status))
        .route("/history", get(history))
        .route("/wifi", get(wifi).put(update_wifi))
}

async fn status(State(state): State<AppState>, _auth: AuthUser) -> AppResult<Json<DeviceStatus>> {
    Ok(Json(service::status(&state.pool).await?))
}

async fn history(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> AppResult<Json<Vec<ConnectionEvent>>> {
    Ok(Json(service::history(&state.pool).await?))
}

/// Admin only: the response carries the passphrase in clear text.
async fn wifi(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<WifiConfig>> {
    Ok(Json(service::wifi(&state.pool).await?))
}

async fn update_wifi(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(body): Json<UpdateWifi>,
) -> AppResult<Json<WifiConfig>> {
    let ssid = body.wifi_ssid.trim();

    // Already sentence cased: "Wi-Fi" would otherwise render as "Wi-fi".
    if ssid.is_empty() {
        return Err(AppError::BadRequest("Wi-Fi network name is required".to_owned()));
    }
    if ssid.len() > SSID_MAX {
        return Err(AppError::BadRequest(format!(
            "Wi-Fi network name must be at most {SSID_MAX} characters"
        )));
    }

    let length = body.wifi_password.len();
    if length != 0 && !(WPA2_MIN..=WPA2_MAX).contains(&length) {
        return Err(AppError::BadRequest(format!(
            "Wi-Fi password must be {WPA2_MIN} to {WPA2_MAX} characters, or empty for an open network"
        )));
    }

    // The board keeps its own copy of the credentials, so it can only learn a new
    // network while it is reachable. Saving one it never receives would leave the
    // stored config and the device disagreeing.
    if !service::status(&state.pool).await?.connected {
        return Err(AppError::BadRequest(
            "The ESP32 is offline, so it cannot receive a new network. Reconnect it first."
                .to_owned(),
        ));
    }

    Ok(Json(service::update_wifi(&state.pool, &body).await?))
}
