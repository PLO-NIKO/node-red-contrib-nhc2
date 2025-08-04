// nhc2-input.js
module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    let cfgNode;
    let currentHandler;

    // Attach to a fresh client
    function attachClient(client) {
      const prefix = cfgNode.username;
      client.subscribe(`${prefix}/control/devices/evt`);
      client.subscribe(`${prefix}/control/devices/rsp`);

      if (currentHandler) {
        client.off('message', currentHandler);
      }
      currentHandler = (topic, message) => {
        let payload;
        try {
          payload = JSON.parse(message.toString());
        } catch (err) {
          if (cfgNode.debug) node.error('[NHC2 Input] JSON parse error: ' + err);
          return;
        }
        const method  = payload.Method;
        const devices = payload.Params?.[0]?.Devices || [];
        devices.forEach(dev => {
          if (!node.deviceUuid || dev.Uuid === node.deviceUuid) {
            handleDevicePayload(node, dev, method);
          }
        });
      };
      client.on('message', currentHandler);

      // Mirror MQTT status
      client.on('close', () => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        node.log('NHC2 Input: client disconnected');
      });
      client.on('reconnect', () => {
        node.status({ fill: 'yellow', shape: 'ring', text: 'reconnecting' });
        node.log('NHC2 Input: client reconnecting');
      });
      client.on('connect', () => {
        node.status({ fill: 'green', shape: 'dot', text: 'listening' });
        node.log('NHC2 Input: client listening');
      });

      node.status({ fill: 'green', shape: 'dot', text: 'listening' });
      node.log('NHC2 Input: listening for events');
    }

    // Exactly the same payload‐dispatch logic you had
    function handleDevicePayload(n, dev, method) {
      const info = cfgNode.devices[dev.Uuid] || { Name: dev.Uuid };
      let lastB = n.context().get('lastBrightness') || null;

      if (method === 'devices.list') {
        dev.Properties.forEach(p => {
          if (p.hasOwnProperty('Brightness')) lastB = p.Brightness;
        });
        n.context().set('lastBrightness', lastB);
        return;
      }

      function send(val) {
        const ts = new Date().toLocaleTimeString('en-GB', {
          hour12: false, hour: '2-digit',
          minute: '2-digit', second: '2-digit',
          fractionalSecondDigits: 3
        });
        n.send({ topic: info.Name, payload: val, device: info });
        n.status({ fill: 'green', shape: 'dot', text: `${val} @ ${ts}` });
      }

      if (n.property === 'Brightness') {
        dev.Properties.forEach(p => {
          if (p.hasOwnProperty('Brightness')) {
            lastB = p.Brightness;
            send(lastB);
          }
          if (p.hasOwnProperty('Status')) {
            const out = (p.Status === 'On' || p.Status === true) ? lastB : 0;
            send(out);
          }
        });
        n.context().set('lastBrightness', lastB);
      }
      else if (n.property) {
        dev.Properties.forEach(p => {
          if (p.hasOwnProperty(n.property)) send(p[n.property]);
        });
      }
      else {
        const merged = dev.Properties.reduce((acc, p) => Object.assign(acc, p), {});
        send(merged);
      }
    }

    // Initial wiring
    function init() {
      cfgNode = RED.nodes.getNode(config.config);
      if (!cfgNode) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for config' });
        return;
      }
      // Re‐attach whenever we get a fresh client
      cfgNode.on('client', attachClient);
      if (cfgNode.client && cfgNode.client.connected) {
        attachClient(cfgNode.client);
      } else {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for client' });
      }
    }
    init();

    node.on('close', () => {
      if (cfgNode) {
        cfgNode.removeListener('client', attachClient);
        if (cfgNode.client && currentHandler) {
          cfgNode.client.off('message', currentHandler);
        }
      }
    });
  }

  RED.nodes.registerType('nhc2-input', NHC2InputNode);
};
