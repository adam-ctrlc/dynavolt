#pragma once

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

class TemperatureProbe {
 public:
  explicit TemperatureProbe(uint8_t pin)
      : pin(pin), oneWire(pin), sensors(&oneWire), lastGood(NAN) {}

  void begin() {
    pinMode(pin, INPUT_PULLUP);
    sensors.begin();
    sensors.setWaitForConversion(false);
    sensors.requestTemperatures();
  }

  /// Async request/read pattern: returns the value from the previous request, then
  /// kicks off the next conversion without blocking. The -127 (disconnected) and 85
  /// (conversion not complete) guards are dropped and the last good reading is kept,
  /// so a transient bad sample never overwrites a valid temperature.
  float read() {
    float t = sensors.getTempCByIndex(0);
    sensors.requestTemperatures();
    if (t != DEVICE_DISCONNECTED_C && t != 85.0f) lastGood = t;
    return lastGood;
  }

 private:
  uint8_t pin;
  OneWire oneWire;
  DallasTemperature sensors;
  float lastGood;
};
