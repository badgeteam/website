---
title: "Getting Started with FPGA Development"
linkTitle: "FPGA"
nodateline: true
weight: 1
---

# FPGA development

The badge contains an ice40 FPGA that is connected to a PMOD connector, some RAM, and an RGB LED.
It can also control the display over a parallel bus, and has an USB UART link via the RP2040 and an SPI link to the ESP32.

As with all the other methods to program the badge, step one is to download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip).
There are two main tools to use here, `python3 webusb_fpga.py bitstream.bin` which will upload a bitstream directly into the FPGA, and `python3 webusb_fat_push.py bitsream.bin /sdcard/apps/ice40/myapp/bitstream.bin` which will make the bitstream available in the launcher.

The most easy way to install the tools needed to program the FPGA is [oss-cad-suite](https://github.com/YosysHQ/oss-cad-suite-build/releases). You can also build yosys, icestorm, and nextpnr from source, but whatever you do, don't use the highly outdated distro packages shipped with most Linux distros.

The main repository with templates and examples is [mch2022-firmware-ice40](https://github.com/badgeteam/mch2022-firmware-ice40). Running `make` in any of the project folders should produce a bitstream. In particular take note of the `cores` folder, which contains many useful cores for basic functionality.

The FPGA can kind of be used in two seperate modes.

## Standalone

When launching a bitstream from the launcher, the ESP32 hands over control of the display, and exposes an API to read buttons and files.

A basic example to read the buttons is found in [buttons.v](https://github.com/badgeteam/mch2022-firmware-ice40/blob/master/projects/Buttons/rtl/buttons.v)

A more elaborate example of a full-fledged RISC-V SoC with a wishbone bus and video output can be found in [riscv_doom](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/riscv_doom).
While the example is runing Doom, it is of course totally possible to change the RISC-V code, or add/modify peripherals on the wishbone bus.

## Peripheral mode

Both in the C++ and the Pyhon API, there is a convenient function to load a bitstream into the FPGA from your ESP32 program.
This allows using the FPGA as a peripheral to a larger ESP32 app.

A great way to get started with this is to use the [spi_skeleton](https://github.com/badgeteam/mch2022-firmware-ice40/tree/master/projects/spi_skeleton) example, which exposes a wishbone bus to the ESP32 over SPI.

You could for example add an UART port on the PMOD by adding the following code, adjusting the top level ports and incrementing `WN`.

```
	// UART [2]
	// ----

	uart_wb #(
		.DIV_WIDTH(12),
		.DW(32)
	) uart_I (
		.uart_tx  (uart_tx),
		.uart_rx  (uart_rx),
		.wb_addr  (wb_addr[1:0]),
		.wb_rdata (wb_rdata[2]),
		.wb_we    (wb_we),
		.wb_wdata (wb_wdata),
		.wb_cyc   (wb_cyc[2]),
		.wb_ack   (wb_ack[2]),
		.clk      (clk),
		.rst      (rst)
	);

```

On the ESP32 you could then write the following Python script that loads a bitstream and writes to the newly added UART port.

```
import mch22
from fpga_wishbone import FPGAWB

# load bitstream from SD card onto the FPGA
with open("/sd/apps/ice40/myapp/bitstream.bin", "rb") as f:
    mch22.fpga_load(f.read())

# create a wishbone command buffer
c = FPGAWB()
# setup UART
# (30e6/9600)-2
c.queue_write(2, 4, 3123)
# queue writing a byte
c.queue_write(2, 0, 0xaa)
# queue reading a byte
c.queue_read(2, 0)
# execute the command queue
c.exec()
```
