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

Map NHC2 numeric or boolean payloads to HueMagic payload objects for Philips Hue commands.

* **Inputs:** 1  
* **Outputs:** 1  

**Configuration:**  
* **Name**: Descriptive name for the node  
* **Mode**: Choose mapping mode:  
  * `brightness` (default): Map `0–100` to `brightness` (and `on` if > 0)  
  * `colorTemp`: Map `0–100` to `colorTemp` in mireds (`153–500`) and `on` if > 0  
  * `color`: Map `0–100` across the color spectrum (hue `0–360`) and convert to an RGB array  

**Behavior:**

* If `msg.payload` is a string:  
  * `"on"` / `"off"` (case-insensitive) → `{ on: true|false }`  
  * Numeric string → parsed as number and processed below  
* If `msg.payload` is a boolean → `{ on: payload }`  
* If `msg.payload` is a number → mapped according to **Mode** and output as `{ brightness|colorTemp|rgb, on? }`  
* Other payload types → warning: Unsupported payload  

**Example Flows:**

```js
// Brightness mode:
// Input msg.payload = 75
// Output msg.payload = { brightness: 75, on: true }

// Color Temperature mode:
// Input msg.payload = 50
// Output msg.payload = { colorTemp: 327, on: true }

// Color (RGB) mode:
// Input msg.payload = 100
// Output msg.payload = { rgb: [255, 0, 0], on: true }
```

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