// nhc2-output.js
module.exports = function (RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.deviceUuid = config.deviceUuid;
    node.property   = config.property;

    let statusTimeout = null;
    let cfgNode;

    function formatTime(opts) {
      return new Date().toLocaleTimeString('en-GB', opts);
    }

    function clearAndScheduleGreenStatus(timeStr, payloadStr) {
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        node.status({ fill: 'green', shape: 'dot', text: `last: ${payloadStr} at ${timeStr}` });
      }, 5000);
    }

    // Wire to each new client
    function attachOutputClient(client) {
      const prefix = cfgNode.username;

      node.on('input', msg => {
        if (!node.deviceUuid) return;

        let props;
        if (node.property) {
          props = [{ [node.property]: msg.payload }];
        } else if (Array.isArray(msg.payload)) {
          props = msg.payload;
        } else if (typeof msg.payload === 'object') {
          props = [msg.payload];
        } else {
          return node.error('When no Property is selected, msg.payload must be object/array');
        }

        const cmd = {
          Method: 'devices.control',
          Params: [{ Devices: [{ Uuid: node.deviceUuid, Properties: props }] }]
        };

        const payloadStr = JSON.stringify(props);
        const timeStr = formatTime({
          hour12: false, hour: '2-digit',
          minute: '2-digit', second: '2-digit',
          fractionalSecondDigits: 3
        });

        client.publish(`${prefix}/control/devices/cmd`, JSON.stringify(cmd));
        node.status({ fill: 'blue', shape: 'dot', text: `sent: ${payloadStr} at ${timeStr}` });
        clearAndScheduleGreenStatus(timeStr, payloadStr);
      });

      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
      node.log('NHC2 Output: client connected');

      client.on('close', () => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        node.log('NHC2 Output: client disconnected');
      });
      client.on('reconnect', () => {
        node.status({ fill: 'yellow', shape: 'ring', text: 'reconnecting' });
        node.log('NHC2 Output: client reconnecting');
      });
      client.on('connect', () => {
        node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        node.log('NHC2 Output: client connected');
      });
    }

    function init() {
      cfgNode = RED.nodes.getNode(config.config);
      if (!cfgNode) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for config' });
        return;
      }
      cfgNode.on('client', attachOutputClient);
      if (cfgNode.client && cfgNode.client.connected) {
        attachOutputClient(cfgNode.client);
      } else {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for client' });
      }
    }
    init();

    node.on('close', () => {
      if (statusTimeout) clearTimeout(statusTimeout);
      if (cfgNode) cfgNode.removeListener('client', attachOutputClient);
    });
  }

  RED.nodes.registerType('nhc2-output', NHC2OutputNode);
};
