---
title: "CircuitPython"
linkTitle: "CircuitPython"
nodateline: true
weight: 11
---

The Cyber Ægg has a CircuitPython build. It turns the badge into a device you
program in Python, with no toolchain. Flash it once. The badge then mounts as a
`CIRCUITPY` drive. Put a `code.py` file on the drive, and the badge runs it when
you save.

Ordinary CircuitPython modules reach the display, the buttons, the joystick, the
LEDs, the buzzer and the battery. The same is true for the LoRa radio, NFC,
Bluetooth Low Energy and deep sleep.

{{% alert title="It replaces the firmware and erases your saved data" color="warning" %}}
CircuitPython is a separate image. It is not an app inside the normal firmware.
While CircuitPython is installed, the badge has no BornPets, no mesh and no
clock. Flash the standard firmware again from the [Flash page](../flash/) to get
the badge back.

The CIRCUITPY drive uses the same QSPI flash that holds your pet, your settings
(the KV store) and the badge's asset files. CircuitPython writes over all of
them. You lose the pet and the settings. After you flash a normal firmware
again, install its assets before the sprites come back.
{{% /alert %}}

## Install it

1. Flash the CircuitPython image from the [Flash page](../flash/).
2. Reset the badge with no button held.
3. The badge appears as a **`CIRCUITPY`** drive. It also gives a serial console
   for the REPL: `/dev/ttyACM0` on Linux, a `usbmodem` device on macOS, a `COM`
   port on Windows.
4. Copy the libraries and the examples to the drive, as below.

{{% alert title="Power cycle the badge, do not reboot it from the flasher" color="info" %}}
After you flash the badge, restart it with the **ON/OFF** switch at the top left
of the front. Slide the switch off, then back on. Do not ask the tool to reboot
the badge. The battery keeps the badge powered when you disconnect USB. A power
cycle is the reliable way to start the new firmware.
{{% /alert %}}

## Install the libraries and examples

The examples do not run without the support libraries. An import of
`cyberaegg_epd` or the LoRa driver fails until the libraries are in
`CIRCUITPY/lib`. Install them first. The same archive holds the examples. They
go to `CIRCUITPY/examples`, so you can open one and save it as `code.py`.

{{< pylib >}}

## Your first program

After you install the libraries, save this file as `CIRCUITPY/code.py`:

```python
import cyberaegg_epd

display = cyberaegg_epd.get_display()
```

`get_display()` returns a standard `displayio.EPaperDisplay`. Build a
`displayio` group as usual. Assign the group to `display.root_group`, then
refresh the display.

The example `epd_hello.py` draws a bordered white field with one black square
and one red square. The example `hwtest.py` tests the LED, the buzzer, the
charger, the battery, I²C and all the buttons.

The install above puts every example in `CIRCUITPY/examples`. Copy one to
`code.py`, and the badge runs it when you save. You can also
[read the examples online](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/examples)
and [the libraries](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/lib),
or paste an example into the console below.

The firmware includes `terminalio` and `fontio`, so `adafruit_display_text` can
draw text labels. That library is in the repository's `lib/` folder.

## The serial console

CircuitPython prints `print()` output and tracebacks to a USB serial console. It
also gives a REPL there. The console tells you why a program did not run. Errors
never appear on the display.

You can open the console here, without a terminal program:

{{< repl >}}

**Ctrl-C** stops the running program and gives you the `>>>` prompt. At that
prompt you can test the hardware one line at a time. **Ctrl-D** starts `code.py`
again from the top. This is the quickest way to run a program again after an
edit.

The console is only available while CircuitPython is installed. The firmware
gives the console, not the bootloader.

## Work with the e-paper display

E-paper does not behave like a normal screen. Most first-time surprises come
from this.

**The badge shows the last image it drew.** E-ink holds its image with no power.
An `EPaperDisplay` object does not change the glass when you create it. To start
from a clean panel, use this code:

```python
import cyberaegg_epd

cyberaegg_epd.clear()          # white panel, one full refresh
```

If your program clears the screen and then stops, call
`displayio.release_displays()` before it stops. If you do not, CircuitPython
draws its own start logo over the clean panel.

**Refreshes are slow, and each one wears the panel.** A full tri-color refresh
takes about twenty seconds. Obey these rules:

* Use one refresh for each start. Draw the final image with the white
  background in the same frame, instead of one refresh to clear and a second
  refresh to draw.
* Do not refresh more often than every 180 seconds.
* Use full refreshes only. This panel does not do partial updates.
* If the badge stays unused for a long time, leave the panel white. This
  prevents image retention.

**A refresh does not block the program.** `display.refresh()` returns
immediately, and the panel continues to update for about six seconds. Read
`display.busy` if you must wait. You can also call
`cyberaegg_epd.refresh(display)`. That function waits for the minimum interval
of the panel, then blocks until the refresh ends.

## LoRa

The repository's `lib/` folder has a driver for the SX1262 radio. The driver
uses MeshCore-compatible EU settings: 869.618 MHz, SF8, 62.5 kHz bandwidth,
coding rate 4/5, sync word `0x1424`, no TCXO.

The driver and the SX126x files it needs are part of the library set that you
[installed above](#install-the-libraries-and-examples). You copy no more files:

```python
import cyberaegg_lora

radio = cyberaegg_lora.LoRa()
radio.send("hello")
data, err = radio.receive(timeout_ms=5000)
```

`examples/lora_tx.py` sends a counter. `examples/lora_rx.py` receives, and
prints the size and the signal strength of each packet. The receiver works
against a second badge that runs `lora_tx.py`. It also works against live
MeshCore traffic. `lora_dashboard.py` shows live packet statistics on the
e-paper display.

## NFC

The firmware includes NFC, so you copy nothing into `lib/`. The badge serves a
read-only tag. A phone that touches the badge opens a URL. See
`examples/nfc_tag.py` and the repository's `docs/NFC.md`.

## Bluetooth

The badge advertises and accepts Bluetooth Low Energy connections from
CircuitPython, through the standard `_bleio` API. It uses the factory address
from `FICR.DEVICEADDR`. The normal Rust firmware advertises with the same
address.

```python
import _bleio

adapter = _bleio.adapter
print(adapter.address)

# Flags: LE General Discoverable, BR/EDR not supported, then the complete name.
advertisement = bytes((2, 0x01, 0x06)) + bytes((10, 0x09)) + b"CyberAegg"
adapter.start_advertising(advertisement, scan_response=None, connectable=True,
                          anonymous=False, timeout=0, interval=0.1,
                          tx_power=0, directed_to=None)
```

A phone scanner then shows the badge. On Linux, use this command:

```
bluetoothctl --timeout 20 scan le
```

`examples/ble_advertise.py` does the same, and advertises again after a central
disconnects. Connections and GATT also work. `examples/ble_uart.py` serves a
Nordic UART Service. Any BLE terminal app, such as nRF Connect or Adafruit
Bluefruit Connect, connects to `CyberAegg`. The text you send arrives on the
badge's serial console.

### Find and connect to other badges

The badge also scans, which is the observer role, and it connects out, which is
the central role. Two badges therefore find each other.

`examples/ble_scan.py` lists what the badge hears. It scans and advertises at
the same time, so two badges watch each other with no connection between them.
`examples/ble_central.py` connects to a second badge that runs
`examples/ble_uart.py`. The link comes up in about 0.2 seconds, and both badges
report the same state.

Scanning uses the multirole controller library, because the peripheral library
has no scanning. That library costs about 31 KB more flash.

Three limits are important:

* **There is no GATT client.** The badge connects to another device, but it
  cannot read or write the characteristics of that device.
  `Connection.discover_remote_services()` returns nothing. A connection is
  therefore useful to prove that two badges reach each other, and to hold a
  link, but not yet to exchange data.
* **Legacy advertising only.** The advertisement must fit in 31 bytes.
* **Bluetooth does not work together with the display.** A full tri-color
  refresh keeps the panel busy for tens of seconds. The background work of
  `displayio` competes with the Bluetooth poll, and a connection does not
  survive a redraw. Keep Bluetooth and the display in separate programs.

Bluetooth starts when a program first imports `_bleio`, and then stays on. This
uses battery power.

{{% alert title="How it works without the SoftDevice" color="info" %}}
The native nRF Bluetooth of CircuitPython needs Nordic's S140 SoftDevice at
flash address `0x1000`. The badge's bootloader owns that region, and DFU writes
only from `0x10000` up. Thus you cannot install the S140 without an SWD reflash
of the bootloader.

This limit belongs to the S140 binary, not to Bluetooth. This firmware links
Nordic's SoftDevice Controller instead. That controller is the link layer alone,
an ordinary library with no fixed address. The firmware connects the controller
to the HCI Bluetooth host that CircuitPython already has for boards with an
off-chip radio. The host and the controller then run on the same chip. The
bootloader stays untouched, and you flash the badge with plain USB DFU.

The repository's
[docs/BLUETOOTH.md](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/docs/BLUETOOTH.md)
explains the design.
{{% /alert %}}

The MeshCore companion app cannot talk to the badge while CircuitPython is
installed. MeshCore is part of the normal badge firmware, and this image
replaces that firmware.

## Deep sleep

The `alarm` module works, with pin wake-up and time wake-up. A battery-powered
program can sleep between refreshes instead of a busy loop:

```python
import alarm
import time

alarm.exit_and_deep_sleep_until_alarms(
    alarm.time.TimeAlarm(monotonic_time=time.monotonic() + 300)
)
```

E-paper keeps its image with no power. The display stays readable during the
sleep.

## If something goes wrong

**No `CIRCUITPY` drive appears.** The badge is still in the bootloader, or the
flashing tool rebooted it instead of a reset. Reset the badge with no button
held.

**My code did not run.** CircuitPython runs `code.py` from the root of the
drive. Check the file name. Open the serial console. The console prints syntax
errors and tracebacks. The display does not show them.

**The display shows the CircuitPython logo over my drawing.** Your program
cleared the panel and then stopped. Call `displayio.release_displays()` before
the program stops, or keep the program running.

**The screen did not change.** The firmware limits the refresh rate. It ignores
a request that comes too soon after the last refresh. Wait for the interval, or
use `cyberaegg_epd.refresh(display)`. That function does the wait for you.

## Source

The firmware, the libraries and the examples are at
[rarenerd/cyberaegg-circuitpython](https://codeberg.org/rarenerd/cyberaegg-circuitpython).
Go directly to the
[examples](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/examples)
or the [libraries](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/lib).
The image on the Flash page is that repository's prebuilt binary, byte for byte.
Its checksum matches the published `SHA256SUMS` file. The repository's
`docs/BUILDING.md` has the build instructions.

CircuitPython is MIT, and the badge port is Apache-2.0. The Bluetooth build also
links Nordic's SoftDevice Controller and MPSL under
`LicenseRef-Nordic-5-Clause`. That license allows redistribution, but only for
use on Nordic silicon. The badge's nRF52840 is Nordic silicon.
