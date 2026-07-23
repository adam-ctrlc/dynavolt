#pragma once

#include <Arduino.h>

class Relay {
 public:
  Relay(uint8_t pin, uint8_t onLevel, uint8_t offLevel)
      : pin(pin), onLevel(onLevel), offLevel(offLevel), closed_(true) {}

  void begin() {
    pinMode(pin, OUTPUT);
    set(true);
  }

  void set(bool closed) {
    closed_ = closed;
    digitalWrite(pin, closed ? onLevel : offLevel);
  }

  bool isClosed() const { return closed_; }

 private:
  uint8_t pin;
  uint8_t onLevel;
  uint8_t offLevel;
  bool closed_;
};
