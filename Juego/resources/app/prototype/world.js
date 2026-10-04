/* Authored procedural regions. Decoration and landmarks stay in world coordinates. */
window.CRWorld = function({T,scene,heightAt,hash,neon,additive,dimension=0}) {
  const regions=[
    {id:'umbral',name:'UMBRAL · MARISMA VIVA',color:'#50684f',fog:'#15292c',water:'#224345',description:'Agua negra, raíces y cantos entre la niebla.'},
    {id:'forge',name:'FUNDICIÓN · CENIZAL',color:'#5b3d28',fog:'#352620',water:'#6c392c',description:'Ceniza, mineral caliente y ecos bajo la corteza.'},
    {id:'rift',name:'FRACTURA · BOSQUE QUEBRADO',color:'#403b69',fog:'#272340',water:'#343457',description:'Fragmentos suspendidos, esporas y grietas resonantes.'},
    {id:'heart',name:'CORAZÓN DEL VACÍO',color:'#183342',fog:'#111e2b',water:'#183a48',description:'Ruinas sumergidas bajo una singularidad distante.'}
  ];
  if(dimension===1){for(let i=0;i<regions.length;i++)regions[i].name=window.CRDimensions[1].zones[i];const fog=['#1b2334','#302536','#292542','#172439'],water=['#2d3f55','#594055','#3d385f','#233e53'];for(let i=0;i<regions.length;i++){regions[i].fog=fog[i];regions[i].water=water[i];}}
  function regionAt(x,z){return x<-1250?regions[3]:z<-1600?regions[2]:x>950?regions[1]:regions[0];}
  const root=new T.Group();root.name='living-world';scene.add(root);
  const colliders=[],waters=[],animated=[],landmarks=[];
  const sites=[{id:'umbral',name:'Relé del Manglar',x:-520,z:-700},{id:'forge',name:'Relé de Ceniza',x:1450,z:-900},{id:'rift',name:'Relé de la Grieta',x:650,z:-2250},{id:'boss',name:'Santuario del Vacío',x:-1750,z:-1400},{id:'extract',name:'Refugio · extracción',x:0,z:110}];
  if(dimension===1){const names=['Relé del Receptor','Relé del Horno','Relé del Coro','Archivo del Vacío','Refugio de la señal'];sites.forEach((s,i)=>s.name=names[i]);}
  const refuges=window.CRShelters.world({T,root,heightAt,colliders,dimension,neon});
  const content=window.CRDimensionContent({T,root,heightAt,colliders,sites,neon,dimension});landmarks.push(...content.landmarks);
  function onRoute(x,z){return content.routes.some(route=>route.slice(1).some((b,i)=>{const a=route[i],dx=b.x-a.x,dz=b.z-a.z,f=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-f*dx,z-a.z-f*dz)<58;}));}
  const obj=new T.Object3D(),matrix=new T.Matrix4(),up=new T.Vector3(0,1,0);
  function box(x,y,z,sx,sy,sz){colliders.push(new T.Box3(new T.Vector3(x-sx/2,y-sy/2,z-sz/2),new T.Vector3(x+sx/2,y+sy/2,z+sz/2)));}
  function instance(geometry,material,count){const m=new T.InstancedMesh(geometry,material,count);m.castShadow=false;m.receiveShadow=true;root.add(m);return m;}
  function place(mesh,i,x,y,z,sx,sy,sz,rotation=0){obj.position.set(x,y,z);obj.rotation.set(0,rotation,0);obj.scale.set(sx,sy,sz);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);}
  const portal={x:-260,z:-450,radius:82,destination:dimension===0?'UMBRAL II':'UMBRAL I'};
  function safe(x,z){return refuges.points.some(s=>Math.hypot(x-s.position[0],z-s.position[2])<170)||onRoute(x,z)||Math.abs(x-520)<210&&Math.abs(z-1080)<250||Math.abs(x-900)<230&&Math.abs(z-620)<260|| Math.hypot(x-portal.x,z-portal.z)<165||Math.hypot(x,z)<200||sites.some(s=>Math.hypot(x-s.x,z-s.z)<115)||Math.abs(x-Math.sin(z*.0018)*160)<80;}
  // Bark relief is baked once. No texture generation in the frame loop.
  function bark(){const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#405049';ctx.fillRect(0,0,128,256);for(let i=0;i<70;i++){ctx.strokeStyle=i%3?'#23312f':'#738073';ctx.lineWidth=1+i%3;ctx.beginPath();ctx.moveTo(i*17%128,0);ctx.bezierCurveTo(i*23%128,60,i*13%128,180,i*29%128,256);ctx.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
  const trunkMat=new T.MeshStandardMaterial({color:'#56615a',map:bark(),roughness:.92});
  const trunk=instance(new T.CylinderGeometry(.65,1,1,7),trunkMat,620);
  const branches=instance(new T.CylinderGeometry(.3,.55,1,6),trunkMat,1240);
  const crowns=instance(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#345046',roughness:.97,flatShading:true}),620);
  let treeIndex=0;
  for(let i=0;i<950 && treeIndex<620;i++){
    const extent=i<380?2600:6700,x=(hash(i,44)-.5)*extent,z=(hash(i,45)-.5)*extent,r=regionAt(x,z);
    if(safe(x,z)||r.id==='forge'&&hash(i,8)>.18)continue;
    const h=90+hash(i,46)*180,width=7+hash(i,47)*12,y=heightAt(x,z),j=treeIndex++,lean=hash(i,48)*6.28;
    place(trunk,j,x,y+h*.5,z,width,h,width,lean);trunk.setColorAt(j,new T.Color(r.id==='heart'?'#364251':r.id==='rift'?'#685d6d':'#738277'));
    box(x,y+h*.5,z,width*1.8,h,width*1.8);
    for(let k=0;k<2;k++){const angle=lean+k*2.9;const direction=new T.Vector3(Math.cos(angle)*.7,.65,Math.sin(angle)*.7).normalize();obj.position.set(x+direction.x*h*.19,y+h*.73,z+direction.z*h*.19);obj.quaternion.setFromUnitVectors(up,direction);obj.scale.set(width*.5,h*.6,width*.5);obj.updateMatrix();branches.setMatrixAt(j*2+k,obj.matrix);}
    obj.quaternion.identity();place(crowns,j,x,y+h,z,h*.24,h*.18,h*.22,lean);crowns.setColorAt(j,new T.Color(r.id==='rift'?'#694b73':r.id==='heart'?'#294d62':'#54724d'));
  }
  trunk.count=crowns.count=treeIndex;branches.count=treeIndex*2;
  trunk.castShadow=crowns.castShadow=true;
  const rootFans=instance(new T.CylinderGeometry(.15,.8,1,5),trunkMat,treeIndex*3);
  for(let i=0;i<treeIndex;i++){trunk.getMatrixAt(i,matrix);obj.matrix.copy(matrix);obj.matrix.decompose(obj.position,obj.quaternion,obj.scale);const x=obj.position.x,z=obj.position.z,w=obj.scale.x;for(let j=0;j<3;j++){const a=i*1.37+j*2.1;obj.position.set(x+Math.cos(a)*w*1.2,heightAt(x,z)+w*.5,z+Math.sin(a)*w*1.2);obj.quaternion.setFromUnitVectors(up,new T.Vector3(Math.cos(a),.4,Math.sin(a)).normalize());obj.scale.set(w*.25,w*3,w*.25);obj.updateMatrix();rootFans.setMatrixAt(i*3+j,obj.matrix);}}
  obj.quaternion.identity();
  // Root fans, reeds and fungi supply near-ground scale without closing traversal lanes.
  const reed=instance(new T.ConeGeometry(1,1,4),new T.MeshStandardMaterial({color:'#819068',roughness:.95}),9000);
  const fungi=instance(new T.SphereGeometry(1,7,5),neon('#65bdac',.25,.75),750);
  const windShaders=[];
  for(const mesh of [crowns,reed]){mesh.material.onBeforeCompile=shader=>{shader.uniforms.windTime={value:0};shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(windTime*.65 + instanceMatrix[3].x*.03 + position.y)*.018*max(0.,position.y);');windShaders.push(shader);};}
  for(let i=0;i<9000;i++){const near=i<1500,angle=hash(i,60)*6.28,radius=80+hash(i,61)*430,x=near?-80+Math.cos(angle)*radius:(hash(i,60)-.5)*6500,z=near?-260+Math.sin(angle)*radius:(hash(i,61)-.5)*6500,y=heightAt(x,z),h=9+hash(i,62)*24;place(reed,i,x,y+h*.4,z,near?1.5:2,h,near?1.5:2,hash(i,63)*6.28);reed.setColorAt(i,new T.Color(regionAt(x,z).id==='forge'?'#947359':'#879672'));}
  for(let i=0;i<750;i++){const x=(hash(i,68)-.5)*6000,z=(hash(i,69)-.5)*6000;place(fungi,i,x,heightAt(x,z)+3,z,4+hash(i,70)*6,2,4+hash(i,70)*6);}
  // Clumped understory frames paths; it is soft vegetation, not invisible cover.
  const shrubs=instance(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#344f42',roughness:1}),960);
  for(let i=0;i<240;i++){const x=(hash(i,201)-.5)*4400,z=(hash(i,202)-.5)*4400;
    for(let j=0;j<4;j++){const k=i*4+j,px=x+Math.cos(j*2.4)*14,pz=z+Math.sin(j*2.4)*14,h=12+hash(i,j+203)*19;
      if(safe(px,pz)){place(shrubs,k,px,heightAt(px,pz),pz,0,0,0);continue;}
      place(shrubs,k,px,heightAt(px,pz)+h*.45,pz,h*.8,h*.55,h*.7,i+j);shrubs.setColorAt(k,new T.Color(regionAt(px,pz).id==='forge'?'#62513c':regionAt(px,pz).id==='rift'?'#51485e':'#3c5849'));}}
  const mysteries=[{x:-430,z:-1050},{x:880,z:-2050},{x:-1940,z:-850}];
  for(const m of mysteries){m.position={x:m.x,y:heightAt(m.x,m.z)+18,z:m.z};const g=new T.Group();g.position.set(m.x,heightAt(m.x,m.z),m.z);root.add(g);
    for(let j=0;j<5;j++){const stone=new T.Mesh(new T.OctahedronGeometry(9,0),new T.MeshStandardMaterial({color:'#45595b',roughness:.9}));stone.position.set(Math.cos(j*1.256)*25,9,Math.sin(j*1.256)*25);stone.scale.y=1.7;g.add(stone);}
    const core=new T.Mesh(new T.OctahedronGeometry(3,0),neon('#8eacb7',.35));core.position.y=18;g.add(core);m.core=core;}
  const ruinMat=new T.MeshStandardMaterial({color:'#4d5558',roughness:.9,metalness:.05});
  function ruin(x,z,angle=0){const g=new T.Group();g.position.set(x,heightAt(x,z),z);g.rotation.y=angle;root.add(g);
    for(const side of [-1,1]){const col=new T.Mesh(new T.BoxGeometry(24,130,30),ruinMat);col.position.set(side*78,65,0);col.castShadow=true;g.add(col);}
    const beam=new T.Mesh(new T.BoxGeometry(184,25,30),ruinMat);beam.position.y=136;g.add(beam);g.updateMatrixWorld(true);
    for(const part of g.children)colliders.push(new T.Box3().setFromObject(part));
    const ring=new T.Mesh(new T.TorusGeometry(45,1.4,6,40),additive('#b8c7a7',.25));ring.position.y=78;g.add(ring);landmarks.push(g);
  }
  ruin(1250,-700,.3);ruin(500,-1870,-.2);ruin(-1650,-1200,.4);
  const singularityPortal=window.CRSingularity({T,root,portal,heightAt,neon,additive});
  // Shallow pockets use the terrain surface as their basin; only wet vertices draw.
  for(let i=0;i<32;i++){
    const x=i===0?-80:(hash(i,90)-.5)*6000,z=i===0?-260:(hash(i,91)-.5)*6000,radius=120+hash(i,92)*170,y=heightAt(x,z)+2.8;
    const g=new T.PlaneGeometry(radius*2,radius*2,14,14);const p=g.attributes.position;for(let j=0;j<p.count;j++){const px=p.getX(j)+x,pz=-p.getY(j)+z;p.setZ(j,Math.max(y,heightAt(px,pz)+.15));}
    g.computeVertexNormals();const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},color:{value:new T.Color(regionAt(x,z).water)}},vertexShader:'varying vec2 uvW;varying vec3 pos;void main(){uvW=uv;pos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;uniform vec3 color;varying vec2 uvW;varying vec3 pos;void main(){float edge=1.-smoothstep(.38,.5,length(uvW-.5));float rip=.5+.5*sin((uvW.x+uvW.y)*110.-time*1.8);gl_FragColor=vec4(color+vec3(.025,.05,.05)*rip,edge*.7);}' });
    const mesh=new T.Mesh(g,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,0,z);mesh.renderOrder=1;root.add(mesh);waters.push({x,z,radius,y,mesh});animated.push(mat);
  }
  function wetAt(x,z){return waters.some(w=>Math.hypot(x-w.x,z-w.z)<w.radius*.76 && heightAt(x,z)<w.y+.4);}
  const glows=instance(new T.SphereGeometry(1,5,4),new T.MeshBasicMaterial({color:'#b5e68a',transparent:true,opacity:.75}),180);
  const glowBase=[];for(let i=0;i<180;i++)glowBase.push(new T.Vector3((hash(i,103)-.5)*2100,30+hash(i,104)*90,(hash(i,105)-.5)*2100));
  const mistCanvas=document.createElement('canvas');mistCanvas.width=mistCanvas.height=128;const mc=mistCanvas.getContext('2d'),grad=mc.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'#b6d3bf18');grad.addColorStop(.6,'#a7bfa60a');grad.addColorStop(1,'#a7bfa600');mc.fillStyle=grad;mc.fillRect(0,0,128,128);const mistTexture=new T.CanvasTexture(mistCanvas);
  const mists=[];for(let i=0;i<32;i++){const x=(hash(i,110)-.5)*6000,z=(hash(i,111)-.5)*6000;const sprite=new T.Sprite(new T.SpriteMaterial({map:mistTexture,transparent:true,depthWrite:false,color:'#83b2ae'}));sprite.position.set(x,heightAt(x,z)+30,z);sprite.scale.set(540+hash(i,112)*600,120,1);root.add(sprite);mists.push(sprite);}
  // Distant landmarks: eclipsed moon, broken shards, gravitational aperture.
  const moon=new T.Mesh(new T.SphereGeometry(260,32,20),new T.MeshStandardMaterial({color:'#829788',emissive:'#24312c',emissiveIntensity:.25,roughness:1}));moon.position.set(-2000,1000,-3800);root.add(moon);
  const forgeSun=new T.Mesh(new T.SphereGeometry(140,24,16),neon('#a75a25',.5));forgeSun.position.set(2700,750,-2600);root.add(forgeSun);
  const singularity=new T.Group();singularity.position.set(-2100,550,-2600);root.add(singularity);singularity.add(new T.Mesh(new T.SphereGeometry(110,24,16),new T.MeshBasicMaterial({color:'#03060a'})));
  const disk=new T.Mesh(new T.TorusGeometry(165,13,9,70),additive('#67b6db',.3));disk.rotation.set(.7,.2,.3);singularity.add(disk);
  for(let i=0;i<30;i++){const shard=new T.Mesh(new T.OctahedronGeometry(12+hash(i,121)*35),neon('#514678',.15,.8));shard.position.set(300+(hash(i,122)-.5)*1500,120+hash(i,123)*240,-2300+(hash(i,124)-.5)*700);shard.rotation.set(i,.2*i,.3*i);root.add(shard);landmarks.push(shard);}
  const beacons=[];
  for(const site of sites){const g=new T.Group();g.position.set(site.x,heightAt(site.x,site.z),site.z);root.add(g);
    const base=new T.Mesh(new T.CylinderGeometry(42,48,8,12),ruinMat);base.position.y=4;g.add(base);
    const resting=site.id==='extract';
    const core=new T.Mesh(new T.OctahedronGeometry(resting?5:14,0),neon(site.id==='boss'?'#cf7fc8':'#71ddbd',.8));core.position.y=resting?11:45;g.add(core);
    const halo=new T.Mesh(new T.TorusGeometry(resting?35:27,resting?.6:1.7,7,42),additive('#94efd9',resting?.2:.7));halo.position.y=resting?9:45;halo.rotation.x=resting?Math.PI/2:0;g.add(halo);
    const beam=new T.Mesh(new T.CylinderGeometry(.8,2.5,260,6),additive('#7bdcc1',resting?.025:.09));beam.position.y=140;g.add(beam);
    beacons.push({...site,object:g,core,halo});
  }
  // Small fauna and precipitation use fixed pools; neither participates in combat RNG.
  const flock=instance(new T.ConeGeometry(1,1,3),new T.MeshStandardMaterial({color:'#263638',roughness:1}),48);
  const rainGeometry=new T.BufferGeometry(),rainData=new Float32Array(260*6);
  rainGeometry.setAttribute('position',new T.BufferAttribute(rainData,3));
  const rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#9badac',transparent:true,opacity:.1,depthWrite:false}));rain.frustumCulled=false;root.add(rain);
  let current=regions[0],weather=0,disturbUntil=0;
  const growth=dimension===1?window.CRGrowth({T,root,heightAt,hash,surfaces:[trunkMat,crowns.material,shrubs.material]}):null;
  function disturb(time){disturbUntil=time+5;}
  function update(time,dt,position,transitIntensity=0){
    singularityPortal.update(time,transitIntensity);
    if(growth)growth.update(time);
    current=regionAt(position.x,position.z);const targetColor=new T.Color(current.fog);scene.fog.color.lerp(targetColor,1-Math.exp(-dt*.8));scene.fog.density=T.MathUtils.lerp(scene.fog.density,current.id==='umbral'?.00125:current.id==='heart'?.001:.00085,1-Math.exp(-dt));
    weather=.5+.5*Math.sin(time*.025);for(const mat of animated)mat.uniforms.time.value=time;
    for(const shader of windShaders)shader.uniforms.windTime.value=time;
    for(const m of mysteries){const proximity=Math.max(0,1-Math.hypot(position.x-m.x,position.z-m.z)/350);m.core.material.emissiveIntensity=.15+proximity*(.25+.1*Math.sin(time*.9));m.core.rotation.y=time*.15;}
    for(let i=0;i<mists.length;i++){mists[i].material.opacity=.7+.15*Math.sin(time*.07+i);mists[i].position.x=(hash(i,110)-.5)*6000+Math.sin(time*.025+i)*35;}
    const sky=scene.getObjectByName('atmosphereSky');if(sky)sky.material.uniforms.horizon.value.lerp(targetColor,1-Math.exp(-dt));
    const fill=scene.getObjectByName('regionFill');if(fill)fill.color.lerp(new T.Color(dimension===1?'#c4c6e1':current.id==='forge'?'#ecc3a0':current.id==='rift'?'#c3b5de':current.id==='heart'?'#a3c6db':'#b6c8a8'),1-Math.exp(-dt*.5));
    for(let i=0;i<glowBase.length;i++){const b=glowBase[i];place(glows,i,b.x+Math.sin(time*.3+i)*20,b.y+Math.sin(time+i)*8,b.z+Math.cos(time*.25+i)*15,1.2,1.2,1.2);}
    glows.instanceMatrix.needsUpdate=true;
    for(const b of beacons){b.core.rotation.y=time*.7;b.core.position.y=b.id==='extract'?11:45+Math.sin(time*1.5)*3;if(b.id!=='extract')b.halo.rotation.set(.6,time*.25,.4);}
    for(let i=0;i<24;i++){
      const x=-650+Math.sin(time*.035+i*.7)*480,z=-800+Math.cos(time*.03+i*.7)*540;
      const scared=Math.max(0,disturbUntil-time),y=heightAt(x,z)+145+Math.sin(time*.3+i)*30+scared*20;
      for(let w=0;w<2;w++){place(flock,i*2+w,x+(w?5:-5),y,z,7,2,3,time*.06+i);obj.rotation.z=(w?1:-1)*Math.sin(time*7+i)*.55;obj.updateMatrix();flock.setMatrixAt(i*2+w,obj.matrix);}
    }
    obj.rotation.set(0,0,0);flock.instanceMatrix.needsUpdate=true;
    rain.material.opacity=current.id==='forge'?.025:.025+weather*.06;
    for(let i=0;i<260;i++){const x=position.x+(hash(i,150)-.5)*900,z=position.z+(hash(i,151)-.5)*900,y=heightAt(x,z)+((hash(i,152)*420-time*180)%420+420)%420;rainData.set([x,y,z,x-1.5,y-11,z+1.5],i*6);}
    rainGeometry.attributes.position.needsUpdate=true;
    disk.rotation.z+=dt*.045;
  }
  // Acoustic anchors are derived from the rendered world, indexed once, queried at 10 Hz.
  const audioCells=new Map(),audioCell=300;
  function acoustic(id,kind,x,y,z,range){const item={id,kind,position:{x,y,z},range,phase:hash(x,z,190)*6.28};const key=Math.floor(x/audioCell)+','+Math.floor(z/audioCell);if(!audioCells.has(key))audioCells.set(key,[]);audioCells.get(key).push(item);}
  for(let i=0;i<treeIndex;i++){trunk.getMatrixAt(i,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix);acoustic('tree-'+i,'tree',p.x,heightAt(p.x,p.z)+45,p.z,220);}
  for(let i=0;i<9000;i+=12){reed.getMatrixAt(i,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix);acoustic('reeds-'+i,'reeds',p.x,p.y+5,p.z,95);}
  waters.forEach((w,i)=>acoustic('water-'+i,'water',w.x,w.y+3,w.z,650));
  landmarks.forEach((l,i)=>acoustic('landmark-'+i,l.isGroup?'ruin':'crystal',l.position.x,l.position.y+(l.isGroup?65:0),l.position.z,l.isGroup?380:550));
  acoustic('forge-vent','thermal',sites[1].x+65,heightAt(sites[1].x+65,sites[1].z)+18,sites[1].z,650);
  acoustic('dimension-gate','crystal',portal.x,heightAt(portal.x,portal.z)+68,portal.z,350);
  const ramp=(v,a,b)=>{const t=T.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  function audioEnvironment(position,time){
    const candidates=[];
    for(let x=Math.floor((position.x-700)/audioCell);x<=Math.floor((position.x+700)/audioCell);x++)for(let z=Math.floor((position.z-700)/audioCell);z<=Math.floor((position.z+700)/audioCell);z++)for(const a of audioCells.get(x+','+z)||[]){const d=Math.hypot(position.x-a.position.x,position.z-a.position.z);if(d<a.range)candidates.push({...a,d});}
    candidates.sort((a,b)=>a.d-b.d);const counts={},emitters=[];
    for(const a of candidates){if((counts[a.kind]||0)>=(a.kind==='water'?2:1))continue;counts[a.kind]=(counts[a.kind]||0)+1;emitters.push({...a,intensity:a.kind==='reeds'?1-a.d/a.range:1});if(emitters.length>=7)break;}
    // Match the moving flock coordinates from update(), including its response to shots.
    const x=-650+Math.sin(time*.035)*480,z=-800+Math.cos(time*.03)*540,y=heightAt(x,z)+145+Math.sin(time*.3)*30+Math.max(0,disturbUntil-time)*20;
    if(Math.hypot(position.x-x,position.z-z)<750)emitters.push({id:'flock',kind:'fauna',position:{x,y,z},intensity:time<disturbUntil?.2:1});
    const heart=1-ramp(position.x,-1450,-1050),rift=(1-heart)*(1-ramp(position.z,-1800,-1400)),forge=(1-heart-rift)*ramp(position.x,750,1150);
    const ruin=candidates.find(a=>a.kind==='ruin');
    const mystery=mysteries.find(m=>Math.hypot(position.x-m.x,position.z-m.z)<480);
    const resonances=[{id:'portal-resonance',position:{x:portal.x,y:heightAt(portal.x,portal.z)+68,z:portal.z}},...beacons.map((b,i)=>({id:'relay-resonance-'+i,position:{x:b.x,y:heightAt(b.x,b.z)+45,z:b.z}})),...mysteries.map((m,i)=>({id:'mystery-resonance-'+i,position:m.position})),...(growth?growth.resonances():[])].filter(a=>Math.hypot(position.x-a.position.x,position.z-a.position.z)<600);
    return {emitters,resonances,mystery:mystery?{position:mystery.position}:null,wet:wetAt(position.x,position.z),weather,shelter:ruin?Math.max(0,1-ruin.d/180):0,weights:[1-heart-rift-forge,forge,rift,heart]};
  }
  const vertical=window.CRVerticalWorld({T,root,colliders,heightAt});
  return {refuges,content,singularityPortal,vertical,root,colliders,regions,sites,beacons,portal,regionAt,wetAt,update,disturb,audioEnvironment,aesthetic(){return growth?growth.stats():{style:'original-marsh',sculptures:0,stems:0,orbs:0,particles:0,cosmetic:true};},stats(){return {trees:treeIndex,reeds:9000,fungi:750,shrubs:960,mysteries:mysteries.length,waterPockets:waters.length,landmarks:landmarks.length,covers:content.covers,routes:content.routes.length,colliders:colliders.length,fauna:24,rainDrops:260,region:current.id,weather};}};
};
