#pragma once

#include <HardwareSerial.h>
#include <PZEM004Tv30.h>
#include <DHT.h>

#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define DHT_PIN 4
#define RELAY_PIN 5

#define RELAY_ON LOW
#define RELAY_OFF HIGH

#define VA_LIMIT 900.0f
#define VA_CLEAR 850.0f
#define TEMP_LIMIT 40.0f
#define TEMP_CLEAR 37.0f

#define SAMPLE_INTERVAL_MS 1000
#define TRIP_CONFIRM_MS 3000
#define RECLOSE_LOCKOUT_MS 30000

extern bool relayTestMode;

enum Status { STATUS_NORMAL, STATUS_WARNING, STATUS_OVERLOAD };

PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
DHT dht(DHT_PIN, DHT22);

Status status = STATUS_NORMAL;
bool relayClosed = true;
unsigned long lastSample = 0;
unsigned long abnormalSince = 0;
unsigned long trippedAt = 0;

float voltage = NAN;
float current = NAN;
float power = NAN;
float energy = NAN;
float frequency = NAN;
float powerFactor = NAN;
float apparentPower = NAN;
float temperature = NAN;
float humidity = NAN;

void setRelay(bool closed) {
  relayClosed = closed;
  digitalWrite(RELAY_PIN, closed ? RELAY_ON : RELAY_OFF);
}

bool readSensors() {
  voltage = pzem.voltage();
  current = pzem.current();
  power = pzem.power();
  energy = pzem.energy();
  frequency = pzem.frequency();
  powerFactor = pzem.pf();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity = h;

  if (isnan(voltage) || isnan(current)) {
    apparentPower = NAN;
    return false;
  }

  apparentPower = voltage * current;
  return true;
}

bool overLimit() {
  return (!isnan(apparentPower) && apparentPower >= VA_LIMIT) ||
         (!isnan(temperature) && temperature >= TEMP_LIMIT);
}

bool belowClear() {
  bool vaOk = isnan(apparentPower) || apparentPower <= VA_CLEAR;
  bool tempOk = isnan(temperature) || temperature <= TEMP_CLEAR;
  return vaOk && tempOk;
}

void updateStatus(unsigned long now) {
  switch (status) {
    case STATUS_NORMAL:
      if (overLimit()) {
        status = STATUS_WARNING;
        abnormalSince = now;
      }
      break;

    case STATUS_WARNING:
      if (!overLimit()) {
        status = STATUS_NORMAL;
        abnormalSince = 0;
      } else if (now - abnormalSince >= TRIP_CONFIRM_MS) {
        status = STATUS_OVERLOAD;
        trippedAt = now;
        setRelay(false);
      }
      break;

    case STATUS_OVERLOAD:
      if (belowClear() && now - trippedAt >= RECLOSE_LOCKOUT_MS) {
        status = STATUS_NORMAL;
        abnormalSince = 0;
        setRelay(true);
      }
      break;
  }
}

const char *statusName() {
  switch (status) {
    case STATUS_OVERLOAD: return "OVERLOAD";
    case STATUS_WARNING: return "WARNING";
    default: return "NORMAL";
  }
}

void publish(bool sensorsOk) {
  Serial.print("{\"status\":\"");
  Serial.print(statusName());
  Serial.print("\",\"relay\":\"");
  Serial.print(relayClosed ? "CLOSED" : "OPEN");
  Serial.print("\",\"test_mode\":");
  Serial.print(relayTestMode ? "true" : "false");
  Serial.print(",\"sensor_ok\":");
  Serial.print(sensorsOk ? "true" : "false");
  Serial.print(",\"voltage_v\":");
  Serial.print(voltage, 1);
  Serial.print(",\"current_a\":");
  Serial.print(current, 3);
  Serial.print(",\"power_w\":");
  Serial.print(power, 1);
  Serial.print(",\"apparent_va\":");
  Serial.print(apparentPower, 1);
  Serial.print(",\"pf\":");
  Serial.print(powerFactor, 2);
  Serial.print(",\"frequency_hz\":");
  Serial.print(frequency, 1);
  Serial.print(",\"energy_kwh\":");
  Serial.print(energy, 3);
  Serial.print(",\"temperature_c\":");
  Serial.print(temperature, 1);
  Serial.print(",\"humidity_pct\":");
  Serial.print(humidity, 1);
  Serial.println("}");
}

void hardwareSetup() {
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(true);

  Serial2.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  dht.begin();
}

bool sampleDue(unsigned long now) {
  if (now - lastSample < SAMPLE_INTERVAL_MS) return false;
  lastSample = now;
  return true;
}

void mainLoop(unsigned long now) {
  if (!sampleDue(now)) return;

  bool sensorsOk = readSensors();
  updateStatus(now);
  publish(sensorsOk);
}
