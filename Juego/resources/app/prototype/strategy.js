/* Authoritative objective/stealth/tool rules. Coordinates are world units (10/m).
   No renderer, DOM or network privileges. All effects, stocks and goals are data. */
(function(root){'use strict';
const catalog={
 grapple:{name:'Lazo resonante',icon:'dash',description:'Enganche corto hacia una cobertura visible.',uses:2,range:250,radius:0,turns:0,counter:'Expuesto durante el tirón; una pared bloquea el recorrido.'},
 blink:{name:'Salto de ancla',icon:'anchor',description:'Salto a suelo visible y libre.',uses:1,range:180,radius:0,turns:0,counter:'Línea de visión y espacio libre; revela tu llegada.'},
 needle:{name:'Aguja de presión',icon:'aim',description:'Pulso preciso, daño reducido y empuje.',uses:3,range:400,radius:35,turns:0,zones:[{fraction:.3,damage:18,push:40},{fraction:.7,damage:8,push:25},{fraction:1,damage:2,push:10}],counter:'Cobertura sólida bloquea el pulso.'},
 smoke:{name:'Nube de ceniza',icon:'bush',description:'Corta la visión, no las balas.',uses:2,range:180,radius:60,turns:2,counter:'Sensor, luz próxima o salir de la nube.'},
 sensor:{name:'Ojo de pulso',icon:'camera',description:'Detecta ocultos en un radio de 12 m.',uses:2,range:180,radius:120,turns:2,hp:20,counter:'Emisor visible, destruible; una pared bloquea detección.'},
 quiet:{name:'Manto de quietud',icon:'cocoon',description:'Cierra turno protegido del PvE hasta tu próxima jugada.',uses:1,range:0,radius:65,turns:1,counter:'No bloquea PvP, veneno previo ni objetivos disputados.'},
 acid:{name:'Sello corrosivo',icon:'antidote',description:'Campo persistente con tres zonas de daño.',uses:2,range:180,radius:40,turns:2,zones:[{fraction:.3,damage:6,status:'poison'},{fraction:.7,damage:3},{fraction:1,damage:1}],counter:'Salir del círculo, cobertura o antídoto.'},
 messenger:{name:'Mensajero de falla',icon:'echo',description:'Señuelo móvil; lleva tu fragmento a extracción.',uses:1,range:300,radius:18,turns:3,hp:30,counter:'Se puede destruir/interceptar; no atraviesa coberturas.'}
};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function segmentSphere(a,b,c,r){const d=b.map((v,i)=>v-a[i]),o=a.map((v,i)=>v-c[i]),aa=d.reduce((s,v)=>s+v*v,0),t=aa?Math.max(0,Math.min(1,-o.reduce((s,v,i)=>s+v*d[i],0)/aa)):0;return distance(a.map((v,i)=>v+d[i]*t),c)<r;}
function create({actors,active,phase,position,los,clear,ground,move,hit,award,status,reward=()=>{},shelter=()=>null,guard=()=>false,noiseEvent=()=>{},notice=()=>{},visual=()=>{},pve=()=>[],combatTargets=()=>[],hitPve=()=>false}={}){
 let enabled=false,goals=[],fields=[],couriers=[],channel=null,serial=0,elapsed=0,turn=0;const stocks=new Map(),reveals=new Map(),contracts=new Map(),cargo=new Map(),logs=[],damageLog=[];const reasons=new Map(),visibilityCache=new Map();
 const stock=id=>{if(!stocks.has(id))stocks.set(id,Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v.uses])));return stocks.get(id);};
 const team=id=>actors().find(m=>m.id===id)?.teamId;
 const live=()=>actors().filter(m=>m.hp>0),near=(p,r)=>live().filter(m=>distance(position(m.id),p)<r&&Math.abs(position(m.id)[1]-p[1])<50);
 function configure(defs){if(!Array.isArray(defs)||defs.length>12||defs.some(g=>!['relay','zone','cargo','extract','pve','resonator','breach'].includes(g.type)||!Array.isArray(g.position)||g.position.length!==3||!g.position.every(Number.isFinite)))throw Error('Invalid objective definitions');const ids=defs.map((g,i)=>g.id||'goal-'+i);if(new Set(ids).size!==ids.length||defs.some(g=>g.requires&&(!Array.isArray(g.requires)||g.requires.some(id=>!defs.some(d=>d.id===id&&d.type==='resonator')))))throw Error('Invalid circuit dependencies');goals=defs.map((g,i)=>({id:ids[i],type:g.type,name:String(g.name||g.type).slice(0,60),position:[...g.position],radius:Math.max(20,Math.min(200,g.radius||85)),required:Math.max(1,Math.min(8,g.required||2)),points:Math.max(1,Math.min(20,g.points||6)),workSeconds:Math.max(2,Math.min(30,g.workSeconds||6)),requires:[...(g.requires||[])],work:{},owner:null,progress:0,complete:[],carrier:null,available:g.type!=='pve',rewardMode:g.rewardMode||'stealable'}));}
 function start(defs){reset();enabled=true;configure(defs);const relays=goals.filter(g=>g.type==='relay'),loads=goals.filter(g=>['cargo','pve'].includes(g.type));live().forEach((m,i)=>{stock(m.id);const kind=i%2?'cargo':'hold',pool=kind==='cargo'?loads:relays,g=pool[Math.floor(i/2)%Math.max(1,pool.length)];contracts.set(m.id,{kind,goalId:g?.id,name:(kind==='cargo'?'Entregá ':'Terminá oculto en ')+(g?.name||'una zona de objetivo'),progress:0,required:1,done:false});});}
 function reset(){enabled=false;goals=[];fields=[];couriers=[];channel=null;serial=elapsed=turn=0;stocks.clear();reveals.clear();contracts.clear();cargo.clear();logs.length=damageLog.length=0;reasons.clear();visibilityCache.clear();}
 function noise(id,kind='shot',seconds=5){if(!enabled||!id)return;visibilityCache.clear();reveals.set(id,{until:elapsed+seconds,kind});noiseEvent(position(id),kind);}
 function visibility(observer,target,options={}){
   if(!enabled)return {seen:true,reason:'legacy'};
   const p=observer.position||position(observer.id),q=target.position||position(target.id),d=distance(p,q);let reason='visible',seen=true;
   const cacheKey=[observer.id,target.id,observer.yaw||0,options.range,options.lightRadius,...p.map(v=>Math.floor(v/5)),...q.map(v=>Math.floor(v/5))].join(':');const cached=visibilityCache.get(cacheKey);if(cached&&cached.until>elapsed)return cached.value;
   const sensor=fields.some(f=>f.kind==='sensor'&&team(f.owner)===observer.teamId&&distance(f.position,q)<catalog.sensor.radius&&los(f.position,q));
   const smoke=fields.some(f=>f.kind==='smoke'&&segmentSphere(p,q,f.position,f.radius));
   const cover=shelter(target.id),hidden=cover?.kind==='bush'||cover?.kind==='stone'||cover?.kind==='rift'||cover?.kind==='contested';
   const loud=(reveals.get(target.id)?.until||0)>elapsed;
   const range=Math.min(options.range||550,options.lightRadius||550)*(hidden&&!loud&&!sensor?.4:1);
   const dx=q[0]-p[0],dz=q[2]-p[2],horizontal=Math.hypot(dx,dz),facing=observer.yaw||0,dot=horizontal?(-Math.sin(facing)*dx-Math.cos(facing)*dz)/horizontal:1;
   if(d>range){seen=false;reason='fuera de alcance / niebla';}
   else if(!los(p,q)){seen=false;reason='cobertura sólida';}
   else if(sensor){reason='sensor';}
   else if(smoke&&d>40){seen=false;reason='humo';}
   else if(loud){reason='ruido: '+reveals.get(target.id).kind;}
   else if(d>70&&dot<Math.cos((options.cone||110)*Math.PI/360)){seen=false;reason='fuera del cono';}
   else if(hidden&&d>45){seen=false;reason=cover.kind==='bush'?'vegetación':'sombra / camuflaje';}
   const key=(observer.id||'pve')+':'+target.id,value=seen+':'+reason;
   if(reasons.get(key)!==value){if(reasons.size>=128)reasons.delete(reasons.keys().next().value);reasons.set(key,value);logs.push({observer:observer.id,target:target.id,seen,reason,time:elapsed});if(logs.length>64)logs.shift();}
   const valueResult={seen,reason};if(visibilityCache.size>=256)visibilityCache.delete(visibilityCache.keys().next().value);visibilityCache.set(cacheKey,{until:elapsed+.1,value:valueResult});return valueResult;
 }
 function seenByTeam(id,teamId,options={}){const target=actors().find(m=>m.id===id);if(!target)return false;if(target.teamId===teamId)return true;return live().filter(m=>m.teamId===teamId).some(m=>visibility({id:m.id,teamId:m.teamId,yaw:m.yaw||m.data?.yaw||0},{id},options).seen);}
 function ownVisibility(id,observers=[]){for(const o of observers){if(o.teamId===team(id))continue;const r=visibility(o,{id});if(r.seen)return {seen:true,reason:r.reason};}return {seen:false,reason:'sin observador con visión'};}
 function objectivePoint(id,points,reason){award(id,points,reason);reward(id);}
 function circuitReady(g,t){return g.requires.every(id=>goals.find(n=>n.id===id)?.complete.includes(t));}
 function cancelChannel(reason){if(channel){notice('Sintonía interrumpida · '+reason+' · progreso guardado');channel=null;}}
 function tickChannel(dt){if(!channel)return;const c=channel,g=goals.find(g=>g.id===c.goalId),m=actors().find(m=>m.id===c.actorId),p=position(c.actorId),t=team(c.actorId);
   if(!g||!m||m.hp<=0||active()?.id!==c.actorId||phase()!=='active'){cancelChannel('fin de turno');return;}
   if(m.hp<c.hp){cancelChannel('daño recibido');return;}
   if(distance(p,c.origin)>6||distance(p,g.position)>g.radius||!los(p,g.position)){cancelChannel('movimiento o cobertura');return;}
   if(near(g.position,g.radius).some(m=>m.teamId!==t)){cancelChannel('zona disputada');return;}
   g.work[t]=Math.min(g.workSeconds,(g.work[t]||0)+dt);if(elapsed>=c.nextNoise){noise(c.actorId,'resonador',2);c.nextNoise=elapsed+1;}
   if(g.work[t]>=g.workSeconds){g.complete.push(t);channel=null;objectivePoint(c.actorId,g.points,g.type==='breach'?'objective-breach':'objective-resonator');visual('sensor',g.position,g.radius);notice(g.name+' completado · +'+g.points);}
 }
 function interact(id){if(!enabled||active()?.id!==id||phase()!=='active')return false;const p=position(id),t=team(id);
   for(const g of [...goals].sort((a,b)=>(['cargo','extract','pve'].includes(b.type)?1:0)-(['cargo','extract','pve'].includes(a.type)?1:0))){if(distance(p,g.position)>g.radius||!los(p,g.position))continue;
     if(['resonator','breach'].includes(g.type)){if(g.complete.includes(t)){notice('Ya completado por tu equipo');return true;}if(!circuitReady(g,t)){notice('Brecha sellada · sintonizá los tres resonadores');return true;}if(near(g.position,g.radius).some(m=>m.teamId!==t)){notice('Zona disputada · no podés sintonizar');return true;}if(channel?.goalId===g.id&&channel.actorId===id)return true;channel={actorId:id,goalId:g.id,origin:[...p],hp:active().hp,nextNoise:elapsed};noise(id,'resonador',2);notice('Sintonizando · quedate quieto · el ruido te expone');return true;}
     if(g.type==='cargo'||g.type==='pve'&&g.available){if(g.carrier||cargo.has(id)||g.complete.includes(t))continue;g.carrier=id;cargo.set(id,g.id);notice('Fragmento recogido · llevalo a EXTRACCIÓN');return true;}
     if(g.type==='extract'&&cargo.has(id)){const source=goals.find(g=>g.id===cargo.get(id));if(!source)continue;source.complete.push(t);source.carrier=null;cargo.delete(id);objectivePoint(id,source.points,'objective-extract');const c=contracts.get(id);if(c?.kind==='cargo'&&c.goalId===source.id&&!c.done){c.done=true;c.progress=1;objectivePoint(id,3,'contract');}notice('Extracción completada · +'+source.points);return true;}
     if(['relay','zone'].includes(g.type)){const rivals=near(g.position,g.radius).filter(m=>m.teamId!==t);if(rivals.length){notice('Zona disputada · el rival impide capturar');return false;}if(g.owner===t){notice('Controlá la zona al cerrar el turno');return true;}g.owner=t;g.progress=0;noise(id,'baliza',3);notice('Zona activada · mantenela al cerrar turnos');return true;}
   }return false;
 }
 function onEnd(id){if(!enabled)return;cancelChannel('fin de turno');visibilityCache.clear();turn++;
   for(const m of live())if(cargo.has(m.id))noise(m.id,'carga luminosa',3);
   for(const g of goals){if(!['relay','zone'].includes(g.type)||!g.owner)continue;const inside=near(g.position,g.radius),friendly=inside.find(m=>m.teamId===g.owner),rival=inside.some(m=>m.teamId!==g.owner);if(!friendly||rival){g.progress=0;if(rival)g.owner=null;continue;}
     if(team(id)!==g.owner)continue;g.progress++;if(g.type==='zone')award(id,2,'objective-zone');else if(g.progress>=g.required&&!g.complete.includes(g.owner)){g.complete.push(g.owner);objectivePoint(id,g.points,'objective-relay');notice(g.name+' · +'+g.points);}
   }
   const c=contracts.get(id);if(c&&!c.done&&c.kind==='hold'&&goals.some(g=>g.id===c.goalId&&distance(position(id),g.position)<g.radius)&&!ownVisibility(id,live().map(m=>({id:m.id,teamId:m.teamId,yaw:m.data?.yaw||0}))).seen){c.progress++;c.done=true;objectivePoint(id,3,'contract');}
   for(const f of fields){if(f.kind==='acid')area(f.position,catalog.acid,f.owner);f.remaining--;}
   fields=fields.filter(f=>f.remaining>0&&f.hp!==0);for(const c of couriers)c.remaining--;
   if(active()?.hp>0)award(id,.1,'survival');
 }
 function area(p,def,owner){
   for(const m of [...live().map(m=>({...m,pve:false,position:position(m.id),radius:18})),...combatTargets().map(m=>({...m,pve:true}))]){
     if(!m.pve&&m.teamId===team(owner)&&m.id!==owner)continue;const q=m.position,d=Math.max(0,distance(p,q)-(m.radius||18));if(d>def.radius)continue;
     const zone=def.zones.findIndex(z=>d<=z.fraction*def.radius),z=def.zones[zone];if(!z)continue;const blocked=!los(p,q),applied=!blocked&&(m.pve?hitPve(m.id,z.damage,owner):hit(m.id,z.damage,owner,z.push||0,p));
     if(applied&&z.status&&!m.pve)status(m.id,z.status,6,.5);damageLog.push({source:owner,target:m.id,item:def.name,zone:['centro','medio','borde'][zone],damage:applied?z.damage:0,reason:blocked?'cobertura':applied?'impacto':'protección',turn});if(damageLog.length>64)damageLog.shift();
   }visual('pulse',p,def.radius);
 }
 function use(id,kind,aim){const def=catalog[kind];if(!enabled||!def||active()?.id!==id||phase()!=='active'||active().hp<=0||!stock(id)[kind])return false;const origin=position(id),p=aim&&aim.every(Number.isFinite)?[...aim]:[...origin];if(def.range&&distance(origin,p)>def.range+1){notice('Fuera de alcance · '+def.range/10+' m');return false;}
   if(kind!=='quiet'&&(!los(origin,p)||!clear(p,kind==='blink'||kind==='grapple'?18:4))){notice('Cobertura o destino sin espacio libre');return false;}
   if(fields.length>=32||kind==='messenger'&&couriers.length>=8){notice('Límite de efectos activos');return false;}
   if(kind==='blink'||kind==='grapple'){if(!move(id,p,kind))return false;}
   else if(kind==='quiet'){if(!guard(id))return false;}
   else if(kind==='needle')area(p,def,id);
   else if(kind==='messenger'){const cargoId=cargo.get(id)||null;if(cargoId){cargo.delete(id);goals.find(g=>g.id===cargoId).carrier='messenger-'+(serial+1);}couriers.push({id:'messenger-'+(++serial),owner:id,position:[...origin],destination:p,remaining:def.turns,hp:def.hp,cargoId});}
   else fields.push({id:'field-'+(++serial),kind,owner:id,position:p,radius:def.radius,remaining:def.turns,hp:def.hp||-1});
   visibilityCache.clear();stock(id)[kind]--;if(!['smoke','quiet'].includes(kind))noise(id,kind,kind==='needle'?6:3);visual(kind,p,def.radius);return true;
 }
 function replenish(id,kind){if(!catalog[kind]||stock(id)[kind]>=catalog[kind].uses)return false;stock(id)[kind]++;return true;}
 function damageObject(id,amount){const o=[...fields,...couriers].find(f=>f.id===id);if(!o||o.hp<0)return false;visibilityCache.clear();o.hp=Math.max(0,o.hp-amount);return true;}
 function tick(dt){if(!enabled||!Number.isFinite(dt)||dt<=0)return;elapsed+=dt;tickChannel(dt);for(const g of goals){if(g.carrier&&actors().some(m=>m.id===g.carrier&&m.hp<=0)){const p=position(g.carrier);g.position=[...p];cargo.delete(g.carrier);g.carrier=null;g.available=true;}if(g.type==='pve'&&!g.available&&pve().length===0){g.available=true;notice('Amenaza despejada · recompensa robable');if(g.rewardMode==='shared'){for(const m of live())award(m.id,g.points/live().length,'objective-pve');g.complete=live().map(m=>m.teamId);}}}
   for(const c of couriers){if(c.hp<=0)continue;const d=distance(c.position,c.destination);if(d>4){const step=Math.min(1,65*dt/d),q=c.position.map((v,i)=>v+(c.destination[i]-v)*step);q[1]=ground(q[0],q[2])+18;if(clear(q,18)&&los(c.position,q))c.position=q;}
     if(c.cargoId){const extraction=goals.find(g=>g.type==='extract');if(extraction&&distance(c.position,extraction.position)<extraction.radius){const g=goals.find(g=>g.id===c.cargoId);g.carrier=null;g.complete.push(team(c.owner));objectivePoint(c.owner,g.points,'objective-courier');c.cargoId=null;}}
   }
   for(const c of couriers)if((c.hp<=0||c.remaining<=0)&&c.cargoId){const g=goals.find(g=>g.id===c.cargoId);g.carrier=null;g.position=[...c.position];g.available=true;c.cargoId=null;}
   couriers=couriers.filter(c=>c.hp>0&&c.remaining>0);fields=fields.filter(f=>f.hp!==0);
 }
 function snapshot(viewTeam=null){return {enabled,elapsed,turn,serial,channel:channel?{...channel,origin:[...channel.origin]}:null,goals:goals.map(g=>({...g,position:[...g.position],complete:[...g.complete],work:{...g.work},requires:[...g.requires]})),fields:fields.map(f=>({...f,position:[...f.position]})),couriers:couriers.map(c=>({...c,position:[...c.position],destination:[...c.destination]})),stocks:[...stocks].filter(([id])=>!viewTeam||team(id)===viewTeam).map(([id,items])=>({id,items:{...items}})),contracts:[...contracts].filter(([id])=>!viewTeam||team(id)===viewTeam).map(([id,c])=>({id,...c})),cargo:[...cargo].map(([id,goal])=>({id,goal})),reveals:[...reveals].map(([id,r])=>({id,...r})),logs:viewTeam?logs.filter(l=>team(l.observer)===viewTeam):logs.map(l=>({...l})),damageLog:damageLog.filter(l=>!viewTeam||team(l.source)===viewTeam||team(l.target)===viewTeam).map(l=>({...l}))};}
 function restore(s){if(!s)return;enabled=s.enabled;elapsed=s.elapsed;turn=s.turn;serial=s.serial;channel=s.channel?{...s.channel,origin:[...s.channel.origin]}:null;goals=s.goals.map(g=>({...g,position:[...g.position],complete:[...g.complete],work:{...(g.work||{})},requires:[...(g.requires||[])]}));fields=s.fields;couriers=s.couriers;stocks.clear();for(const o of s.stocks)stocks.set(o.id,o.items);contracts.clear();for(const {id,...c} of s.contracts)contracts.set(id,c);cargo.clear();for(const o of s.cargo)cargo.set(o.id,o.goal);reveals.clear();for(const {id,...r} of s.reveals)reveals.set(id,r);logs.splice(0,logs.length,...s.logs);damageLog.splice(0,damageLog.length,...(s.damageLog||[]));visibilityCache.clear();}
 return {start,reset,use,interact,onEnd,tick,noise,visibility,ownVisibility,seenByTeam,replenish,damageObject,snapshot,restore,stock,catalog,get enabled(){return enabled;}};
}
const api={create,catalog,segmentSphere};if(typeof module==='object')module.exports=api;else root.CRStrategy=api;
})(typeof window==='object'?window:globalThis);
