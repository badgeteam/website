---
title: "CircuitPython"
linkTitle: "CircuitPython"
nodateline: true
weight: 11
---

There is a CircuitPython build for the Cyber Ægg, which turns the badge into
something you program in Python with no toolchain at all. Flash it once and the
badge mounts as a `CIRCUITPY` drive: drop a `code.py` on it, and it runs the
moment you save.

The display, buttons, joystick, LEDs, buzzer, battery, LoRa radio, NFC,
Bluetooth Low Energy and deep sleep are all reachable from ordinary
CircuitPython modules.

{{% alert title="It replaces the firmware and wipes your saved data" color="warning" %}}
CircuitPython is a separate image, not an app inside the normal firmware. While
it is installed there is no BornPets, mesh or clock — flash the standard
firmware again from the [Flash page](../flash/) to get the badge back.

The CIRCUITPY drive lives on the same QSPI flash that holds your pet, settings
(the KV store) and the badge's asset files, so switching to CircuitPython
overwrites them. Your pet and settings are lost, and when you flash a normal
firmware back you will need to re-install its assets before the sprites return.
{{% /alert %}}

## Install it

1. **Flash the CircuitPython image** from the [Flash page](../flash/), then
   reset the badge with no button held.
2. The badge appears as a **`CIRCUITPY`** drive, plus a serial console for the
   REPL (`/dev/ttyACM0` on Linux, a `usbmodem` device on macOS, a `COM` port on
   Windows).
3. Copy the libraries and examples onto the drive, as below.

{{% alert title="Power-cycle rather than reboot from the flasher" color="info" %}}
After flashing, restart the badge with the **ON/OFF** switch — top-left on the
front — (slide it off, then back on), not by asking the tool to reboot it. The battery keeps the badge
powered when USB is unplugged, so a clean power-cycle is the reliable way to
hand off to the new firmware.
{{% /alert %}}

## Install the libraries and examples

None of the examples run without the support libraries — importing
`cyberaegg_epd` or the LoRa driver fails until they are in `CIRCUITPY/lib`. Put
them there first. The examples come along in the same archive, landing in
`CIRCUITPY/examples`, so you can open one and save it as `code.py`:

{{< pylib >}}

## Your first program

With the libraries installed, save this as `CIRCUITPY/code.py`:

```python
import cyberaegg_epd

display = cyberaegg_epd.get_display()
```

`get_display()` returns a standard `displayio.EPaperDisplay`. Build a
`displayio` group as usual, assign it to `display.root_group` and refresh.

The example `epd_hello.py` draws a bordered white field with a black and a red
square; `hwtest.py` walks through the LED, buzzer, charger, battery, I²C and all
the buttons.

They are all in `CIRCUITPY/examples` after the install above — copy one to
`code.py` and it runs on save. You can also
[browse them online](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/examples),
along with [the libraries](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/lib),
or paste one into the console below.

For text, the firmware includes `terminalio` and `fontio`, so
`adafruit_display_text` can draw labels — it is bundled in the repository's
`lib/`.

## The serial console

CircuitPython prints `print()` output and tracebacks to a USB serial console,
and offers a REPL there. That console is where you find out *why* a program did
not run — errors never appear on the display.

You can open it right here, without installing a terminal program:

{{< repl >}}

**Ctrl-C** interrupts whatever is running and gives you the `>>>` prompt, where
you can poke at the hardware a line at a time. **Ctrl-D** restarts `code.py`
from the top, which is the quickest way to re-run after an edit.

The console is only available while CircuitPython is installed — it is the
firmware that provides it, not the bootloader.

## Working with the e-paper display

E-paper is the one part that does not behave like a normal screen, and most
first-time surprises come from it.

**The badge shows whatever was drawn last.** E-ink holds its image with no
power, and creating an `EPaperDisplay` does not touch the glass. To start from a
clean panel:

```python
import cyberaegg_epd

cyberaegg_epd.clear()          # white panel, one full refresh
```

If your program clears the screen and then exits rather than staying running,
call `displayio.release_displays()` afterwards — otherwise CircuitPython draws
its own boot logo over your freshly cleared panel.

**Refreshes are slow and finite.** A tri-colour full refresh takes around twenty
seconds, and every refresh wears the panel a little. So:

* Prefer **one refresh per boot**, showing your final image with the white
  background baked into the same frame, over clearing and then drawing as two
  separate refreshes.
* Do not refresh more often than roughly **every 180 seconds**.
* Use **full refreshes only** — this panel does not do partial updates.
* If the badge will sit unused for a long time, leave it cleared to white to
  avoid image retention.

**Refreshing does not block.** `display.refresh()` returns straight away while
the panel keeps updating for about six seconds. Read `display.busy` if you need
to wait, or call `cyberaegg_epd.refresh(display)`, which waits out the panel's
minimum interval first and blocks until the refresh finishes.

## LoRa

The SX1262 radio has a driver in the repository's `lib/`, configured for
MeshCore-compatible EU settings: 869.618 MHz, SF8, 62.5 kHz bandwidth, coding
rate 4/5, sync word `0x1424`, no TCXO.

The driver and the SX126x files it needs are part of the library set installed
[above](#install-the-libraries), so there is nothing more to copy:

```python
import cyberaegg_lora

radio = cyberaegg_lora.LoRa()
radio.send("hello")
data, err = radio.receive(timeout_ms=5000)
```

`examples/lora_tx.py` sends a counter and `lora_rx.py` receives, printing each
packet's size and signal strength. The receiver works both against a second
badge running `lora_tx.py` and left listening to live MeshCore traffic.
`lora_dashboard.py` shows live packet statistics on the e-paper display.

## NFC

NFC is built into the firmware, so there is nothing to copy into `lib/`. The
badge serves a read-only tag, so tapping a phone against it opens a URL. See
`examples/nfc_tag.py` and the repository's `docs/NFC.md`.

## Bluetooth

The badge advertises and accepts Bluetooth Low Energy connections from
CircuitPython, through the standard `_bleio` API. It uses the factory address
from `FICR.DEVICEADDR` — the same one the normal Rust firmware advertises with.

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

Any phone scanner will then show the badge, or on Linux:

```
bluetoothctl --timeout 20 scan le
```

`examples/ble_advertise.py` is that with a loop that re-advertises after a
central disconnects. Connections and GATT work too: `examples/ble_uart.py`
serves a Nordic UART Service, so any BLE terminal app — nRF Connect, Adafruit
Bluefruit Connect — can connect to `CyberAegg` and send text that arrives on the
badge's serial console.

Three limits are worth knowing:

* **Peripheral only.** The badge can be found and connected to, but it cannot
  scan or connect to anything itself — so badge-to-badge does not work.
* **Legacy advertising only**, so the payload has to fit in 31 bytes.
* **Not together with the display.** A tri-colour refresh keeps the panel busy
  for tens of seconds and `displayio`'s background work contends with the
  Bluetooth poll, so a connection does not survive a redraw. Keep the two in
  separate programs for now.

Bluetooth also switches on the moment `_bleio` is first imported and stays on,
which costs battery.

{{% alert title="How it works without the SoftDevice" color="info" %}}
CircuitPython's *native* nRF Bluetooth needs Nordic's S140 SoftDevice at flash
address `0x1000`, which is inside the region the badge's bootloader owns — DFU
writes only from `0x10000` up, so the S140 cannot be placed without an SWD
reflash of the bootloader.

That restriction belongs to the S140 binary, not to Bluetooth. This firmware
links Nordic's SoftDevice Controller instead — the link layer on its own, as an
ordinary library with no fixed address — and wires it to the HCI Bluetooth host
CircuitPython already ships for boards with an off-chip radio. Host and
controller end up on the same chip, the bootloader is untouched, and flashing
stays plain USB DFU. The write-up is in the repository's
[docs/BLUETOOTH.md](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/docs/BLUETOOTH.md).
{{% /alert %}}

The MeshCore companion app still cannot talk to the badge while CircuitPython is
installed: MeshCore lives in the normal badge firmware, which this image
replaces.

## Deep sleep

The `alarm` module works, with both pin and time wake-up, so a battery-powered
program can idle between refreshes instead of spinning:

```python
import alarm
import time

alarm.exit_and_deep_sleep_until_alarms(
    alarm.time.TimeAlarm(monotonic_time=time.monotonic() + 300)
)
```

E-paper keeps its image with no power, so the display stays readable through the
sleep.

## If something goes wrong

**No `CIRCUITPY` drive appears.** The badge is probably still in the bootloader
or was rebooted by the flashing tool rather than reset. Reset it with no button
held.

**My code did not run.** CircuitPython runs `code.py` from the root of the
drive. Check the filename, and open the serial console — syntax errors and
tracebacks are printed there, not on the display.

**The display shows the CircuitPython logo over my drawing.** Your program
cleared the panel and then exited. Call `displayio.release_displays()` before
finishing, or keep the program running.

**The screen did not change.** Refreshes are rate-limited: too soon after the
last one and the request is ignored. Wait out the interval, or use
`cyberaegg_epd.refresh(display)`, which handles the waiting for you.

## Source

The firmware, library and examples live at
[rarenerd/cyberaegg-circuitpython](https://codeberg.org/rarenerd/cyberaegg-circuitpython)
— go straight to the
[examples](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/examples)
or the [libraries](https://codeberg.org/rarenerd/cyberaegg-circuitpython/src/branch/main/lib).
The image offered on the Flash page is that repository's prebuilt binary, byte
for byte — its checksum matches the `SHA256SUMS` published alongside it. Build
instructions are in the repository's `docs/BUILDING.md`.

CircuitPython itself is MIT and the badge port is Apache-2.0, but the Bluetooth
build also links Nordic's SoftDevice Controller and MPSL under
`LicenseRef-Nordic-5-Clause`: redistributable, but only for use on Nordic
silicon — which the badge's nRF52840 is.
