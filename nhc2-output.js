module.exports = function (RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg = RED.nodes.getNode(config.config);
    const deviceUuid = config.deviceUuid;
    node.property = config.property;

    let statusTimeout = null;

    function formatTime() {
      const now = new Date();
      return now.toLocaleTimeString('en-GB'); // e.g., "14:23:07"
    }

    function clearAndScheduleGreenStatus(timeStr) {
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        node.status({ fill: 'green', shape: 'dot', text: `last OK at ${timeStr}` });
      }, 5000);
    }

    if (cfg && cfg.client) {
      const prefix = cfg.username;

      node.on('input', msg => {
        if (!deviceUuid) return;

        let props;
        if (node.property) {
          props = [{ [node.property]: msg.payload }];
        } else {
          if (Array.isArray(msg.payload)) {
            props = msg.payload;
          } else if (typeof msg.payload === 'object') {
            props = [msg.payload];
          } else {
            return node.error('When no Property is selected, msg.payload must be an object or array');
          }
        }

        const cmd = {
          Method: 'devices.control',
          Params: [{
            Devices: [{
              Uuid: deviceUuid,
              Properties: props
            }]
          }]
        };

        const payloadStr = JSON.stringify(props);
        const timeStr = formatTime();

        cfg.client.publish(`${prefix}/control/devices/cmd`, JSON.stringify(cmd));

        node.status({ fill: 'blue', shape: 'dot', text: `sent: ${payloadStr} at ${timeStr}` });
        clearAndScheduleGreenStatus(timeStr);
      });
    } else {
      node.status({ fill: 'red', shape: 'ring', text: 'no config' });
    }
  }

  RED.nodes.registerType('nhc2-output', NHC2OutputNode);
};
