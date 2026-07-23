// 1 = real firmware (src/core/Main.h): relay on, reads temp + PZEM, posts to the app.
// 0 = run the TEST_MODE picked below instead.
#define REAL_MODE 1

#define TEST_DS18B20 1
#define TEST_NET 2
#define TEST_LCD 3
#define TEST_PZEM 4
#define TEST_MODE TEST_NET

#if REAL_MODE

#include "src/core/Main.h"
Main runner;

#else

#if TEST_MODE == TEST_DS18B20
#include "src/tests/Ds18b20Test.h"
Ds18b20Test runner;
#elif TEST_MODE == TEST_LCD
#include "src/tests/LcdTest.h"
LcdTest runner;
#elif TEST_MODE == TEST_PZEM
#include "src/tests/PzemTest.h"
PzemTest runner;
#else
#include "src/tests/NetTest.h"
NetTest runner;
#endif

#endif

void setup() {
  runner.begin();
}

void loop() {
  runner.loop();
}
