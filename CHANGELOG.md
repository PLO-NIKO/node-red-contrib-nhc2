# Changelog

---

## Version 1.19.4 (2025-10-07)

**Highlights**
- Hue color temperature now always emitted as **mireds** and clamped to Hue’s valid range **153–500**.
- New option: **Map Kelvin range to full Hue CT span (153–500)** *(default ON)* — map `minKelvin → 500` (warmest) and `maxKelvin → 153` (coolest) linearly.
- **TunableWhite**: `cwww(k, x)` parses **k** only; **x is ignored for brightness** (sticky brightness behavior).
- **RGB only** for color output: emit `rgb: [r,g,b]` (removed `color` alias and `colorTempKelvin`).

**Added**
- **Accept color-frames as input** *(checkbox)*: allows `{rgb:[r,g,b]}`, `{r,g,b}`, `{h,s,v}` / `{hue,sat,val}`, `{kelvin}` / `{mireds}`.
- **Color input may change brightness** *(checkbox, default OFF)*: when ON, HSV/V or RGB luminance can set `brightness`. When OFF, color never alters brightness.
- **Auto-include CT when in white mode** *(checkbox, default ON)*: always emits last-known CT when in white mode so Hue exits colour mode.
- **Map Kelvin range to full Hue CT span (153–500)** *(checkbox, default ON)*.
- **Listen ColorMode** *(checkbox)*: obeys `{ ColorMode: "TunableWhite"|"Color" }` or `{ mode:"white"|"colour" }`.
- **Quiet status** *(checkbox)*.

**Input compatibility (parity with ha-adv)**
- On/Off: boolean payload, `{switch:true|false}`, or `{ Status:"On"|"Off" }`.
- Brightness: `{Brightness:"…"} | {brightness:…}`.
- White: `{TunableWhite:"cwww(k, x)"}` (uses **k** only), `{temperature: percent|kelvin}`.
- Color: `{Color:"hsv(h,s,v)"}` or `{Color:"rgb(r,g,b)"}`.
- (Optional) Color-frames: `{rgb:[…]}`, `{r,g,b}`, `{h,s,v}`/`{hue,sat,val}`, `{kelvin}`, `{mireds}`.

**State & mode behavior**
- Sticky values stored: last **brightness**, last **kelvin**, and last **hsv**.
- When **switching modes** without an explicit brightness, we **carry the last brightness**.
- When switching **to white mode**, we emit the latest CT (if *Auto-include CT* is ON) so Hue leaves colour mode.

**Breaking / notable changes**
- Removed `color` alias and `colorTempKelvin` from outputs; use `rgb` and `colorTemp` (mireds) only.
- Removed `ctUnit` config (always Hue mireds now).

## Version 1.17.0 (2025-08-07)

**Added**
- NHC2→Hue Mapping node with three modes (node-red-contrib-huemagic-fork):
  - **Brightness**: maps 0–100 to `brightness` (and `on` if >0)
  - **Color Temperature**: maps 0–100 to `colorTemp` (153–500 mireds)
  - **Color (RGB)**: cycles full color hue across 0–100 and outputs `rgb: [r,g,b]`


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
