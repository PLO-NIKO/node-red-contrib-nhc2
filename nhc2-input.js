module.exports=function(RED){
  function NHC2InputNode(config){
    RED.nodes.createNode(this,config);
    const node=this;
    const cfg=RED.nodes.getNode(config.config);
    node.deviceUuid=config.deviceUuid;
    node.propertyName=config.propertyName;
    if(cfg&&cfg.client){
      cfg.client.subscribe(`${cfg.username}/control/devices/evt`);
      cfg.client.on('message',(t,m)=>{
        try{
          const p=JSON.parse(m.toString());
          if(p.Method==='devices.status'){
            p.Params[0].Devices.forEach(dev=>{
              if(!node.deviceUuid||dev.Uuid===node.deviceUuid){
                const info=cfg.devices[dev.Uuid]||{Name:dev.Uuid};
                const props=dev.Properties[0];
                const payload=node.propertyName?props[node.propertyName]:props;
                node.send({topic:info.Name,payload,device:info});
              }
            });
          }
        }catch(e){if(cfg.debug)node.error('[Input] parse error '+e);}      
      });
      node.status({fill:'green',shape:'dot',text:'listening'});
    } else node.status({fill:'red',shape:'ring',text:'no config'});
  }
  RED.nodes.registerType('nhc2-input',NHC2InputNode);
};