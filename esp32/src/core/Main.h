#pragma once

#include <Arduino.h>
#include <WiFi.h>

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
      backend.postHeartbeat();
    }
  }

 private:
  Lcd lcd;
  BackendClient backend;
  WifiLink net;
  EnergyMeter meter;
  TemperatureProbe probe;
  Relay relay;
  Monitor monitor;
  unsigned long lastPost = 0;
  unsigned long lastHeartbeat = 0;
};
