#pragma once

#include <Arduino.h>
#include <HardwareSerial.h>
#include <PZEM004Tv30.h>

class EnergyMeter {
 public:
  struct Reading {
    float voltage;
    float current;
    float power;
    float energy;
    float frequency;
    float powerFactor;
  };

  EnergyMeter(HardwareSerial &serial, uint8_t rx, uint8_t tx)
      : serial(serial), rxPin(rx), txPin(tx), pzem(serial, rx, tx) {}

  void begin() {
    serial.begin(9600, SERIAL_8N1, rxPin, txPin);
  }

  Reading read() {
    Reading r;
    r.voltage = pzem.voltage();
    r.current = pzem.current();
    r.power = pzem.power();
    r.energy = pzem.energy();
    r.frequency = pzem.frequency();
    r.powerFactor = pzem.pf();
    return r;
  }

 private:
  HardwareSerial &serial;
  uint8_t rxPin;
  uint8_t txPin;
  PZEM004Tv30 pzem;
};
