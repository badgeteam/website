---
title: "API reference"
nodateline: true
weight: 5
---

Welcome to the API reference for the BADGE.TEAM platform firmware.

This reference describes all officially supported APIs of our platform. We try to keep these APIs as stable as possible. There are many more (undocumented) APIs in the firmware, all of which may change at any time!

Our platform firmware uses MicroPython at it's core. Most of the libraries and APIs from the upstream MicroPython project are available in the BADGE.TEAM firmware.

The [MicroPython documentation](https://docs.micropython.org/en/latest) describes the builtin [libraries](https://docs.micropython.org/en/latest/library) and [functions](https://docs.micropython.org/en/latest/library/builtins.html).

Specifically, the MicroPython core in our firmware is based on the ESP32 port of MicroPython by [Loboris](https://github.com/loboris/MicroPython_ESP32_psRAM_LoBo). He changed some parts of MicroPython to suit the ESP32 better. The [wiki](https://github.com/loboris/MicroPython_ESP32_psRAM_LoBo/wiki) of his project describes the changes he made.

We have made a lot of changes on top of the work done by Loboris. We've added some badge specific APIs, a brand new framebuffer system for displaying graphics and drivers for the hardware specific to the supported badges.

By doing this we aim to take the resource intensive parts of driving the hardware to the C level beneith the Python. This allows for a much more speedy experience and a lot more possibilities and flexibility.

### Things to keep in mind while looking up documentation

 - There is currently no API available for directly controlling the SPI bus(ses) of your badge from within Python.
 - I2C should be used with caution as the I2C bus on most badges is used for system peripherals as well.
 - The Neopixel (LED) driver differs greatly from the neopixel API in the Loboris port.
 - The Display driver differs greatly from the display API in the Loboris port.

If you want to help with firmware development please tell us! We're always happy to accept PRs and improvements.

Should you have ideas, problems or observations but no means to act on them then you can always [create an issue on Github](https://github.com/badgeteam/ESP32-platform-firmware/issues).

## BADGE.TEAM platform APIs

| Library                | Function                                                                           | SHA2017 | Disobey 2019 | HackerHotel 2019 | I-PANE (CampZone 2019) |
|------------------------|------------------------------------------------------------------------------------|---------|--------------|------------------|------------------------|
| [display](display)     | Control the display of your badge: create and display text and graphics            | Yes     | Yes          | Yes              | Yes                    |
| [buttons](buttons)     | Read button status and attach callback functions to button interactions            | Yes     | Yes          | Yes              | Yes                    |
| [wifi](wifi)           | Abstraction layer wrapping the ```network``` API for connection to WiFi networks   | Yes     | Yes          | Yes              | Yes                    |
| [terminal](terminal)   | Helper functions for presenting a user interface over the serial port or telnet    | Yes     | Yes          | Yes              | Yes                    |
| [system](system)       | Abstraction layer for starting apps and controlling badge behaviour and sleep mode | Yes     | Yes          | Yes              | Yes                    |
| [samd](samd)           | Disobey 2019 specific hardware interface module                                    | No      | Yes          | Yes              | Yes                    |
| [sndmixer](sndmixer)   | Audio related functions *in active development, may change at ANY time*            | No      | Partially    | Yes              | No                     |
| [opus](opus)           | Opus encoding and decoding                                                         | No      | No           | No               | No                     |
| [neopixel](neopixel)   | Control the addressable LEDs on your badge                                         | Yes     | No           | Yes              | No                     |
| [mpu6050](mpu6050)     | MPU6050 accelerometer and gyroscope control                                        | No      | No           | No               | Yes                    |
| [rgb](rgb)             | Legacy display API for CampZone 2019 badges (1/2)                                  | No      | No           | No               | Yes                    |
| [hub75](hub75)         | Legacy display API for CampZone 2019 badges (2/2)                                  | No      | No           | No               | Yes                    |
| [espnow](espnow)       | Mesh networking API utilizing the Espressif ESPNOW features of the ESP32           | Yes     | Yes          | Yes              | Yes                    |
| [consts](consts)       | Reference containing constants describing your badge and it's firmware             | Yes     | Yes          | Yes              | Yes                    |
| ssd1306                | Direct SSD1306 display control (*will be removed in a future release*)             | No      | No           | No               | No                     |
| erc12864               | Direct ERC12864 display control (*will be removed in a future release*)            | No      | Yes          | No               | No                     |
| eink                   | Direct E-INK display control    (*will be removed in a future release*)            | Yes     | No           | No               | No                     |
| rtc                    | Legacy real-time-clock API (*please use machine.RTC and utime instead*)            | Yes     | Yes          | Yes              | Yes                    |
| _buttons               | Generic GPIO button handler API, usefull for adding extra buttons to GPIO headers  | Yes     | Yes          | Yes              | Yes                    |
| voltages               | API for reading various voltages, exact functionality differs per badge            | No      | No           | No               | No                     |
| keyboard               | Display a text entry form complete with on-screen-keyboard                         | Yes     | Yes          | Yes              | No                     |
| esp32_ulp              | Collection of helper functions for using the Ultra Low Power co-processor          | Yes     | Yes          | Yes              | Yes                    |
| umqtt                  | MQTT client library                                                                | Yes     | Yes          | Yes              | Yes                    |



## APIs that differ from their upstream counterparts
 - [The machine API: for directly controlling some hardware features and busses of your badge](machine)
 
 
## Other libraries and APIs
This section lists most of the other libraries that you can use in your apps.

| Library      | Function                                                                         | Documentation                                                                   |
|--------------|----------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| math         | Mathematical functions                                                           | [MicroPython](https://docs.micropython.org/en/latest/library/math.html)         |
| cmath        | Mathematical functions for complex numbers                                       | [MicroPython](https://docs.micropython.org/en/latest/library/cmath.html)        |
| ubinascii    | Utilities for working with binary data (Hex-string, base64 and CRC32 calculation | [MicroPython](https://docs.micropython.org/en/latest/library/ubinascii.html)    |
| ucollections | Collection and container types                                                   | [MicroPython](https://docs.micropython.org/en/latest/library/ucollections.html) |
| uerrno       | System error code reference                                                      | [MicroPython](https://docs.micropython.org/en/latest/library/uerrno.html)       |
| uhashlib     | SHA1 and SHA256 hashing algorithms                                               | [MicroPython](https://docs.micropython.org/en/latest/library/uhashlib.html)     |
| uheapq       | Heap queue algorithm                                                             | [MicroPython](https://docs.micropython.org/en/latest/library/uheapq.html)       |
| uio          | Input/output streams                                                             | [MicroPython](https://docs.micropython.org/en/latest/library/uio.html)          |
| ujson        | JSON encoding and decoding                                                       | [MicroPython](https://docs.micropython.org/en/latest/library/ujson.html)        |
| uos          | Basic “operating system” services                                                | [MicroPython](https://docs.micropython.org/en/latest/library/uos.html)          |
| ure          | Simple regular expressions                                                       | [MicroPython](https://docs.micropython.org/en/latest/library/ure.html)          |
| uselect      | Wait for events on a set of streams                                              | [MicroPython](https://docs.micropython.org/en/latest/library/uselect.html)      |
| usocket      | Sockets (TCP, UDP)                                                               | [MicroPython](https://docs.micropython.org/en/latest/library/usocket.html)      |
| ussl         | SSL/TLS module                                                                   | [MicroPython](https://docs.micropython.org/en/latest/library/ussl.html)         |
| ustruct      | Pack and unpack primitive data types                                             | [MicroPython](https://docs.micropython.org/en/latest/library/ustruct.html)      |
| utime        | Time related functions                                                           | [MicroPython](https://docs.micropython.org/en/latest/library/utime.html)        |
| uzlib        | Zlib decompression                                                               | [MicroPython](https://docs.micropython.org/en/latest/library/uzlib.html)        |
| _thread      | Multithreading support                                                           | [MicroPython](https://docs.micropython.org/en/latest/library/_thread.html)      |
| gc           | Control the garbage collector                                                    | [MicroPython](https://docs.micropython.org/en/latest/library/gc.html)           |
| sys          | System specific functions                                                        | [MicroPython](https://docs.micropython.org/en/latest/library/sys.html)          |
| machine      | Functions related to the hardware  (Note: different from upstream version)       | [BADGE.TEAM]](machine)                                                          |
| micropython  | Access and control MicroPython internals                                         | [MicroPython](https://docs.micropython.org/en/latest/library/micropython.html)  |
| network      | Network configuration (Please use the ```wifi``` library instead when possible)  | [MicroPython](https://docs.micropython.org/en/latest/library/network.html)      |
| esp          | ESP32 specific functions (Note: direct flash access has been disabled)           | [MicroPython](https://docs.micropython.org/en/latest/library/esp.html)          |


## Utilities
| Library                                                | Function                                                                           |
|--------------------------------------------------------|------------------------------------------------------------------------------------|
| [pye](https://github.com/robert-hh/Micropython-Editor) | Built-in text editor                                                               |
