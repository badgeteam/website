---
title: "Board Support Package"
linkTitle: "Board support Package"
nodateline: true
weight: 2
---

Most of the board's peripherals (RP2040 USB and keyboard coprocessor,
 ICE40 FPGA, ILI9341 LCD controller, BNO055 accelerometer, BME680 air
 sensor) are initialized and maintained by the board support package.
 It does not implement each peripheral's functions, but it provides 
 initialization functions and accessors to the peripheral instances.
 The BSP is a separate ESP-IDF component that is supposed to be cloned
 as a [git submodule](https://github.com/badgeteam/esp32-component-mch2022-bsp) within your project.

At start of your code:

```
#include "hardware.h"

...

esp_err_t err = bsp_init();
```

There are additional initialization functions for individual peripherals
(`bsp_rp2040_init() ,bsp_ice40_init(), bsp_bno055_init(), bsp_bme680_init()`).
Call them prior to use if you intend to use the specific component. The
ILI9341 display will always be initialized during startup and therefore
does not require separate initialization call. 

After initialization, you can use the respective instance accessor
functions to obtain the peripheral's instance, e.g.
`get_ili9341(), get_rp2040(), get_ice40(), get_bno055(), get_bme680()`.
See each function's documentation in `hardware.h` in the component.

In addition, the BSP package gives you defines to the ESP32 pinout. See
`mch2022_badge.h`.
