#define MODE_DS18B20_TEST 1
#define MODE_NET_TEST 2
#define MODE_MAIN 3

#define ACTIVE_MODE MODE_NET_TEST

#if ACTIVE_MODE == MODE_DS18B20_TEST

#include "tests/ds18b20_test.h"

void setup() {
  ds18b20TestSetup();
}

void loop() {
  ds18b20TestLoop();
}

#elif ACTIVE_MODE == MODE_NET_TEST

#include "tests/net_test.h"

void setup() {
  netTestSetup();
}

void loop() {
  netTestLoop();
}

#else

#include "functions/main.h"
#include "tests/test.h"

bool relayTestMode = true;

void setup() {
  Serial.begin(115200);
  hardwareSetup();
}

void loop() {
  unsigned long now = millis();

  if (relayTestMode) {
    testLoop(now);
  } else {
    mainLoop(now);
  }
}

#endif
