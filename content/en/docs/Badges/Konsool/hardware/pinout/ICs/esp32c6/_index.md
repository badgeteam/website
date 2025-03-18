---
title ESP32C6 pinout
linkTitle ESP32 C6
nodateline true
weight -10
---

## ESP32 C6

| Name | No. | Type1 | Function                                                                                        |
| ---- | --- | ----- | ----------------------------------------------------------------------------------------------- |
| GND  | 1   | P     | Ground                                                                                          |
| 3V3  | 2   | P     | Power supply                                                                                    |
| EN   | 3   | I     | High on, enables the chip. Low off, the chip powers off. Note Do not leave the EN pin floating. |
| IO4  | 4   | IOT   | MTMS, GPIO4, LP_GPIO4, LP_UART_RXD, ADC1_CH4, FSPIHD                                            |
| IO5  | 5   | IOT   | MTDI, GPIO5, LP_GPIO5, LP_UART_TXD, ADC1_CH5, FSPIWP                                            |
| IO6  | 6   | IOT   | MTCK, GPIO6, LP_GPIO6, LP_I2C_SDA, ADC1_CH6, FSPICLK                                            |
| IO7  | 7   | IOT   | MTDO, GPIO7, LP_GPIO7, LP_I2C_SCL, FSPID                                                        |
| IO0  | 8   | IOT   | GPIO0, XTAL_32K_P, LP_GPIO0, LP_UART_DTRN, ADC1_CH0                                             |
| IO1  | 9   | IOT   | GPIO1, XTAL_32K_N, LP_GPIO1, LP_UART_DSRN, ADC1_CH1                                             |
| IO8  | 10  | IOT   | GPIO8                                                                                           |
| IO10 | 11  | IOT   | GPIO10                                                                                          |
| IO11 | 12  | IOT   | GPIO11                                                                                          |
| IO12 | 13  | IOT   | GPIO12, USB_DIO13 14 IOT GPIO13, USB_D+                                                         |
| IO9  | 15  | IOT   | GPIO9                                                                                           |
| IO18 | 16  | IOT   | GPIO18, SDIO_CMD, FSPICS2                                                                       |
| IO19 | 17  | IOT   | GPIO19, SDIO_CLK, FSPICS3                                                                       |
| IO20 | 18  | IOT   | GPIO20, SDIO_DATA0, FSPICS4                                                                     |
| IO21 | 19  | IOT   | GPIO21, SDIO_DATA1, FSPICS5                                                                     |
| IO22 | 20  | IOT   | GPIO22, SDIO_DATA2                                                                              |
| IO23 | 21  | IOT   | GPIO23, SDIO_DATA3                                                                              |
| NC   | 22  | —     | NC                                                                                              |
| IO15 | 23  | IOT   | GPIO15                                                                                          |
| RXD0 | 24  | IOT   | U0RXD, GPIO17, FSPICS1                                                                          |
| TXD0 | 25  | IOT   | U0TXD, GPIO16, FSPICS0                                                                          |
| IO3  | 26  | IOT   | GPIO3, LP_GPIO3, LP_UART_CTSN, ADC1_CH3                                                         |
| IO2  | 27  | IOT   | GPIO2, LP_GPIO2, LP_UART_RTSN, ADC1_CH2, FSPIQ                                                  |
| GND  | 28  | P     | Ground                                                                                          |
| EPAD | 29  | P     | Ground                                                                                          |
