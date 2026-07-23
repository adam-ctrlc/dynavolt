#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>

#include "../config/Pins.h"
#include "Monitor.h"
#include "../hardware/Lcd.h"
#include "../hardware/EnergyMeter.h"
#include "../hardware/TemperatureProbe.h"
#include "../hardware/Relay.h"
#include "../net/BackendClient.h"
#include "../net/WifiLink.h"

#define POST_INTERVAL_MS 10000
#define HEARTBEAT_INTERVAL_MS 30000

class Main {
 public:
  Main()
      : lcd(LCD_SDA_PIN, LCD_SCL_PIN, LCD_COLS, LCD_ROWS),
        backend(),
        net(lcd),
        meter(Serial2, PZEM_RX_PIN, PZEM_TX_PIN),
        probe(DS18B20_PIN),
        relay(RELAY_PIN, RELAY_ON, RELAY_OFF),
        monitor(meter, probe, relay, lcd) {}

  void begin() {
    Serial.begin(115200);
    monitor.begin();

    // Adopt the last thresholds seen so a reboot keeps the operator's values instead
    // of falling back to the compiled defaults until the first heartbeat lands.
    prefs.begin("vital", false);
    monitor.setThresholds(prefs.getFloat("loadVa", 900.0f),
                          prefs.getFloat("tempC", 40.0f));

    net.connect();
  }

  void loop() {
    unsigned long now = millis();

    monitor.loop(now);

    if (now - lastPost >= POST_INTERVAL_MS) {
      lastPost = now;
      if (WiFi.status() == WL_CONNECTED) {
        Monitor::Snapshot s = monitor.snapshot();
        backend.postReading(s.voltage, s.current, s.temperature, s.power,
                            s.powerFactor, s.frequency, s.energy);
      }
    }

    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = now;
      net.connect();
      applyThresholds(backend.postHeartbeat());
    }
  }

 private:
  // Adopts thresholds from a heartbeat, but only when they are valid and actually
  // changed, so unchanged heartbeats never wear the flash. Persisting them means an
  // edit made while the board was offline sticks once it reconnects and reboots.
  void applyThresholds(const BackendClient::HeartbeatResult &ack) {
    if (!ack.ok) return;

    float va = ack.loadThresholdVa;
    float temp = ack.tempThresholdC;
    if (isnan(va) || isnan(temp) || va <= 0.0f || temp <= 0.0f) return;

    if (fabs(va - monitor.loadThreshold()) < 0.05f &&
        fabs(temp - monitor.tempThreshold()) < 0.05f) {
      return;
    }

    monitor.setThresholds(va, temp);
    prefs.putFloat("loadVa", va);
    prefs.putFloat("tempC", temp);

    Serial.print("thresholds updated -> VA:");
    Serial.print(va, 0);
    Serial.print(" TEMP:");
    Serial.println(temp, 0);
  }

  Lcd lcd;
  BackendClient backend;
  WifiLink net;
  EnergyMeter meter;
  TemperatureProbe probe;
  Relay relay;
  Monitor monitor;
  Preferences prefs;
  unsigned long lastPost = 0;
  unsigned long lastHeartbeat = 0;
};
