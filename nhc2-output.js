module.exports = function (RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.deviceUuid = config.deviceUuid;
    node.property = config.property;

    let statusTimeout = null;
    let waitInterval = null;
    let connectListener = null;
    let isSetup = false;
    let cfgNode = null;

    function formatTime(opts) {
      return new Date().toLocaleTimeString('en-GB', opts);
    }

    function clearAndScheduleGreenStatus(timeStr, payloadStr) {
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        node.status({ fill: 'green', shape: 'dot', text: `last: ${payloadStr} at ${timeStr}` });
      }, 5000);
    }

    function setupClient(cfg) {
      if (isSetup) return;
      isSetup = true;

      if (connectListener) {
        cfg.client.removeListener('connect', connectListener);
        connectListener = null;
      }
      if (waitInterval) {
        clearInterval(waitInterval);
        waitInterval = null;
      }

      const prefix = cfg.username;

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
          return node.error('When no Property is selected, msg.payload must be an object or array');
        }

        const cmd = {
          Method: 'devices.control',
          Params: [{ Devices: [{ Uuid: node.deviceUuid, Properties: props }] }]
        };

        const payloadStr = JSON.stringify(props);
        const timeStr = formatTime({
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        });

        cfg.client.publish(`${prefix}/control/devices/cmd`, JSON.stringify(cmd));
        node.status({ fill: 'blue', shape: 'dot', text: `sent: ${payloadStr} at ${timeStr}` });
        clearAndScheduleGreenStatus(timeStr, payloadStr);
      });

      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
      node.log('NHC2 Output: config client connected');
    }

    function init() {
      cfgNode = RED.nodes.getNode(config.config);
      if (!cfgNode) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for config' });
        waitInterval = setInterval(init, 1000);
        return;
      }
      if (!cfgNode.client) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'waiting for client' });
        waitInterval = setInterval(init, 1000);
        return;
      }
      if (!cfgNode.client.connected) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
        connectListener = () => setupClient(cfgNode);
        cfgNode.client.on('connect', connectListener);
        return;
      }
      setupClient(cfgNode);
    }

    init();

    node.on('close', () => {
      if (statusTimeout) clearTimeout(statusTimeout);
      if (waitInterval) clearInterval(waitInterval);
      if (connectListener && cfgNode && cfgNode.client) {
        cfgNode.client.removeListener('connect', connectListener);
      }
    });
  }

  RED.nodes.registerType('nhc2-output', NHC2OutputNode);
};