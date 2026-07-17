use dynavolt_api::config::Config;
use tower::Layer;
use tracing_subscriber::EnvFilter;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::{Error, run};

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Without a subscriber the internal error detail never reaches the Vercel logs,
    // and responses only carry the generic message.
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env().map_err(|error| Error::from(error.to_string()))?;

    let app = dynavolt_api::build(&config)
        .await
        .inspect_err(|error| tracing::error!(?error, "failed to build app"))
        .map_err(|error| Error::from(error.to_string()))?;

    run(VercelLayer::new().layer(app)).await
}
