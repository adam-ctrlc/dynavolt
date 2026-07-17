use dynavolt_api::config::Config;
use dynavolt_api::error::AppResult;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> AppResult<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env()?;
    let app = dynavolt_api::build_for_dev(&config).await?;

    let address = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&address).await?;

    tracing::info!(%address, "dynavolt api listening");

    axum::serve(listener, app).await?;

    Ok(())
}
