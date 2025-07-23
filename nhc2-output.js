module.exports = function(RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node       = this;
    const cfg        = RED.nodes.getNode(config.config);
    const deviceUuid = config.deviceUuid;
    node.property    = config.property;  // ← new

    if (cfg && cfg.client) {
      const prefix = cfg.username;
      node.on('input', msg => {
        if (!deviceUuid) return;
        let props;
        if (node.property) {
          // wrap single value
          props = [{ [node.property]: msg.payload }];
        } else {
          // expect user to send full JSON (object or array)
          if (Array.isArray(msg.payload)) {
            props = msg.payload;
          } else if (typeof msg.payload === 'object') {
            props = [ msg.payload ];
          } else {
            // nothing sensible to do
            return node.error('When no Property is selected, msg.payload must be an object or array');
          }
        }
        const cmd = {
          Method: 'devices.control',
          Params: [{
            Devices: [{
              Uuid:       deviceUuid,
              Properties: props
            }]
          }]
        };
        cfg.client.publish(`${prefix}/control/devices/cmd`, JSON.stringify(cmd));
        node.status({ fill: 'blue', shape: 'dot', text: 'sent' });
      });
    } else {
      node.status({ fill: 'red', shape: 'ring', text: 'no config' });
    }
  }

  RED.nodes.registerType('nhc2-output', NHC2OutputNode);
};
