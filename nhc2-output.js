module.exports=function(RED){
  function NHC2OutputNode(config){
    RED.nodes.createNode(this,config);
    const node=this;
    const cfg=RED.nodes.getNode(config.config);
    const du=config.deviceUuid;
    node.propertyName=config.propertyName;
    if(cfg&&cfg.client){
      node.on('input',msg=>{
        if(du){
          const props=node.propertyName?{[node.propertyName]:msg.payload}:msg.payload;
          const cmd={Method:'devices.control',Params:[{Devices:[{Uuid:du,Properties:props}]}]};
          cfg.client.publish(`${cfg.username}/control/devices/cmd`,JSON.stringify(cmd));
          node.status({fill:'blue',shape:'dot',text:'sent'});
        }
      });
    } else node.status({fill:'red',shape:'ring',text:'no config'});
  }
  RED.nodes.registerType('nhc2-output',NHC2OutputNode);
};