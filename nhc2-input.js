module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    let waitInterval = null;
    let cfgNode = null;

    // Initialize or re-check configuration
    function init() {
      cfgNode = RED.nodes.getNode(config.config);
      if (!cfgNode) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for config' });
      } else if (!cfgNode.client) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for client' });
      } else {
        setupSharedListener();
        if (waitInterval) {
          clearInterval(waitInterval);
          waitInterval = null;
        }
      }
    }

    // Register node and shared handler on the config node
    function setupSharedListener() {
      // Track all input instances on this config node
      cfgNode._nhc2Listeners = cfgNode._nhc2Listeners || [];
      if (!cfgNode._nhc2Listeners.includes(node)) {
        cfgNode._nhc2Listeners.push(node);
      }

      // If shared handler not yet registered, do so now
      if (!cfgNode._nhc2HandlerRegistered) {
        const prefix = cfgNode.username;
        cfgNode.client.subscribe(`${prefix}/control/devices/evt`);
        cfgNode.client.subscribe(`${prefix}/control/devices/rsp`);

        cfgNode.client.on('message', (topic, message) => {
          let payload;
          try { payload = JSON.parse(message.toString()); }
          catch (err) { if (cfgNode.debug) RED.log.error('[NHC2 Input] JSON parse error: ' + err); return; }

          const method = payload.Method;
          const devices = payload.Params?.[0]?.Devices || [];

          // Dispatch to each registered node
          cfgNode._nhc2Listeners.forEach(n => {
            devices.forEach(dev => {
              if (!n.deviceUuid || dev.Uuid === n.deviceUuid) {
                handleDevicePayload(n, dev, method);
              }
            });
          });
        });

        cfgNode._nhc2HandlerRegistered = true;
      }

      // Indicate listening state on this node
      node.status({ fill: 'green', shape: 'dot', text: 'listening' });
      node.log('NHC2 Input: listening for events');
    }

    // Process a single device payload for a node instance
    function handleDevicePayload(n, dev, method) {
      const info = cfgNode.devices[dev.Uuid] || { Name: dev.Uuid };
      let lastB = n.context().get('lastBrightness') || null;

      // Initialize brightness from device list
      if (method === 'devices.list') {
        dev.Properties.forEach(p => {
          if (p.hasOwnProperty('Brightness')) lastB = p.Brightness;
        });
        n.context().set('lastBrightness', lastB);
        return;
      }

      // Helper to send output
      function send(out) {
        const timestamp = new Date().toLocaleTimeString('en-GB', {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
        });
        n.send({ topic: info.Name, payload: out, device: info });
        n.status({ fill: 'green', shape: 'dot', text: `${out} @ ${timestamp}` });
      }

      // If listening for Brightness, send on both brightness and status changes
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
      // If listening for a specific property
      else if (n.property) {
        dev.Properties.forEach(p => {
          if (p.hasOwnProperty(n.property)) send(p[n.property]);
        });
      }
      // If no property selected, merge and send all
      else {
        const merged = dev.Properties.reduce((acc, p) => Object.assign(acc, p), {});
        send(merged);
      }
    }

    init();
    // Continue polling until setup
    if (!waitInterval) {
      waitInterval = setInterval(init, 1000);
    }

    node.on('close', () => {
      if (waitInterval) clearInterval(waitInterval);
      if (cfgNode && cfgNode._nhc2Listeners) {
        cfgNode._nhc2Listeners = cfgNode._nhc2Listeners.filter(n => n !== node);
      }
    });
  }

  RED.nodes.registerType('nhc2-input', NHC2InputNode);
};
