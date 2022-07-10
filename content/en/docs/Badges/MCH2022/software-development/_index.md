---
title: "Software Development"
linkTitle: "Software Development"
nodateline: true
weight: 1
---



This is a shameless placeholder for the software development section

# Micropython

A Python interpreter is available for the badge. This should be the easiest way to
control the device and the most preferable mode to write apps for The Badge, especially if you are a beginner or don't want to spend a lot of time downloading toolchains and debugging drivers.

First, install the Python app from the Hatchery by going to `Hatchery -> ESP32 native binaryies -> Utility -> Python` and instal it either onto the flash or onto an SD card.

This badge contains a common ESP32 firmware platform shared with other badges, so to learn more about the general platform and its components, [start here](../../../esp32-platform-firmware/esp32-app-development/getting-started/first_egg/). In addition there is also a `mch22` module that offers a few badge-specific APIs.

While the above allows you to access the Python shell and install Python apps from the hatchery, here is how you upload custom apps to the badge over USB:

1. Download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip)
2. Write you Python code using the platfrom modules documented above
3. Use `python3 webusb_fat_push.py __init__.py /sdcard/apps/python/myapp/__init__.py`
4. Start you app in the Apps menu.

# Arduino

The ESP32 on the badge can be programmed using the Aduino IDE.

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) if you havn't already.
2. Install ESP32 support using [these instructions](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)
3. Install [PyUSB](https://pyusb.github.io/pyusb/) for Python 3 using pip or the package manager provided by your distro. On Debian you can run `sudo apt install python3-usb`
4. Download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip)

Now write your Arduino sketch as usual, by selecting the ESP32 wrover module.
But instead of uploading your sketch, use `Sketch > Export compiled binary` (ctrl+alt+s)

Now you need to plug in the badge, turn it on, and launch [webusb_push.py](https://github.com/badgeteam/mch2022-firmware-esp32/blob/master/tools/webusb_push.py) from the [ESP32-platform-firmware](https://github.com/badgeteam/ESP32-platform-firmware) repo with the path of the binary that Arduino generate in your sketch folder.

```sh
python path/to/webusb_push.py "my cool app" path/to/my_app.ino.esp32.bin --run
```

After a few seconds your app should be runnin on the badge.

#### Controling the display

The easiest way to control the display is by using the Adafruit ILI9341 library.
Go to `Tools > Manage Libraries...` and search for the Adafruit GFX library and the Adafruit ILI9341 library and install both.
Include them as follows

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

And now you can use regular GFX commands like so

```c++
tft.fillScreen(ILI9341_PURPLE);
tft.setCursor(0, 0);
tft.setTextColor(ILI9341_YELLOW);
tft.setTextSize(3);
tft.println("MCH2022");
```

#### Controlling the LEDs

The LEDs are controlled using the FastLED library, which can once again be installed from the library manager.

First define and include all the things.
```c++
#include <FastLED.h>

#define PIN_LED_DATA 5
#define PIN_LED_ENABLE 19
#define NUM_LEDS 5

CRGB leds[NUM_LEDS];
```

And then run the folowing setup code
```c++
FastLED.addLeds<SK6812, PIN_LED_DATA, GRB>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
FastLED.setBrightness(96);

// This has to be placed after SPI (LCD) has been initialized (Arduino wants to use this pin as SPI MISO...)
pinMode(PIN_LED_ENABLE, OUTPUT);
digitalWrite(PIN_LED_ENABLE, HIGH);
```

And you can now just set the LED colors as follows
```c++
        leds[i] = CRGB::Purple;
```
#### Reading the buttons

The buttons are controller by the RP2040, and can be read over I2C. Here is a simple example.

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

You can now trigger this when the home button is pressed like so

```c++
if (!digitalRead(PIN_RP2040_INT)) {
    if (read_inputs() & (1<<0)) {
    return_to_launcher();
    }
}
```

# FPGA development

The badge contains an ice40 FPGA that is connected to a PMOD connector, some RAM, and an RGB LED.
It can also control the display over a parallel bus, and has an USB UART link via the RP2040 and an SPI link to the ESP32.

As with all the other methods to program the badge, step one is to download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip).
There are two main tools to use here, `python3 webusb_fpga.py bitstream.bin` which will upload a bitstream directly into the FPGA, and `python3 webusb_fat_push.py bitsream.bin /sdcard/apps/ice40/myapp/bitstream.bin` which will make the bitstream available in the launcher.

The most easy way to install the tools needed to program the FPGA is [oss-cad-suite](https://github.com/YosysHQ/oss-cad-suite-build/releases). You can also build yosys, icestorm, and nextpnr from source, but whatever you do, don't use the highly outdated distro packages shipped with most Linux distros.

The main repository with templates and examples is [mch2022-firmware-ice40](https://github.com/badgeteam/mch2022-firmware-ice40). Running `make` in any of the project folders should produce a bitstream. In particular take note of the `cores` folder, which contains many useful cores for basic functionality.

The FPGA can kind of be used in two seperate modes.

## Standalone

When launching a bitstream from the launcher, the ESP32 hands over control of the display, and exposes an API to read buttons and files.

A basic example to read the buttons is found in [buttons.v](https://github.com/badgeteam/mch2022-firmware-ice40/blob/master/projects/Buttons/rtl/buttons.v)

A more elaborate example of a full-fledged RISC-V SoC with a wishbone bus and video output can be found in [riscv_doom](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/riscv_doom).
While the example is runing Doom, it is of course totally possible to change the RISC-V code, or add/modify peripherals on the wishbone bus.

## Peripheral mode

Both in the C++ and the Pyhon API, there is a convenient function to load a bitstream into the FPGA from your ESP32 program.
This allows using the FPGA as a peripheral to a larger ESP32 app.

A great way to get started with this is to use the [spi_skeleton](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/spi_skeleton) example, which exposes a wishbone bus to the ESP32 over SPI.

You could for example add an UART port on the PMOD by adding the following code, adjusting the top level ports and incrementing `WN`.

```
	// UART [2]
	// ----

	uart_wb #(
		.DIV_WIDTH(12),
		.DW(32)
	) uart_I (
		.uart_tx  (uart_tx),
		.uart_rx  (uart_rx),
		.wb_addr  (wb_addr[1:0]),
		.wb_rdata (wb_rdata[2]),
		.wb_we    (wb_we),
		.wb_wdata (wb_wdata),
		.wb_cyc   (wb_cyc[2]),
		.wb_ack   (wb_ack[2]),
		.clk      (clk),
		.rst      (rst)
	);

```

On the ESP32 you could then write the following Python script that loads a bitstream and writes to the newly added UART port.

```
import mch22
from fpga_wishbone import FPGAWB

# load bitstream from SD card onto the FPGA
with open("/sd/apps/ice40/myapp/bitstream.bin", "rb") as f:
    mch22.fpga_load(f.read())

# create a wishbone command buffer
c = FPGAWB()
# setup UART
# (30e6/9600)-2
c.queue_write(2, 4, 3123)
# queue writing a byte
c.queue_write(2, 0, 0xaa)
# queue reading a byte
c.queue_read(2, 0)
# execute the command queue
c.exec()
```