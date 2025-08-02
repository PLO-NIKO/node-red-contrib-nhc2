# Changelog

## [1.14.X] - 2025-07-25
- 🟦 **Improved:**
    - Added auto discovery of the Controller by hostname


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