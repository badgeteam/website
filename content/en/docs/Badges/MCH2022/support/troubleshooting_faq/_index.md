---
title: "Troubleshooting & FAQ"
linkTitle: "FAQ & Troubleshooting"
nodateline: true
weight: -10
---

This page is intended to collect answers to questions that pop up frequently and
solutions to common problems...

# OMGWTFBBQ "FAIL"!?

In case you see this when first booting your Badge:

![OMG, Fail!?](bootfailure.jpg)

Don't worry, that just means one of the elves in Santa's workshop forgot to
confirm that the self-test passed. Plug it into USB, and press A.


# The kite in the front is flashing RED!? Am I in danger!?

You're probably fine. But be sure to drink plenty of water.
But you will need to:

- Download the the [RP2040 coprocessor firmware U2F](https://github.com/badgeteam/ota/blob/master/mch2022-rp2040/mch2022.uf2)
- Turn the Badge off ( with the switch labeled ON-OFF)
- Hold the `SELECT` button while turning the switch back to ON
- Make sure a USB cable is connected to your computer
- The Badge will mount as a mass storage device (MSD, a.k.a USB thumbdrive)
- Drag-n-drop (or whatever it is you Linux-from-Scratch folks do ...) the U2F firmware onto the drive

This sound way more complicated than it is, you'll figure it out. In case you don't that means we msessed up something else as well, please bring your Badge to the [Badge tent](https://map.mch2022.org/#map=20/5.5274/52.2839/0) so we can have a look to see what went wrong.
