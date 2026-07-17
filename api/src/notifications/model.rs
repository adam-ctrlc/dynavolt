use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterToken {
    pub token: String,
    #[serde(default)]
    pub platform: Option<String>,
}

/// One message in an Expo push batch.
///
/// <https://docs.expo.dev/push-notifications/sending-notifications/>
#[derive(Debug, Serialize)]
pub struct ExpoMessage {
    pub to: String,
    pub title: String,
    pub body: String,
    /// `high` wakes the device promptly; alerts are the reason this app exists.
    pub priority: &'static str,
    pub sound: &'static str,
    /// Lets the app open straight to the alert it is about.
    pub data: serde_json::Value,
}
