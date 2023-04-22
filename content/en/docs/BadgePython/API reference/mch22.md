---
title: "mch22"
nodateline: true
weight: 9999
---

{{% alert title="Warning" color="warning" %}}
This module is only available on the MCH2022 badge, only use this module if you plan to use hardware features specific to the MCH2022 badge.
{{% /alert %}}

## FPGA

The ICE40UP5K FPGA on the MCH2022 badge can be controlled using these APIs.

### Loading a bitstream

A bitstream can be loaded into the FPGA by calling `mch22.fpga_load(x)` with `x` being a bytes object containing the bitstream binary. Loading a bitstream automatically enables the FPGA.

### Disabling the FPGA

To disable the FPGA after a bitstream was loaded call `mch22.fpga_disable()`. Note that to enable the FPGA a bitstream has to be loaded in again.

### Communicating with the FPGA

The FPGA is connected to the ESP32 via an SPI bus. Communication over SPI can be done in full-duplex mode (sending while receiving) or in half-duplex mode (only sending or receiving).

The transmitting functions require a bytes object, the receiving functions return a bytes object.

| Function    | Direction      | Bus speed  |
| ----------- | -------------- | ---------- |
| transaction | Full-duplex    | 26.7MHz    |
| receive     | Read from FPGA | 40MHz      |
| send        | Write to FPGA  | 40MHz      |
| send_turbo  | Write to FPGA  | 40MHz      |

In case you get communication errors please check the timing constraints of your bitstream.

### LCD mode

To connect the LCD to the FPGA call `mch22.lcd_mode(True)`, to connect the LCD to the ESP32 call `mch22.lcd_mode(False)`. To send the contents of the framebuffer to the LCD call `display.flush(True)`, the `True` argument forces the flush to happen even though the contents of the framebuffer haven't changed.

## GPIO

You can set the direction of a GPIO pin using `mch22.set_gpio_dir(pin, direction)`, where pin is one of `mch22.SAO_IO0_PIN`, `mch22.SAO_IO1_PIN`, `mch22.PROTO_0_PIN` or `mch2022.PROTO_1_PIN` and `direction` is `False` for input or `True` for output.

Inputs can be read using `value = mch22.get_gpio_value(pin)` and outputs can be set using `mch22.set_gpio_value(pin, value)`.

## Deprecated functions

These functions have been moved to other, more generic APIs. Please use those APIs instead.

### Buttons
The `mch22` module exposes a direct interface to the button handler code via the `buttons` and `set_handler` functions. Please do not use these, use the [buttons](../buttons) API instead. Using these APIs directly can cause crashes to occur.

### Brightness control
Please use the [display](../display) API instead, brightness can be set using `display.brightness(x)` with `x` being a value from 0 to 255.
