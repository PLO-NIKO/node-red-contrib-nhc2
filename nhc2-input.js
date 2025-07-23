module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg  = RED.nodes.getNode(config.config);

    // persisted config values
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    // track latest brightness value per device
    let lastBrightness = null;

    if (cfg && cfg.client) {
      const prefix = cfg.username;
      // subscribe to events and initial device list responses
      cfg.client.subscribe(`${prefix}/control/devices/evt`);
      cfg.client.subscribe(`${prefix}/control/devices/rsp`);

      cfg.client.on('message', (topic, message) => {
        if (cfg.debug) {
          node.debug(`[Input] MQTT message on topic ${topic}: ${message.toString()}`);
        }
        try {
          const payload = JSON.parse(message.toString());

          // initial list contains starting brightness
          if (payload.Method === 'devices.list') {
            if (cfg.debug) node.debug('[Input] Handling devices.list');
            const devices = payload.Params[0].Devices || [];
            devices.forEach(dev => {
              if (dev.Uuid === node.deviceUuid && node.property === 'Brightness') {
                dev.Properties.forEach(p => {
                  if (p.hasOwnProperty('Brightness')) {
                    lastBrightness = p.Brightness;
                    if (cfg.debug) node.debug(`[Input] Init brightness for ${dev.Uuid}: ${lastBrightness}`);
                  }
                });
              }
            });
          }

          // status updates (evt) for brightness/status
          if (payload.Method === 'devices.status') {
            if (cfg.debug) node.debug('[Input] Handling devices.status');
            payload.Params[0].Devices.forEach(dev => {
              if (!node.deviceUuid || dev.Uuid === node.deviceUuid) {
                const info = cfg.devices[dev.Uuid] || { Name: dev.Uuid };

                if (node.property === 'Brightness') {
                  // always forward brightness and listen for status
                  dev.Properties.forEach(propObj => {
                    if (propObj.hasOwnProperty('Brightness')) {
                      lastBrightness = propObj.Brightness;
                      if (cfg.debug) node.debug(`[Input] Received Brightness ${lastBrightness} for ${dev.Uuid}`);
                      node.send({ topic: info.Name, payload: lastBrightness, device: info });
                    }
                    if (propObj.hasOwnProperty('Status')) {
                      const status = propObj.Status;
                      const brightness = lastBrightness != null ? lastBrightness : 100;
                      const out = (status === 'On' || status === true) ? brightness : 0;
                      if (cfg.debug) node.debug(`[Input] Status ${status} for ${dev.Uuid}, sending payload ${out}`);
                      node.send({ topic: info.Name, payload: out, device: info });
                    }
                  });
                } else if (node.property) {
                  // only send when this update contains the chosen property
                  const obj = dev.Properties.find(p => p.hasOwnProperty(node.property));
                  if (!obj) return;
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
