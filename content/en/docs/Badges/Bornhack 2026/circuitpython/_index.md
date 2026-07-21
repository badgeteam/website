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

The display, buttons, joystick, LEDs, buzzer, battery, LoRa radio and NFC are
all reachable from ordinary CircuitPython modules.

{{% alert title="It replaces the badge firmware" color="warning" %}}
CircuitPython is a separate image, not an app inside the normal firmware. While
it is installed there is no BornPets, mesh or clock — flash the standard
firmware again from the [Flash page](../flash/) to get the badge back. Your pet
and settings survive in flash.
{{% /alert %}}

## Install it

1. **Flash the CircuitPython image** from the [Flash page](../flash/), then
   reset the badge with no button held.
2. The badge appears as a **`CIRCUITPY`** drive, plus a serial console for the
   REPL (`/dev/ttyACM0` on Linux, a `usbmodem` device on macOS, a `COM` port on
   Windows).
3. Copy the library and an example onto the drive, as below.

{{% alert title="Reset rather than reboot from the flasher" color="info" %}}
After flashing, restart the badge with a **reset**, not by asking the tool to
reboot it. The battery keeps the badge powered when USB is unplugged, so a reset
is the reliable way to hand off to the new firmware.
{{% /alert %}}

## Your first program

Copy `lib/cyberaegg_epd.py` into `CIRCUITPY/lib/`, then save this as
`CIRCUITPY/code.py`:

```python
import cyberaegg_epd

display = cyberaegg_epd.get_display()
```

`get_display()` returns a standard `displayio.EPaperDisplay`. Build a
`displayio` group as usual, assign it to `display.root_group` and refresh.

The example `epd_hello.py` draws a bordered white field with a black and a red
square; `hwtest.py` walks through the LED, buzzer, charger, battery, I²C and all
the buttons. Both are in the repository's `examples/` directory.

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

Copy `cyberaegg_lora.py` along with `sx1262.py`, `sx126x.py` and `_sx126x.py`
into `CIRCUITPY/lib/`:

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

## What is not included

**Bluetooth.** CircuitPython's Bluetooth support needs Nordic's S140 SoftDevice,
which has to live at flash address `0x1000` — inside the region owned by the
badge's own bootloader. The DFU bootloader only writes the application area from
`0x10000` upwards and cannot overwrite itself, so Bluetooth would mean
reflashing the bootloader over SWD. This firmware does not do that.

That also means the MeshCore companion app cannot talk to the badge while
CircuitPython is installed.

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
[rarenerd/cyberaegg-circuitpython](https://codeberg.org/rarenerd/cyberaegg-circuitpython).
The image offered on the Flash page is that repository's prebuilt binary, byte
for byte — its checksum matches the `SHA256SUMS` published alongside it. Build
instructions are in the repository's `docs/BUILDING.md`.
