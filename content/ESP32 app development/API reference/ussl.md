---
title: "ussl"
nodateline: true
weight: 9999
---

The `ussl` API provides low-level SSL encryption and certificate verification functions and is used by other APIs such as `urequests`.

# Reference
| Command            | Parameters                                                            | Description                                                                                                                    |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| disable_warning    | Boolean: disable warning                                              | Disables the warning notifying users that the SSL connection isn't secure because the server certificate isn't verified        |
| verify_letsencrypt | Boolean: verify server certificate against Letsencrypt root           | Enables verification of the server certificate against the Letsencrypt root certificate                                        |
| wrap_socket        | (See upstream Micropython documentation)                              | (See upstream Micropython documentation)                                                                                       |
| debug_level        | 0-4                                                                   | controls the amount of debug information printed                                                                               |
