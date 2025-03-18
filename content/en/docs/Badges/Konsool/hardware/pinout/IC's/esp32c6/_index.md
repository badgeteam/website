---
title: "ESP32C6 pinout"
linkTitle: "ESP32 C6"
nodateline: true
weight: -10
---

## ESP32 C6

| Name | No. | Type1 | Function                                                                                           |
| ---- | --- | ----- | -------------------------------------------------------------------------------------------------- |
| GND  | 1   | P     | Ground                                                                                             |
| 3V3  | 2   | P     | Power supply                                                                                       |
| EN   | 3   | I     | High: on, enables the chip. Low: off, the chip powers off. Note: Do not leave the EN pin floating. |
| IO4  | 4   | I/O/T | MTMS, GPIO4, LP_GPIO4, LP_UART_RXD, ADC1_CH4, FSPIHD                                               |
| IO5  | 5   | I/O/T | MTDI, GPIO5, LP_GPIO5, LP_UART_TXD, ADC1_CH5, FSPIWP                                               |
| IO6  | 6   | I/O/T | MTCK, GPIO6, LP_GPIO6, LP_I2C_SDA, ADC1_CH6, FSPICLK                                               |
| IO7  | 7   | I/O/T | MTDO, GPIO7, LP_GPIO7, LP_I2C_SCL, FSPID                                                           |
| IO0  | 8   | I/O/T | GPIO0, XTAL_32K_P, LP_GPIO0, LP_UART_DTRN, ADC1_CH0                                                |
| IO1  | 9   | I/O/T | GPIO1, XTAL_32K_N, LP_GPIO1, LP_UART_DSRN, ADC1_CH1                                                |
| IO8  | 10  | I/O/T | GPIO8                                                                                              |
| IO10 | 11  | I/O/T | GPIO10                                                                                             |
| IO11 | 12  | I/O/T | GPIO11                                                                                             |
| IO12 | 13  | I/O/T | GPIO12, USB_DIO13 14 I/O/T GPIO13, USB_D+                                                          |
| IO9  | 15  | I/O/T | GPIO9                                                                                              |
| IO18 | 16  | I/O/T | GPIO18, SDIO_CMD, FSPICS2                                                                          |
| IO19 | 17  | I/O/T | GPIO19, SDIO_CLK, FSPICS3                                                                          |
| IO20 | 18  | I/O/T | GPIO20, SDIO_DATA0, FSPICS4                                                                        |
| IO21 | 19  | I/O/T | GPIO21, SDIO_DATA1, FSPICS5                                                                        |
| IO22 | 20  | I/O/T | GPIO22, SDIO_DATA2                                                                                 |
| IO23 | 21  | I/O/T | GPIO23, SDIO_DATA3                                                                                 |
| NC   | 22  | —     | NC                                                                                                 |
| IO15 | 23  | I/O/T | GPIO15                                                                                             |
| RXD0 | 24  | I/O/T | U0RXD, GPIO17, FSPICS1                                                                             |
| TXD0 | 25  | I/O/T | U0TXD, GPIO16, FSPICS0                                                                             |
| IO3  | 26  | I/O/T | GPIO3, LP_GPIO3, LP_UART_CTSN, ADC1_CH3                                                            |
| IO2  | 27  | I/O/T | GPIO2, LP_GPIO2, LP_UART_RTSN, ADC1_CH2, FSPIQ                                                     |
| GND  | 28  | P     | Ground                                                                                             |
| EPAD | 29  | P     | Ground                                                                                             |
