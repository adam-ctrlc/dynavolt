use crate::readings::model::ReadingInput;

const NOMINAL_VOLTAGE: f64 = 230.0;

/// Derives a smooth, repeatable measurement from the clock.
///
/// Serverless functions cannot keep a background loop alive, so the value is a pure
/// function of time. It drifts across the 900 VA and 40 C thresholds so the dashboard,
/// alerts and logs all exercise realistically without any stored simulator state.
#[must_use]
pub fn at(unix_ms: i64) -> ReadingInput {
    let t = unix_ms as f64 / 1000.0;

    let apparent_power_va =
        720.0 + 190.0 * (t / 37.0).sin() + 70.0 * (t / 11.3).sin() + 18.0 * (t / 2.7).sin();
    let apparent_power_va = apparent_power_va.clamp(0.0, 1400.0);

    let voltage_v = NOMINAL_VOLTAGE + 2.5 * (t / 6.1).sin() + 1.2 * (t / 1.7).sin();
    let current_a = apparent_power_va / voltage_v;

    let temperature_c = 34.0 + 7.0 * (t / 53.0).sin() + 1.5 * (t / 4.3).sin();

    ReadingInput {
        voltage_v,
        current_a,
        temperature_c,
    }
}
