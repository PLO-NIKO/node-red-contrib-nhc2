const mqtt = require('mqtt');
const fs = require('fs-extra');

module.exports = function(RED) {
  function NHC2ConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.host = config.host;
    node.port = config.port || 8884;
    node.username = config.username;
    node.password = config.password;
    node.caPath = config.caPath;
    node.devices = {};

    const options = {
      host: node.host,
      port: node.port,
      username: node.username,
      password: node.password,
      ca: fs.readFileSync(node.caPath),
      protocol: 'mqtts'
    };

    node.client = mqtt.connect(options);

    node.client.on('connect', function() {
      node.status({fill:"green",shape:"dot",text:"connected"});
      node.client.subscribe('hobby/control/devices/rsp');
    });

    node.client.on('message', function(topic, message) {
      const payload = JSON.parse(message);
      if(payload.Method === "devices.list"){
        payload.Params[0].Devices.forEach(device => {
          node.devices[device.Uuid] = device;
        });
      }
    });

    node.refreshDevices = function() {
      node.client.publish('hobby/control/devices/cmd', JSON.stringify({Method: "devices.list"}));
    };

    node.on('close', function() {
      node.client.end();
    });
  }
  RED.nodes.registerType("nhc2-config", NHC2ConfigNode);
};