#include "main.h"
#include "test.h"

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
