module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg = RED.nodes.getNode(config.config);
    node.deviceUuid = config.deviceUuid;

    if (cfg && cfg.client) {
      const prefix = cfg.username;
      cfg.client.subscribe(`${prefix}/control/devices/evt`);

      cfg.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.Method === 'devices.status') {
            payload.Params[0].Devices.forEach(dev => {
              if (!node.deviceUuid || dev.Uuid === node.deviceUuid) {
                const info = cfg.devices[dev.Uuid] || { Name: dev.Uuid };
                node.send({ topic: info.Name, payload: dev.Properties[0], device: info });
              }
            });
          }
        } catch (e) {
          if (cfg.debug) node.error('[Input] parse error: ' + e);
        }
      });
      node.status({ fill: 'green', shape: 'dot', text: 'listening' });
    } else {
      node.status({ fill: 'red', shape: 'ring', text: 'no config' });
    }
  }
  RED.nodes.registerType('nhc2-input', NHC2InputNode);
};