/* Offline Warrior presentation. Physics, targeting and network state remain spheres. */
window.CRHumanoids=function(T){
 const template=new T.ObjectLoader().parse(window.CRWarriorData),actors=new Set();
 const clips=template.animations.map(c=>{const copy=c.clone();for(const tr of copy.tracks){if(tr.name==='Bip001.position'){for(let i=0;i<tr.values.length;i+=3){tr.values[i]=tr.values[0];tr.values[i+2]=tr.values[2];}}}return copy;});
 const p=new T.Vector3(),q=new T.Vector3(),foot=new T.Vector3();
 function cloneRig(source){
  const clone=source.clone(true),original=[],copied=[],map=new Map();source.traverse(o=>original.push(o));clone.traverse(o=>copied.push(o));original.forEach((o,i)=>map.set(o,copied[i]));
  original.forEach(o=>{if(!o.isSkinnedMesh)return;const m=map.get(o);m.skeleton=new T.Skeleton(o.skeleton.bones.map(b=>map.get(b)),o.skeleton.boneInverses);m.bindMatrix.copy(o.bindMatrix);m.bindMatrixInverse.copy(o.bindMatrixInverse);m.frustumCulled=false;m.geometry.userData.humanoidShared=true;});
  return clone;
 }
 function attach(root,radius,core,face,{player=false,health=null}={}){
  if(root.userData.humanoid)return root.userData.humanoid;
  root.userData.core=core;
  const model=cloneRig(template),factor=radius/18*120,anchor=new T.Group(),accents=new T.Group();
  model.name='warrior-body-rig';model.scale.setScalar(factor);model.position.y=-radius;root.add(model,anchor);anchor.name='original-sphere-head';
  // Reparent the actual original objects: no replacement texture or face material.
  core.scale.setScalar(.42);face.scale.setScalar(.42);anchor.add(core,face,accents);accents.scale.setScalar(.42);
  const source=player?root.userData.rolling:root;
  for(const item of [...source.children])if(item!==model&&item!==anchor&&item!==health&&item!==root.userData.rolling&&!item.isLight)accents.add(item);
  if(player)root.userData.rolling.visible=false;
  const bones=[];let skin;model.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh){skin=o;const m=core.material.clone();m.emissiveIntensity=.08;o.material=m;o.castShadow=o.receiveShadow=true;}});
  const head=bones.find(b=>/Head/.test(b.name)),feet=bones.filter(b=>/Toe0$/.test(b.name));
  const mixer=new T.AnimationMixer(model),actions={};for(const name of ['idle','mv_tar21','atk01','hurt']){const c=clips.find(a=>a.name===name);if(c)actions[name]=mixer.clipAction(c);}
  actions.idle.play();const data={root,model,anchor,accents,core,face,health,head,feet,skin,mixer,actions,factor,radius,previous:root.position.clone(),speed:0,mode:'idle',elapsed:0};
  root.userData.humanoid=data;actors.add(data);pose(data,0,{speed:0,yaw:0,grounded:true});return data;
 }
 function pose(a,dt,{speed=0,yaw=0,grounded=true,attack=false,hurt=false,dead=false}={}){
  dt=T.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.05);a.elapsed+=dt;a.speed+=(speed-a.speed)*(1-Math.exp(-dt*16));
  const name=hurt?'hurt':attack?'atk01':grounded&&a.speed>5?'mv_tar21':'idle';
  if(a.mode!==name&&a.actions[name]){a.actions[a.mode]?.fadeOut(.12);a.actions[name].reset().fadeIn(.12).play();a.mode=name;}
  const action=a.actions[a.mode];if(action)action.timeScale=a.mode==='mv_tar21'?T.MathUtils.clamp(a.speed/105,.35,3):1;
  a.mixer.update(dt);a.model.rotation.y=yaw+Math.PI;a.model.position.y=-a.radius;a.root.updateMatrixWorld(true);
  // Contact is visual only; sole alignment uses toe bones, never modifies actor position.
  let min=Infinity;for(const b of a.feet){b.getWorldPosition(foot);a.root.worldToLocal(foot);min=Math.min(min,foot.y);}
  if(Number.isFinite(min))a.model.position.y+=-a.radius+1-min;a.root.updateMatrixWorld(true);
  a.head.getWorldPosition(p);a.root.worldToLocal(p);a.anchor.position.copy(p);a.anchor.position.y+=a.factor*.055;
  if(a.health)a.health.position.y=a.anchor.position.y+a.radius*.42+12;
  a.skin.material.color.copy(a.core.material.color);a.skin.material.emissive.copy(a.core.material.emissive);a.skin.material.emissiveIntensity=Math.min(.16,a.core.material.emissiveIntensity*.3);
  // Existing actor visibility owns elimination; never leave a head without its body.
  a.previous.copy(a.root.position);
 }
 function update(root,dt,state){const a=root.userData.humanoid;if(a)pose(a,dt,state);}
 function updateEnemy(root,dt){const a=root.userData.humanoid;if(!a||!root.visible)return;const distance=Math.hypot(root.position.x-a.previous.x,root.position.z-a.previous.z);pose(a,dt,{speed:dt>0&&distance<80?distance/dt:0,yaw:0,attack:root.userData.windup>0,hurt:root.userData.flash>0});}
 function cameraFade(root,camera,transit=false){const a=root.userData.humanoid;if(!a)return;const alpha=transit?1:T.MathUtils.smoothstep(camera.position.distanceTo(root.position),30,80);for(const group of [a.model,a.anchor])group.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.opacity=alpha;m.transparent=alpha<.999;m.depthWrite=alpha>=.999;}});}
 function release(root){const a=root.userData.humanoid;if(!a)return;actors.delete(a);a.mixer.stopAllAction();a.mixer.uncacheRoot(a.model);a.skin.material.dispose();a.skin.skeleton.dispose();delete root.userData.humanoid;}
 function cloneTransit(root){const a=root.userData.humanoid,model=cloneRig(a.model),head=a.anchor.clone(true),body=new T.Group();body.add(model,head);body.userData={};return body;}
 function audit(){return {asset:'Warrior.fbx',actors:actors.size,clips:clips.map(c=>c.name),sharedGeometry:true,facesRedrawn:false,collidersChanged:false,rigs:[...actors].map(a=>({name:a.root.name,bones:a.skin.skeleton.bones.length,head:a.anchor.position.toArray(),radius:a.radius,headRadius:a.radius*.42,mode:a.mode,finite:a.skin.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite))}))};}
 window.CRHumanoidsTransit=cloneTransit;return {attach,update,updateEnemy,cameraFade,release,cloneTransit,audit};
};
