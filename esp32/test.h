#pragma once

#include "main.h"

#define RELAY_TEST_INTERVAL_MS 5000

unsigned long lastToggle = 0;

void testLoop(unsigned long now) {
  if (now - lastToggle >= RELAY_TEST_INTERVAL_MS) {
    lastToggle = now;
    setRelay(!relayClosed);
  }

  if (!sampleDue(now)) return;

  bool sensorsOk = readSensors();
  publish(sensorsOk);
}
