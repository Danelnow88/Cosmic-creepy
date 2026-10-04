// Geometría pura. No recibe perfil, tiempo, ruido, velocidad ni estado de animación.
(() => {
  'use strict';
  const TAU=Math.PI*2;
  // 'original' queda disponible sólo para comprobar el baseline por código.
  const names=Object.freeze({original:'Original de diagnóstico',woven:'Radial entrelazada',radial:'Radial puntiaguda',star:'Estrella irregular',asymmetric:'Angular asimétrica',peaks:'Picos largos y cortos'});
  function sample(vertices,u){
    if(u>=1)return {x:vertices[vertices.length-1].x,y:vertices[vertices.length-1].y};
    const q=u*(vertices.length-1),i=Math.floor(q),t=q-i,a=vertices[i],b=vertices[i+1];
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  function points(kind,reference){
    if(kind==='original')return reference.map(({x,y})=>({x,y}));
    if(!names[kind])throw Error('Forma desconocida');
    const count=40,radius=Math.sqrt(reference.slice(0,-1).reduce((s,p)=>s+p.x*p.x+p.y*p.y,0)/(reference.length-1)),result=[];
    if(kind==='woven'){
      // Un único contorno procedural {12/5}: doce agujas enlazadas mediante
      // diagonales que cruzan el núcleo, como en la referencia de cuatro figuras.
      // La alternancia de longitud mantiene una estructura radial equilibrada.
      const nodes=Array.from({length:12},(_,i)=>{
        const tip=i*5%12,a=tip/12*TAU-Math.PI/2,r=radius*(tip%2===0?1.48:1.22);
        return {x:Math.cos(a)*r,y:Math.sin(a)*r};
      });
      nodes.push({...nodes[0]});
      return Array.from({length:49},(_,i)=>sample(nodes,i/48));
    }
    for(let i=0;i<=count;i++){
      const k=i%count,a=k/count*TAU;let r;
      if(kind==='radial')r=k%2===0?1.24:.54;
      else if(kind==='star')r=(k%4===0?1.42:k%2===0?1.03:.48)*(1+.14*Math.sin(a*3+.6));
      else if(kind==='asymmetric'){
        // Diez sectores repetidos, con agujas principales/secundarias finas.
        // Sólo dos sectores cambian de longitud; los ocho restantes conservan
        // el orden radial de la referencia. La animación se agrega aparte.
        const sector=Math.floor(k/4),part=k%4;
        r=part===0?1.38:part===2?.99:.40;
        if(sector===2&&part===0)r=1.68;
        if(sector===2&&part===2)r=.82;
        if(sector===7&&part===0)r=1.17;
        if(sector===7&&part===2)r=1.13;
      }
      else r=k%10===0?1.65:k%4===0?1.1:.60+.13*Math.sin(a*3);
      result.push({x:Math.cos(a)*radius*r,y:Math.sin(a)*radius*r});
    }return result;
  }
  function apply(kind,reference,animated){
    if(kind==='original')return animated.map(({x,y})=>({x,y}));
    const field=animated.map((v,i)=>({x:v.x-reference[i].x,y:v.y-reference[i].y})),shape=points(kind,reference);
    return shape.map((p,i)=>{const d=sample(field,i/(shape.length-1));return {x:p.x+d.x,y:p.y+d.y};});
  }
  window.NV.pilotGeometry=Object.freeze({names,points,sample,apply});
})();
