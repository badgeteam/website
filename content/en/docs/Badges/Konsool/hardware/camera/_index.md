---
title: "Camera"
linkTitle: "Camera"
nodateline: true
weight: -10
---

# Camera Compatibility List

| Camera                              | Sensor | Connector                                   | Lens                        | "Night vision" | Flashlight | Autofocus | Tested |
| ----------------------------------- | ------ | ------------------------------------------- | --------------------------- | -------------- | ---------- | --------- | ------ |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 120 degree fixed            | No             | No         | No        | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 72 degree fixed             | Yes            | No         | No        | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 72 degree fixed             | No             | No         | No        | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 160 degree fixed            | No             | No         | No        | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 120 degree fixed (big lens) | No             | No         | No        | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 120 degree motorized        | No             | No         | Yes       | No     |
| Camera Module for Raspberry Pi Zero | OV5647 | 22 pin Pi Zero/5 style                      | 72 degree motorized         | No             | No         | Yes       | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | FF 69                       | No             | No         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | AF 65"                      | No             | No         | Yes       | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | IR-CUT 175 2                | Yes            | IR         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | IR-CUT 175                  | Yes            | No         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | IR-CUT 75 2"                | Yes            | IR         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | IR-CUT 75                   | Yes            | No         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | MF 220                      | No             | No         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | MF 175                      | No             | No         | No        | No     |
| Raspberry Pi 5 camera               | OV5647 | Comes with cable to  22 pin Pi Zero/5 style | MF 130 Night 2              | Yes            | IR         | No        | No     |

# Not compatible

The new IMX519 based camera modules from Raspberry Pi are currently not supported. For a list of supported sensors see [supported sensors](../../compatibility/camera/).

| Camera                              | Sensor | Connector                                   | Lens                        | "Night vision" | Flashlight | Autofocus |
| ----------------------------------- | ------ | ------------------------------------------- | --------------------------- | -------------- | ---------- | --------- |
| Raspberry Pi 5 camera               | IMX519 | Comes with cable to  22 pin Pi Zero/5 style | Unknown                     | No             | No         | Yes       |
