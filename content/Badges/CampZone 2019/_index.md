---
title: "CampZone 2019"
nodateline: true
weight: -4
---

Work in progress doc

In Ubuntu

Install screen:

<code> sudo apt install screen </code>


Then add yourself to the network users

<code> sudo usermod -a -G dialout -currentUser- </code>

login or reboot

then connect and switch on the badge.

Then in the terminal execute the following:

<code> screen /dev/ttyUSB0 115200 </code>
