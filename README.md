# DynaVolt

A Transformer Alert Management System for a 1 KVA distribution transformer, built as an electrical engineering thesis project at PHINMA Cagayan de Oro College, Carmen Campus.

An ESP32 measures the transformer's supply and reports it to a Rust API, which stores every sample, raises alerts when a reading crosses a threshold, and serves live readings to an Expo app. Until the hardware is wired in, the API simulates the transformer from the clock so the whole system can be exercised end to end.

## What it does

- Live monitoring of voltage, current, temperature and apparent power, with an animated AC waveform
- Alerts raised automatically when load reaches **900 VA** or temperature reaches **40 °C**, with acknowledgement and response time
- Historical logs with server-side search, filtering and pagination, plus a daily load trend
- Configurable thresholds and ESP32 Wi-Fi settings
- Two roles, decided by the account rather than a picker at sign-in

| Role | Who | Can reach |
|---|---|---|
| `admin` | Maintenance engineers | Everything: dashboard, alerts, logs, settings, users |
| `user` | Power utility personnel | Dashboard and alerts only |

## Architecture

```
ESP32  ──POST /readings──>  Rust API  ──>  Neon PostgreSQL
                              │
Expo app  ──polls──────────────┘
```

The API is stateless. Serverless functions cannot keep a background loop alive, so simulated readings are a pure function of the clock, and a sample is persisted only when the newest stored row is older than `SAMPLE_INTERVAL_MS`. Polling fast does not flood the database.

## Tech stack

**API** Rust, Axum 0.8, sqlx 0.8 against PostgreSQL (Neon), JWT (HS256) auth, argon2 password hashing. Deployed to Vercel in the `sin1` region, co-located with the database.

**App** Expo SDK 54, Expo Router, React Native 0.81, NativeWind (Tailwind), React Native Reusables, react-native-reanimated and react-native-svg for the waveform and charts, Phosphor icons, KaTeX pre-rendered offline for the formulas.

**Firmware** ESP32 with a PZEM-004T v3 energy meter and a DHT22 temperature and humidity sensor.

## Project structure

```
api/            Rust API
  src/          one module per domain: auth, readings, alerts, settings, device, users
  migrations/   SQL, applied in development and shared with production
  api/index.rs  Vercel serverless entrypoint
app/            Expo application
  src/app/      Expo Router routes; (tabs) holds the four screens
  src/features/ API clients and types, split by domain
  src/components/
  scripts/      build-time asset generation
esp32/          firmware
```

## Getting started

### API

Create `api/.env`:

```
DATABASE_URL=postgres://...
JWT_SECRET=a-long-random-string
PORT=8080
SIMULATOR_ENABLED=true
SAMPLE_INTERVAL_MS=15000
```

```bash
cd api
cargo run
```

The development server applies migrations on start. Production never migrates: both share one database, so running the development server is what production sees.

### Accounts

There are no accounts until you create one, and **the seeder is not committed**: it holds real passwords and this repository is public. Create `api/src/bin/seed.rs`, which cargo discovers automatically:

```rust
use dynavolt_api::auth::{Role, password};
use dynavolt_api::config::Config;
use dynavolt_api::db;
use dynavolt_api::error::AppResult;

#[tokio::main]
async fn main() -> AppResult<()> {
    dotenvy::dotenv().ok();
    let pool = db::connect(&Config::from_env()?.database_url).await?;

    sqlx::query(
        "insert into users (email, password_hash, role, first_name, last_name)
         values ($1, $2, $3, $4, $5)
         on conflict (email) do update set password_hash = excluded.password_hash",
    )
    .bind("you@example.com")
    .bind(password::hash("your-password")?)
    .bind(Role::Admin.as_str())
    .bind("Your")
    .bind("Name")
    .execute(&pool)
    .await?;

    Ok(())
}
```

```bash
cargo run --bin seed
```

Further accounts can be created from the app by an admin.

### App

Create `app/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
```

```bash
cd app
pnpm install
pnpm expo start
```

Open it in Expo Go (SDK 54) or a development build. A phone cannot reach `localhost`, so point `EXPO_PUBLIC_API_URL` at your machine's LAN address or a deployed API.

## API

Everything is under `/api/v1`. All routes except `/health` and `/auth/login` need a bearer token.

| Route | Method | Access | Notes |
|---|---|---|---|
| `/health` | GET | public | Returns the check time, UTC and local |
| `/auth/login` | POST | public | Returns a token and the account |
| `/auth/me` | GET | any | The current account |
| `/readings/latest` | GET | any | Live heartbeat plus thresholds |
| `/readings` | GET | admin | Paginated history; `q`, `status`, `limit`, `offset` |
| `/readings` | POST | public | Hardware ingest |
| `/readings/trend` | GET | admin | Daily averages; `days` |
| `/alerts` | GET | any | Paginated; `q`, `kind`, `active`, `limit`, `offset` |
| `/alerts/{id}/ack` | POST | any | Acknowledge, recording response time |
| `/settings` | GET / PUT | any / admin | Thresholds |
| `/device/status` | GET | any | ESP32 link state |
| `/device/history` | GET | any | Connection events |
| `/device/wifi` | GET / PUT | admin | Network the board connects to |
| `/users` | GET / POST | admin | List and create |
| `/users/{id}` | DELETE | admin | Remove |

List endpoints return `{ rows, total, limit, offset }`. `total` counts every row matching the filters, not just the returned window.

### Readings

An ingest must carry `voltageV`, `currentA` and `temperatureC`. The rest are optional, so a board without a PZEM still reports:

```json
{
  "voltageV": 230.1, "currentA": 3.2, "temperatureC": 31.5,
  "powerW": 690.2, "powerFactor": 0.94, "frequencyHz": 60.01,
  "energyKwh": 12.5, "humidityPct": 58
}
```

Apparent power is derived as `S = V * I`. Reactive power is derived from the power triangle, `Q = sqrt(S^2 - P^2)`, and is only reported when real power was measured, since it cannot be recovered from apparent power alone.

## Notes

- `SIMULATOR_ENABLED=false` makes the API serve the newest stored reading instead of the clock. Flip it once the ESP32 is reporting.
- `SAMPLE_INTERVAL_MS` throttles writes, not the dashboard: the live view polls every second regardless. It defaults to 15s because a transformer's thermal behaviour moves over minutes, and storing every 1.5s filled the database roughly ten times faster for no extra insight.
- The database must be reached through a **session** pooler. sqlx names prepared statements per connection, so a transaction pooler multiplexes them onto shared backends and fails with `42P05 ... already exists` on about half of all requests.
- After changing an environment variable on Vercel, deploy with `--force`. A cached build keeps the old environment and every request fails with `failed to load env vars`.
- `POST /readings` is currently unauthenticated. It needs a device key before the board is exposed to a real network.
- The grid here runs at **60 Hz**; the nominal supply is 230 V.
- Times are stamped in UTC and rendered at UTC+8.

## Scripts

From `app/`:

- `pnpm expo start` starts the development server
- `node scripts/build-katex-assets.mjs` regenerates the offline KaTeX assets

From `api/`:

- `cargo run` starts the API and applies migrations
- `cargo run --bin seed` creates accounts, if you have added a seeder
- `cargo test` runs the unit and property tests

## License

Apache License 2.0. See [LICENSE](LICENSE).
