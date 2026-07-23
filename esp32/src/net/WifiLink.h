#pragma once

#include <Arduino.h>
#include <WiFi.h>

#include "../hardware/Lcd.h"
#include "../../secrets.h"

#define WIFI_ATTEMPT_TIMEOUT_MS 15000

class WifiLink {
 public:
  explicit WifiLink(Lcd &lcd) : lcd(lcd) {}

  void connect() {
    if (WiFi.status() == WL_CONNECTED) return;

    WiFi.mode(WIFI_STA);
    lcd.show("WiFi connecting", WIFI_SSID);
    Serial.print("WiFi connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_ATTEMPT_TIMEOUT_MS) {
      delay(500);
      Serial.print('.');
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected, IP ");
      Serial.println(WiFi.localIP());
      lcd.show("WiFi: " WIFI_SSID, WiFi.localIP().toString());
    } else {
      Serial.println("WiFi connect failed.");
      lcd.show("No WiFi", "check the network");
    }
  }

 private:
  Lcd &lcd;
};
