module.exports = function(RED) {
  function NHC2InputNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const nhcConfig = RED.nodes.getNode(config.config);

    if (nhcConfig) {
      nhcConfig.client.subscribe('hobby/control/devices/evt');

      nhcConfig.client.on('message', function(topic, message) {
        const payload = JSON.parse(message);
        if(payload.Method === "devices.status"){
          payload.Params[0].Devices.forEach(device => {
            const deviceInfo = nhcConfig.devices[device.Uuid];
            if(deviceInfo){
              node.send({
                topic: deviceInfo.Name,
                payload: device.Properties[0],
                device: deviceInfo
              });
            }
          });
        }
      });

      node.status({fill:"green",shape:"dot",text:"listening"});
    } else {
      node.status({fill:"red",shape:"ring",text:"no config"});
    }
  }
  RED.nodes.registerType("nhc2-input", NHC2InputNode);
};
