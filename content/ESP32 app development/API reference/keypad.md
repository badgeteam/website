---
title: "Keypad"
nodateline: true
weight: 50
---


The *keypad* API allows you to call functions when someone presses a button on the silicone keypad of their [CampZone 2020](/badges/campzone-2020/) badge.
{{% notice tip %}}
**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)
{{% /notice %}}

# Example

```python
import keypad

def on_key(key_index, is_pressed):
    # Print to the serial port when a button is pressed or released
    print('Key ' + key_index + ': ' + is_pressed)

keypad.add_handler(on_key)
```

# Reference

| Command            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| add_handler        | handler                    | - | Registers a handler function, that is called any time a keypad button is pressed or released. The first argument is the key index (0 top left, 3 top right, 12 bottom left, etc.), and the second argument is whether the button is currently pressed or not.                                                    |
| remove_handler     | handler                    | - | Removes previously registered handler function, so it won't be called anymore.                                                    |
| get_state          | -                          | touch_state | Returns a list of 16 booleans indicating for each button whether they are currently pressed.                                                    |
