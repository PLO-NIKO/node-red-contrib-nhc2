module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg  = RED.nodes.getNode(config.config);

    // persisted config values
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    // track latest brightness value
    let lastBrightness = null;

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

                if (node.property === 'Brightness') {
                  // for brightness mode, listen to both Brightness and Status updates
                  dev.Properties.forEach(propObj => {
                    if (propObj.hasOwnProperty('Brightness')) {
                      // update and forward brightness
                      lastBrightness = propObj.Brightness;
                      node.send({ topic: info.Name, payload: lastBrightness, device: info });
                    }
                    if (propObj.hasOwnProperty('Status')) {
                      // on status change, send last brightness (or default 100), or 0
                      const status = propObj.Status;
                      const brightness = lastBrightness != null ? lastBrightness : 100;
                      const out = (status === 'On' || status === true) ? brightness : 0;
                      node.send({ topic: info.Name, payload: out, device: info });
                    }
                  });
                } else if (node.property) {
                  // only send when this update contains the chosen property
                  const obj = dev.Properties.find(p => p.hasOwnProperty(node.property));
                  if (!obj) return;          // skip if property not in this update
                  node.send({ topic: info.Name, payload: obj[node.property], device: info });
                } else {
                  // merge all properties into one object
                  const out = dev.Properties.reduce((acc, p) => Object.assign(acc, p), {});
                  node.send({ topic: info.Name, payload: out, device: info });
                }
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
