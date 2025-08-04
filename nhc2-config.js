const mqtt = require('mqtt');
const { discoverController } = require('./discover_nhc2');

module.exports = function(RED) {

  // Admin HTTP endpoints
  RED.httpAdmin.post(
    '/nhc2-config/:id/refresh',
    RED.auth.needsPermission('nhc2-config.write'),
    (req, res) => {
      const node = RED.nodes.getNode(req.params.id);
      if (node) {
        node.refreshDevices();
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    }
  );

  RED.httpAdmin.get(
    '/nhc2-config/:id/devices',
    RED.auth.needsPermission('nhc2-config.read'),
    (req, res) => {
      const node = RED.nodes.getNode(req.params.id);
      if (node) res.json(node.devices || {});
      else res.sendStatus(404);
    }
  );

  RED.httpAdmin.get(
    '/nhc2-config/discover',
    RED.auth.needsPermission('nhc2-config.read'),
    async (req, res) => {
      const controllers = await discoverController({ timeout: 5000, multiple: true });
      res.json(controllers || []);
    }
  );

  function NHC2ConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.autodiscover = config.autodiscover;
    node.host = config.host;
    node.port = config.port || 8884;
    node.username = config.username;
    node.password = config.password;
    node.debug = config.debug;
    node.watchdog = config.watchdog;
    node.devices = {};
    node.mac = config.mac;

    let messageTimer = null;
    const prefix = node.username;

    // Try to rediscover by MAC
    async function updateHost() {
      if (!node.autodiscover) return;
      try {
        const ctrls = await discoverController({ timeout: 5000, multiple: true });
        const match = ctrls.find(c => c.mac === node.mac);
        if (match) {
          node.host = match.ip;
          if (node.debug) node.log(`[Autodiscover] IP -> ${node.host}`);
        } else if (node.debug) {
          node.log(`[Autodiscover] no match; keeping ${node.host}`);
        }
      } catch (err) {
        if (node.debug) node.error(`[Autodiscover] ${err.message}`);
      }
    }

    // Connect / reconnect loop
    async function connectMQTT() {
      await updateHost();

      // Create a fresh MQTT client instance
      node.client = mqtt.connect({
        host: node.host,
        port: node.port,
        username: node.username,
        password: node.password,
        protocol: 'mqtts',
        rejectUnauthorized: false,
        reconnectPeriod: 0 // we handle retry manually
      });

      // Watchdog: if no message in 45s, force reconnect
      function resetWatchdog() {
        // only run when checkbox is on
        if (!node.watchdog) return;
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => {
          node.status({ fill: 'yellow', shape: 'ring', text: 'no messages, reconnecting' });
          if (node.debug) node.log('[Watchdog] no message in 45s, forcing reconnect');
          node.emit('disconnect');
          node.client.end();
        }, 45000);
      }

      node.client.on('connect', () => {
        node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        if (node.debug) node.log('[MQTT] connected');
        node.client.subscribe(`${prefix}/control/devices/rsp`);
        node.refreshDevices();

        // Notify child nodes of new client
        node.emit('client', node.client);

        // Start watchdog
        resetWatchdog();
      });

      node.client.on('message', (topic, message) => {
        // Reset watchdog on each message
        resetWatchdog();
        try {
          const p = JSON.parse(message.toString());
          if (p.Method === 'devices.list') {
            node.devices = {};
            p.Params[0].Devices.forEach(d => {
              node.devices[d.Uuid] = d;
            });
            if (node.debug) node.log(`[Devices] ${Object.keys(node.devices).length} loaded`);
          }
        } catch (e) {
          if (node.debug) node.error('[Devices] parse error ' + e);
        }
      });

      node.client.on('close', async () => {
        // Clear watchdog
        if (messageTimer) clearTimeout(messageTimer);
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        if (node.debug) node.log('[MQTT] closed — retry in 5s');
        // Notify child nodes of disconnect
        node.emit('disconnect');
        await updateHost();
        setTimeout(connectMQTT, 5000);
      });

            // MQTT error handler — ignore client-initiated disconnects
      node.client.on('error', err => {
        if (err.message === 'client disconnecting') {
          // silent ignore
          return;
        }
        // emit disconnect for other errors
        node.emit('disconnect');
        if (node.debug) node.error('[MQTT] ' + err.message);
      });
    }

    // Manual refresh trigger
    node.refreshDevices = () => {
      if (node.client && node.client.connected) {
        node.client.publish(
          `${prefix}/control/devices/cmd`,
          JSON.stringify({ Method: 'devices.list' })
        );
      }
    };

    connectMQTT();

    node.on('close', () => {
      if (node.client) node.client.end();
      if (messageTimer) clearTimeout(messageTimer);
      if (node.debug) node.log('[Config] closed');
      // Final disconnect emit
      node.emit('disconnect');
    });
  }

  RED.nodes.registerType('nhc2-config', NHC2ConfigNode);
};
