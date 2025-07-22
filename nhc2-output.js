module.exports = function(RED) {
  function NHC2OutputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const nhcConfig = RED.nodes.getNode(config.config);
    const deviceUuid = config.deviceUuid;

    node.on('input', function(msg) {
      if (nhcConfig && deviceUuid) {
        const command = {
          Method: "devices.control",
          Params: [{
            Devices: [{
              Uuid: deviceUuid,
              Properties: [msg.payload]
            }]
          }]
        };

        nhcConfig.client.publish('hobby/control/devices/cmd', JSON.stringify(command));
        node.status({fill:"blue",shape:"dot",text:"command sent"});
      } else {
        node.status({fill:"red",shape:"ring",text:"config missing"});
      }
    });
  }
  RED.nodes.registerType("nhc2-output", NHC2OutputNode);
};
