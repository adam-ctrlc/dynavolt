#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>

class Lcd {
 public:
  Lcd(uint8_t sda, uint8_t scl, uint8_t cols, uint8_t rows)
      : sdaPin(sda), sclPin(scl), cols(cols), rows(rows), present_(false), status_(-1) {}

  /// Brings up the PCF8574 backpack over the custom I2C pins. hd44780 auto-detects
  /// the backpack address and register mapping, so begin() just starts the bus on the
  /// chosen pins and reports the driver status. A nonzero status (no device, or begin
  /// failed) leaves present() false and keeps every show() a safe no-op with no LCD
  /// wired.
  void begin() {
    Wire.begin(sdaPin, sclPin);

    int status = lcd.begin(cols, rows);
    status_ = status;
    present_ = (status == 0);

    if (!present_) {
      Serial.print("LCD begin failed, hd44780 status ");
      Serial.println(status);
      return;
    }

    lcd.backlight();
    Serial.println("LCD detected (hd44780 I2C).");

    lcd.setCursor(0, 0);
    lcd.print("VITAL");
  }

  bool present() const { return present_; }
  int status() const { return status_; }

  /// Overwrites both rows in place, padding each to cols with spaces instead of
  /// clearing, to keep the display from flickering between updates.
  void show(const String &line1, const String &line2) {
    if (!present_) return;

    String a = line1;
    String b = line2;
    if (a.length() > cols) a = a.substring(0, cols);
    if (b.length() > cols) b = b.substring(0, cols);
    while (a.length() < cols) a += ' ';
    while (b.length() < cols) b += ' ';

    lcd.setCursor(0, 0);
    lcd.print(a);
    if (rows > 1) {
      lcd.setCursor(0, 1);
      lcd.print(b);
    }
  }

  static String formatFloat(float value, int digits) {
    if (isnan(value)) return String("--");
    return String(value, digits);
  }

 private:
  uint8_t sdaPin;
  uint8_t sclPin;
  uint8_t cols;
  uint8_t rows;
  bool present_;
  int status_;
  hd44780_I2Cexp lcd;
};
