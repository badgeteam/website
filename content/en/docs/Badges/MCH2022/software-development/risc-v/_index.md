---
title: "RISC-V Playground"
linkTitle: "RISC-V"
nodateline: true
weight: 1
---

If you want to dive into the RISC-V architecture, have a look at the [RISC-V Playground](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/RISCV-Playground).

This projects contains a beginner friendly RISC-V 'fantasy microcontroller' for the FPGA featuring a RV32IMC processor and a selection of peripherals:

  * Textmode LCD driver with 7-Bit ASCII font
  * Random number generator
  * GPIO registers for PMOD pin access
  * Timer tick interrupt
  * LEDs
  * UART terminal, 115200 Baud 8N1
  * 1 kb initialised RAM for bootloader
  * 128 kb RAM initialised using file read interface over SPI

Detailed descriptions, memory map and register set are described in the [README](https://github.com/badgeteam/mch2022-firmware-ice40/blob/master/projects/RISCV-Playground/README) file.

# Docs on RISC-V itself

 * Instruction set quick reference, recommended: [http://www.riscvbook.com/greencard-20181213.pdf](http://www.riscvbook.com/greencard-20181213.pdf)

 * Complete specifications: [https://riscv.org/technical/specifications/](https://riscv.org/technical/specifications/)
   See `Volume 1, Unprivileged Spec` for instruction set, and `Volume 2, Privileged Spec` for interrupt infrastructure.

# Quickstart

Clone both the bitstream tools repo

`git clone https://github.com/badgeteam/mch2022-tools/`

and the FPGA repo

`git clone --recursive https://github.com/badgeteam/mch2022-firmware-ice40/`

go to the

`mch2022-firmware-ice40/projects/RISCV-Playground/`

folder and load both the bitstream for the FPGA and a RISC-V binary:

`webusb_fpga.py riscv-playground.bin 0xdabbad00:fw/tinyblinky/tinyblinky.bin`

Connect to the serial terminal using your favourite terminal emulator with 115200 baud 8N1 LF on `ttyACM1`.

# Example firmware
## Bootloader

  This one is included into the bitstream for default.
  It initialises the LCD display and initialises the 128 kb RAM from
  file "0xdabbad00" using the file read interface over SPI provided
  by the ESP32 firmware.

## Tinyblinky

  A little blinky in RISC-V assembler. A nice "hello world" project.

## Interrupt

  An example on how to use interrupts on RISC-V, including notes
  on compressed opcodes and and small tools for printing hex numbers.

## Hello GCC

  A small project in C featuring serial terminal, buttons, LED and LCD.

## Forth

  This is a port of Mecrisp-Quintus, a 32 Bit Forth implementation,
  available under GPL3.

  For more info, get the full release of Mecrisp-Quintus here:

  [http://mecrisp.sourceforge.net/](http://mecrisp.sourceforge.net/)

  Useful for debugging, and maybe for you, too.

  If you have not used
  Forth before, better start with [this implementation](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/Forth) of Forth that
  comes with much more badge support code.
