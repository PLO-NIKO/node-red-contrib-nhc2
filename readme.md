## NHC2 Node-RED Nodes

This repository provides custom Node-RED nodes and a discovery utility to integrate with the Niko Home Control 2 (NHC2) system via MQTT. You can use the **NHC2 Config**, **NHC2 Input**, and **NHC2 Output** nodes in your flows, and the included `discover_nhc2.js` script to auto-discover controllers on your network.

---

## CLI Discovery Utility

A helper script to find NHC2 controllers via UDP broadcast on your local network:

```bash
node discover_nhc2.js [--timeout <ms>] [--multiple]
```

* **timeout**: discovery window in milliseconds (default: 5000)
* **multiple**: return all found controllers (default: true)

The script outputs JSON objects with:

* `serial`: controller serial number
* `mac`: controller MAC address
* `ip`: controller IP address
* `submask`: subnet mask
* `version`: firmware version

---

## Default Credentials

* **Username**: `hobby` (default)
* **Password**: Activate the Hobby API in the NHC2 programming software to retrieve

---

## Prerequisites

* [Node-RED](https://nodered.org/) (v4.x or later)
* NHC2 system with MQTT Hobby API enabled
* MQTT broker reachable from your Node-RED instance
* Tested with NHC 2.23

---

## Installation

1. Clone or copy the following files into a Node-RED node module folder (e.g., `node-red-contrib-nhc2`):

   * `package.json`
   * `discover_nhc2.js`
   * `nhc2-config.html`, `nhc2-config.js`
   * `nhc2-input.html`, `nhc2-input.js`
   * `nhc2-output.html`, `nhc2-output.js`

2. Install dependencies and build:

   ```bash
   cd node-red-contrib-nhc2
   npm install
   ```

3. Restart Node-RED or run:

   ```bash
   npm link
   ```

Alternatively, if published on npm:

```bash
npm install node-red-contrib-nhc2
```

---

## Configuration (NHC2 Config Node)

Use the **NHC2 Config** node to manage your MQTT connection and device list:

1. **Auto Discover**: Enable to scan your local network for controllers by MAC address.

   * When checked, select your controller’s MAC from the dropdown.
   * When unchecked, enter the Host (IP or hostname) manually.
2. **Port**: MQTT port (default: `8884`).
3. **Username & Password**: Credentials for the MQTT Hobby API.
4. **Debug**: Enable verbose logging in the Node-RED console.
5. **Refresh Devices**: Click to request an updated device list from the controller.

The node maintains a cache of devices and their properties, exposed via HTTP endpoints:

* `GET /nhc2-config/:id/devices` — returns the current devices list.
* `POST /nhc2-config/:id/refresh` — triggers a fresh devices.list command.

---

## NHC2 Input Node

Subscribe to device status and events:

* **Config**: Select your NHC2 Config node.
* **Search**: Filter devices by name, model, type, or location.
* **Device**: Choose a device; the node stores its name for dynamic labeling.
* **Property**: Select a specific property or leave blank for `All`.
* **Definitions**: View a table of property metadata (`HasStatus`, `CanControl`, description).

**Brightness Handling**:

* On startup, the node initializes `lastBrightness` from the latest devices.list response.
* When **Brightness** is selected:

  * Incoming brightness updates are forwarded immediately.
  * Status changes trigger sending the last known brightness (or `100` if unknown) on turns **On**, and `0` when **Off**.

**Node Label**: Displays `<Device Name> [<Property>]`, e.g., `Living Room Light [Brightness]`.

**Debug & Status**: The node’s status panel shows the last payload and timestamp, e.g., `75 @ 14:32:11.123`.

---

## NHC2 Output Node

Send control commands to devices:

* **Config**: Select your NHC2 Config node.
* **Search**: Filter devices by name, model, type, or location.
* **Device**: Choose the target device; its name is stored for labeling.
* **Property**: Select a property or leave blank to send complex payloads.
* **Definitions**: View the reference table of properties.

**Payload**:

* If a **Property** is selected, `msg.payload` should be the value to set.
* If **All** is selected, `msg.payload` must be an object (or array of objects) representing the properties.

**Status Display**:

* On send, the node publishes to `<username>/control/devices/cmd`:

  ```json
  { "Method": "devices.control", "Params": [{ "Devices": [{ "Uuid": "<deviceUuid>", "Properties": [...] }] }] }
  ```
* Shows a blue dot: `sent: [{"Brightness":100}] at 14:32:11.123`.
* After 5s, auto-clears to green: `last: [{"Brightness":100}] at 14:32:11.123`.

**Node Label**: Displays `<Device Name> [<Property>]`, e.g., `Kitchen Dimmer [Status]`.

---

## Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request.

---

## License

MIT © Peter Løbner — Niko Home Control 2
