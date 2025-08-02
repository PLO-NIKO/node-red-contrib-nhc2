const mqtt = require('mqtt');
const { discoverController } = require('./discover_nhc2');

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

  RED.httpAdmin.get('/nhc2-config/discover', RED.auth.needsPermission('nhc2-config.read'), async (req, res) => {
    const controllers = await discoverController({timeout:5000, multiple:true});
    res.json(controllers || []);
  });

  function NHC2ConfigNode(config){
    RED.nodes.createNode(this,config);
    const node=this;
    node.autodiscover=config.autodiscover;
    node.host=config.host;
    node.port=config.port||8884;
    node.username=config.username;
    node.password=config.password;
    node.debug=config.debug;
    node.devices={};
    node.mac=config.mac;

    const prefix=node.username;

    async function connectMQTT(){
      if(node.autodiscover){
        const controllers = await discoverController({multiple:true});
        const controller = controllers.find(c => c.mac === node.mac);
        if(controller){
          node.host = controller.ip;
          if(node.debug) node.log(`Discovered controller at ${node.host} (MAC: ${node.mac})`);
        }else{
          node.status({fill:'red',shape:'ring',text:'controller not found'});
          node.error('No matching controller found');
          return;
        }
      }

      node.client = mqtt.connect({
        host:node.host,
        port:node.port,
        username:node.username,
        password:node.password,
        protocol:'mqtts',
        rejectUnauthorized:false,
        reconnectPeriod: 5000
      });

      node.client.on('connect',()=>{
        node.status({fill:'green',shape:'dot',text:'connected'});
        if(node.debug) node.log('[MQTT] connected, subscribing and requesting device list');
        node.client.subscribe(`${prefix}/control/devices/rsp`);
        node.refreshDevices();
      });

      node.client.on('message',(topic,message)=>{
        try{
          const p=JSON.parse(message.toString());
          if(p.Method==='devices.list'){
            node.devices={};
            p.Params[0].Devices.forEach(d=>{node.devices[d.Uuid]=d;});
            if(node.debug) node.log(`[Devices] loaded ${Object.keys(node.devices).length}`);
          }
        }catch(e){if(node.debug)node.error('[Devices] parse error '+e);}    
      });

      node.client.on('close',()=>node.status({fill:'red',shape:'ring',text:'disconnected'}));
      node.client.on('reconnect',()=>node.status({fill:'yellow',shape:'ring',text:'reconnecting'}));
    }

    node.refreshDevices=()=>{
      if(node.client && node.client.connected){
        node.client.publish(`${prefix}/control/devices/cmd`,JSON.stringify({Method:'devices.list'}));
      }
    };

    connectMQTT();

    node.on('close',()=>{if(node.client)node.client.end();if(node.debug)node.log('[Config] closed');});
  }

  RED.nodes.registerType('nhc2-config',NHC2ConfigNode);
};
