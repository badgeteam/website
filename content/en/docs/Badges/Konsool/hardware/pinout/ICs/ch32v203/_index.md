---
title: "CH32V203 pinout"
linkTitle: "CH32V203"
nodateline: true
weight: -10
---

## CH32V203

| Pin Number | Pin Name  | Net Name               | Direction     | Notes                                   |
| ---------- | --------- | ---------------------- | ------------- | --------------------------------------- |
| 1          | VBAT      | VBAT                   | Power         | Regulated 2.5V supply                   |
| 2          | PC13      | POWER_ON_PULSE         | Output        | Emit pulse to wake up badge             |
| 3          | PC14      | XTAL                   | Input         | Crystal Oscillator                      |
| 4          | PC15      | XTAL                   | Input         | Crystal Oscillator                      |
| 5          | PD0       | AMP_EN                 | Output        | Enable audio speaker amplifier          |
| 6          | PD1       | USB_ENABLE             | Output        | Enable to USB-A OTG port                |
| 7          | NRST      | NRST                   | Input         | 3V3                                     |
| 8          | VSSA      | VSSA                   | Power         | Analog Ground                           |
| 9          | VDDA      | VDDA                   | Power         | Analog Power                            |
| 10         | PA0       | INT                    | Output        | Interrupt line to ESP32-P4              |
| 11         | PA1       | KB_ROW5                | Output        | Keyboard IO                             |
| 12         | PA2       | KB_ROW8                | Output        | Keyboard IO                             |
| 13         | PA3       | KB_ROW4                | Output        | Keyboard IO                             |
| 14         | PA4       | KB_ROW3                | Output        | Keyboard IO                             |
| 15         | PA5       | KB_ROW7                | Output        | Keyboard IO                             |
| 16         | PA6       | KB_ROW6                | Output        | Keyboard IO                             |
| 17         | PA7       | KB_COL3                | Input         | Keyboard IO                             |
| 18         | PB0       | KB_COL7                | Input         | Keyboard IO                             |
| 19         | PB1       | KB_COL2                | Input         | Keyboard IO                             |
| 20         | PB2/BOOT1 | KB_COL6                | Input         | Keyboard IO                             |
| 21         | PB10      | PM_SCL                 | Output        | I2C Clock PMIC (Power controller)       |
| 22         | PB11      | PM_SDA                 | Bidirectional | I2C Data PMIC                           |
| 23         | VSS1      | GND                    | Power         | Ground                                  |
| 24         | VDDIO1    | +3.3V                  | Power         | Power Supply                            |
| 25         | PB12      | KB_COL1                | Input         | Keyboard IO                             |
| 26         | PB13      | KB_COL5                | Input         | Keyboard IO                             |
| 27         | PB14      | KB_COL0                | Input         | Keyboard IO                             |
| 28         | PB15      | KB_COL4                | Input         | Keyboard IO                             |
| 29         | PA8       | KB_ROW0                | Output        | Keyboard IO                             |
| 30         | PA9       | KB_ROW1                | Output        | Keyboard IO                             |
| 31         | PA10      | KB_ROW2                | Output        | Keyboard IO                             |
| 32         | PA11      | LED_DATA               | Output        | Serial data to SK6805 LEDs              |
| 33         | PA12      | POWER_BTN              | Input         | Power button input (low when pressed)   |
| 34         | PA13      | SWDIO                  | Bidirectional | Debug Interface CH32V203                |
| 35         | VSS2      | GND                    | Power         | Ground                                  |
| 36         | VDD2      | +3.3V                  | Power         | Power Supply                            |
| 37         | PA14      | SWCLK                  | Output        | Debug Clock                             |
| 38         | PA15      | SD_DET                 | Input         | SD card detect                          |
| 39         | PB3       | KEYBOARD_BL            | Output        | Enable backlight Keyboard               |
| 40         | PB4       | DISPLAY_BL             | Output        | Enable backlight display                |
| 41         | PB5       | HP_DET                 | Input         | Head phone detect                       |
| 42         | PB6       | SCL                    | input         | I2C Clock shared bus                    |
| 43         | PB7       | SDA                    | Bidirectional | I2C Data shared bus                     |
| 44         | BOOT0     | DCAM_IO0               | Output        | Camera module power enable (if present) |
| 45         | PB8       | RADIO_ENABLE / CAM_IO0 | Output        | Enable C6 and MIPI_CSI camera IO 0      |
| 46         | PB9       | PM_INT                 | Input         | Interrupt signal PMIC                   |
| 47         | VSS3      | GND                    | Power         | GND                                     |
| 48         | VDDIO3    | +3.3V                  | Power         | Power                                   |
