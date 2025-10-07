# node-red-contrib-nhc2

![npm version](https://badge.fury.io/js/node-red-contrib-nhc2.svg) ![Node-RED ≥3.1.0](https://img.shields.io/badge/Node--RED-%3E%3D3.1.0-brightgreen.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

Node-RED nodes for **Niko Home Control 2** via MQTT (Hobby API). Control and monitor your NHC2 system directly from Node-RED.

---

## Table of Contents

1. [Features](#features)  
2. [Prerequisites](#prerequisites)  
3. [Installation](#installation)  
4. [Usage](#usage)  
   * [NHC2 Config Node](#nhc2-config-node)  
   * [Example `secrets.json`](#example-secretsjson)  
   * [NHC2 Input Node](#nhc2-input-node)  
   * [NHC2 Output Node](#nhc2-output-node)  
   * [NHC2 Hue Mapping Node](#nhc2-hue-mapping-node)  
   * [CLI Discovery Utility](#cli-discovery-utility)  
5. [Examples](#examples)  
6. [Changelog](#changelog)  
7. [Contributing](#contributing)  
8. [License](#license)  

---

## Features

* Automatic discovery of NHC2 controllers on your network  
* Secure MQTT(S) communication with optional reconnect watchdog  
* Real-time event listening (status, brightness, etc.)  
* Control individual devices or multiple properties  
* Integration-ready for Home Assistant and other home automation platforms  
* **Hue Mapping**: Convert NHC2 values to HueMagic payloads for Philips Hue integration  

## Prerequisites

* **Node.js** ≥ 16.0.0  
* **Node-RED** ≥ 3.1.0  
* Niko Home Control 2 with the Hobby API enabled  

## Installation

```bash
cd ~/.node-red
npm install node-red-contrib-nhc2
```

Restart Node-RED to load the new nodes.

## Usage

### NHC2 Config Node

Configure your connection to the NHC2 controller.

**Settings:**

* **Host**: IP address of the controller (e.g. `192.168.0.202`)  
* **Port**: MQTT port (`8884` by default for MQTT(S))  
* **Auto Discover**: Enable UDP-based discovery of controllers  
* **Select Controller (MAC)**: Choose from discovered controllers  
* **Username**: MQTT topic prefix (default `hobby`)  
* **Password**: Hobby API password from NHC2 programming software  
* **Debug**: Enable verbose logging output  
* **Watchdog**: Listen for a keep-alive message every 30 s to reset the reconnect timer  
* **Refresh Devices**: Manually refresh the device list  

### Example `secrets.json`

If you'd like to use a `secrets.json` file instead of configuring credentials in the UI, create a file named `secrets.json` in your `node-red-contrib-nhc2` directory with the following content:

```json
{
  "username": "hobby",
  "port": 8884,
  "password": ""
}
```

* **username**: Your MQTT username (UUID)  
* **port**: MQTT port to use when secrets mode is enabled  
* **password**: *Leave blank*; it will be automatically set to your controller’s serial number upon discovery  

### NHC2 Input Node

Listen for events emitted by your NHC2 devices.

* **Inputs:** None  
* **Outputs:** 1  

**Configuration:**

* **Config**: Select your NHC2 Config node  
* **Device Filter**: Filter devices by name/model/type  
* **Device**: Select a specific device (UUID)  
* **Property**: Choose a property (`Status`, `Brightness`, etc.) or `All`  

**Output Message:**

```js
msg.topic    // Device Name
msg.payload  // Value of the selected property or object of all properties
msg.device   // Full device object returned by the controller
```

### NHC2 Output Node

Send control commands to your NHC2 devices.

* **Inputs:** 1  
* **Outputs:** 0  

**Configuration:**

* **Config**: Select your NHC2 Config node  
* **Device Filter**: Filter and select devices  
* **Device**: Choose a device to control  
* **Property**: Property to set (e.g. `Status`, leave blank for multiple)  

**Input Message Requirements:**

* If **Property** is set: `msg.payload` must be the value (e.g. `true`, `"On"`, an integer)  
* If **Property** is blank: `msg.payload` must be an object `{ PropertyName: value }` or an array of such objects  

### NHC2 Hue Mapping Node

Maps NHC2 / HA-like payloads to **Hue**-friendly objects.

**Inputs / Outputs**
- Inputs: 1
- Outputs: 1

**Editor settings**
- **Number input maps to**: `brightness` | `tunable white` | `color hue`
- **Accept color-frames as input** *(default OFF)* — accepts `{rgb:[r,g,b]}`, `{r,g,b}`, `{h,s,v}`/`{hue,sat,val}`, `{kelvin}`, `{mireds}`
- **Color input may change brightness** *(default OFF)* — when OFF, color never changes brightness
- **Auto-include CT when in white mode** *(default ON)* — always emits last CT so Hue leaves colour mode
- **Map Kelvin range to full Hue CT span (153–500)** *(default ON)* — `minKelvin → 500`, `maxKelvin → 153`
- **CT range (Kelvin)**: `minKelvin`, `maxKelvin`
- **Listen ColorMode** *(default ON)* — obey `{ ColorMode:"TunableWhite"|"Color" }` or `{ mode:"white"|"colour" }`
- **Quiet status**

**Behavior**
- **On/Off**: boolean, `{switch:true|false}`, or `{ Status:"On"|"Off" }` → `{ on:… }`
- **Brightness**: `{Brightness:"62"}` / `{brightness:62}` → `{ brightness:62 }` (sticky until changed)
- **Tunable White**:
  - `{TunableWhite:"cwww(k, x)"}` → `colorTemp` from **k**; **x is ignored for brightness**
  - `{temperature: 0..100}` → mapped across `[minKelvin..maxKelvin]`, then converted to Hue mireds
  - `{kelvin:k}` / `{mireds:m}` (when color-frames enabled)
  - Output **always** uses `colorTemp` (mireds), clamped **153–500**
  - If **Map Kelvin range…** is ON: `minKelvin → 500`, `maxKelvin → 153` linearly
- **Color**: `{Color:"hsv(h,s,v)"}` or `{Color:"rgb(r,g,b)"}` → `{ rgb:[r,g,b] }`
  - By default, no `brightness` included; turn on *Color input may change brightness* to let HSV/V set it
- **Mode switching**: `{ ColorMode:"TunableWhite" }` (or `{ mode:"white" }`) → emits latest `colorTemp` so Hue leaves colour mode; brightness sticks

#### Single integer input (0–100)
Yes, still supported and selectable via **Number input maps to**:

- **Brightness** (default): `42` → `{ "brightness": 42, "on": true }`
- **Tunable white**: `42` → `colorTemp` mapped from 42% of `[minKelvin..maxKelvin]` → mireds (clamped 153–500)
- **Color hue**: `42` → hue≈`42*3.6`°, RGB from `HSV(h,100%,V=last_brightness)` → `{ "rgb":[r,g,b] }`

**Examples**
```jsonc
// Sticky brightness
{ "Brightness":"37" }                  // → { "brightness": 37, "on": true }
{ "TunableWhite":"cwww(2700,100)" }    // → { "colorTemp": 500, "on": true }   // if map-to-full ON & minK=2700

// Percent temperature across your K-range
{ "temperature": 50 }                  // → colorTemp from 50% of [minK..maxK] → mireds (153–500)

// Explicit Kelvin
{ "kelvin": 6500 }                     // → { "colorTemp": 153 }  // with map-to-full ON and maxK=6500

// Color
{ "Color": "hsv(241,100,100)" }        // → { "rgb": [..,..,..], "on": true }  // no brightness unless option enabled
```

> ℹ️ Outputs **never** include a `color` alias or `colorTempKelvin`; use `rgb` and `colorTemp` only.
### CLI Discovery Utility

Discover NHC2 controllers via UDP broadcast on your local network:

```bash
node discover_nhc2.js [--timeout <ms>] [--multiple]
```

* `--timeout`: Discovery window in milliseconds (default: `5000`)  
* `--multiple`: Return all found controllers (default: enabled)  

**Example Output:**

```json
[
  {
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.0.202",
    "submask": "255.255.255.0",
    "version": "<firmware>",
    "serial": "<serial-number>"
  }
]
```

## Examples

Import `examples/usage_example.json` into Node-RED to see a complete demo flow.

## Changelog

For the full changelog, see [CHANGELOG.md](CHANGELOG.md).

<details>
<summary>v1.19.4 </summary>

**Added**

* Hue Mapping node (`nhc2-hue-mapping`) now supports color-objects from Niko.

</details>

<details>
<summary>v1.18.0</summary>

**Added**

* Hue Mapping node (`nhc2-hue-mapping`) to map NHC2 values to HueMagic payloads for brightness, color temperature, and RGB.

</details>

<details>
<summary>v1.17.0</summary>

**Removed**

* Use Secrets toggle removed from the Config node UI.

**Changed**

* Watchdog: listens for a keep-alive message every 30 s to reset the reconnect timer.  
* Improved the save-restore on the nodes  
* Improved filter, so it shows the first device while searching

</details>

## Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/PLO-NIKO/node-red-contrib-nhc2).

## License

MIT © Peter Løbner — Niko Home Control 2