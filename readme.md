# NHC2 Node-RED Nodes

This repository provides custom Node-RED nodes to integrate with the Niko Home Control 2 (NHC2) system via MQTT. You can use the **NHC2 Input** and **NHC2 Output** nodes to subscribe to device status updates and send control commands, respectively.

## Default Credentials

- **Username**: `hobby` (default)
- **Password**: Obtainable in the NHC2 programming software by activating the Hobby API.

## Prerequisites

- [Node-RED](https://nodered.org/) (v4.x or later)
- NHC2 system with MQTT Hobby API enabled
- MQTT broker accessible from your Node-RED instance
- Tested with NHC 2.23

## Installation

1. Copy the `nhc2-config.html`, `nhc2-config.js`, `nhc2-input.html`, `nhc2-input.js`, `nhc2-output.html`, and `nhc2-output.js` files into a new Node-RED node module folder, e.g., `node-red-contrib-nhc2`.
2. Add a `package.json` with dependencies on `node-red`.
3. Run `npm install` in the module directory.
4. Restart Node-RED.

Alternatively, install via npm if published:

```bash
npm install node-red-contrib-nhc2
```

## Configuration

1. In Node-RED, add the **NHC2 Config** node to your flow.
2. Enter your MQTT broker details and credentials:
   - **Username**: `hobby`
   - **Password**: (activate Hobby API in NHC2 programming software to retrieve)
3. Deploy the configuration.

## Nodes

### NHC2 Config

- **Purpose**: Manage MQTT connection, fetch device list, and refresh devices.
- **Endpoints**:
  - `GET /nhc2-config/:id/devices` - return cached devices list.
  - `POST /nhc2-config/:id/refresh` - trigger a devices.list request.

### NHC2 Input

- **Purpose**: Subscribe to device status events.
- **Features**:
  - Select a configuration node with your MQTT connection.
  - Search and select a device by name (sorted alphabetically).
  - Choose a specific property or `All` to receive full payloads.
  - View a table of `PropertyDefinitions` (HasStatus, CanControl, Description).
  - **Brightness Handling**: On startup the node loads the current brightness from the latest `devices.list`. When `Brightness` is selected:
    - Any incoming brightness update is forwarded immediately.
    - The node listens for `Status` changes—sending the latest brightness (or `100` if unknown) when the device turns **On**, and `0` when it turns **Off**.
  - Node label displays `Device Name [Property]`.
  - Debug logging and status display of last payload and timestamp.

### NHC2 Output

- **Purpose**: Send control commands to devices.
- **Features**:
  - Select the same configuration node.
  - Search and select a device by name.
  - Choose a property or `All` when sending complex payloads.
  - View `PropertyDefinitions` table for reference.
  - Node label displays `Device Name [Property]`.

## Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request.

## License

MIT © Peter Løbner - Niko
