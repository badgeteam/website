---
title: "ESP32-P4 pinout"
linkTitle: "ESP32-P4"
nodateline: true
weight: -10
---

## ESP32-P4 (U8)

### LDO

| Pin number | Pin name        | Pin net                           |
|------------|-----------------|-----------------------------------|
| 71         | VFB/VO1         | VFLASH                            |
| 72         | VFB/VO2         | VPSRAM                            |
| 73         | VFB/VO3         | VMIPI                             |
| 74         | VFB/VO4         | VSDCARD                           |

### GPIO

| GPIO     | Direction / Bus          | Function                                             | Note                                                                                                                    |
|----------|--------------------------|------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| 0        | User controlled          | Internal Add-On: E2                                  |                                                                                                                         |
| 1        | Output                   | Camera GPIO 1 / LED enable                           |                                                                                                                         |
| 2        | User controlled          | JTAG: MTCK, PMOD: IO                                 | Can be used as JTAG interface or as generic GPIO on the external Add-On connector                                       |
| 3        | User controlled          | JTAG: MTDI, PMOD: IO                                 | Can be used as JTAG interface or as generic GPIO on the external Add-On connector                                       |
| 4        | User controlled          | JTAG: MTMS, PMOD: IO                                 | Can be used as JTAG interface or as generic GPIO on the external Add-On connector                                       |
| 5        | User controlled          | JTAG: MTDO, PMOD: IO                                 | Can be used as JTAG interface or as generic GPIO on the external Add-On connector                                       |
| 6        | Input                    | Interrupt from CH32V203 coprocessor                  | Read from the coprocessor I2C device to clear the interrupt condition                                                   |
| 7        | Input / User controlled  | Interrupt from internal Add-On board                 | Can also be used as GPIO, depending on the needs of the internal Add-On board                                           |
| 8        | Input                    | Interrupt from ESP32-C6 radio                        | Controlled by ESP-HOSTED component                                                                                      |
| 9        | I2C bus SDA              | Internal I2C bus data                                | Internal I2C bus connecting the ESP32-P4 to the ESP32-C6, CH32V203 coprocessor, Bosch sensors and internal Add-On board |
| 10       | I2C bus SCL              | Internal I2C bus clock                               | Internal I2C bus connecting the ESP32-P4 to the ESP32-C6, CH32V203 coprocessor, Bosch sensors and internal Add-On board |
| 11       | Input                    | LCD TE (Tearing effect)                              | Synchronization pin for frame sync, used to avoid tearing                                                               |
| 12       | User controlled          | SAO: I2C SDA, PMOD: IO                               | Can be used as I2C interface for SAO Add-On boards or as generic GPIO on the external Add-On connector                  |
| 13       | User controlled          | SAO: I2C SCL, PMOD: IO                               | Can be used as I2C interface for SAO Add-On boards or as generic GPIO on the external Add-On connector                  |
| 14       | Output                   | LCD reset                                            | Hardware reset for the LCD controller                                                                                   |
| 15       | User controlled          | SAO: IO1, PMOD: IO                                   | Can be used as generic GPIO for SAO Add-On boards or as generic GPIO on the external Add-On connector                   |
| 16       | SDIO 2.0                 | SDIO bus for ESP32-C6: CMD                           | Controlled by ESP-HOSTED component                                                                                      |
| 17       | SDIO 2.0                 | SDIO bus for ESP32-C6: CLK                           | Controlled by ESP-HOSTED component                                                                                      |
| 18       | SDIO 2.0                 | SDIO bus for ESP32-C6: D0                            | Controlled by ESP-HOSTED component                                                                                      |
| 19       | SDIO 2.0                 | SDIO bus for ESP32-C6: D1                            | Controlled by ESP-HOSTED component                                                                                      |
| 20       | SDIO 2.0                 | SDIO bus for ESP32-C6: D2                            | Controlled by ESP-HOSTED component                                                                                      |
| 21       | SDIO 2.0                 | SDIO bus for ESP32-C6: D3                            | Controlled by ESP-HOSTED component                                                                                      |
| 22       | Bidirectional            | CH32V203 programming interface: SWDIO                | For coprocessor firmware updates                                                                                        |
| 23       | Output                   | CH32V203 programming interface: SWCLK                | For coprocessor firmware updates                                                                                        |
| 24       | USB                      | USB DN, port 1 on USB hub (USB-C port)               |                                                                                                                         |
| 25       | USB                      | USB DP, port 1 on USB hub (USB-C port)               |                                                                                                                         |
| 26       | User controlled          | Internal Add-On: USB DN or generic GPIO              |                                                                                                                         |
| 27       | User controlled          | Internal Add-On: USB DP or generic GPIO              |                                                                                                                         |
| 28       | I2S                      | I2S: data                                            |                                                                                                                         |
| 29       | I2S                      | I2S: sample clock                                    |                                                                                                                         |
| 30       | I2S                      | I2S: master clock                                    |                                                                                                                         |
| 31       | I2S                      | I2S: lr clock                                        |                                                                                                                         |
| 32       | I3C                      | I2C/I3C QWIIC port: SDA                              |                                                                                                                         |
| 33       | I3C                      | I2C/I3C QWIIC port: SCL                              |                                                                                                                         |
| 34       | User controlled          | SAO: IO2, PMOD: IO                                   |                                                                                                                         |
| 35       | User controlled          | Internal Add-On: E1                                  |                                                                                                                         |
| 36       | User controlled          | Internal Add-On: E0                                  |                                                                                                                         |
| 37       | Output / User controlled | Debug UART transmit                                  |                                                                                                                         |
| 38       | Input / User controlled  | Debug UART receive                                   |                                                                                                                         |
| 39       | SDIO 3.0                 | SD card slot: D0                                     |                                                                                                                         |
| 40       | SDIO 3.0                 | SD card slot: D1                                     |                                                                                                                         |
| 41       | SDIO 3.0                 | SD card slot: D2                                     |                                                                                                                         |
| 42       | SDIO 3.0                 | SD card slot: D3                                     |                                                                                                                         |
| 43       | SDIO 3.0                 | SD card slot: CLK                                    |                                                                                                                         |
| 44       | SDIO 3.0                 | SD card slot: CMD                                    |                                                                                                                         |
| 45       | User controlled          | Internal Add-On: E3                                  |                                                                                                                         |
| 46       | User controlled          | Internal Add-On: E6                                  |                                                                                                                         |
| 47       | User controlled          | Internal Add-On: E5                                  |                                                                                                                         |
| 48       | User controlled          | Internal Add-On: E4                                  |                                                                                                                         |
| 49       | User controlled          | Internal Add-On: E7                                  |                                                                                                                         |
| 50       | User controlled          | Internal Add-On: E8                                  |                                                                                                                         |
| 51       | User controlled          | Internal Add-On: E9                                  |                                                                                                                         |
| 52       | User controlled          | Internal Add-On: E10                                 |                                                                                                                         |
| 53       | User controlled          | Internal Add-On: E11                                 |                                                                                                                         |
| 54       | User controlled          | Internal Add-On: E12                                 |                                                                                                                         |

