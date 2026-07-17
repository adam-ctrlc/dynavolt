use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database error")]
    Database(#[from] sqlx::Error),
    #[error("io error")]
    Io(#[from] std::io::Error),
    #[error("migration error")]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error("missing environment variable: {0}")]
    MissingEnv(String),
    #[error("invalid environment variable: {0}")]
    InvalidEnv(String),
    #[error("invalid credentials")]
    InvalidCredentials,
    #[error("missing or invalid token")]
    Unauthorized,
    #[error("admin access required")]
    Forbidden,
    #[error("not found")]
    NotFound,
    #[error("{0}")]
    BadRequest(String),
    #[error("could not hash password")]
    PasswordHash,
    #[error("could not create token")]
    Token,
}

pub type AppResult<T> = Result<T, AppError>;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            Self::Database(_)
            | Self::Io(_)
            | Self::Migrate(_)
            | Self::MissingEnv(_)
            | Self::InvalidEnv(_)
            | Self::PasswordHash
            | Self::Token => StatusCode::INTERNAL_SERVER_ERROR,
            Self::InvalidCredentials | Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
        };

        if status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = ?self, "request failed");
        }

        (status, Json(json!({ "error": self.to_string() }))).into_response()
    }
}
