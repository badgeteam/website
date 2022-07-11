
---
title: "Using Arduino to Develop Badge Apps"
linkTitle: "Arduino"
nodateline: true
weight: 0
---

# PLEASE BE AWARE THAT THE ARDUINO SDK IS NOT FULLY SUPPORTED!!
# YOU MAY RUN INTO SOME ISSUES

<!-- TODO provide links to alternatives -->

# Introduction to Arduino
The ESP32 on the badge can be programmed using the Aduino IDE.

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) if you haven't already.
2. Install ESP32 support using [these instructions](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)
3. Install [PyUSB](https://pyusb.github.io/pyusb/) for Python 3 using pip or the package manager provided by your distro. On Debian you can run `sudo apt install python3-usb`
4. Download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip)

Now write your Arduino sketch as usual, by selecting the ESP32 wrover module.
But instead of uploading your sketch, use `Sketch > Export compiled binary` (ctrl+alt+s)

Now you need to plug in the badge, turn it on, and launch `webusb_push.py` from
the [mch2022-tools](https://github.com/badgeteam/mch2022-tools) repo with the
path of the binary that Arduino generate in your sketch folder.

```sh
python path/to/webusb_push.py "my cool app" path/to/my_app.ino.esp32.bin --run
```

After a few seconds your app should be running on the badge.

#### Controlling the display

The easiest way to control the display is by using the Adafruit ILI9341
library.  Go to `Tools > Manage Libraries...` and search for the Adafruit GFX
library and the Adafruit ILI9341 library and install both.  Include them as
follows

```c++
#include "Adafruit_GFX.h"
#include "Adafruit_ILI9341.h"

#define PIN_LCD_CS 32
#define PIN_LCD_DC 33
#define PIN_LCD_RST 25

Adafruit_ILI9341 tft = Adafruit_ILI9341(PIN_LCD_CS, PIN_LCD_DC, PIN_LCD_RST);
```

And then add the following lines to the `setup` function.

```c++
tft.begin(LCD_FREQ);
tft.setRotation(1);
```

And now you can use regular GFX commands like so:

```c++
tft.fillScreen(ILI9341_PURPLE);
tft.setCursor(0, 0);
tft.setTextColor(ILI9341_YELLOW);
tft.setTextSize(3);
tft.println("MCH2022");
```

#### Controlling the LEDs

The LEDs are controlled using the FastLED library, which can once again be
installed from the library manager.

First define and include all the things.
```c++
#include <FastLED.h>

#define PIN_LED_DATA 5
#define PIN_LED_ENABLE 19
#define NUM_LEDS 5

CRGB leds[NUM_LEDS];
```

And then run the following setup code:

```c++
FastLED.addLeds<SK6812, PIN_LED_DATA, GRB>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
FastLED.setBrightness(96);

// This has to be placed after SPI (LCD) has been initialized (Arduino wants to use this pin as SPI MISO...)
pinMode(PIN_LED_ENABLE, OUTPUT);
digitalWrite(PIN_LED_ENABLE, HIGH);
```

And you can now just set the LED colors as follows:

```c++
        leds[i] = CRGB::Purple;
```

#### Reading the buttons

The buttons are controller by the RP2040, and can be read over I2C. Here is a
simple example.

```c++
#include <Wire.h>

#define PIN_I2C_SDA 22
#define PIN_I2C_SCL 21
#define PIN_RP2040_INT 34

#define RP2040_ADDR 0x17  // RP2040 co-processor
#define BNO055_ADDR 0x28  // BNO055 position sensor
#define BME680_ADDR 0x77  // BME680 environmental sensor

#define RP2040_REG_LCD_BACKLIGHT 4
#define RP2040_REG_INPUT1 0x06
#define RP2040_REG_INPUT2 0x07

void set_backlight(uint8_t brightness) {
    Wire.beginTransmission(RP2040_ADDR);
    Wire.write(RP2040_REG_LCD_BACKLIGHT);
    Wire.write(brightness);
    Wire.endTransmission();
}

uint16_t read_inputs() {
    Wire.beginTransmission(RP2040_ADDR);
    Wire.write(RP2040_REG_INPUT1);
    Wire.endTransmission();
    Wire.requestFrom(RP2040_ADDR, 4);
    uint16_t input = Wire.read() | (Wire.read()<<8);
    uint16_t interrupt = Wire.read() | (Wire.read()<<8);
    return interrupt;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  pinMode(PIN_RP2040_INT, INPUT);
  read_inputs();
}

uint8_t brightness = 0;
void loop() {
    if (!digitalRead(PIN_RP2040_INT)) {
      Serial.println(read_inputs(), BIN);
    }
    set_backlight(brightness);
    brightness++;
    //delay(500);
}
```

A full list of all the registers can be found [here](https://github.com/badgeteam/esp32-component-mch2022-rp2040/blob/master/include/rp2040.h)

#### Reset the ESP32

Restting the ESP32 can be done using the following snippet.

```c++
#include <esp_system.h>
#include "soc/rtc.h"
#include "soc/rtc_cntl_reg.h"

void return_to_launcher() {
  REG_WRITE(RTC_CNTL_STORE0_REG, 0);
  esp_restart();
}
```

You can now trigger this when the home button is pressed like so:

```c++
if (!digitalRead(PIN_RP2040_INT)) {
    if (read_inputs() & (1<<0)) {
    return_to_launcher();
    }
}
```
