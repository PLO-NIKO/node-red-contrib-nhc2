module.exports = function(RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const cfg = RED.nodes.getNode(config.config);
    const deviceUuid = config.deviceUuid;

    if (cfg && cfg.client) {
      const prefix = cfg.username;
      node.on('input', msg => {
        if (deviceUuid) {
          const cmd = { Method: 'devices.control', Params: [{ Devices: [{ Uuid: deviceUuid, Properties: [msg.payload] }] }] };
          cfg.client.publish(`${prefix}/control/devices/cmd`, JSON.stringify(cmd));
          node.status({ fill: 'blue', shape: 'dot', text: 'sent' });
        }
      });
    } else {
      node.status({ fill: 'red', shape: 'ring', text: 'no config' });
    }
  }
  RED.nodes.registerType('nhc2-output', NHC2OutputNode);
};