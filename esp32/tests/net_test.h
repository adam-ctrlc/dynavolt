#pragma once

#include <OneWire.h>
#include <DallasTemperature.h>

#include "../functions/net.h"

#define DS18B20_PIN 32
#define POST_INTERVAL_MS 10000
#define CONFIG_SYNC_MS 60000

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);

unsigned long lastPost = 0;
unsigned long lastSync = 0;

void netTestSetup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("Backend connectivity test");

  pinMode(DS18B20_PIN, INPUT_PULLUP);
  sensors.begin();
  netConnect();
}

void netTestLoop() {
  if (millis() - lastSync >= CONFIG_SYNC_MS) {
    lastSync = millis();
    syncWifiConfig();
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

  postReading(NAN, NAN, t, NAN, NAN, NAN, NAN, NAN);
}
