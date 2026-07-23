#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "../config/Pins.h"
#include "../hardware/Lcd.h"
#include "../net/BackendClient.h"
#include "../net/WifiLink.h"

#define POST_INTERVAL_MS 10000
#define HEARTBEAT_INTERVAL_MS 30000

class NetTest {
 public:
  NetTest()
      : lcd(LCD_SDA_PIN, LCD_SCL_PIN, LCD_COLS, LCD_ROWS),
        backend(),
        net(lcd),
        oneWire(DS18B20_PIN),
        sensors(&oneWire) {}

  void begin() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println("Backend connectivity test");

    pinMode(DS18B20_PIN, INPUT_PULLUP);
    sensors.begin();
    lcd.begin();
    net.connect();
  }

  void loop() {
    if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = millis();
      net.connect();
      backend.postHeartbeat();
    }

    if (millis() - lastPost < POST_INTERVAL_MS) return;
    lastPost = millis();

    sensors.requestTemperatures();
    float t = sensors.getTempCByIndex(0);

    if (t == DEVICE_DISCONNECTED_C || t == 85.0f) {
      Serial.println("temperature read failed, skipping post.");
      return;
    }

    Serial.print("temperature: ");
    Serial.print(t, 2);
    Serial.println(" C");

    net.connect();
    bool ok = backend.postReading(NAN, NAN, t, NAN, NAN, NAN, NAN);

    String line1 = "T: " + String(t, 2) + " C";
    String line2;
    if (WiFi.status() == WL_CONNECTED) {
      line2 = ok ? "Sent " + WiFi.localIP().toString() : String("Send failed");
    } else {
      line2 = "No WiFi";
    }
    lcd.show(line1, line2);
  }

 private:
  Lcd lcd;
  BackendClient backend;
  WifiLink net;
  OneWire oneWire;
  DallasTemperature sensors;
  unsigned long lastPost = 0;
  unsigned long lastHeartbeat = 0;
};
