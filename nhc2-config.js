const mqtt = require('mqtt');

module.exports = function(RED) {
  // HTTP endpoint for device refresh
  RED.httpAdmin.post('/nhc2-config/:id/refresh', RED.auth.needsPermission('nhc2-config.write'), (req, res) => {
    const node = RED.nodes.getNode(req.params.id);
    if (node) {
      if (node.debug) node.log('[HTTP Admin] Refresh devices requested');
      node.refreshDevices();
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  // HTTP endpoint to get current device list
  RED.httpAdmin.get('/nhc2-config/:id/devices', RED.auth.needsPermission('nhc2-config.read'), (req, res) => {
    const node = RED.nodes.getNode(req.params.id);
    if (node) {
      res.json(node.devices || {});
    } else {
      res.sendStatus(404);
    }
  });

  function NHC2ConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.host = config.host;
    node.port = config.port || 8884;
    node.username = config.username;
    node.password = config.password;
    node.debug = config.debug;
    node.devices = {};

    const prefix = node.username;
    const options = {
      host: node.host,
      port: node.port,
      username: node.username,
      password: node.password,
      protocol: 'mqtts',
      rejectUnauthorized: false
    };

    node.client = mqtt.connect(options);
    if (node.debug) node.log(`[Config] Connecting to MQTT broker mqtts://${node.host}:${node.port}`);

    node.client.on('connect', () => {
      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
      if (node.debug) node.log('[MQTT] connected');
      node.client.subscribe(`${prefix}/control/devices/rsp`, err => {
        if (err && node.debug) node.error('[MQTT] subscribe error: ' + err);
      });
      node.refreshDevices();
    });

    node.client.on('error', err => {
      node.status({ fill: 'red', shape: 'ring', text: 'error' });
      if (node.debug) node.error('[MQTT] error: ' + err);
    });

    node.client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.Method === 'devices.list') {
          node.devices = {};
          payload.Params[0].Devices.forEach(d => { node.devices[d.Uuid] = d; });
          if (node.debug) node.log(`[Devices] ${Object.keys(node.devices).length} devices loaded`);
        }
      } catch (e) {
        if (node.debug) node.error('[Devices] parse error: ' + e);
      }
    });

    node.refreshDevices = () => {
      if (node.debug) node.log('[Devices] requesting device list');
      node.client.publish(`${prefix}/control/devices/cmd`, JSON.stringify({ Method: 'devices.list' }));
    };

    node.on('close', () => {
      if (node.client) node.client.end();
      if (node.debug) node.log('[Config] closed');
    });
  }
  RED.nodes.registerType('nhc2-config', NHC2ConfigNode);
};