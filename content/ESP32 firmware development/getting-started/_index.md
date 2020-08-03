---
title: "Getting started"
nodateline: true
weight: 1
---

Welcome developer! This section describes how to get your development environment set-up so that you can build the BADGE.TEAM ESP32 platform firmware for any of the supported targets.

## Introduction

Our firmware has been set-up as an ESP-IDF project. The ESP-IDF is the development framework or SDK released by Espressif. Espressif is improving and updating the ESP-IDF constantly. Unfortunately these updates often introduce breaking changes. Because of this we have included the exact version of the ESP-IDF that we use as a submodule in our firmware GIT repository.

## Downloading the project

You can clone the project by running ```git clone https://github.com/badgeteam/ESP32-platform-firmware.git --recursive```. Git will then create a folder called "ESP32-platform-firmware" containing the project files.

## Installing required packages (Linux only)

Debian / Ubuntu: ```sudo apt-get install make unzip git libncurses5-dev flex bison gperf python-serial libffi-dev libsdl2-dev libmbedtls-dev perl```

## Installing the toolchain

Currently we're using ESP-IDF version 3.2 to build the firmware. After cloning our repository you will find the exact version of the ESP-IDF used in the ```ESP32-platform-firmware/esp-idf``` folder. You don't need to download or install a version of the ESP-IDF yourself.

The toolchain is another story: the newest ESP-IDF version (v4.x and newer) uses a different toolchain than the older (v3.3 / stable) version of the IDF. Because of this you can't simply download the "latest greatest" ESP32 toolchain, instead you need to use a specific version.

You can download the correct version of the toolchain directly from Espressif using the following URLs:

| Operating system  | Architecture   | Download link                                                                             |
|-------------------|----------------|-------------------------------------------------------------------------------------------|
| Linux             | AMD64 (64-bit) | https://dl.espressif.com/dl/xtensa-esp32-elf-linux64-1.22.0-80-g6c4433a-5.2.0.tar.gz      |
| Linux             | I386 (32-bit)  | https://dl.espressif.com/dl/xtensa-esp32-elf-linux32-1.22.0-80-g6c4433a-5.2.0.tar.gz      |
| Apple Mac OS      | OSX            | https://dl.espressif.com/dl/xtensa-esp32-elf-osx-1.22.0-80-g6c4433a-5.2.0.tar.gz          |
| Microsoft Windows | WIN32          | https://dl.espressif.com/dl/esp32_win32_msys2_environment_and_gcc5_toolchain-20191220.zip |

You can find the official toolchain installation instructions here:
- Linux: https://docs.espressif.com/projects/esp-idf/en/v3.3.2/get-started/linux-setup.html
- Mac OS: https://docs.espressif.com/projects/esp-idf/en/v3.3.2/get-started/macos-setup.html
- Windows: https://docs.espressif.com/projects/esp-idf/en/v3.3.2/get-started/windows-setup.html

The very, very short version of these instructions for Linux is as follows:
- Extract the archive
- Add the path to the ```bin``` folder in the archive, containing the toolchain executables to your path ```export PATH="$PATH:/path/to/my/toolchain/xtensa-esp32-elf/bin"```

