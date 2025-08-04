# Changelog

## [1.15.33] - 2025-08-04
- 🟦 **Improved:**
    - Added reconnect and disconnect messages to the UI
    - Added a Watchdog that can be enabled to auto reconnect if no message is received in 45 sec (BETA)
    - Added support for Node-red in Homeassistant

## [1.14.27] - 2025-08-02
- 🟦 **Improved:**
    - Added auto discovery of the Controller by MAC (takes a bit longer to connect due to this)
    - Can still use IP-address as well, if auto discovery does not work

## [1.13.X] - 2025-07-25
- 🟦 **Improved:**
    - Added ms to timestamps

## [1.12.5] - 2025-07-25

### Enhancements

- 🟦 **Status Reporting Improved:**
  - After sending a control message, the node status now displays:
    - `sent: {payload} at HH:mm:ss`
  - Example: `sent: [{"Brightness":100}] at 14:32:11`

- ✅ **Auto-Clearing Status:**
  - After 5 seconds of no new messages, the status automatically updates to:
    - `last OK at HH:mm:ss`
  - This provides a visual heartbeat confirming the last successful publish.

- ⏰ **Timestamp Display:**
  - Both the `sent` and `last OK` status messages now include timestamps for better traceability.

### Notes

- The JSON payload is stringified for status display. Consider truncating long payloads in future versions for compact UI display.
- Added Usage examples

## [1.12.4] - 2025-07-24

### First Release