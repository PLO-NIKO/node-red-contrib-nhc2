const mqtt = require('mqtt');
module.exports = function(RED) {
  RED.httpAdmin.post('/nhc2-config/:id/refresh', RED.auth.needsPermission('nhc2-config.write'), (req,res)=>{
    const node=RED.nodes.getNode(req.params.id);
    if(node){node.refreshDevices();res.sendStatus(200);}else res.sendStatus(404);
  });
  RED.httpAdmin.get('/nhc2-config/:id/devices', RED.auth.needsPermission('nhc2-config.read'), (req,res)=>{
    const node=RED.nodes.getNode(req.params.id);
    if(node) res.json(node.devices||{});
    else res.sendStatus(404);
  });
  function NHC2ConfigNode(config){
    RED.nodes.createNode(this,config);
    const node=this;
    node.host=config.host;node.port=config.port||8884;
    node.username=config.username;node.password=config.password;
    node.debug=config.debug;node.devices={};
    const prefix=node.username;
    const client=mqtt.connect({host:node.host,port:node.port,username:node.username,password:node.password,protocol:'mqtts',rejectUnauthorized:false});
    node.client=client;
    client.on('connect',()=>{
      node.status({fill:'green',shape:'dot',text:'connected'});
      if(node.debug) node.log('[MQTT] connected, subscribing and requesting device list');
      client.subscribe(`${prefix}/control/devices/rsp`,err=>{if(err&&node.debug)node.error(err);});
      node.refreshDevices();
    });
    client.on('message',(topic,message)=>{
      try{
        const p=JSON.parse(message.toString());
        if(p.Method==='devices.list'){
          node.devices={};
          p.Params[0].Devices.forEach(d=>{node.devices[d.Uuid]=d;});
          if(node.debug) node.log(`[Devices] loaded ${Object.keys(node.devices).length}`);
        }
      }catch(e){if(node.debug)node.error('[Devices] parse error '+e);}    
    });
    node.refreshDevices=()=>client.publish(`${prefix}/control/devices/cmd`,JSON.stringify({Method:'devices.list'}));
    node.on('close',()=>{if(node.client)node.client.end();if(node.debug)node.log('[Config] closed');});
  }
  RED.nodes.registerType('nhc2-config',NHC2ConfigNode);
};