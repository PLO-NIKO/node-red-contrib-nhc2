module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg  = RED.nodes.getNode(config.config);

    // persisted config values
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    if (cfg && cfg.client) {
      const prefix = cfg.username;
      cfg.client.subscribe(`${prefix}/control/devices/evt`);

      cfg.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.Method === 'devices.status') {
            payload.Params[0].Devices.forEach(dev => {
              // filter by selected device UUID (or allow all if none selected)
              if (!node.deviceUuid || dev.Uuid === node.deviceUuid) {
                const info = cfg.devices[dev.Uuid] || { Name: dev.Uuid };
                let out;

                if (node.property) {
                  // only send when this update contains the chosen property
                  const obj = dev.Properties.find(p => p.hasOwnProperty(node.property));
                  if (!obj) return;          // skip if property not in this update
                  out = obj[node.property];
                } else {
                  // merge all properties into one object
                  out = dev.Properties.reduce((acc, p) => Object.assign(acc, p), {});
                }

                node.send({
                  topic:   info.Name,
                  payload: out,
                  device:  info
                });
              }
            });
          }
        } catch (err) {
          if (cfg.debug) {
            node.error('[Input] parse error: ' + err);
          }
        }
      });

      node.status({ fill: 'green', shape: 'dot', text: 'listening' });
    } else {
      node.status({ fill: 'red', shape: 'ring', text: 'no config' });
    }
  }

  RED.nodes.registerType('nhc2-input', NHC2InputNode);
};
