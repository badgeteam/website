---
title: "Rust development for the ESP32"
linkTitle: "Rust"
weight: 100
description: >-
     Short description on how to install the tools for Rust development for the ESP32 on the badge
---

## Tools installation

* Rust toolchain from https://github.com/esp-rs/rust-build. Follow the
  instructions given there.
* Install cargo-generate (`cargo install cargo-generate`)
* Install the [mch2022 webusb
  tools](https://github.com/badgeteam/mch2022-tools)

## Project workflow

* Create a new project as follows:

```bash
cargo generate --git https://github.com/esp-rs/esp-idf-template cargo
```

* Generate an app image using:

```bash
cargo espflash save-image rust_esp.img
```

* Upload the image using web USB:
```bash
webusb_push.py --run rust rust_esp.img
```

## Limitations
These instructions use the esp-idf as provided by Espressif so you won't have
access to the components added by the badge team. It's probably possible to use
the version provided by the badge team, but I have not tried this.


