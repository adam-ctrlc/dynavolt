use dynavolt_api::config::Config;
use tower::Layer;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::{Error, run};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let config = Config::from_env().map_err(|error| Error::from(error.to_string()))?;

    let app = dynavolt_api::build(&config)
        .await
        .map_err(|error| Error::from(error.to_string()))?;

    run(VercelLayer::new().layer(app)).await
}
