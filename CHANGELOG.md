# Changelog

---

## Version 1.17.0 (2025-08-06)

**Removed**

* Use Secrets toggle removed from the Config node UI.

**Changed**

* Watchdog: listens for a keep-alive message every 30 seconds to reset the reconnect timer.
* Improved the save-restore on the nodes
* Improved filter, so it shows the first device while searching

---

## Version 1.16.0 (2025-08-04)

**Added**

* Use Secrets option in the Config node:

  * Load `username` and `port` from `secrets.json` when Auto-Discover is enabled.
  * Automatically set the MQTT password to the controller’s serial number upon discovery.
  * Hide **Host**, **Port**, **Username** & **Password** fields when using secrets.
  * Enforce that Use Secrets can only be enabled if Auto-Discover is checked.
  * Error out if `secrets.json` is missing or cannot be parsed.

---

## Version 1.15.33 (2025-08-04)

**Changed**

* Added reconnect and disconnect messages to the UI.
* Watchdog (BETA): auto-reconnect if no message is received within 45 seconds.
* Added support for Node-RED integration in Home Assistant.

---

## Version 1.14.27 (2025-08-02)

**Changed**

* Auto discovery of controller by MAC (may increase initial connection time).
* Option to use IP address if auto discovery fails.

---

## Version 1.13.X (2025-07-25)

**Changed**

* Timestamps now include milliseconds.

---

## Version 1.12.5 (2025-07-25)

**Enhancements**

* Status Reporting Improved:

  * After sending a control message, the node status displays `sent: {payload} at HH:mm:ss`.
* Auto-Clearing Status:

  * After 5 seconds of no new messages, status updates to `last OK at HH:mm:ss`.
* Timestamp Display:

  * Both `sent` and `last OK` messages include timestamps for better traceability.

**Notes**

* JSON payload is stringified for status display. Consider truncating long payloads for a more compact UI.
* Added usage examples.

---

## Version 1.12.4 (2025-07-24)

**Initial Release**
