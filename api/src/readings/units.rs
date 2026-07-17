//! Unit conversions for readings.
//!
//! Sensors report SI units and the database stores those, so these are applied on
//! the way out rather than at rest. Storing both would let the two drift apart.

/// Converts degrees Celsius to degrees Fahrenheit: `F = C * 9/5 + 32`.
#[must_use]
pub fn celsius_to_fahrenheit(celsius: f64) -> f64 {
    celsius.mul_add(9.0 / 5.0, 32.0)
}

/// Converts degrees Fahrenheit to degrees Celsius: `C = (F - 32) * 5/9`.
#[must_use]
pub fn fahrenheit_to_celsius(fahrenheit: f64) -> f64 {
    (fahrenheit - 32.0) * 5.0 / 9.0
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Floats do not compare exactly, so fixed points are checked within a tolerance.
    fn close(left: f64, right: f64) -> bool {
        (left - right).abs() < 1e-9
    }

    #[test]
    fn converts_the_known_fixed_points() {
        assert!(close(celsius_to_fahrenheit(0.0), 32.0), "water freezes");
        assert!(close(celsius_to_fahrenheit(100.0), 212.0), "water boils");
        assert!(close(celsius_to_fahrenheit(37.0), 98.6), "body temperature");
        // The one temperature where both scales read the same.
        assert!(close(celsius_to_fahrenheit(-40.0), -40.0));
    }

    #[test]
    fn converts_the_alarm_threshold() {
        assert!(close(celsius_to_fahrenheit(40.0), 104.0));
    }

    #[test]
    fn round_trips_without_drifting() {
        for step in -50..150 {
            let celsius = f64::from(step);
            let round_tripped = fahrenheit_to_celsius(celsius_to_fahrenheit(celsius));

            assert!(close(round_tripped, celsius), "drifted at {celsius} C");
        }
    }
}
