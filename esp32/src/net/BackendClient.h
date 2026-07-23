#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include "../../secrets.h"
#include "../config/Device.h"

class BackendClient {
 public:
  BackendClient() = default;

  void postHeartbeat() {
    if (WiFi.status() != WL_CONNECTED) return;

    String body = "{";
    body += "\"deviceId\":\"";
    body += DEVICE_ID;
    body += "\",\"firmware\":\"";
    body += FIRMWARE_VERSION;
    body += "\",\"ssid\":\"";
    body += WiFi.SSID();
    body += "\",\"ipAddress\":\"";
    body += WiFi.localIP().toString();
    body += "\",\"signalDbm\":";
    body += String((int)WiFi.RSSI());
    body += ",\"uptimeSeconds\":";
    body += String((unsigned long)(millis() / 1000));
    body += "}";

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.begin(client, String(BACKEND_URL) + "/api/v1/device/heartbeat");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);

    int code = http.POST(body);
    Serial.print("POST /heartbeat -> ");
    Serial.println(code);
    http.end();
  }

  bool postReading(float voltage, float current, float temperature,
                   float power, float pf, float frequency, float energy) {
    if (WiFi.status() != WL_CONNECTED) return false;

    String body = "{";
    bool first = true;
    appendField(body, first, "voltageV", voltage, 1);
    appendField(body, first, "currentA", current, 3);
    appendField(body, first, "temperatureC", temperature, 2);
    appendField(body, first, "powerW", power, 1);
    appendField(body, first, "powerFactor", pf, 2);
    appendField(body, first, "frequencyHz", frequency, 1);
    appendField(body, first, "energyKwh", energy, 3);
    body += "}";

    if (first) {
      Serial.println("no readings to send, skipping post.");
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.begin(client, String(BACKEND_URL) + "/api/v1/readings");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);

    int code = http.POST(body);
    Serial.print("POST /readings -> ");
    Serial.println(code);
    if (code > 0) {
      Serial.println(http.getString());
    } else {
      Serial.println(http.errorToString(code));
    }
    http.end();

    return code >= 200 && code < 300;
  }

 private:
  static void appendField(String &body, bool &first, const char *key,
                          float value, int digits) {
    if (isnan(value)) return;
    if (!first) body += ",";
    body += "\"";
    body += key;
    body += "\":";
    body += String(value, digits);
    first = false;
  }
};
