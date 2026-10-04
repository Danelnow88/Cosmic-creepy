// Apariencia aprobada: geometría y movimiento visual, nunca estado de combate.
(() => {
  'use strict';
  const NV=window.NV,base=NV.PILOT_ANIMATION_BASELINE,env=base.environment,N=env.noise;
  const shapes=Object.freeze({boti:'woven',nova:'radial',rook:'peaks',swarm:'asymmetric'});
  const configs=Object.freeze(Object.fromEntries(Object.entries(shapes).map(([id,shape],index)=>
    [id,Object.freeze({id,shape,parameters:base.settings[id],seed:index*N.pilotSeedStep+N.seedBase})])));
  const cache=new Map(),TAU=Math.PI*2;
  function hash(value){let x=value|0;x=Math.imul(x^(x>>>16),N.hashMix);x=Math.imul(x^(x>>>16),N.hashMix);return ((x^(x>>>16))>>>0)/4294967296;}
  function noise(seed,time){const k=Math.floor(time),f=time-k,s=f*f*(3-2*f);return (hash(seed+k*N.cellStep)*(1-s)+hash(seed+(k+1)*N.cellStep)*s)*2-1;}
  function nativeVertex(i,count,radius,amount,speed,seed,frame,jitter){
    const a=i/count*TAU,t=frame*.025;
    const r=radius+(Math.sin(a*4+t*8*speed+seed)+Math.cos(a*3-t*10*speed+seed*2))*amount+jitter;
    return {x:Math.cos(a)*r,y:Math.sin(a)*r};
  }
  function trace(ctx,c,frame,layer,radius,count,amount,speed,seed){
    const key=c.id+':'+layer,signature=[radius,count,amount,speed,seed].join(':');
    let entry=cache.get(key);
    if(!entry||entry.signature!==signature){
      const preceding=base.rendererContract.layers[c.id].slice(0,layer).reduce((n,l)=>n+l.points+1,0);
      const reference=Array.from({length:count+1},(_,i)=>nativeVertex(i,count,radius,amount,speed,seed,env.anchor,
        (hash(c.seed+Math.floor(env.anchor)*N.frameSeedStep+(preceding+i+1)*N.drawSeedStep)-.5)*2.5));
      entry={signature,reference,shape:NV.pilotGeometry.points(c.shape,reference),field:reference.map(()=>({x:0,y:0}))};
      cache.set(key,entry); // Como máximo dos capas por piloto; no crece por frame.
    }
    const p=c.parameters,moving=env.anchor+(frame-env.anchor)*p.speed,weight=p.amplitude*(1-p.stability);
    for(let i=0;i<=count;i++){
      const a=i/count*TAU,b=entry.reference[i],m=nativeVertex(i,count,radius,amount,speed,seed,moving,0);
      const jitter=noise(c.seed+layer*N.layerSeedStep+(i%count)*N.vertexSeedStep,frame/env.fps*N.frequency)*N.amplitude*p.micro;
      // Conservar el orden aritmético del laboratorio, también en el frame ancla.
      entry.field[i].x=(b.x+(m.x-b.x)*weight+Math.cos(a)*jitter)-b.x;
      entry.field[i].y=(b.y+(m.y-b.y)*weight+Math.sin(a)*jitter)-b.y;
    }
    for(let i=0;i<entry.shape.length;i++){
      const point=entry.shape[i],d=NV.pilotGeometry.sample(entry.field,i/(entry.shape.length-1));
      if(i===0)ctx.moveTo(point.x+d.x,point.y+d.y);else ctx.lineTo(point.x+d.x,point.y+d.y);
    }
  }
  NV.pilotAppearance=Object.freeze({shapes,get:id=>configs[id],trace,
    detailFrame:(c,frame)=>env.anchor+(frame-env.anchor)*c.parameters.detailSpeed,bobScale:env.bodyBobScale});
})();
