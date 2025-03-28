---
title: "Camera"
linkTitle: "Camera"
nodateline: true
weight: -10
---

# Software

Konsool applications can use the [esp_cam_sensor](https://github.com/espressif/esp-video-components/tree/master/esp_cam_sensor) driver to read frames from a MIPI CSI camera module.

The camera connector on Konsool has the same pinout as the 22 pin MIPI CSI connector found on the Raspberry Pi Zero and Raspberry Pi 5.

# Supported sensors

| Sensor           | Max resolution | Output format                                                |
|------------------|----------------|--------------------------------------------------------------|
| GC2145           | 1600 x 1200    | RGB565<br/>YCbCr422<br/>8bit Raw RGB data                    |
| OV2710           | 1920 x 1080    | Raw RGB data                                                 |
| OV5645           | 2592 x 1944    | 8/10-bit Raw RGB data<br/>RGB565<br/>YUV/YCbCr422<br/>YUV420 |
| OV5647           | 2592 x 1944    | 8/10-bit Raw RGB data                                        |
| SC035HGS         | 640 x 480      | Raw MONO<br/>Raw RGB data                                    |
| SC202CS (SC2356) | 1600 x 1200    | 8/10-bit Raw RGB data                                        |
| SC2336           | 1920 x 1080    | 8/10-bit Raw RGB data                                        |

