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
* **Watchdog**: Auto-reconnect if no MQTT message received in 45 seconds (BETA)
* **Use Secrets**: Load credentials & port from `secrets.json` (requires Auto Discover)
* **Refresh Devices**: Manually refresh the device list

### Example `secrets.json`

Create a file named `secrets.json` in your `node-red-contrib-nhc2` directory with the following content:

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

For details on recent changes, see [CHANGELOG.md](CHANGELOG.md). Notable in **v1.16.0**:

* 🟦 **Use Secrets** support (`secrets.json` loading, hidden fields, enforcement)
* Auto-set password to controller serial number on discovery
* Error handling for missing or invalid `secrets.json`

## Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/PLO-NIKO/node-red-contrib-nhc2).

## License

MIT © Peter Løbner — Niko Home Control 2
