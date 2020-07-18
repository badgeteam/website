---
title: "HID Keyboard & Mouse"
nodateline: true
weight: 50
---


The *HID* API allows you to make your [CampZone 2020](/badges/campzone-2020/) badge act like a keyboard and mouse over USB. You can use it to type text, press key combinations, and click or move the mouse cursor.
{{% notice tip %}}
**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)
{{% /notice %}}

# Example

```python
import hid, keycodes

hid.keyboard_type("Cyber")
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| keyboard_type | text          | - | Automatically sends the right key press and release events for the keys needed to type a text. Will use the SHIFT modifier for uppercase keys too. Blocks until the whole text has been typed.                                                    |
| keyboard_press_keys | keys, [modifier]          | - | Send key down commands over USB for the given keys. The optional modifier can be used to convey pressing ctrl, alt, shift, or the GUI/Windows button.                                                    |
| keyboard_release_keys | -          | - | Cancels all current key presses by sending a release command.                                                    |


{{% notice tip %}}
You can learn more in-depth about how this module works by checking out [its source here](https://github.com/badgeteam/ESP32-platform-firmware/blob/feature/cz20/firmware/python_modules/campzone2020/hid.py)
{{% /notice %}}
# A more complex example

```python
import hid, keycodes, time

# Presses ctrl+alt+delete
keys = bytes([keycodes.DELETE])
modifier = bytes([keycodes.MOD_LEFT_CONTROL & keycodes.MOD_LEFT_ALT])
hid.keyboard_press_keys(keys, modifier)
time.sleep(0.1)
hid.keyboard_release()
```

# Known problems
* The USB mouse interface is not yet present in the firmware at time of writing. A future Over-the-Air update will include it.