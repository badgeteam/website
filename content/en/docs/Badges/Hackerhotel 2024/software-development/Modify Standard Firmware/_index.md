---
title: "Modify Standard Firmware"
linkTitle: "Modify Standard Firmware"
nodateline: true
weight: 1
---

# Ready, set, hack!
Hack your badge and build cool applications on the ESP32-C6! Here are some basic instructions to get you started:

## Main firmware/ESP32-C6
Follow the instructions on the [ESP32-C6](https://github.com/badgeteam/hackerhotel-2024-firmware-esp32c6), we recommand VScode as an IDE.

## CH32V003 co-processor

Follow the instructions on the [CH32V003 repo](https://github.com/badgeteam/hackerhotel-2024-firmware-ch32v003), the J5 contains all the pins necessary to connect to a WCH link.

## Add and display an image
First the convert your image (input.png) by running <samp>convert</samp> using the mascot.png in the ressource folder as a reference, example:
```
convert input.png -map mascot.png output.png
```
Then open main/CMakeLists.txt and add your new file:
```
EMBED_FILES ${project_dir}/resources/output.png
```
Add in your file:
```
extern const uint8_t output_png_start[] asm("_binary_output_png_start");
extern const uint8_t output_png_end[] asm("_binary_output_png_end");
```
And use <samp>pax_insert_png_buf</samp> in your code to add the image to the screen buffer:
```
pax_insert_png_buf(&gfx, output_png_start, output_png_end - output_png_start, 0, 0, 0);
```

