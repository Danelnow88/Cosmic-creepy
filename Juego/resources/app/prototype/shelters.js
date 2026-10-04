/* Seven bounded shelter experiments. No dimensional damage clock is enabled. */
(function(root){'use strict';
function create({actors,activeId,phase,dimension,sites,positions,clear=()=>true,placeEcho=p=>[p[0]+85,p[1],p[2]],onEnd=()=>{},onNotice=()=>{}}){
 const guards=new Map(),kits=new Map(),anchors=new Map(),echoes=new Map(),collected=new Set();let elapsed=0;
 const kit=id=>{if(!kits.has(id))kits.set(id,{cocoon:1,stone:2,anchor:1,echo:1});return kits.get(id);};
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 const waiting=id=>id!==activeId()||phase()!=='active';
 function nearby(id){const p=positions(id);return sites().filter(s=>distance(p,s.position)<s.radius&&Math.abs(p[1]-s.position[1])<45).sort((a,b)=>distance(p,a.position)-distance(p,b.position))[0]||null;}
 function guardFor(id){const g=guards.get(id);if(!g||!waiting(id)||g.dimension!==dimension()||distance(positions(id),g.position)>g.radius)return null;return g;}
 function eligible(id){return !guardFor(id);}
 function armSite(id){if(guards.has(id))return true;const s=nearby(id),a=anchors.get(id),p=positions(id);let g=null;
   if(s){if(s.kind==='contested'&&[...guards.entries()].some(([other,g])=>other!==id&&g.siteId===s.id&&guardFor(other))){onNotice('Refugio ocupado · buscá otro');return false;}g={kind:s.kind==='rift'?'cocoon':s.kind,siteId:s.id,position:[...s.position],radius:s.radius,dimension:dimension()};}
   else if(a&&a.dimension===dimension()&&distance(p,a.position)<a.radius)g={kind:'anchor',position:[...a.position],radius:a.radius,dimension:dimension()};
   if(g){guards.set(id,g);onNotice('Resguardo preparado · protección PvE durante la espera');return true;}return false;
 }
 function use(id,type){if(phase()!=='active'||id!==activeId()||!['cocoon','stone','anchor','echo'].includes(type))return false;const k=kit(id);if(!k[type]){onNotice('Sin cargas de '+type);return false;}const p=positions(id);if(!clear(p)){onNotice('Buscá terreno libre');return false;}
   const echoPosition=type==='echo'?placeEcho(p):null;if(type==='echo'&&(!echoPosition||!clear(echoPosition))){onNotice('No hay espacio para el señuelo');return false;}
   k[type]--;if(type==='anchor'){anchors.set(id,{position:[...p],radius:85,dimension:dimension()});onNotice('Ancla desplegada · E o Enter dentro para resguardarte');}
   else if(type==='echo'){echoes.set(id,{position:[...echoPosition],life:30,hp:30,dimension:dimension()});onNotice('Eco señuelo · atrae PvE durante 30 s');}
   else{guards.set(id,{kind:type,position:[...p],radius:type==='stone'?28:65,dimension:dimension()});onNotice(type==='stone'?'Camuflaje de piedra · sólo mientras esperás':'Capullo preparado · cierra tu turno');onEnd();}return true;
 }
 function protect(id){if(phase()!=='active'||id!==activeId()||!clear(positions(id)))return false;guards.set(id,{kind:'cocoon',position:[...positions(id)],radius:65,dimension:dimension()});onEnd();return true;}
 function begin(id){guards.delete(id);anchors.delete(id);kit(id);}
 function tick(dt){elapsed+=dt;for(const [id,e] of echoes){e.life-=dt;if(e.life<=0||e.hp<=0)echoes.delete(id);}for(const [id,g] of guards)if(!actors().some(m=>m.id===id&&m.hp>0))guards.delete(id);}
 function hitEcho(id,amount){const e=echoes.get(id);if(!e)return false;e.hp-=amount;if(e.hp<=0)echoes.delete(id);return true;}
 function collect(id,point,accept){const key=dimension()+':'+point.id;if(collected.has(key)||distance(positions(id),point.position)>48||!accept())return false;collected.add(key);return true;}
 function snapshot(){return {elapsed,guards:[...guards].map(([id,g])=>({id,...g,position:[...g.position]})),kits:[...kits].map(([id,k])=>({id,...k})),anchors:[...anchors].map(([id,a])=>({id,...a,position:[...a.position]})),echoes:[...echoes].map(([id,e])=>({id,...e,position:[...e.position]})),collected:[...collected]};}
 function restore(s){if(!s)return;elapsed=s.elapsed;for(const [map,list] of [[guards,s.guards],[kits,s.kits],[anchors,s.anchors],[echoes,s.echoes]]){map.clear();for(const item of (list||[]).slice(0,24)){const {id,...data}=item;map.set(id,{...data,...(data.position?{position:[...data.position]}:{})});}}collected.clear();for(const k of s.collected||[])collected.add(k);}
 function reset(){guards.clear();kits.clear();anchors.clear();echoes.clear();collected.clear();elapsed=0;}
 return {protect,nearby,guardFor,eligible,armSite,use,begin,tick,hitEcho,collect,snapshot,restore,reset,kit,isCollected(point){return collected.has(dimension()+':'+point.id);}};
}
function world({T,root:group,heightAt,colliders,dimension,neon}){
 const points=[],shards=[],solids=[],dummy=new T.Object3D(),matrix=new T.Matrix4();
 const kinds=['rift','bush','contested'];for(let x=-2800,i=0;x<=2800;x+=1400)for(let z=-2800;z<=2800;z+=1400,i++){const pz=x===0&&z===0?480:z;points.push({id:'shelter-'+i,kind:kinds[i%3],position:[x,heightAt(x,pz)+18,pz],radius:78});}
 for(const [i,kind] of kinds.entries())points.push({id:'trial-'+i,kind,position:[-390+i*390,heightAt(-390+i*390,360)+18,360],radius:78});
 const material=new T.MeshStandardMaterial({color:dimension?'#414052':'#394c46',roughness:.95});
 const bushes=[];function solid(x,z,w,h,d){const y=heightAt(x,z);solids.push({x,y:y+h/2,z,w,h,d});colliders.push(new T.Box3(new T.Vector3(x-w/2,y,z-d/2),new T.Vector3(x+w/2,y+h,z+d/2)));}
 const markers=new T.InstancedMesh(new T.OctahedronGeometry(7,0),neon('#91b8ab',.28),points.length);group.add(markers);
 for(const [i,s] of points.entries()){const [x,y,z]=s.position;if(s.kind==='bush'){for(let j=0;j<10;j++)bushes.push({x:x+Math.cos(j*.628)*70,z:z+Math.sin(j*.628)*70});}
   else {solid(x-104,z,18,132,210);solid(x+104,z,18,132,210);solid(x,z+104,210,132,18);const roofY=Math.max(heightAt(x-100,z-100),heightAt(x+100,z+100),y-18)+150;solids.push({x,y:roofY,z,w:225,h:12,d:225});colliders.push(new T.Box3(new T.Vector3(x-112.5,roofY-6,z-112.5),new T.Vector3(x+112.5,roofY+6,z+112.5)));}
   dummy.position.set(x,y+55,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();markers.setMatrixAt(i,dummy.matrix);markers.setColorAt(i,new T.Color(s.kind==='rift'?'#88cfc1':s.kind==='bush'?'#82a666':'#d9ad79'));
 }
 const walls=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,solids.length);walls.receiveShadow=true;group.add(walls);solids.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);});
 const leaves=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#384f43',roughness:1}),bushes.length);group.add(leaves);bushes.forEach((b,i)=>{dummy.position.set(b.x,heightAt(b.x,b.z)+30,b.z);dummy.scale.set(25,38,25);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});
 const shardPositions=[[-65,130],[65,130],...points.map(s=>[s.position[0]+140,s.position[2]-100])];
 const crystalMaterial=neon('#a8e7cb',.85),crystals=new T.InstancedMesh(new T.OctahedronGeometry(6,0),crystalMaterial,shardPositions.length);group.add(crystals);
 for(const [i,[x,z]] of shardPositions.entries())shards.push({id:'energy-'+i,position:[x,heightAt(x,z)+22,z]});
 function update(time,isCollected){for(let i=0;i<shards.length;i++){const s=shards[i];dummy.position.fromArray(s.position);dummy.position.y+=Math.sin(time*1.8+i)*2;dummy.rotation.set(.2,time*.6,0);dummy.scale.setScalar(isCollected(s)?0:1);dummy.updateMatrix();crystals.setMatrixAt(i,dummy.matrix);}crystals.instanceMatrix.needsUpdate=true;}
 return {points,shards,solids:solids.length,update};
}
const api={create,world};if(typeof module==='object')module.exports=api;else root.CRShelters=api;
})(typeof window==='object'?window:globalThis);
