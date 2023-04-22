---
title: "API reference"
nodateline: true
weight: 5
---

Welcome to the API reference for BadgePython.

This reference describes all officially supported APIs of our platform. We try to keep these APIs as stable as possible. There are many more (undocumented) APIs in the firmware, all of which may change at any time!

BadgePython uses MicroPython at it's core.The libraries and APIs from the upstream MicroPython project are available in BadgePython.

The [MicroPython documentation](https://docs.micropython.org/en/v1.18/) describes the builtin [libraries](https://docs.micropython.org/en/latest/library) and [functions](https://docs.micropython.org/en/latest/library/builtins.html).


We've added some badge specific APIs for efficiently controlling hardware like the display and reading the buttons. By implementing the resource intensive parts of driving the hardware in C. This allows for a much more speedy experience and a lot more possibilities and flexibility.

If you want to help with firmware development please tell us! We're always happy to accept PRs and improvements.

Should you have ideas, problems or observations but no means to act on them then you can always [create an issue on Github](https://github.com/badgeteam/BadgePython/issues).

## BadgePython APIs

| Library                | Function                                                                           | MCM2022 | SHA2017 | Disobey 2019 | Disobey 2020 | HackerHotel 2019 | CampZone 2019 | CampZone 2020 |
| ---------------------- | ---------------------------------------------------------------------------------- | ------- | ------- | ------------ | ------------ | ---------------- | ------------- | ------------- |
| [display](display)     | Control the display of your badge: create and display text and graphics            | ✅       | ✅      | ✅            | ✅           | ✅                | ✅            | ✅             |
| [buttons](buttons)     | Read button status and attach callback functions to button interactions            | ✅       | ✅      | ✅            | ✅           | ✅                | ✅            | ❌             |
| [mch22](mch22)         | MCH2022 specific functions                                                         | ✅       | ❌      | ❌            | ❌           | ❌                 | ❌            | ❌             |
 
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
| machine      | Functions related to the hardware  (Note: different from upstream version)       | [MicroPython](https://docs.micropython.org/en/latest/library/machine.html)      |
| micropython  | Access and control MicroPython internals                                         | [MicroPython](https://docs.micropython.org/en/latest/library/micropython.html)  |
| network      | Network configuration (Please use the ```wifi``` library instead when possible)  | [MicroPython](https://docs.micropython.org/en/latest/library/network.html)      |
| esp          | ESP32 specific functions (Note: direct flash access has been disabled)           | [MicroPython](https://docs.micropython.org/en/latest/library/esp.html)          |
