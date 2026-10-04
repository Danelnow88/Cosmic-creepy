window.CRExpedition = function({T,scene,world,sound,state,player,boss,targets,heightAt,burst,damagePlayer,shootHostile,onRestock}){
 const run={relays:[false,false,false],phase:'relays',extract:0,xp:0,level:1,shards:0,upgrades:0,visited:[],notice:'Explorá la marisma y activá los tres relés.',noticeUntil:8};
 const bossNode=document.getElementById('boss-info'), objective=document.getElementById('objective'),regionNode=document.getElementById('region-name'),prompt=document.getElementById('interact-prompt');
 const map=document.getElementById('region-map'),ctx=map.getContext('2d');let mapOpen=false,lastMap=-1,bossTimer=2,bossWindup=0,bossPattern=0;
 const loot=[];const lootGeometry=new T.OctahedronGeometry(5),lootMat=new T.MeshStandardMaterial({color:'#67e7bc',emissive:'#67e7bc',emissiveIntensity:.7});
 for(let i=0;i<60;i++){const mesh=new T.Mesh(lootGeometry,lootMat);mesh.visible=false;scene.add(mesh);loot.push({mesh,active:false,life:0,value:0});}
 const warning=new T.Mesh(new T.RingGeometry(165,174,64),new T.MeshBasicMaterial({color:'#ff536c',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}));warning.rotation.x=-Math.PI/2;warning.visible=false;scene.add(warning);
 function notify(text){run.notice=text;run.noticeUntil=state.time+5;}
 function save(){if(state.dimension||state.matchMode)return;try{localStorage.setItem('CR3D-expedition-v1',JSON.stringify({version:1,relays:run.relays,phase:run.phase,xp:run.xp,shards:run.shards,upgrades:run.upgrades,visited:run.visited}));}catch(_){} }
 function reset(continueRun=false){
   Object.assign(run,{relays:[false,false,false],phase:'relays',extract:0,xp:0,level:1,shards:0,upgrades:0,visited:[],notice:'Explorá la marisma y activá los tres relés.',noticeUntil:state.time+8});
   if(continueRun){try{const s=JSON.parse(localStorage.getItem('CR3D-expedition-v1')||'null');if(s?.version===1&&s.phase!=='complete'&&Array.isArray(s.relays)&&s.relays.length===3){run.relays=s.relays.map(Boolean);run.phase=s.phase==='extract'?'extract':run.relays.every(Boolean)?'boss':'relays';run.xp=Math.max(0,Number(s.xp)||0);run.shards=Math.max(0,Number(s.shards)||0);run.upgrades=Math.min(3,Math.max(0,Number(s.upgrades)||0));run.visited=Array.isArray(s.visited)?s.visited.filter(v=>world.regions.some(r=>r.id===v)):[];}}catch(_){} }
   run.level=1+Math.floor(run.xp/100);bossTimer=2;bossWindup=0;warning.visible=false;
   const d=boss.userData;d.alive=run.phase==='boss';d.hp=d.maxHp;boss.visible=d.alive;boss.position.set(d.home.x,heightAt(d.home.x,d.home.z)+d.radius,d.home.z);d.telegraph.visible=false;
   for(const p of loot){p.active=false;p.mesh.visible=false;}
   for(let i=0;i<3;i++)world.beacons[i].core.material.color.set(run.relays[i]?'#d7bd68':'#71ddbd');
 }
 function recordKill(enemy){
   run.xp+=enemy.userData.isBoss?300:20;run.level=1+Math.floor(run.xp/100);
   const slot=loot.find(l=>!l.active);if(slot){slot.active=true;slot.life=45;slot.value=enemy.userData.isBoss?50:5;slot.mesh.position.copy(enemy.position);slot.mesh.position.y=heightAt(enemy.position.x,enemy.position.z)+10;slot.mesh.visible=true;}
   if(enemy===boss){run.phase='extract';warning.visible=false;notify('Leviatán derrotado. Regresá al refugio para extraer.');sound.event('reward',boss.position);save();}
 }
 function interact(){
   if(state.paused||state.dead)return false;
   const camp=world.sites[4];if(Math.hypot(player.position.x-camp.x,player.position.z-camp.z)<105){state.hp=100;onRestock();
     if(run.shards>=20&&run.upgrades<3){run.shards-=20;run.upgrades++;notify('Arsenal calibrado: +10% de daño. Vida y cargadores completos.');}else notify('Vida y cargadores completos. Calibrar cuesta 20 fragmentos.');sound.event('reward',player.position);save();return true;
   }
   for(let i=0;i<3;i++){
     const s=world.sites[i];if(run.relays[i]||Math.hypot(player.position.x-s.x,player.position.z-s.z)>90)continue;
     if(targets.some(t=>t.userData.alive&&!t.userData.isBoss&&Math.hypot(t.position.x-s.x,t.position.z-s.z)<160)){notify('El relé está amenazado. Despejá las criaturas cercanas.');return false;}
     run.relays[i]=true;run.xp+=40;run.level=1+Math.floor(run.xp/100);world.beacons[i].core.material.color.set('#d7bd68');burst(world.beacons[i].core.getWorldPosition(new T.Vector3()),'#b6ffe6',24);sound.event('relay',world.beacons[i].object.position);notify('Relé sincronizado · '+run.relays.filter(Boolean).length+'/3');
     if(run.relays.every(Boolean)){run.phase='boss';boss.userData.alive=true;boss.visible=true;notify('El Santuario despertó. Cazá al Leviatán del Vacío.');sound.event('boss',boss.position);}
     save();return true;
   }
   return false;
 }
 function update(dt){
   const region=world.regionAt(player.position.x,player.position.z);
   if(!run.visited.includes(region.id)){run.visited.push(region.id);run.xp+=25;run.level=1+Math.floor(run.xp/100);notify(region.name+' · región descubierta');}
   for(const p of loot){if(!p.active)continue;p.life-=dt;p.mesh.rotation.y+=dt*2;const distance=p.mesh.position.distanceTo(player.position);if(distance<85)p.mesh.position.lerp(player.position,1-Math.exp(-dt*7));if(distance<25){run.shards+=p.value;state.hp=Math.min(100,state.hp+3);p.active=false;p.mesh.visible=false;sound.event('reward',player.position);}if(p.life<=0){p.active=false;p.mesh.visible=false;}}
   if(boss.userData.alive&&run.phase==='boss'){
     const distance=boss.position.distanceTo(player.position),d=boss.userData;
     if(distance<1000){const delta=player.position.clone().sub(boss.position);delta.y=0;if(distance>210)boss.position.addScaledVector(delta.normalize(),dt*(d.hp<d.maxHp*.5?52:34));boss.position.y=heightAt(boss.position.x,boss.position.z)+d.radius;
       boss.rotation.y=Math.atan2(player.position.x-boss.position.x,player.position.z-boss.position.z)+Math.PI;
       bossTimer-=dt;
       if(bossTimer<=0&&bossWindup<=0){bossWindup=.9;bossPattern++;sound.event('boss',boss.position);}
       if(bossWindup>0){bossWindup-=dt;warning.visible=true;warning.position.set(boss.position.x,heightAt(boss.position.x,boss.position.z)+1,boss.position.z);warning.scale.setScalar(1+.2*Math.sin(state.time*15));
         if(bossWindup<=0){
           if(bossPattern%2===0){if(Math.hypot(player.position.x-boss.position.x,player.position.z-boss.position.z)<175&&player.position.y-heightAt(player.position.x,player.position.z)<65)damagePlayer(28,player.position.clone().sub(boss.position).normalize());burst(boss.position,'#ff6a87',35);}
           else {const count=d.hp<d.maxHp*.5?16:10;for(let j=0;j<count;j++){const angle=j/count*Math.PI*2;const dir=new T.Vector3(Math.sin(angle),.005,Math.cos(angle)),origin=boss.position.clone().addScaledVector(dir,d.radius+8);origin.y=heightAt(origin.x,origin.z)+24;shootHostile(origin,dir,true);}}
           bossTimer=d.hp<d.maxHp*.5?1.7:2.6;warning.visible=false;
         }
       }
     }else warning.visible=false;
   }
   if(run.phase==='extract'){
     const s=world.sites[4],near=Math.hypot(player.position.x-s.x,player.position.z-s.z)<100;
     run.extract=near?run.extract+dt:0;
     if(run.extract>=5){run.phase='complete';state.won=true;save();}
   }
 }
 function nearestGoal(){if(run.phase==='boss')return world.sites[3];if(run.phase==='extract'||run.phase==='complete')return world.sites[4];let nearest=null,distance=Infinity;for(let i=0;i<3;i++){if(run.relays[i])continue;const s=world.sites[i],dist=Math.hypot(s.x-player.position.x,s.z-player.position.z);if(dist<distance){nearest=s;distance=dist;}}return nearest||world.sites[3];}
 function drawMap(){
   ctx.fillStyle='#071713';ctx.fillRect(0,0,340,340);
   for(let x=0;x<340;x+=10)for(let z=0;z<340;z+=10){ctx.fillStyle=world.regionAt((x/340-.5)*7200,(z/340-.5)*7200).color;ctx.fillRect(x,z,10,10);}
   ctx.globalAlpha=.28;ctx.strokeStyle='#c3d4b3';for(let j=0;j<12;j++){ctx.beginPath();for(let x=0;x<340;x+=8){const y=j*30+Math.sin(x*.045+j)*10;ctx.lineTo(x,y);}ctx.stroke();}ctx.globalAlpha=1;
   for(const [id,site] of Object.entries(world.vertical?.sites||{})){const x=(site.x/7200+.5)*340,z=(site.z/7200+.5)*340;ctx.fillStyle='#dec28e';ctx.fillRect(x-3,z-3,6,6);ctx.font='9px Segoe UI';ctx.fillText(id==='tower'?'Observatorio':'Pasaje inferior',x+6,z+12);}
   for(const site of world.sites){const x=(site.x/7200+.5)*340,z=(site.z/7200+.5)*340;ctx.fillStyle=site.id==='boss'?'#ff6f8a':'#d2e7ab';ctx.beginPath();ctx.arc(x,z,4,0,6.28);ctx.fill();ctx.font='9px Segoe UI';ctx.fillText(site.name,x+6,z-5);}
   if(window.CR3D?.snapshot().strategy?.enabled){const strategy=window.CR3D.snapshot().strategy;for(const g of strategy.goals){const x=(g.position[0]/7200+.5)*340,z=(g.position[2]/7200+.5)*340;ctx.strokeStyle=g.type==='extract'?'#8ed6d0':g.type==='cargo'?'#c6a1e7':'#e3c98f';ctx.strokeRect(x-4,z-4,8,8);ctx.fillStyle=ctx.strokeStyle;ctx.font='9px Segoe UI';ctx.fillText({relay:'◎',zone:'⚑',cargo:'◆',extract:'↗',pve:'!'}[g.type],x+5,z+9);}}
   const p=world.portal,px=(p.x/7200+.5)*340,pz=(p.z/7200+.5)*340;ctx.strokeStyle='#8ae2dc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,pz,6,0,6.28);ctx.stroke();ctx.fillStyle='#8ae2dc';ctx.fillText('PORTAL → '+p.destination,px+9,pz+5);
   ctx.fillStyle='#9bffff';ctx.beginPath();ctx.arc((player.position.x/7200+.5)*340,(player.position.z/7200+.5)*340,4,0,6.28);ctx.fill();
 }
 function present(yaw){
   const goal=nearestGoal(),distance=Math.hypot(goal.x-player.position.x,goal.z-player.position.z),r=world.regionAt(player.position.x,player.position.z);
   regionNode.textContent=(state.dimension?'UMBRAL II':'UMBRAL I')+' · '+r.name;
   const title=run.phase==='boss'?'CAZA · LEVIATÁN':run.phase==='extract'?'EXTRACCIÓN · '+Math.floor(run.extract)+'/5 s':run.phase==='complete'?'EXPEDICIÓN COMPLETA':'CONTRATO · RELÉS '+run.relays.filter(Boolean).length+'/3';
   objective.textContent=title+' — '+goal.name+' · '+Math.round(distance/10)+' m';
   const bearing=Math.atan2(-(goal.x-player.position.x),-(goal.z-player.position.z))-yaw;
   document.getElementById('goal-bearing').style.transform='rotate('+bearing+'rad)';
   document.getElementById('contract-note').textContent=state.time<run.noticeUntil?run.notice:'Exploración '+run.visited.length+'/4 · Nivel '+run.level+' · Fragmentos '+run.shards;
   prompt.textContent=distance<90&&run.phase==='relays'?'E · sincronizar relé':Math.hypot(player.position.x,player.position.z-110)<105?'E · descansar / calibrar arsenal (20 fragmentos)':'';
   bossNode.hidden=!boss.userData.alive||boss.position.distanceTo(player.position)>1200;
   bossNode.textContent='LEVIATÁN DEL VACÍO · '+boss.userData.hp+' / '+boss.userData.maxHp+(boss.userData.hp<boss.userData.maxHp*.5?' · FASE 2':'');
   document.getElementById('map-panel').hidden=!mapOpen;if(mapOpen&&state.time-lastMap>.2){lastMap=state.time;drawMap();}
 }
 function suspend(){return {run:JSON.parse(JSON.stringify(run)),bossTimer,loot:loot.map(p=>({active:p.active,life:p.life,value:p.value,position:p.mesh.position.toArray()}))};}
 function restore(s){Object.assign(run,s.run);bossTimer=s.bossTimer;bossWindup=0;warning.visible=false;mapOpen=false;lastMap=-1;for(let i=0;i<loot.length;i++){const p=loot[i],a=s.loot[i];p.active=a.active;p.life=a.life;p.value=a.value;p.mesh.position.fromArray(a.position);p.mesh.visible=p.active;}for(let i=0;i<3;i++)world.beacons[i].core.material.color.set(run.relays[i]?'#d7bd68':'#71ddbd');}
 return {run,reset,interact,update,present,recordKill,save,nearestGoal,suspend,restore,toggleMap(){mapOpen=!mapOpen;drawMap();},snapshot(){return JSON.parse(JSON.stringify(run));}};
};
