---
title: "CATT pinout"
linkTitle: "CATT pinout"
nodateline: true
weight: -10
---

## Description

The CATT connector combines several different connectors in one.

- Special Addon (SAO)
- JTAG
- PMOD

Because of this multi functional nature, the name for the connector is CATT (Connect all the things), even though there are more kind of things to connect.

## SAO

<div style="background-color: white; padding: 1.5rem; margin: 1rem; display: inline-block;">
  <img src="catt-connector.svg" alt="CATT pinout">
</div>


- *DET: Detect, when pulled down during power up, JTAG functionality is provided
- *3V3: Not connected by default, jumper on the PCB needs to be closed to supply 3V3

## Schematic

![CATT schematic](catt-schematic.png)