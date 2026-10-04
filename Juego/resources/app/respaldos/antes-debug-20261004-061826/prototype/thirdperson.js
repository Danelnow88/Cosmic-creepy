(() => {
  'use strict';
  const T = window.THREE, canvas = document.getElementById('world');
  const renderer = new T.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color(0x02030a); scene.fog = new T.FogExp2(0x040716, 0.0002);
  const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 9000);
  const clock = new T.Clock(), raycaster = new T.Raycaster();
  const WORLD = 7200, HALF = WORLD * 0.5, PLAYER_RADIUS = 18;
  let yaw = 0, pitch = 0.18, travelled = 0, ready = false, accumulator = 0,dimensionId=0,portalLock=0,portalFlash=0,lastFrameError=null,frameFaults=0,frameSerial=0,contextLost=false;
  const P = window.CRPhysics;
  const state = { hp:100, kills:0, grounded:true, coyote:0, jumpBuffer:0, dashBuffer:0, dash:0, cooldown:0, invincible:0, fireCooldown:0, hurt:0, hit:0, time:0, paused:false, dead:false, won:false, cameraMode:'free', lastMouse:-10 };
  const dashDirection = new T.Vector3(), pointerAim = new T.Vector2();
  let shooting=false, aiming=false, simulationManual=false;
  let networkRole='off',networkTeam=null,networkReady=false,networkSession='',networkSeq=0,networkTick=0,nextNetworkPublish=0,lastRemoteInput=0,remoteSnapshot=null,networkActions=[],captureChannel=null;
  function localControls(){return networkRole==='off'||networkReady&&turns.active()?.teamId===networkTeam;}
  const weapons=[{name:'Pistola',damage:25,rate:.22,mag:14,reload:1.05,pellets:1,spread:0,speed:980},{name:'Rifle',damage:19,rate:.095,mag:28,reload:1.5,pellets:1,spread:.014,speed:1250},{name:'Escopeta',damage:11,rate:.65,mag:6,reload:1.7,pellets:8,spread:.1,speed:780},{name:'Mortero',damage:95,rate:1.2,mag:3,reload:2.3,pellets:1,spread:0,speed:0}];
  let selectedWeapon=0,ammo=weapons.map(w=>w.mag),reserve=[28,56,12,3],consumables={medkit:1,shield:1,antidote:1},soloShield=0,consumableCooldown=0,reloadTime=0,reloadWeapon=0,recoil=0;
  let expedition=null;
  const input = { forward:false, back:false, left:false, right:false };
  const velocity = new T.Vector3(), desiredMove = new T.Vector3(), forward = new T.Vector3(), right = new T.Vector3();
  const cameraFocus = new T.Vector3(), cameraDesired = new T.Vector3(), lookDesired = new T.Vector3();
  const obstacles = [], targets = [], projectiles = [], particles = [];
  const speedNode = document.getElementById('speed'), distanceNode = document.getElementById('distance'), targetsNode = document.getElementById('targets');

  function hash(x, z, salt = 0) { const value = Math.sin(x * 127.1 + z * 311.7 + salt * 91.13+dimensionId*137.37) * 43758.5453; return value - Math.floor(value); }
  function rawHeight(x, z) {
    const originalX=x,originalZ=z;x+=dimensionId*713;z-=dimensionId*947;
    const broad = Math.sin(x * 0.00135) * 24 + Math.cos(z * 0.0011) * 19 + Math.sin((x + z) * 0.0021) * 11;
    const detail = Math.sin(x * 0.008 + Math.cos(z * 0.003)) * 3.4 + Math.cos(z * 0.007 - x * 0.001) * 2.6;
    const startBlend = Math.min(1, Math.hypot(originalX, originalZ) / 420);
    const cut=Math.max(0,1-Math.abs(originalX-900)/220)*Math.max(0,1-Math.abs(originalZ-620)/230);
    return (broad + detail) * startBlend -8*Math.exp(-((x+100)**2+(z+280)**2)/(260*260))-130*cut;
  }
  // Same two triangles per cell as PlaneGeometry: physics follows the visible mesh.
  function heightAt(x,z) {
    const step=WORLD/180, gx=T.MathUtils.clamp((x+HALF)/step,0,179.999999), gz=T.MathUtils.clamp((z+HALF)/step,0,179.999999);
    const ix=Math.floor(gx), iz=Math.floor(gz), u=gx-ix,v=gz-iz, x0=ix*step-HALF,z0=iz*step-HALF;
    const a=rawHeight(x0,z0), b=rawHeight(x0+step,z0), c=rawHeight(x0,z0+step), d=rawHeight(x0+step,z0+step);
    return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  function neon(color, glow = 0.5, roughness = 0.35) { return new T.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:glow, roughness, metalness:0.22 }); }
  function additive(color, opacity = 0.35) { return new T.MeshBasicMaterial({ color, transparent:true, opacity, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide }); }
  function makeSurfaceMap() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
    const image=ctx.createImageData(512,512);
    function noise(x,y,size){const count=512/size,gx=x/size,gy=y/size,ix=Math.floor(gx),iy=Math.floor(gy);let u=gx-ix,v=gy-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);const a=hash(ix%count,iy%count,89),b=hash((ix+1)%count,iy%count,89),d=hash(ix%count,(iy+1)%count,89),e=hash((ix+1)%count,(iy+1)%count,89);return (a+(b-a)*u)*(1-v)+(d+(e-d)*u)*v;}
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){const value=100+noise(x,y,128)*45+noise(x,y,32)*38+noise(x,y,8)*23+hash(x,y,77)*12,i=(y*512+x)*4;image.data[i]=value;image.data[i+1]=value+3;image.data[i+2]=value-5;image.data[i+3]=255;}
    ctx.putImageData(image,0,0);
    for(let i=0;i<180;i++){const x=hash(i,72)*512,y=hash(i,73)*512;ctx.fillStyle=i%3?'#27352a30':'#b4bfa323';ctx.fillRect(x,y,1+hash(i,74)*5,1+hash(i,75)*3);}
    const map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(34, 34); map.colorSpace = T.SRGBColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); return map;
  }
  function buildSky() {
    const sky = new T.Mesh(new T.SphereGeometry(7600, 32, 20), new T.ShaderMaterial({ side:T.BackSide, uniforms:{ top:{value:new T.Color('#09052a')}, horizon:{value:new T.Color('#071d35')}, bottom:{value:new T.Color('#010207')} }, vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader:'uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(horizon,top,smoothstep(0.,.75,h));c=mix(bottom,c,smoothstep(-.35,.05,h));gl_FragColor=vec4(c,1.);}' })); sky.name='atmosphereSky';scene.add(sky);
    const geometry = new T.BufferGeometry(), points = [];
    for (let i = 0; i < 1800; i++) { const a = hash(i, 2) * Math.PI * 2, h = hash(i, 5) * 0.82 + 0.08, r = 6200; points.push(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r, Math.sin(a) * Math.sqrt(1 - h * h) * r); }
    geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3)); scene.add(new T.Points(geometry, new T.PointsMaterial({ color:'#b9e9ff', size:5, transparent:true, opacity:0.72, sizeAttenuation:true })));
  }
  function buildTerrain() {
    const segments = 180, geometry = new T.PlaneGeometry(WORLD, WORLD, segments, segments), positions = geometry.attributes.position, colors = [];
    const low = new T.Color('#1c4056'), mid = new T.Color('#397286'), high = new T.Color('#77a6a3'), color = new T.Color();
    for (let i = 0; i < positions.count; i++) { const x = positions.getX(i), z = -positions.getY(i), y = rawHeight(x, z); positions.setZ(i, y); const t = T.MathUtils.clamp((y + 48) / 100, 0, 1); color.set(x<-1250?'#28424e':z<-1600?'#57496a':x>950?'#69543c':'#4a6651').multiplyScalar(.82+t*.42); colors.push(color.r, color.g, color.b); }
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
    const terrain = new T.Mesh(geometry, new T.MeshStandardMaterial({ color:'#b9d1d8', vertexColors:true, map:makeSurfaceMap(), roughness:0.78, metalness:0.12, emissive:'#071923', emissiveIntensity:0.25 })); terrain.rotation.x = -Math.PI / 2; terrain.receiveShadow = true; terrain.name = 'terrain'; scene.add(terrain); return terrain;
  }
  let terrain = buildTerrain(); buildSky();
  const regionFill=new T.HemisphereLight(0xb6c8a8,0x101a18,1.55);regionFill.name='regionFill';scene.add(regionFill);
  const sun = new T.DirectionalLight(0xe6fbff, 2.45); sun.position.set(-900, 1400, 600); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -650; sun.shadow.camera.right = sun.shadow.camera.top = 650; sun.shadow.camera.far = 3200; scene.add(sun);
  const magenta = new T.PointLight(0xff42ac, 34, 1400, 2); magenta.position.set(700, 300, -500); scene.add(magenta);

  const characterStyle=window.CRCharacterStyle(T),humanoids=window.CRHumanoids(T);
  function makePlayer() {
    const root = new T.Group(), rolling = new T.Group(), coreGeo = new T.SphereGeometry(PLAYER_RADIUS, 36, 26);
    const core = characterStyle.body(PLAYER_RADIUS,'#638c88'); core.castShadow = true; core.receiveShadow = true; rolling.add(core);

    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, spike = new T.Mesh(new T.ConeGeometry(2.2, 9.5, 8), new T.MeshStandardMaterial({color:i%2?'#b6aa91':'#668382',roughness:.88,metalness:.04})); const dir = new T.Vector3(Math.cos(a), (i % 3 - 1) * 0.22, Math.sin(a)).normalize(); spike.position.copy(dir).multiplyScalar(PLAYER_RADIUS + 3.5); spike.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); rolling.add(spike); }
    const ringA = new T.Mesh(new T.TorusGeometry(24, 1.2, 8, 48), new T.MeshStandardMaterial({color:'#a3977c',roughness:.72,metalness:.2})); ringA.rotation.set(0.55, 0.2, 0.2); const ringB = new T.Mesh(new T.TorusGeometry(21.5, 0.85, 8, 48), new T.MeshStandardMaterial({color:'#718b89',roughness:.72,metalness:.15})); ringB.rotation.set(1.1, -0.15, -0.55); rolling.add(ringA, ringB);
    const face = characterStyle.face(PLAYER_RADIUS,0); root.add(rolling, face); root.userData.rolling = rolling; root.userData.face = face; root.position.set(0, heightAt(0, 0) + PLAYER_RADIUS, 0); scene.add(root); humanoids.attach(root,PLAYER_RADIUS,core,face,{player:true}); return root;
  }
  const player = makePlayer();
  const transit=window.CRTransit({T,scene,player});
  const candleLight=new T.PointLight(0xffbd72,110,560,2);candleLight.castShadow=false;candleLight.position.set(0,22,-9);player.add(candleLight);
  const shadow = new T.Mesh(new T.CircleGeometry(23, 32), new T.MeshBasicMaterial({ color:'#02040b', transparent:true, opacity:0.46, depthWrite:false })); shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  function crystalCluster(x, z, scale, color) {
    const group = new T.Group(), count = 2 + Math.floor(hash(x, z, 3) * 4); const material = neon(color, 0.55, 0.24);
    for (let i = 0; i < count; i++) { const crystal = new T.Mesh(new T.OctahedronGeometry(scale * (0.5 + hash(x, z, i) * 0.55), 0), material); crystal.scale.y = 1.5 + hash(z, x, i) * 2.4; crystal.position.set((hash(x, i) - 0.5) * scale * 2.2, crystal.scale.y * scale * 0.35, (hash(z, i) - 0.5) * scale * 2.2); crystal.rotation.y = hash(i, x) * Math.PI; crystal.castShadow = true; group.add(crystal); }
    group.position.set(x, heightAt(x, z), z); scene.add(group); obstacles.push({ x, z, radius:scale * 1.4, object:group });
  }
  function rockFormation(x, z, scale) {
    const mesh = new T.Mesh(new T.DodecahedronGeometry(scale, 1), new T.MeshStandardMaterial({ color:'#162c3c', emissive:'#071621', emissiveIntensity:0.3, roughness:0.9, metalness:0.05 })); mesh.scale.set(1.2, 0.65 + hash(x, z) * 0.8, 0.9); mesh.position.set(x, heightAt(x, z) + scale * mesh.scale.y * 0.65, z); mesh.rotation.set(hash(x, 1) * 0.4, hash(z, 2) * Math.PI, hash(x, z) * 0.25); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); obstacles.push({ x, z, radius:scale * 1.05, object:mesh });
  }
  function verticalFootprint(x,z){return Math.abs(x-520)<210&&Math.abs(z-1080)<250||Math.abs(x-900)<230&&Math.abs(z-620)<260;}
  function buildObstacles(){for (let i = 0; i < 220; i++) { const angle = hash(i, 1) * Math.PI * 2, radius = 240 + Math.sqrt(hash(i, 2)) * 3150, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;if(Math.hypot(x+260,z+450)<170||verticalFootprint(x,z))continue; if (i % 3 === 0) crystalCluster(x, z, 10 + hash(i, 5) * 18, i % 2 ? '#28cfe6' : '#bd5bea'); else rockFormation(x, z, 12 + hash(i, 7) * 24); }}
  buildObstacles();
  function energyRiver(seed, color) {
    const points = []; for (let i = 0; i < 14; i++) { const z = -HALF + i / 13 * WORLD, x = Math.sin(i * 0.9 + seed) * 520 + (seed - 1.5) * 900; points.push(new T.Vector3(x, heightAt(x, z) + 1.1, z)); }
    const curve = new T.CatmullRomCurve3(points), tube = new T.Mesh(new T.TubeGeometry(curve, 220, 2.1, 6, false), additive(color, 0.48)); scene.add(tube);
  }
  // Energy is localized to landmarks; the marsh retains dark natural surfaces.

  function makeTarget(index) {
    const angle = index<6 ? Math.PI*1.3+index*0.25 : hash(index, 17)*Math.PI*2, radius=index<6 ? 330+index*60 : 650+hash(index,21)*2400, x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    const group = new T.Group(), size = 15 + hash(index, 5) * 9, color = index % 3 === 0 ? '#ff5b76' : index % 3 === 1 ? '#ff9a55' : '#b56cff';
    const core = characterStyle.body(size,['#997568','#a78c67','#80708e'][index%3]); core.castShadow = true; group.add(core);
    const ring = new T.Mesh(new T.TorusGeometry(size * 1.25, 0.9, 7, 32), new T.MeshStandardMaterial({color:'#756d5c',roughness:.88,metalness:.1})); ring.rotation.x = Math.PI / 2;ring.position.y=-size*.63; group.add(ring);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, spike = new T.Mesh(new T.ConeGeometry(2, size * 0.75, 6), neon(color, 0.12, 0.72)); const dir = new T.Vector3(Math.cos(a), 0.15, Math.sin(a)).normalize(); spike.position.copy(dir).multiplyScalar(size * 1.05); spike.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); group.add(spike); }
    const role=index%3, maxHp=[60,80,150][role];
    const face=characterStyle.face(size,index%6);group.add(face);
    const health=new T.Mesh(new T.PlaneGeometry(34,3),new T.MeshBasicMaterial({color:'#72ffc6',transparent:true,opacity:.85,depthWrite:false})); health.position.y=size+15; health.renderOrder=5; group.add(health);
    const telegraph=new T.Mesh(new T.RingGeometry(size*1.4,size*1.5,32),additive('#ff334f',0.75)); telegraph.rotation.x=-Math.PI/2; telegraph.visible=false; scene.add(telegraph);
    if(role===1){const barrel=new T.Mesh(new T.CylinderGeometry(3.5,5,19,8),neon('#f4ab5c',0.4));barrel.rotation.x=Math.PI/2;barrel.position.set(size*.65,-size*.45,-size-5);group.add(barrel);}
    if(role===2){for(let j=0;j<6;j++){if(j===3)continue;const plate=new T.Mesh(new T.BoxGeometry(size*.65,size*.8,size*.28),neon('#7961b4',0.24)); const a=j*Math.PI/3;plate.position.set(Math.sin(a)*size,0,Math.cos(a)*size);plate.rotation.y=a;group.add(plate);}}
    group.position.set(x,heightAt(x,z)+size*1.2,z);
    group.userData={radius:size*1.2,phase:index*.77,alive:true,role,face,hp:maxHp,maxHp,health,telegraph,home:new T.Vector3(x,0,z),cooldown:1+index*.08,windup:0,flash:0,attackDirection:new T.Vector3()};scene.add(group);targets.push(group);humanoids.attach(group,size*1.2,core,face,{health});return group;
  }
  for (let i = 0; i < 34; i++) makeTarget(i);

  const sound=window.CRSound(),survival=window.CRCandleFear({seed:22391}),terrorAudio=window.CRTerrorAudio({sound,seed:9041}),terrorVisual=window.CRTerrorVisual({T,renderer,scene,camera});
  let survivalFrame=survival.snapshot();const lightScreen=new T.Vector3();
  function startAudio(){return terrorAudio.start();}
  const world={...window.CRWorld({T,scene,heightAt,hash,neon,additive})};
  for(let i=0;i<9;i++){const t=targets[i+6],site=world.sites[Math.floor(i/3)],angle=(i%3)*Math.PI*2/3+.4;const x=site.x+Math.sin(angle)*130,z=site.z+Math.cos(angle)*130;t.userData.home.set(x,0,z);t.position.set(x,heightAt(x,z)+t.userData.radius,z);}
  const boss=makeTarget(34);boss.scale.setScalar(3.1);
  Object.assign(boss.userData,{isBoss:true,alive:false,hp:900,maxHp:900,radius:boss.userData.radius*3.1,home:new T.Vector3(world.sites[3].x,0,world.sites[3].z)});
  boss.userData.core.material.color.set('#ac5279');boss.userData.core.material.emissive.set('#a23766');
  const bossCrown=new T.Mesh(new T.TorusGeometry(35,1.5,8,55),additive('#e4a4be',.42));bossCrown.rotation.x=.65;boss.add(bossCrown);boss.visible=false;
  const particleGeometry = new T.TetrahedronGeometry(1.6, 0);
  for (let i = 0; i < 180; i++) { const mesh = new T.Mesh(particleGeometry, new T.MeshBasicMaterial({ color:'#bdfcff', transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false })); mesh.visible = false; scene.add(mesh); particles.push({ mesh, life:0, velocity:new T.Vector3() }); }
  function burst(position, color, count = 12) { for (let i = 0; i < count; i++) { const p = particles.find(item => item.life <= 0); if (!p) break; const a = i / count * Math.PI * 2 + hash(i, performance.now()); p.life = 0.45 + hash(i, count) * 0.5; p.mesh.visible = true; p.mesh.position.copy(position); p.mesh.material.color.set(color); p.mesh.material.opacity = 0.9; p.velocity.set(Math.cos(a) * (35 + hash(i, 3) * 45), 22 + hash(i, 8) * 55, Math.sin(a) * (35 + hash(i, 6) * 45)); } }
  function updateParticles(dt) { for (const p of particles) { if (p.life <= 0) continue; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= 75 * dt; p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7; p.mesh.material.opacity = Math.max(0, p.life * 1.3); if (p.life <= 0) p.mesh.visible = false; } }

  const projectileGeometry=new T.SphereGeometry(3.2,12,9),haloGeometry=new T.SphereGeometry(5,10,8);
  const projectileMaterial=neon('#bafaff',0.85,0.22), hostileMaterial=neon('#ff334f',0.85,0.22);
  const projectileHalo=additive('#5ff5ff',0.18),hostileHalo=additive('#ff334f',0.2);
  const projectilePool=[];
  for(let i=0;i<120;i++){
    const mesh=new T.Group();mesh.add(new T.Mesh(projectileGeometry,projectileMaterial),new T.Mesh(haloGeometry,projectileHalo));mesh.visible=false;scene.add(mesh);projectilePool.push(mesh);
  }
  const collisions=window.CRCollisionWorld.create({physics:P,heightAt,half:HALF}),collisionBoxes=collisions.boxes;
  function rebuildCollisions(){const source=[];scene.updateMatrixWorld(true);
  for(const obstacle of obstacles) {
    obstacle.object.traverse(object=>{if(object.isMesh){source.push(new T.Box3().setFromObject(object));}});
  }
  source.push(...world.colliders);collisions.rebuild(source);
  }
  rebuildCollisions();
  const nearbyBoxes=collisions.nearby,cameraRig=window.CRCameraRig({T,camera,collisions,heightAt});
  const safePlayer=new T.Vector3().copy(player.position);let nextHealthCheck=0,lastPresentTime=0;
  function diagnoseScene(){const issues=[];if(!window.CRCollisionWorld.finite(player.position)||!window.CRCollisionWorld.finite(velocity))issues.push('Jugador no finito');if(!collisions.clear(player.position,PLAYER_RADIUS-.1))issues.push('Jugador dentro de cobertura');if(!window.CRCollisionWorld.finite(camera.position)||camera.projectionMatrix.elements.some(v=>!Number.isFinite(v)))issues.push('Perspectiva no finita');if(!cameraRig.snapshot().clear)issues.push('Cámara dentro de cobertura');if(!cameraRig.snapshot().aboveTerrain)issues.push('Cámara bajo terreno');if(contextLost)issues.push('Contexto WebGL perdido');if(collisions.audit().invalid)issues.push('Colisiones inválidas');return {ok:issues.length===0,issues,boxes:collisionBoxes.length,dimension:dimensionId};}
  const settings=window.CRSettings({diagnose:diagnoseScene,apply(v){const ratio={low:1,balanced:1.5,high:1.75}[v.quality];renderer.setPixelRatio(Math.min(ratio,devicePixelRatio||1));renderer.shadowMap.enabled=v.shadows;terrorVisual.configure({scale:{low:.6,balanced:.8,high:1}[v.quality],effects:v.effects});resize();}});
  function acousticOcclusion(a,b){
    const dist=Math.hypot(b.x-a.x,b.z-a.z);if(dist<20)return 0;
    const sx=-(b.z-a.z)/dist*8,sz=(b.x-a.x)/dist*8,boxes=nearbyBoxes(a,b,8);let blocked=0;
    for(const offset of [-1,0,1]){
      const from={x:a.x+sx*offset,y:a.y,z:a.z+sz*offset},to={x:b.x+sx*offset,y:b.y,z:b.z+sz*offset};let obstruction=false;
      for(const box of boxes){if(box.containsPoint(b))continue;const t=P.box(from,to,box);if(t!==null&&t>.01&&t<.99){obstruction=true;break;}}
      if(!obstruction){const count=Math.min(32,Math.max(2,Math.ceil(dist/40)));for(let i=1;i<count;i++){const t=i/count;if(from.y+(to.y-from.y)*t<heightAt(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t)+1){obstruction=true;break;}}}
      if(obstruction)blocked++;
    }
    return blocked/3;
  }
  sound.setProbe(acousticOcclusion);
  const audioForward=new T.Vector3(),audioUp=new T.Vector3();let nextAudioScene=-1,audioScene={enemies:[]};
  function updateAudio(){
    if(state.time>=nextAudioScene){nextAudioScene=state.time+.1;
      const enemies=targets.map((t,id)=>({id,position:t.position,role:t.userData.role,phase:t.userData.phase,alive:t.userData.alive&&!t.userData.isBoss,aiming:t.userData.windup>0})).filter(e=>e.alive&&e.position.distanceTo(player.position)<650).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position)).slice(0,4);
      const goal=expedition.nearestGoal();audioScene={enemies,health:state.hp,environment:world.audioEnvironment(player.position,state.time),boss:boss.userData.alive?{position:boss.position,phase:boss.userData.hp<450?2:1}:null,objective:goal?{position:{x:goal.x,y:heightAt(goal.x,goal.z)+45,z:goal.z}}:null};
    }
    camera.getWorldDirection(audioForward);audioUp.set(0,1,0).applyQuaternion(camera.quaternion);
    sound.update(state.time,player.position,yaw,world.regionAt(player.position.x,player.position.z).id,state.grounded?Math.hypot(velocity.x,velocity.z):0,world.wetAt(player.position.x,player.position.z),state.paused,{...audioScene,dimension:dimensionId,forward:audioForward,up:audioUp});
  }
  expedition=window.CRExpedition({T,scene,world,sound,state,player,boss,targets,heightAt,burst,damagePlayer:takeDamage,shootHostile:spawnProjectile,onRestock(){ammo=weapons.map(w=>w.mag);reserve=[28,56,12,3];reloadTime=0;}});
  const mortar=window.CRMortar({T,scene,camera,player,state,heightAt,worldHit,targets,physics:P,sound,damageEnemy,damagePlayer:takeDamage,owner:()=>turns.enabled?turns.active()?.id:null,persist:()=>!state.matchMode,additionalTargets:()=>turns.enabled?turnView.bodies(false):[]});

  const overlay=document.getElementById('game-overlay');
  let startingMatch=false;
  const turns=window.CRTurns.create({onSupply(){supplies.spawn(null,strategy.enabled&&turns.snapshot().turn%3===0?"tool":null);},onEnd(member){if(member){shelters.armSite(member.id);strategy.onEnd(member.id);}},onChange(previous,current){if(!startingMatch)handoff(previous,current);},onFinish(){clearInput();velocity.set(0,0,0);setPaused(true);presentResult();}});
  function presentResult(){const s=turns.snapshot(),team=s.teams.find(t=>t.id===s.winner),r=s.result;document.getElementById('resume').hidden=true;overlay.querySelector('h1').textContent=team?'VICTORIA · '+team.name:'PARTIDA TERMINADA · EMPATE';overlay.querySelector('p').textContent=team?(r?.reason==='last-team'?'Último equipo en pie. Sobrevivientes: '+r.survivors.map(m=>(m.avatar?m.avatar+' ':'')+m.name+' · '+Math.ceil(m.hp)+' HP').join(' / '):team.name+' ganó por '+(r?.reason==='time'?'resultado al cerrar el tiempo.':'puntos.')):r?.reason==='no-survivors'?'No quedó ningún jugador vivo.':'Empate por puntos.';}
  function canRead(id){if(networkRole==='guest'&&strategy?.enabled)return !turns.members.find(m=>m.id===id)?.hidden;if(strategy?.enabled)return strategy.seenByTeam(id,networkTeam||turns.active()?.teamId,{lightRadius:survivalFrame.lightRadius});const m=turns.members.find(m=>m.id===id);if(!m)return false;if(m.teamId===turns.active()?.teamId)return true;const pos=m.data.position;if(!pos)return false;const p=new T.Vector3(...pos);return player.position.distanceTo(p)<=survivalFrame.lightRadius&&worldHit(player.position,p)===null;}
  const turnView=window.CRTurnView({T,scene,player,turns,characterStyle,humanoids,heightAt,collisions,readable:id=>canRead(id),stealth:()=>strategy.enabled});
  const supplies=window.CRSupplies({T,scene,collisions,heightAt,actors:()=>turns.enabled?turns.members.filter(m=>m.hp>0).map(m=>({id:m.id,position:m.id===turns.active()?.id?player.position.toArray():m.data.position})): [{id:'solo',position:player.position.toArray()}],sound});
  const shelters=window.CRShelters.create({actors:()=>turns.members,activeId:()=>turns.active()?.id,phase:()=>turns.phase,dimension:()=>dimensionId,sites:()=>world.refuges.points,positions:id=>id===turns.active()?.id||id==='solo'?player.position.toArray():turns.members.find(m=>m.id===id)?.data.position||[0,0,0],clear:p=>collisions.clear(new T.Vector3(...p),PLAYER_RADIUS-.1),placeEcho:p=>{const q=new T.Vector3(...p).add(new T.Vector3(-Math.sin(yaw)*85,0,-Math.cos(yaw)*85));q.y=heightAt(q.x,q.z)+18;collisions.resolve(q,18);return q.toArray();},onEnd:()=>turns.end(),onNotice:text=>{shelterNotice=text;shelterNoticeUntil=state.time+4;}});
  let shelterNotice='',shelterNoticeUntil=0;const shelterView=window.CRShelterView({T,scene,shelters,turns,dimension:()=>dimensionId});

  let selectedTool='smoke',toolUntil=0,nextStealth=0,grip=null;
  const actorPosition=id=>id===turns.active()?.id?player.position.toArray():turns.members.find(m=>m.id===id)?.data.position||[0,0,0];
  function toolNotice(text){shelterNotice=text;shelterNoticeUntil=state.time+4;}
  function tacticalDefinitions(){const at=(x,z)=>[x,heightAt(x,z)+18,z],circuitAt=(x,z)=>{for(let r=0;r<=240;r+=24)for(let i=0;i<(r?16:1);i++){const a=i*Math.PI/8,p=at(x+Math.cos(a)*r,z+Math.sin(a)*r);if(collisions.clear(new T.Vector3(...p),28))return p;}throw Error('Circuit has no accessible ground');};return [
    {id:'relay-near',type:'relay',name:'Baliza de vigilia',position:at(-330,-270),required:2,points:6},
    ...world.sites.slice(0,3).map((p,i)=>({id:'relay-'+i,type:'relay',name:p.name||'Relé '+(i+1),position:at(p.x,p.z),required:2,points:6})),
    {id:'zone-near',type:'zone',name:'Zona disputada',position:at(320,-250),radius:85,points:2},
    {id:'cargo-near',type:'cargo',name:'Fragmento errante',position:at(-200,-110),points:8,radius:45},
    {id:'extract',type:'extract',name:'Extracción',position:at(0,110),radius:55},
    {id:'wave',type:'pve',name:'Nido hostil',position:at(world.sites[0].x+140,world.sites[0].z),radius:45,points:7,rewardMode:'stealable'},
    ...[[-650,-420],[610,-520],[150,620]].map(([x,z],i)=>({id:'resonator-'+i,type:'resonator',name:'Resonador '+['Umbrío','Hueco','Velado'][i],position:circuitAt(x,z),radius:55,workSeconds:6,points:2})),
    {id:'breach',type:'breach',name:'Brecha de retorno',position:circuitAt(-500,550),radius:55,workSeconds:8,points:18,requires:['resonator-0','resonator-1','resonator-2']}
  ];}
  const strategy=window.CRStrategy.create({actors:()=>turns.members,active:turns.active,phase:()=>turns.phase,position:actorPosition,
    los:(a,b)=>worldHit(new T.Vector3(...a),new T.Vector3(...b))===null,
    clear:(p,r)=>Math.abs(p[0])<HALF-r-5&&Math.abs(p[2])<HALF-r-5&&p[1]>=heightAt(p[0],p[2])+r-.1&&collisions.clear(new T.Vector3(...p),r-.1),ground:heightAt,
    move(id,p,kind){const origin=player.position.clone(),q=new T.Vector3(...p);if([...collisions.nearby(origin,q,PLAYER_RADIUS)].some(b=>P.sweptBox(origin,q,b,PLAYER_RADIUS)!==null))return false;if(kind==='grapple'){if(![...collisions.nearby(q,q,28)].some(b=>q.distanceTo(q.clone().clamp(b.min,b.max))<28))return false;grip={destination:q.clone(),remaining:.65};}else player.position.copy(q);velocity.set(0,0,0);safePlayer.copy(player.position);cameraFocus.copy(player.position);updateCamera(.1);burst(player.position,'#b0ddcf',10);return true;},
    hit(id,amount,source,push,origin){const body=id===turns.active()?.id?player:turnView.bodies().find(b=>b.userData.actorId===id);if(!body)return false;const accepted=damageActor(body,amount,source);if(accepted&&push){const d=body.position.clone().sub(new T.Vector3(...origin));d.y=0;d.normalize();if(body===player)velocity.addScaledVector(d,push);else{collisions.move(body.position,d.multiplyScalar(push),18);const m=turns.members.find(m=>m.id===id);if(m)m.data.position=body.position.toArray();}}return accepted;},
    award:turns.award,status:turns.status,reward(id){const kinds=Object.keys(window.CRStrategy.catalog).filter(k=>k!=='quiet');strategy.replenish(id,kinds[turns.snapshot().turn%kinds.length]);},
    shelter:id=>shelters.guardFor(id)||shelters.nearby(id),guard:id=>shelters.protect(id),notice:toolNotice,
    visual:(kind,p)=>{sound.event(kind==='needle'?'impact':'growth-touch',new T.Vector3(...p));burst(new T.Vector3(...p),kind==='acid'?'#9eb66e':'#aacfc3',8);},
    combatTargets:()=>targets.filter(t=>t.userData.alive).map(t=>({id:'enemy-'+targets.indexOf(t),position:t.position.toArray(),radius:t.userData.radius,hp:t.userData.hp})),hitPve:(id,amount,source)=>{const t=targets[Number(id.split('-')[1])];if(!t?.userData.alive)return false;damageEnemy(t,amount,source);return true;},
    pve:()=>targets.slice(6,9).filter(t=>t.userData.alive)
  });
  function toolAim(kind=selectedTool){const def=strategy.catalog[kind];if(!def)return null;const from=player.position.clone(),p=aimPoint().point.clone();if(def.range){const delta=p.clone().sub(from);if(delta.length()>def.range)p.copy(from).addScaledVector(delta.normalize(),def.range);}if(kind==='grapple'){const direction=p.clone().sub(from).normalize();p.addScaledVector(direction,-PLAYER_RADIUS-3);}p.y=heightAt(p.x,p.z)+PLAYER_RADIUS;return p.toArray();}
  function useTool(kind=selectedTool,aim=null){if(networkRole==='guest'||!localControls()&&networkRole!=='host'||!canAct()||state.paused||state.time<toolUntil)return false;const used=strategy.use(turns.active()?.id,kind,aim||toolAim(kind));if(used){toolUntil=state.time+.65;state.fireCooldown=Math.max(state.fireCooldown,.25);}return used;}
  const strategyView=window.CRStrategyView({T,scene,heightAt,icons:window.CRIcons,catalog:strategy.catalog,select:k=>{selectedTool=k;},use:()=>{if(!localControls())return;if(networkRole==='guest')networkActions.push('tool-'+selectedTool);else useTool();}});
  function replenishWeapons(id){const inventory=strategy.stock(id);let added=false;for(let i=0;i<4;i++){const k='weapon-'+i;if((inventory[k]||0)<3){inventory[k]=Math.min(3,(inventory[k]||0)+1);added=true;}}return added;}

  function useShelter(kind){if(!turns.enabled||!canAct()||state.paused)return false;const used=shelters.use(turns.active().id,kind);if(used){clearInput();sound.event('growth-touch',player.position);}return used;}
  function useEnergy(){if(!canAct()||state.paused)return false;const used=survival.useFragment();survivalFrame=survival.snapshot();shelterNotice=used?'Fragmento activo · luz durante 22 s':survivalFrame.fragments===0?'Sin fragmentos · buscá cristales y recogé con E':'Fragmento ya activo · esperá antes de usar otro';shelterNoticeUntil=state.time+4;return used;}
  const shelterActions=document.createElement('div');shelterActions.className='shelter-actions';const shelterKeys={cocoon:'B',stone:'X',anchor:'T',echo:'Y'};for(const [kind,key] of Object.entries(shelterKeys)){const b=document.createElement('button');b.dataset.shelter=kind;b.append(window.CRIcons.make(kind),document.createElement('span'));b.title={cocoon:'Capullo: cierra el turno y protege del PvE mientras esperás',stone:'Piedra: cierra el turno y oculta del PvE hasta tu próxima jugada',anchor:'Ancla: desplegá y terminá dentro para protegerte del PvE',echo:'Eco: señuelo de 30 s que puede ser destruido'}[kind];b.onclick=()=>{if(!localControls())return;if(networkRole==='guest')networkActions.push('shelter-'+kind);else useShelter(kind);};shelterActions.append(b);}document.body.append(shelterActions);const shelterHint=document.createElement('div');shelterHint.id='shelter-hint';document.body.append(shelterHint);
  const energyButton=document.getElementById('energy-use');energyButton.prepend(window.CRIcons.make('fragment'));energyButton.onclick=()=>{if(!localControls())return;if(networkRole==='guest')networkActions.push('match');else useEnergy();};
  for(const [selector,key] of [['.vitals>span','health'],['.candle-status>span','fragment'],['#camera-toggle','camera'],['#map-panel h2','map'],['.arsenal>b','weapon']])document.querySelector(selector)?.prepend(window.CRIcons.make(key));
  const refugeHelp=document.createElement('p');refugeHelp.className='shelter-help';refugeHelp.textContent='Refugios: E o Enter dentro cierra el turno protegido del PvE. B capullo · X piedra · T ancla · Y eco. Los escudos de espera no bloquean disparos rivales. Q activa fragmento; E recoge cristales.';overlay.append(refugeHelp);
  const commentator=window.CRCommentator.create();
  const commentNode=document.createElement('aside');commentNode.id='match-comment';commentNode.hidden=true;document.body.append(commentNode);
  const supplyNote=document.createElement('small');supplyNote.id='supply-note';document.body.append(supplyNote);
  const consumableNode=document.createElement('div');consumableNode.id='supplies-hud';const itemLabels={medkit:'H · Botiquín',shield:'J · Escudo',antidote:'K · Antídoto'};for(const [key,label] of Object.entries(itemLabels)){const b=document.createElement('button');b.dataset.item=key;b.append(window.CRIcons.make(key),document.createElement('span'));b.querySelector('span').textContent=label;b.onclick=()=>{if(!localControls()||state.paused)return;if(networkRole==='guest')networkActions.push('item-'+key);else useConsumable(key);};consumableNode.append(b);}document.body.append(consumableNode);
  function loadout(){return {ammo,reserve,items:consumables};}
  function useConsumable(key){if(networkRole==='guest')return false;if(!canAct()||state.paused||consumableCooldown>0||!consumables[key])return false;if(key==='medkit'){if(state.hp>=100)return false;state.hp=Math.min(100,state.hp+35);if(turns.enabled)turns.active().hp=state.hp;}else if(key==='shield'){if(turns.enabled){if(turns.active().statuses.some(s=>s.type==='shield'))return false;turns.status(turns.active().id,'shield',8);}else{if(soloShield>0)return false;soloShield=8;}}else if(key==='antidote'){if(!turns.enabled||!turns.active().statuses.some(s=>s.type==='poison'))return false;turns.clearStatus(turns.active().id,'poison');}else return false;consumables[key]--;consumableCooldown=.65;state.fireCooldown=Math.max(state.fireCooldown,.5);sound.event('reward',player.position);commentator.say('item',{name:turns.active()?.name,team:turns.snapshot().teams.find(t=>t.id===turns.active()?.teamId)?.name},state.time);return true;}
  const turnHud=document.createElement('section');turnHud.id='turn-hud';turnHud.hidden=true;document.body.append(turnHud);
  function canAct(){return !transit.active&&(!turns.enabled||turns.phase==='active'&&turns.active()?.hp>0);}
  function captureActor(m){if(!m)return;m.data.position=player.position.toArray();m.data.velocity=velocity.toArray();m.data.ammo=[...ammo];m.data.reserve=[...reserve];m.data.items={...consumables};m.data.weapon=selectedWeapon;m.data.mortar=mortar.has();m.data.survival=survival.snapshot();m.data.yaw=yaw;m.data.pitch=pitch;m.data.cooldown=state.cooldown;m.gear={ammo:[...ammo],reserve:[...reserve],items:{...consumables},weapon:weapons[selectedWeapon].name,mortar:mortar.has(),matches:survival.snapshot().matches};}
  function handoff(previous,current){grip=null;captureActor(previous);shelters.begin(current.id);player.userData.actorId=current.id;clearInput();captureChannel=null;characterStyle.tint(player.userData.core,characterStyle.teamColors[Number(current.teamId.split('-')[1])]);characterStyle.setFace(player.userData.face,Number(current.id.split('-').pop()));player.position.fromArray(current.data.position||[0,heightAt(0,0)+18,0]);velocity.fromArray(current.data.velocity||[0,0,0]);state.hp=current.hp;state.dead=state.won=false;state.dash=state.jumpBuffer=state.dashBuffer=state.fireCooldown=state.hurt=state.hit=0;state.cooldown=current.data.cooldown||0;state.invincible=.2;state.grounded=false;ammo=current.data.ammo?[...current.data.ammo]:weapons.map(w=>w.mag);reserve=current.data.reserve?[...current.data.reserve]:[28,56,12,3];consumables=current.data.items?{...current.data.items}:{medkit:1,shield:1,antidote:1};consumableCooldown=soloShield=0;selectedWeapon=current.data.weapon||0;reloadTime=recoil=0;mortar.setOwned(!!current.data.mortar);survival.reset();if(current.data.survival)survival.restore(current.data.survival);survivalFrame=survival.snapshot();yaw=current.data.yaw||0;pitch=current.data.pitch??.18;safePlayer.copy(player.position);cameraFocus.copy(player.position);camera.position.copy(player.position).add(new T.Vector3(0,60,170));updateCamera(1);nextAudioScene=-1;turnView.sync();}
  function startMatch(config={}){const tactical=config.tactical!==false;if(tactical)config={...config,tactical:true,mode:"objectives",victoryRules:config.victoryRules||["score","last-team"],targetScore:config.targetScore||24};const preserved=new Map();try{for(const key of ['CR3D-expedition-v1','CR3D-inventory-v1'])preserved.set(key,localStorage.getItem(key));}catch(_){}const map=config.dimension===undefined?dimensionId:config.dimension===1?1:0;reset(false,map);state.matchMode=true;try{for(const [key,value] of preserved)if(value!==null)localStorage.setItem(key,value);}catch(_){}startingMatch=true;try{turns.start(config);turnView.build();if(tactical){strategy.start(config.objectives||tacticalDefinitions());for(const m of turns.members)for(let i=0;i<4;i++)strategy.stock(m.id)["weapon-"+i]=3;}supplies.reset();commentator.reset();}finally{startingMatch=false;}handoff(null,turns.active());setPaused(false);present();}
  function damageActor(body,amount,sourceId=null){if(body===player)return takeDamage(amount,new T.Vector3(),sourceId);const id=body.userData.actorId;if(sourceId===null&&!shelters.eligible(id))return false;const hit=turns.damage(id,amount,sourceId);body.userData.alive=turns.members.find(m=>m.id===id)?.hp>0;body.visible=body.userData.alive;return hit;}
  const turnOptions=document.createElement('div');turnOptions.className='turn-options';turnOptions.innerHTML='<label>Equipos <select id="turn-team-count"><option>2</option><option>3</option><option>4</option></select></label><label>Miembros <select id="turn-member-count"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label><label>Turno <select id="turn-duration"><option>30</option><option selected>45</option><option>60</option><option>90</option></select> s</label>';overlay.append(turnOptions);
  const mapLabel=document.createElement('label');mapLabel.textContent='Dimensión ';const mapChoice=document.createElement('select');mapChoice.id='match-dimension';for(const map of window.CRDimensions){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapChoice.append(option);}mapLabel.append(mapChoice);turnOptions.prepend(mapLabel);
  const exploreButton=document.createElement('button');exploreButton.id='explore-dimension';exploreButton.textContent='Explorar dimensión elegida';exploreButton.onclick=()=>{if(networkRole==='off')reset(false,Number(mapChoice.value));};overlay.append(exploreButton);
  const profiles=window.CRProfiles.createEditor({overlay,count:document.getElementById('turn-team-count'),size:document.getElementById('turn-member-count'),storage:localStorage});
  function configuredTeams(count,size){return profiles.teams(count,size);}

  const victoryChoice=document.createElement('select');victoryChoice.id='match-purpose';victoryChoice.setAttribute('aria-label','Propósito de partida');for(const [value,label] of [['objectives','Objetivos + sigilo · ganar sin matar'],['survival','Último equipo en pie · clásico']]){const o=document.createElement('option');o.value=value;o.textContent=label;victoryChoice.append(o);}overlay.append(victoryChoice);
  const matchButton=document.createElement('button');matchButton.id='start-turn-match';matchButton.textContent='Partida local por turnos';overlay.append(matchButton);
  matchButton.onclick=()=>startMatch({tactical:victoryChoice.value!=="survival",dimension:Number(mapChoice.value),turnSeconds:Number(document.getElementById('turn-duration').value),teams:configuredTeams()});
  function presentTurns(){turnHud.hidden=!turns.enabled;if(!turns.enabled)return;turnView.sync();const s=turns.snapshot(),key=s.activeId+s.phase+Math.ceil(s.remaining)+s.teams.map(t=>t.name+t.score).join(',')+s.members.map(m=>m.name+m.avatar+canRead(m.id)+Math.ceil(m.hp)+m.statuses.map(a=>a.type).join('')).join('|');if(turnHud.dataset.key===key)return;turnHud.dataset.key=key;const m=turns.active(),team=s.teams.find(t=>t.id===m?.teamId);const title=document.createElement('b');title.textContent=(team?.name||'')+' · '+(m?.avatar?m.avatar+' ':'')+(m?.name||'')+' · '+Math.ceil(s.remaining)+' s';const detail=document.createElement('small');detail.textContent=s.teams.map(t=>t.name+' '+(!strategy.enabled&&s.victoryRules.includes('last-team')?s.members.filter(m=>m.teamId===t.id&&m.hp>0).length+' en pie':t.score+'/'+s.targetScore)).join(' · ')+' | '+(s.phase==='active'?'TURNO '+s.turn+' · Enter: terminar · PvE activo':s.phase==='settling'?'RESOLVIENDO ATAQUES · PvE activo':s.phase==='supply'?'SUMINISTROS CERCA DE '+(s.members.find(m=>m.id===supplies.snapshot().lastTarget)?.name||'alguien')+' · '+Math.ceil(s.remaining)+' s':'PARTIDA TERMINADA');const roster=document.createElement('div');roster.className='turn-roster';for(const member of s.members){const span=document.createElement('span');span.textContent=(member.avatar?member.avatar+' ':'')+member.name+' '+(!member.hidden&&canRead(member.id)?Math.ceil(member.hp):'?')+'♥'+(member.statuses.length?' · '+member.statuses.map(a=>a.type==='poison'?'VENENO':'ESCUDO').join(','):'');if(member.id===s.activeId)span.dataset.active='true';if(member.hp===0&&!member.hidden){span.style.opacity='.5';span.textContent=(member.avatar?member.avatar+' ':'')+member.name+(s.victoryRules.includes('last-team')?' · eliminado':' · reaparece');}roster.append(span);}const text=title.textContent+detail.textContent+roster.textContent;if(turnHud.dataset.text!==text){turnHud.dataset.text=text;turnHud.replaceChildren(title,detail,roster);}}


  const onlinePanel=document.createElement('div');onlinePanel.className='online-panel';onlinePanel.innerHTML='<b>Probar con un amigo · conexión directa</b><div><input id="peer-address" placeholder="IP del anfitrión" aria-label="IP del anfitrión"><input id="peer-code" placeholder="Código" maxlength="12" aria-label="Código de sala"></div><div><button id="peer-host">Crear sala</button><button id="peer-join">Conectar</button><button id="peer-leave" hidden>Salir de sala</button></div><small id="peer-note">Misma red o VPN entre amigos · puerto 49321 · misma versión</small>';overlay.append(onlinePanel);
  const peerNote=document.getElementById('peer-note');
  let guestMenu=false,peerInfo='',networkReceivedAt=0,networkLastTick=-1;
  const audioEvents=[],originalSoundEvent=sound.event;
  sound.event=(type,position,variant=0,options={})=>{if(networkRole!=='guest'&&['shot','mortar-shot','dash','explosion'].includes(type))strategy.noise(turns.active()?.id,type,type==='explosion'?8:5);if(networkRole==='host'&&type!=='explosion'&&audioEvents.length<48&&position)audioEvents.push({type,position:[position.x,position.y,position.z],variant});return originalSoundEvent(type,position,variant,options);};
  function networkButtons(){const online=networkRole!=='off';document.getElementById('peer-host').disabled=online;document.getElementById('peer-join').disabled=online;document.getElementById('peer-leave').hidden=!online;matchButton.disabled=online;profiles.lock(online);mapChoice.disabled=online;exploreButton.disabled=online;document.getElementById('restart').disabled=online;document.getElementById('continue-save').disabled=online;}
  async function leaveNetwork(){await window.CRPeer?.leave();networkRole='off';networkReady=false;networkTeam=null;remoteSnapshot=null;networkActions=[];clearInput();networkButtons();reset(true);peerNote.textContent='Sala cerrada · expedición restaurada';}
  async function hostNetwork(options={}){if(!window.CRPeer)throw Error('Abrí el ejecutable de escritorio');const info=await window.CRPeer.host(options);startMatch({tactical:options.tactical===false?false:victoryChoice.value!=="survival",dimension:Number(mapChoice.value),turnSeconds:Number(document.getElementById('turn-duration').value),teams:configuredTeams(2,Number(document.getElementById('turn-member-count').value))});networkRole='host';networkTeam='team-0';networkReady=false;networkTick=networkSeq=0;setPaused(true);peerInfo='IP '+(info.addresses.join(' / ')||'127.0.0.1')+' · código '+info.code;peerNote.textContent=peerInfo+' · esperando amigo';networkButtons();return info;}
  async function joinNetwork(options){if(!window.CRPeer)throw Error('Abrí el ejecutable de escritorio');setPaused(true);networkRole='guest';networkReady=false;networkLastTick=-1;networkSeq=0;networkButtons();try{const info=await window.CRPeer.join(options);networkTeam=info.teamId;networkSession=info.session;peerNote.textContent='Conectado · equipo Invitado';return info;}catch(e){networkRole='off';networkReady=false;networkButtons();throw e;}}
  for(const [id,fn] of [['peer-host',()=>hostNetwork()],['peer-join',()=>joinNetwork({host:document.getElementById('peer-address').value,code:document.getElementById('peer-code').value})],['peer-leave',leaveNetwork]])document.getElementById(id).onclick=()=>Promise.resolve(fn()).catch(e=>{peerNote.textContent=String(e.message||e);});
  function guestKey(e){if(!canAct()||!overlay.hidden)return;startAudio();inputKey(e.code,true);if(e.code==='KeyF')shooting=true;if(!e.repeat){const action={Enter:'end',Space:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyG:'tool-'+selectedTool,KeyR:'reload',KeyQ:'match',KeyE:'interact',KeyB:'shelter-cocoon',KeyX:'shelter-stone',KeyT:'shelter-anchor',KeyY:'shelter-echo',KeyH:'item-medkit',KeyJ:'item-shield',KeyK:'item-antidote',Digit1:'weapon-0',Digit2:'weapon-1',Digit3:'weapon-2',Digit4:'weapon-3'}[e.code];if(action&&networkActions.length<8)networkActions.push(action);}}
  function remoteInput(command){if(networkRole!=='host'||!networkReady||!turns.enabled||!canAct()||state.paused||turns.active().teamId!=='team-1'||command.turn!==turns.snapshot().turn||command.actorId!==turns.active().id)return false;lastRemoteInput=performance.now();for(const k of Object.keys(input))input[k]=command.keys?.[k]===true;shooting=command.fire===true;aiming=command.aiming===true;if(Number.isFinite(command.yaw))yaw=command.yaw%(Math.PI*2);if(Number.isFinite(command.pitch))pitch=T.MathUtils.clamp(command.pitch,-.25,.72);if(Array.isArray(command.aim)&&command.aim.length===2&&command.aim.every(Number.isFinite))pointerAim.set(T.MathUtils.clamp(command.aim[0],-1,1),T.MathUtils.clamp(command.aim[1],-1,1));for(const action of (Array.isArray(command.actions)?command.actions:[]).slice(0,8)){if(!canAct())break;if(action==='end'){turns.end();clearInput();}else if(action==='jump')state.jumpBuffer=.16;else if(action==='dash')state.dashBuffer=.12;else if(action.startsWith('tool-'))useTool(action.slice(5));else if(action==='reload')reload();else if(action==='match')useEnergy();if(action.startsWith('shelter-'))useShelter(action.slice(8));else if(action==='interact')interact();else if(['item-medkit','item-shield','item-antidote'].includes(action))useConsumable(action.slice(5));else if(/^weapon-[0-3]$/.test(action))selectWeapon(Number(action.slice(-1)));}return true;}
  function exportNetwork(){captureActor(turns.active());const match=turns.snapshot();const allowed=id=>!strategy.enabled||turns.phase==='complete'||id===turns.active()?.id||strategy.seenByTeam(id,'team-1',{lightRadius:550});for(const m of match.members){if(!allowed(m.id)){m.hidden=true;m.eliminated=m.hp===0;m.hp=null;m.statuses=[];m.gear={};}if(strategy.enabled&&m.teamId!=='team-1')m.gear={};}const shelterState=shelters.snapshot();if(strategy.enabled){shelterState.guards=shelterState.guards.filter(g=>allowed(g.id));shelterState.anchors=shelterState.anchors.filter(g=>allowed(g.id));shelterState.kits=shelterState.kits.filter(k=>turns.members.find(m=>m.id===k.id)?.teamId==='team-1');}return {tick:++networkTick,match,positions:turns.members.filter(m=>allowed(m.id)).map(m=>({id:m.id,position:m.data.position})),player:player.position.toArray(),velocity:velocity.toArray(),rolling:player.userData.rolling.quaternion.toArray(),yaw,pitch,aim:pointerAim.toArray(),aiming,state:{...state},ammo:[...ammo],reserve:[...reserve],items:{...consumables},supplies:supplies.snapshot(),shelters:shelterState,strategy:strategy.snapshot('team-1'),commentary:commentator.snapshot(),weapon:selectedWeapon,reloadTime,survival:survival.snapshot(),run:expedition.snapshot(),capture:captureChannel,targets:targets.map(t=>({position:t.position.toArray(),yaw:t.rotation.y,hp:t.userData.hp,alive:t.userData.alive,windup:t.userData.windup,flash:t.userData.flash,alert:t.userData.alert||0})),projectiles:projectiles.map(p=>({position:p.mesh.position.toArray(),enemy:p.enemy})),mortar:mortar.networkSnapshot(),audio:audioEvents.splice(0)};}
  function importNetwork(data){if(networkRole!=='guest'||!data||data.tick<=networkLastTick||data.targets?.length!==targets.length||!data.player?.every(Number.isFinite))return;if(data.state?.dimension!==0&&data.state?.dimension!==1)return;const mapChanged=data.state.dimension!==dimensionId;if(mapChanged){activateDimension(data.state.dimension);sound.reset();nextAudioScene=-1;turnView.clear();player.position.fromArray(data.player);cameraFocus.copy(player.position);}networkLastTick=data.tick;networkReceivedAt=performance.now();const previousId=turns.active()?.id,newRoster=turns.members.map(m=>m.id).join(',')!==data.match.members.map(m=>m.id).join(',');turns.restore(data.match,data.positions);if(newRoster||mapChanged){turnView.build();turns.restore(data.match,data.positions);}if(mapChanged||previousId!==data.match.activeId){handoff(null,turns.active());player.position.fromArray(data.player);cameraFocus.copy(player.position);}remoteSnapshot=data;Object.assign(state,data.state);ammo=[...data.ammo];reserve=[...data.reserve];consumables={...data.items};supplies.restore(data.supplies);shelters.restore(data.shelters);strategy.restore(data.strategy);commentator.restore(data.commentary);selectedWeapon=data.weapon;reloadTime=data.reloadTime;velocity.fromArray(data.velocity);survival.restore(data.survival);survivalFrame=survival.snapshot();mortar.setOwned(!!turns.active()?.gear.mortar);Object.assign(expedition.run,data.run);captureChannel=data.capture;for(let i=0;i<targets.length;i++){const t=targets[i],d=data.targets[i];Object.assign(t.userData,{hp:d.hp,alive:d.alive,windup:d.windup,flash:d.flash,alert:d.alert});t.visible=d.alive;t.rotation.y=d.yaw;t.userData.telegraph.visible=d.alive&&d.windup>0;}if(!localControls()){yaw=data.yaw;pitch=data.pitch;pointerAim.fromArray(data.aim);aiming=data.aiming;}player.userData.rolling.quaternion.fromArray(data.rolling);for(const p of projectiles){p.mesh.visible=false;projectilePool.push(p.mesh);}projectiles.length=0;for(const p of data.projectiles){const mesh=projectilePool.pop();if(!mesh)break;mesh.position.fromArray(p.position);mesh.children[0].material=p.enemy?hostileMaterial:projectileMaterial;mesh.children[1].material=p.enemy?hostileHalo:projectileHalo;mesh.visible=true;projectiles.push({mesh});}mortar.importNetwork(data.mortar);for(const e of data.audio||[])originalSoundEvent(e.type,new T.Vector3(...e.position),e.variant);networkReady=true;overlay.hidden=!state.paused&&!guestMenu;peerNote.textContent='Conectado · '+(localControls()?'TU TURNO':'observando rival');if(state.paused){overlay.querySelector('h1').textContent=data.match.phase==='complete'?'PARTIDA TERMINADA':'PAUSA DEL ANFITRIÓN';overlay.querySelector('p').textContent='El anfitrión controla la pausa compartida.';if(data.match.phase==='complete')presentResult();}}
  function applyRemoteInterpolation(dt){const data=remoteSnapshot;if(!data)return;const k=1-Math.exp(-dt*24);player.position.lerp(new T.Vector3(...data.player),k);for(let i=0;i<targets.length;i++){targets[i].position.lerp(new T.Vector3(...data.targets[i].position),k);const d=targets[i].userData;d.telegraph.position.set(targets[i].position.x,heightAt(targets[i].position.x,targets[i].position.z)+.7,targets[i].position.z);}mortar.update(state.paused?0:dt,true);supplies.update(state.paused?0:dt,state.time,true);if(networkReady&&performance.now()-networkReceivedAt>3000){clearInput();networkReady=false;peerNote.textContent='Conexión interrumpida · salí y volvé a conectar';}}
  function networkFrame(){if(networkRole==='off'||performance.now()<nextNetworkPublish)return;nextNetworkPublish=performance.now()+50;if(networkRole==='host'&&networkReady&&turns.enabled)window.CRPeer.publish(exportNetwork());if(networkRole==='guest'&&networkReady){const snap=turns.snapshot(),allow=localControls()&&canAct()&&overlay.hidden;window.CRPeer.input({seq:++networkSeq,turn:snap.turn,actorId:snap.activeId,keys:allow?{...input}:{},fire:allow&&shooting,aiming:allow&&aiming,yaw,pitch,aim:pointerAim.toArray(),actions:allow?networkActions.splice(0):[]});if(!allow)networkActions=[];}}
  window.CRPeer?.onEvent(event=>{if(event.type==='joined'&&networkRole==='host'){networkReady=true;networkSession=event.session;clearInput();setPaused(false);peerNote.textContent=peerInfo+' · amigo conectado';}else if(event.type==='input')remoteInput(event.command);else if(event.type==='snapshot')importNetwork(event.data);else if(event.type==='disconnected'){networkReady=false;clearInput();if(networkRole==='host')setPaused(true);peerNote.textContent='Amigo desconectado · reconectar con el mismo código o salir';}});

  const originHomes=targets.map(t=>t.userData.home.clone());
  const dimensions=[{terrain,world:{...world},obstacles:[...obstacles],progress:null},null];
  function activateDimension(id){
    if(id===dimensionId)return;
    terrain.visible=false;world.root.visible=false;for(const o of obstacles)o.object.visible=false;
    dimensionId=id;state.dimension=id;mapChoice.value=String(id);
    if(!dimensions[id]){obstacles.length=0;const nextTerrain=buildTerrain(),nextWorld=window.CRWorld({T,scene,heightAt,hash,neon,additive,dimension:id});buildObstacles();dimensions[id]={terrain:nextTerrain,world:nextWorld,obstacles:[...obstacles],progress:null};}
    const m=dimensions[id];terrain=m.terrain;terrain.visible=true;Object.assign(world,m.world);world.root.visible=true;obstacles.splice(0,obstacles.length,...m.obstacles);for(const o of obstacles)o.object.visible=true;rebuildCollisions();
  }
  function storeDimension(){dimensions[dimensionId].progress={expedition:expedition.suspend(),enemies:targets.map(t=>({hp:t.userData.hp,alive:t.userData.alive,home:t.userData.home.toArray(),position:t.position.toArray(),yaw:t.rotation.y}))};}
  function configureHomes(){for(let i=0;i<targets.length;i++){const d=targets[i].userData;d.home.copy(originHomes[i]);if(dimensionId&&i>=15&&!d.isBoss){const a=hash(i,17)*Math.PI*2,r=650+hash(i,21)*2400;d.home.set(Math.cos(a)*r,0,Math.sin(a)*r);}}}
  function travelDimension(){
    if(networkRole!=='off'||turns.enabled||transit.active||state.paused||state.dead||state.won||state.time<portalLock)return false;
    const p=world.portal;if(Math.hypot(player.position.x-p.x,player.position.z-p.z)>p.radius||Math.abs(player.position.y-heightAt(p.x,p.z)-PLAYER_RADIUS)>60)return false;
    clearInput();velocity.set(0,0,0);sound.event('growth-bloom',world.singularityPortal.position);
    return transit.begin(world.singularityPortal.position,completeDimensionTravel);
  }
  function completeDimensionTravel(){
    storeDimension();activateDimension(1-dimensionId);const cached=dimensions[dimensionId].progress;
    if(cached){expedition.restore(cached.expedition);for(let i=0;i<targets.length;i++){const t=targets[i],d=t.userData,a=cached.enemies[i];d.hp=a.hp;d.alive=a.alive;d.home.fromArray(a.home);t.position.fromArray(a.position);t.rotation.y=a.yaw;t.visible=d.alive;}}
    else {configureHomes();for(let i=0;i<targets.length;i++){const t=targets[i],d=t.userData;d.hp=d.maxHp;d.alive=!d.isBoss;t.visible=d.alive;t.position.set(d.home.x,heightAt(d.home.x,d.home.z)+d.radius,d.home.z);}expedition.reset(false);}
    clearInput();velocity.set(0,0,0);accumulator=0;state.dash=state.cooldown=state.fireCooldown=state.hurt=0;state.invincible=1.4;state.grounded=true;reloadTime=recoil=0;
    for(const t of targets){const d=t.userData;d.windup=d.flash=0;d.cooldown=1;d.telegraph.visible=false;d.lastDash=-1;if(d.alive&&Math.hypot(t.position.x-world.portal.x,t.position.z-world.portal.z)<170){t.position.x=world.portal.x+230;t.position.y=heightAt(t.position.x,t.position.z)+d.radius;}}
    for(const p of projectiles){p.mesh.visible=false;projectilePool.push(p.mesh);}projectiles.length=0;for(const p of particles){p.life=0;p.mesh.visible=false;}
    mortar.travel();sound.reset();nextAudioScene=-1;portalLock=state.time+1.2;portalFlash=state.time+.7;
    player.position.set(world.portal.x,heightAt(world.portal.x,world.portal.z+65)+PLAYER_RADIUS,world.portal.z+65);safePlayer.copy(player.position);yaw=0;pitch=.18;cameraFocus.copy(player.position);camera.position.copy(player.position).add(new T.Vector3(0,65,170));updateCamera(1);world.update(state.time,1,player.position);updateAudio();sound.event('growth-bloom',player.position);return true;
  }
  function interact(){if(networkRole==='guest')return false;if(canAct()&&!state.paused){const id=turns.active()?.id||'solo';const crystal=world.refuges.shards.find(s=>!shelters.isCollected(s)&&player.position.distanceTo(new T.Vector3(...s.position))<48&&worldHit(player.position,new T.Vector3(...s.position))===null);if(crystal&&shelters.collect(id,crystal,()=>survival.addFragment())){survivalFrame=survival.snapshot();sound.event('reward',player.position);shelterNotice='Fragmento recogido · Q activa luz';shelterNoticeUntil=state.time+4;return true;}if(turns.enabled&&(shelters.nearby(id)||shelters.snapshot().anchors.some(a=>a.id===id&&player.position.distanceTo(new T.Vector3(...a.position))<a.radius))){if(!shelters.armSite(id))return false;turns.end();clearInput();return true;}const collected=supplies.collect(player.position,payload=>{if(strategy.enabled&&payload.type==='tool'){const choices=Object.keys(strategy.catalog).filter(k=>k!=='quiet'||turns.snapshot().turn%8===0);return choices.some(k=>strategy.replenish(id,k));}const uses=strategy.enabled&&payload.type==='ammo'?replenishWeapons(id):false;return window.CRLoadout.pickup(loadout(),payload)||uses;});if(collected){commentator.say('pickup',{name:turns.active()?.name,team:turns.snapshot().teams.find(t=>t.id===turns.active()?.teamId)?.name},state.time);return true;}}if(strategy.enabled){if(!canAct()||state.paused)return false;if(strategy.interact(turns.active().id))return true;if(mortar.collect()){selectWeapon(3);return true;}return false;}if(turns.enabled){if(!canAct()||state.paused)return false;const index=world.sites.slice(0,3).findIndex(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<90);if(index<0){if(mortar.collect()){selectWeapon(3);return true;}return false;}const team=turns.snapshot().teams.find(t=>t.id===turns.active().teamId);if(team.captures.includes('relay-'+index))return false;captureChannel={index,progress:0};return true;}if(!canAct())return false;if(state.paused||state.dead||state.won)return false;if(Math.hypot(player.position.x-world.portal.x,player.position.z-world.portal.z)<world.portal.radius)return travelDimension();if(mortar.collect()){selectWeapon(3);sound.event('growth-touch',player.position);return true;}if(expedition.interact()){sound.event('growth-touch',player.position);return true;}if(world.sites.slice(0,3).some(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<90))return false;const focus=sound.focus();return !!focus&&player.position.distanceTo(new T.Vector3(focus.position.x,focus.position.y,focus.position.z))<500&&sound.resonate();}
  const hpNode=document.getElementById('health'),dashNode=document.getElementById('dash'),modeNode=document.getElementById('camera-mode');
  const messageNode=document.getElementById('message');
  const aimMarker=document.getElementById('aim-point');
  function clearInput(){for(const key of Object.keys(input))input[key]=false;shooting=false;aiming=false;state.jumpBuffer=state.dashBuffer=0;}
  function setPaused(value){
    if(!value&&turns.enabled&&turns.phase==='complete')return;
    state.paused=!!value;clearInput();accumulator=0;
    updateAudio();
    if(value && document.pointerLockElement===canvas)document.exitPointerLock();
    overlay.hidden=!value && !state.dead && !state.won;
    overlay.querySelector('h1').textContent=state.dead?'NÚCLEO DESTRUIDO':state.won?'EXPEDICIÓN COMPLETA':'PAUSA';
    overlay.querySelector('p').textContent=state.dead||state.won?'N o Nueva expedición para comenzar de nuevo.':'P o Continuar para volver al combate.';
    document.getElementById('resume').hidden=state.dead||state.won;
  }
  function setMode(mode){
    if(!['free','fixed','auto'].includes(mode))return;
    state.cameraMode=mode;state.lastMouse=state.time;modeNode.textContent={free:'Libre',fixed:'Fija',auto:'Autoseguimiento'}[mode];
    pointerAim.set(0,0);document.querySelector('.crosshair').style.left='50%';document.querySelector('.crosshair').style.top='50%';
    if(mode==='fixed' && document.pointerLockElement===canvas)document.exitPointerLock();
  }
  function reset(continueRun=false,map=0){
    transit.cancel();
    strategy.reset();strategyView.reset();grip=null;toolUntil=nextStealth=0;supplies.reset();commentator.reset();shelters.reset();shelterView.reset();consumableCooldown=soloShield=0;
    state.matchMode=false;turns.stop();turnView.clear();turnHud.hidden=true;player.userData.core.material.color.set('#29c8ce');
    activateDimension(map===1?1:0);state.dimension=dimensionId;mapChoice.value=String(dimensionId);portalLock=portalFlash=0;for(const m of dimensions)if(m)m.progress=null;configureHomes();
    sound.reset();terrorAudio.reset();survival.reset();survivalFrame=survival.snapshot();nextAudioScene=-1;
    if(!continueRun&&!dimensionId){try{localStorage.removeItem('CR3D-expedition-v1');}catch(_){} }
    clearInput();state.hp=100;state.kills=0;state.dead=false;state.won=false;state.dash=state.cooldown=state.fireCooldown=state.hurt=state.hit=0;state.invincible=1;
    state.grounded=true;velocity.set(0,0,0);player.position.set(0,heightAt(0,0)+PLAYER_RADIUS,0);travelled=0;yaw=0;pitch=.18;
    for(const p of projectiles){p.mesh.visible=false;projectilePool.push(p.mesh);}projectiles.length=0;
    for(const t of targets){const d=t.userData;d.hp=d.maxHp;d.alive=true;d.windup=0;d.cooldown=1;d.flash=0;t.visible=true;t.position.set(d.home.x,heightAt(d.home.x,d.home.z)+d.radius,d.home.z);d.telegraph.visible=false;}
    for(const p of particles){p.life=0;p.mesh.visible=false;}
    selectedWeapon=0;ammo=weapons.map(w=>w.mag);reserve=[28,56,12,3];consumables={medkit:1,shield:1,antidote:1};reloadTime=recoil=0;expedition.reset(continueRun);
    let originInventory=null;try{if(dimensionId)originInventory=localStorage.getItem('CR3D-inventory-v1');}catch(_){}mortar.reset(continueRun);try{if(dimensionId&&originInventory!==null)localStorage.setItem('CR3D-inventory-v1',originInventory);}catch(_){}
    safePlayer.copy(player.position);nextHealthCheck=0;lastPresentTime=state.time;cameraFocus.copy(player.position);camera.position.copy(player.position).add(new T.Vector3(0,65,170));setPaused(false);
  }
  function takeDamage(amount,direction,sourceId=null){
    if(networkRole==='guest')return false;
    if(!turns.enabled&&soloShield>0)amount*=.5;
    if(turns.enabled&&sourceId===null&&!shelters.eligible(turns.active()?.id))return false;if(transit.active||state.dead||state.won||state.invincible>0)return false;
    if(turns.enabled){if(!turns.damage(turns.active().id,amount,sourceId))return false;state.hp=turns.active().hp;}else state.hp=Math.max(0,state.hp-amount);state.invincible=.65;state.hurt=.32;
    if(direction&&Number.isFinite(direction.x)&&Number.isFinite(direction.z)){velocity.x+=direction.x*65;velocity.z+=direction.z*65;}
    burst(player.position,'#ff5266',9);sound.event('hurt',player.position);
    if(state.hp===0){velocity.set(0,0,0);if(turns.enabled){turns.end('eliminated');clearInput();}else{state.dead=true;setPaused(true);}}
    return true;
  }
  function damageEnemy(target,amount,sourceId=turns.enabled?turns.active()?.id:null){
    if(networkRole==='guest')return false;
    if(target.userData.strategyObject){strategy.damageObject(target.userData.id,amount);return;}if(target.userData.decoy){shelters.hitEcho(target.userData.decoyId,amount);return;}if(target.userData.actorId){damageActor(target,amount,sourceId);state.hit=.12;burst(target.position,'#ffaa87',5);return;}
    const d=target.userData;if(!d.alive)return;
    d.hp=Math.max(0,d.hp-amount);d.flash=.12;state.hit=.12;burst(target.position,target.userData.core.material.color,5);sound.event('hit',target.position);
    if(d.hp===0){
      d.alive=false;target.visible=false;d.telegraph.visible=false;state.kills++;if(state.hp>0)state.hp=Math.min(100,state.hp+5);if(turns.enabled)turns.award(sourceId,strategy.enabled?.05:target.userData.isBoss?5:1,'pve');
      burst(target.position,target.userData.core.material.color,22);
      expedition.recordKill(target);
    }
  }
  function spawnProjectile(origin,direction,enemy=false,damage=25,speed=860){
    const mesh=projectilePool.pop();if(!mesh)return;
    mesh.children[0].material=enemy?hostileMaterial:projectileMaterial;mesh.children[1].material=enemy?hostileHalo:projectileHalo;
    mesh.position.copy(origin);mesh.visible=true;
    projectiles.push({mesh,velocity:direction.clone().normalize().multiplyScalar(enemy?240:speed),life:enemy?5:2.8,radius:3.2,enemy,damage,ownerId:turns.enabled?turns.active().id:null,ownerTeam:turns.enabled?turns.active().teamId:null});
    if(enemy)sound.event('enemy-shot',origin);
  }
  function worldHit(a,b,radius=0){
    return collisions.hit(a,b,radius);
  }
  function aimPoint(){
    raycaster.setFromCamera(pointerAim,camera);
    const origin=raycaster.ray.origin, end=origin.clone().addScaledVector(raycaster.ray.direction,1800);
    let first=worldHit(origin,end),target=null;
    for(const t of [...targets,...(turns.enabled?turnView.bodies(false):[])]){if(!t.userData.alive||t.userData.actorId&&!canRead(t.userData.actorId))continue;const hit=P.sphere(origin,end,t.position,t.userData.radius);if(hit!==null&&(first===null||hit<first)){first=hit;target=t;}}
    return {point:origin.clone().lerp(end,first===null?1:first),target};
  }
  function fire(){
    if(networkRole==='guest')return false;
    if(!canAct()||state.paused||state.dead||state.fireCooldown>0||reloadTime>0)return false;
    if(strategy.enabled&&!(strategy.stock(turns.active().id)["weapon-"+selectedWeapon]>0)){toolNotice("Sin usos · buscá cajas de munición u objetivos");return false;}if(ammo[selectedWeapon]<=0){if(reserve[selectedWeapon]>0)reload();else commentator.say('dry',{name:turns.active()?.name},state.time);return false;}
    if(selectedWeapon===3){const damage=Math.round(weapons[3].damage*(1+expedition.run.upgrades*.1+(expedition.run.level-1)*.03));if(!mortar.fire(aimPoint().point,damage))return false;ammo[3]--;if(strategy.enabled)strategy.stock(turns.active().id)["weapon-3"]--;state.fireCooldown=weapons[3].rate;recoil=.016;world.disturb(state.time);return true;}
    const origin=player.position.clone().add(new T.Vector3(0,8,0)), aim=aimPoint().point;
    const direction=aim.sub(origin).normalize();if(direction.lengthSq()<.1)return false;
    // Start within the player's hull: only enemy/world queries run for friendly shots.
    const w=weapons[selectedWeapon],damage=Math.round(w.damage*(1+expedition.run.upgrades*.1+(expedition.run.level-1)*.03));
    for(let i=0;i<w.pellets;i++){const pellet=direction.clone();if(w.spread){const a=i*2.399963+state.time;pellet.x+=Math.cos(a)*w.spread*(aiming?.6:1);pellet.y+=Math.sin(a)*w.spread*(aiming?.6:1);pellet.normalize();}spawnProjectile(origin,pellet,false,damage,w.speed);}
    ammo[selectedWeapon]--;if(strategy.enabled)strategy.stock(turns.active().id)["weapon-"+selectedWeapon]--;state.fireCooldown=w.rate;recoil=Math.min(.03,recoil+(selectedWeapon===2?.024:.009));sound.event('shot',origin,selectedWeapon);world.disturb(state.time);return true;
  }
  function reload(){if(!canAct()||state.paused||reserve[selectedWeapon]<=0)return false;if(reloadTime>0||ammo[selectedWeapon]===weapons[selectedWeapon].mag)return;reloadWeapon=selectedWeapon;reloadTime=weapons[selectedWeapon].reload;sound.event('reload',player.position);}
  function selectWeapon(index){if(!canAct())return;if(index<0||index>=weapons.length||index===3&&!mortar.has())return;selectedWeapon=index;reloadTime=0;state.fireCooldown=Math.max(state.fireCooldown,.12);}
  function updateProjectiles(dt){
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i],a=p.mesh.position.clone(),b=a.clone().addScaledVector(p.velocity,dt);
      p.life-=dt;let first=worldHit(a,b,p.radius),target=null;
      const ghosts=turns.enabled?turnView.bodies().filter(b=>p.enemy||turns.members.find(m=>m.id===b.userData.actorId).teamId!==p.ownerTeam):[];
      const bodies=p.enemy?[...(turns.enabled&&turns.active().hp<=0?[]:[player]),...ghosts,...shelterView.bodies(),...strategyView.bodies()]:[...targets,...ghosts,...shelterView.bodies(),...strategyView.bodies()];
      for(const body of bodies){
        if(body!==player&&!body.userData.alive)continue;
        const t=P.sphere(a,b,body.position,(body===player?PLAYER_RADIUS:body.userData.radius)+p.radius);
        if(t!==null&&(first===null||t<first)){first=t;target=body;}
      }
      if(first!==null){
        p.mesh.position.copy(a).lerp(b,first);
        if(target===player)takeDamage(p.enemy?12:p.damage,p.velocity.clone().normalize(),p.enemy?null:p.ownerId);else if(target)damageEnemy(target,p.enemy?12:p.damage,p.enemy?null:p.ownerId);
        burst(p.mesh.position,p.enemy?'#ff5266':'#8dffff',5);
      }else p.mesh.position.copy(b);
      if(first!==null&&!target)sound.event('impact',p.mesh.position,world.wetAt(p.mesh.position.x,p.mesh.position.z)?1:p.mesh.position.y>heightAt(p.mesh.position.x,p.mesh.position.z)+8?2:0);
      if(p.enemy&&!p.whizzed&&target!==player){
        const end=p.mesh.position,segment=end.clone().sub(a),length=segment.lengthSq();
        if(length>0){const t=T.MathUtils.clamp(player.position.clone().sub(a).dot(segment)/length,0,1),closest=a.clone().addScaledVector(segment,t),d=closest.distanceTo(player.position);
          if(d>PLAYER_RADIUS+p.radius&&d<70){p.whizzed=true;sound.event('flyby',closest,0,{velocity:{x:p.velocity.x,y:p.velocity.y,z:p.velocity.z}});}}
      }
      if(first!==null||p.life<=0||Math.abs(b.x)>HALF||Math.abs(b.z)>HALF){p.mesh.visible=false;projectilePool.push(p.mesh);projectiles.splice(i,1);}
    }
  }
  function resolveBody(position,radius,bodyVelocity){
    return collisions.resolve(position,radius,bodyVelocity);
  }
  function updateEnemies(dt){
    for(let i=0;i<targets.length;i++){
      const t=targets[i],d=t.userData;if(!d.alive||d.isBoss)continue;
      d.flash=Math.max(0,d.flash-dt);d.cooldown=Math.max(0,d.cooldown-dt);
      let victim=turns.enabled?turnView.nearest(t.position,b=>{const id=b===player?turns.active()?.id:b.userData.actorId;return shelters.eligible(id)&&(!strategy.enabled||strategy.visibility({id:'pve-'+i,position:t.position.toArray(),yaw:t.rotation.y},{id},{range:480,cone:115}).seen);}):player;
      for(const e of [...shelterView.bodies(),...strategyView.bodies().filter(b=>b.userData.id.startsWith("messenger-"))])if(t.position.distanceTo(e.position)<450&&worldHit(t.position,e.position)===null&&(!victim||t.position.distanceTo(e.position)<t.position.distanceTo(victim.position)))victim=e;
      if(!victim){d.windup=0;d.telegraph.visible=false;const patrol=d.home.clone().add(new T.Vector3(Math.sin(state.time*.12+d.phase)*65,0,Math.cos(state.time*.12+d.phase)*65)).sub(t.position);patrol.y=0;if(patrol.length()>10){patrol.normalize().multiplyScalar(24*dt);collisions.move(t.position,patrol,d.radius);t.position.y=Math.max(t.position.y,heightAt(t.position.x,t.position.z)+d.radius);t.rotation.y=Math.atan2(-patrol.x,-patrol.z);}continue;}
      const delta=victim.position.clone().sub(t.position),distance=delta.length();delta.y=0;delta.normalize();
      let move=new T.Vector3();
      const canSee=distance<480 && worldHit(t.position,victim.position)===null;
      if(canSee||(shooting&&distance<680))d.alert=state.time+6;
      if(distance<850&&state.time<(d.alert||0)){
        if(d.windup>0){
          d.windup-=dt;
          if(d.windup<=0){
            if(d.role===1){const origin=t.position.clone().add(new T.Vector3(0,5,0));const direction=victim.position.clone().sub(origin).normalize();spawnProjectile(origin.addScaledVector(direction,d.radius+5),direction,true);}
            else if(t.position.distanceTo(victim.position)<d.radius+PLAYER_RADIUS+28){const hit=victim===player?takeDamage(d.role===2?24:14,delta):victim.userData.strategyObject?strategy.damageObject(victim.userData.id,d.role===2?24:14):victim.userData.decoy?shelters.hitEcho(victim.userData.decoyId,d.role===2?24:14):damageActor(victim,d.role===2?24:14);if(hit&&d.role===2&&turns.enabled&&!victim.userData.decoy&&!victim.userData.strategyObject)turns.status(victim===player?turns.active().id:victim.userData.actorId,'poison',12,.8);}
            d.cooldown=d.role===1?1.65:d.role===2?1.5:.85;
          }
        }else{
          const desired=d.role===1?230:d.radius+PLAYER_RADIUS+8;
          if(distance>desired+12)move.copy(delta).multiplyScalar([88,62,42][d.role]*dt*survivalFrame.aggressionMultiplier);
          else if(d.role===1&&distance<150)move.copy(delta).multiplyScalar(-55*dt);
          const inRange=d.role===1?distance<490:distance<desired+20;
          if(inRange&&d.cooldown===0&&worldHit(t.position,victim.position)===null){d.windup=d.role===2?.65:.4;sound.event('warning',t.position);}
        }
        t.rotation.y=Math.atan2(-delta.x,-delta.z);
      }else {
        const home=d.home.clone().add(new T.Vector3(Math.sin(state.time*.12+d.phase)*65,0,Math.cos(state.time*.12+d.phase)*65)).sub(t.position);home.y=0;if(home.length()>10)move.copy(home.normalize()).multiplyScalar(24*dt);
      }
      if(move.lengthSq()>0){const destination=t.position.clone().add(move);if(worldHit(t.position,destination,d.radius)!==null){let route=null;for(const angle of [.85,-.85,1.45,-1.45]){const candidate=move.clone().applyAxisAngle(new T.Vector3(0,1,0),angle);if(worldHit(t.position,t.position.clone().add(candidate),d.radius)===null){route=candidate;break;}}move.copy(route||new T.Vector3());}}
      t.position.add(move);t.position.y=heightAt(t.position.x,t.position.z)+d.radius;resolveBody(t.position,d.radius);
      // Sphere separation: enemies cannot stack or pass through the player.
      for(let j=0;j<i;j++){const other=targets[j];if(!other.userData.alive||other.userData.isBoss)continue;const separation=t.position.clone().sub(other.position),r=d.radius+other.userData.radius,dist=separation.length();if(dist<r&&dist>1e-5){separation.y=0;t.position.addScaledVector(separation.normalize(),(r-dist)*.5);other.position.addScaledVector(separation,-(r-dist)*.5);}}
      const away=player.position.clone().sub(t.position),sum=PLAYER_RADIUS+d.radius,dist=away.length();
      if(canAct()&&dist<sum){if(dist<1e-5)away.set(1,0,0);else away.divideScalar(dist);player.position.addScaledVector(away,(sum-dist)*.65);t.position.addScaledVector(away,-(sum-dist)*.35);
        if(state.dash>0&&d.lastDash!==dashSerial){damageEnemy(t,55);d.lastDash=dashSerial;t.position.addScaledVector(away,-20);}
      }
      for(const g of turns.enabled?turnView.bodies():[]){const v=t.position.clone().sub(g.position),n=v.length(),r=d.radius+PLAYER_RADIUS;if(n>1e-5&&n<r){v.y=0;t.position.addScaledVector(v.normalize(),r-n);}}
      resolveBody(t.position,d.radius);resolveBody(player.position,PLAYER_RADIUS,velocity);
      player.position.y=Math.max(player.position.y,heightAt(player.position.x,player.position.z)+PLAYER_RADIUS);
      d.telegraph.visible=d.windup>0&&d.alive;d.telegraph.position.set(t.position.x,heightAt(t.position.x,t.position.z)+.7,t.position.z);
      d.telegraph.scale.setScalar(1+(.7-d.windup)*.8);
    }
  }
  let dashSerial=0;
  function simulate(dt){
    if(state.paused||state.dead)return;
    state.time+=dt;if(transit.active){transit.tick(dt);return;}consumableCooldown=Math.max(0,consumableCooldown-dt);soloShield=Math.max(0,soloShield-dt);
    if(turns.enabled){turns.active().hp=state.hp;turns.tick(dt);state.hp=turns.active().hp;if(!canAct()){clearInput();velocity.set(0,0,0);}if(state.paused)return;}
    let nearestEnemy=Infinity;for(const t of targets)if(t.userData.alive)nearestEnemy=Math.min(nearestEnemy,t.position.distanceTo(player.position));
    survivalFrame=survival.update(dt,{time:state.time,health:state.hp,ambientDarkness:dimensionId?.94:.82,windExposure:T.MathUtils.clamp(.25+Math.hypot(velocity.x,velocity.z)/700+(world.wetAt(player.position.x,player.position.z)?.18:0),0,1),enemyPressure:T.MathUtils.clamp(1-nearestEnemy/680,0,1)});
    for(const event of survival.drainEvents())terrorAudio.react(event,player.position);
    if(reloadTime>0){reloadTime=Math.max(0,reloadTime-dt);if(reloadTime===0)window.CRLoadout.reload(loadout(),reloadWeapon);}
    recoil*=Math.exp(-dt*17);
    for(const key of ['cooldown','invincible','fireCooldown','hurt','hit','dash','jumpBuffer','dashBuffer'])state[key]=Math.max(0,state[key]-dt);
    forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));desiredMove.set(0,0,0);
    if(input.forward)desiredMove.add(forward);if(input.back)desiredMove.sub(forward);if(input.right)desiredMove.add(right);if(input.left)desiredMove.sub(right);
    const moving=desiredMove.lengthSq()>0;if(moving)desiredMove.normalize();
    if(state.grounded)state.coyote=.1;else state.coyote=Math.max(0,state.coyote-dt);
    if(state.jumpBuffer>0&&state.coyote>0){velocity.y=245;state.grounded=false;state.coyote=0;state.jumpBuffer=0;burst(player.position,'#bafaff',8);sound.event('jump',player.position);}
    if(state.dashBuffer>0&&state.cooldown===0){
      dashDirection.copy(moving?desiredMove:forward);state.dash=.22;state.cooldown=1.25;state.invincible=Math.max(state.invincible,.22);state.dashBuffer=0;dashSerial++;burst(player.position,'#6ffaff',12);sound.event('dash',player.position);
    }
    if(state.dash>0){velocity.x=dashDirection.x*530;velocity.z=dashDirection.z*530;}
    else {
      const factor=1-Math.exp(-dt*(state.grounded?11:3.3)),speed=(aiming?145:225)*survivalFrame.movementMultiplier;
      velocity.x=T.MathUtils.lerp(velocity.x,desiredMove.x*speed,factor);velocity.z=T.MathUtils.lerp(velocity.z,desiredMove.z*speed,factor);
    }
    if(grip&&canAct()){const delta=grip.destination.clone().sub(player.position),distance=delta.length();grip.remaining-=dt;if(distance<5||grip.remaining<=0)grip=null;else velocity.copy(delta.normalize().multiplyScalar(Math.min(380,distance/Math.max(.05,grip.remaining))));}
    velocity.y-=650*dt;
    const old=player.position.clone();const movementSupported=canAct()?collisions.move(player.position,{x:velocity.x*dt,y:velocity.y*dt,z:velocity.z*dt},PLAYER_RADIUS,velocity,state.grounded?14:0):false;
    const floorY=heightAt(player.position.x,player.position.z)+PLAYER_RADIUS;
    state.grounded=movementSupported;
    if(player.position.y<=floorY){if(velocity.y<-90)sound.event(world.wetAt(player.position.x,player.position.z)?'splash':'land',player.position);player.position.y=floorY;velocity.y=Math.max(0,velocity.y);state.grounded=true;}
    if(resolveBody(player.position,PLAYER_RADIUS,velocity))state.grounded=true;
    for(const body of turns.enabled?turnView.bodies():[]){const delta=player.position.clone().sub(body.position),distance=delta.length();if(distance<PLAYER_RADIUS*2&&canAct()){if(distance<1e-5)delta.set(1,0,0);else delta.divideScalar(distance);player.position.addScaledVector(delta,PLAYER_RADIUS*2-distance);resolveBody(player.position,PLAYER_RADIUS,velocity);}}
    player.position.y=Math.max(player.position.y,heightAt(player.position.x,player.position.z)+PLAYER_RADIUS);
    const dx=player.position.x-old.x,dz=player.position.z-old.z,distance=Math.hypot(dx,dz);travelled+=distance;
    if(distance>.0001&&state.grounded){const axis=new T.Vector3(dz,0,-dx).normalize();player.userData.rolling.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,distance/PLAYER_RADIUS));}
    strategy.tick(dt);shelters.tick(dt);shelterView.sync();updateEnemies(dt);updateProjectiles(dt);updateParticles(dt);mortar.update(dt);supplies.update(dt,state.time);
    if(shooting)fire();
    expedition.update(dt);if(boss.userData.alive)resolveBody(boss.position,boss.userData.radius);
    if(captureChannel){const site=world.sites[captureChannel.index],blocked=targets.some(t=>t.userData.alive&&Math.hypot(t.position.x-site.x,t.position.z-site.z)<160);if(!canAct()||Math.hypot(player.position.x-site.x,player.position.z-site.z)>90||Math.hypot(velocity.x,velocity.z)>20||blocked)captureChannel=null;else{captureChannel.progress+=dt;if(captureChannel.progress>=2){if(turns.capture(turns.active().id,'relay-'+captureChannel.index)){sound.event('relay',player.position);burst(player.position,'#d7bd68',16);}captureChannel=null;}}}
    if(turns.enabled){turns.active().hp=state.hp;if(state.won)state.won=false;}else if(state.won)setPaused(true);
  }
  function updateCamera(dt){
    if(state.cameraMode==='auto' && state.time-state.lastMouse>1.2 && !aiming && !shooting && (input.forward||input.left||input.right) && Math.hypot(velocity.x,velocity.z)>25){
      const heading=Math.atan2(-velocity.x,-velocity.z),difference=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));yaw+=difference*(1-Math.exp(-dt*.9));
    }
    const facing=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),side=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const distance=aiming?128:175, back=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    // Shoulder offset keeps the muzzle and target visible under the reticle.
    lookDesired.copy(player.position).add(new T.Vector3(0,14,0)).addScaledVector(facing,100).addScaledVector(side,27);
    cameraDesired.copy(player.position).addScaledVector(back,distance).add(new T.Vector3(0,28,0)).addScaledVector(side,27);
    cameraFocus.lerp(lookDesired,1-Math.exp(-dt*12));
    const pivot=player.position.clone().add(new T.Vector3(0,15,0));
    cameraRig.update(pivot,cameraDesired,cameraFocus,dt);
    camera.rotateX(recoil);camera.fov=T.MathUtils.lerp(camera.fov,aiming?47:settings.values.fov,1-Math.exp(-dt*10));camera.updateProjectionMatrix();camera.updateMatrixWorld();
    player.userData.face.rotation.y=yaw;
  }
  // Screen-space lens feeding the post pass. Only three projections per frame;
  // the shader itself early-outs outside nine shadow radii, so the cost stays
  // proportional to the black hole's screen area instead of the whole viewport.
  const lensData={amount:0,center:new T.Vector2(.5,.5),radius:0,frontDepth:1,tilt:.2,dopplerAxis:new T.Vector2(1,0)};
  let lensEnabled=true,lensProbe=null;
  const lensNdc=new T.Vector3(),lensEdge=new T.Vector3(),lensRight=new T.Vector3(),lensAxis=new T.Vector3(),
    lensNormal=new T.Vector3(.24,.4,.12),lensUp=new T.Vector3(0,1,0),lensLimb=new T.Vector3(),lensTangent=new T.Vector3(),
    lensView=new T.Vector3(),lensLimbProj=new T.Vector3();
  function updateLens(){
    const portal=world.singularityPortal;if(!portal||!lensEnabled){lensData.amount=0;return;}
    const source=portal.position;
    lensNdc.copy(source).project(camera);
    if(!Number.isFinite(lensNdc.x)||lensNdc.z<-1||lensNdc.z>1){lensData.amount=0;return;}
    const cameraDistance=portal.position.distanceTo(camera.position);
    if(cameraDistance>3400){lensData.amount=0;return;}
    const aspect=innerWidth/Math.max(1,innerHeight);
    const cx=(lensNdc.x+1)*.5,cy=(lensNdc.y+1)*.5;
    // Projected horizon radius, measured along the camera's own right axis.
    lensRight.setFromMatrixColumn(camera.matrixWorld,0);
    lensEdge.copy(source).addScaledVector(lensRight,portal.radius).project(camera);
    const dux=((lensEdge.x+1)*.5-cx)*aspect,duy=(lensEdge.y+1)*.5-cy;
    const radius=Math.min(1.5,Math.hypot(dux,duy));
    if(!Number.isFinite(radius)||radius<.0022){lensData.amount=0;return;}
    // Doppler limb: the disk plane plus the line of sight decide which side of
    // the ring runs toward the camera, and therefore which side is beamed.
    lensView.copy(camera.position).sub(source).normalize();
    lensAxis.copy(portal.normal||lensNormal).normalize();
    lensData.tilt=Math.max(.08,Math.abs(lensAxis.dot(lensView)));
    lensEdge.copy(source).addScaledVector(lensView,portal.radius+1).project(camera);
    lensData.frontDepth=T.MathUtils.clamp(lensEdge.z*.5+.5,0,1);
    lensLimb.crossVectors(lensAxis,lensView);
    if(lensLimb.lengthSq()<1e-6)lensLimb.set(1,0,0);else lensLimb.normalize();
    // Whichever radial direction carries material toward the observer wins.
    lensTangent.crossVectors(lensAxis,lensLimb);
    const approach=lensTangent.dot(lensView)<0?-1:1;
    lensLimbProj.copy(source).addScaledVector(lensLimb,portal.radius*3*approach).project(camera);
    let ax=((lensLimbProj.x+1)*.5-cx)*aspect,ay=(lensLimbProj.y+1)*.5-cy;
    if(!Number.isFinite(ax)||!Number.isFinite(ay)||Math.abs(ax)+Math.abs(ay)<1e-6){ax=1;ay=0;}
    const norm=Math.hypot(ax,ay)||1;
    lensData.dopplerAxis.set(ax/norm,ay/norm);
    lensData.center.set(cx,cy);
    lensData.radius=radius;
    const boost=transit.active?transit.snapshot().intensity:0;
    lensData.amount=Math.min(1,Math.max(0,(1-Math.min(1,Math.max(0,(cameraDistance-260)/3000))*.35)*(.40+boost*.35)));
  }
  function present(){
    updateLens();
    const strategyState=strategy.snapshot(networkRole==='guest'?networkTeam:null);const myId=turns.active()?.id,toolPoint=strategy.enabled?toolAim():null;
    strategyView.update(strategyState,{time:state.time,actorId:myId,position:player.position.toArray(),yaw,selected:selectedTool,aim:toolPoint,valid:!!toolPoint&&(selectedTool==='quiet'||(worldHit(player.position,new T.Vector3(...toolPoint))===null&&collisions.clear(new T.Vector3(...toolPoint),selectedTool==='blink'||selectedTool==='grapple'?17.9:3.9))),visibility:strategy.enabled?strategy.ownVisibility(myId,[...turns.members.filter(m=>m.hp>0).map(m=>({id:m.id,teamId:m.teamId,yaw:m.data.yaw||0})),...targets.filter(t=>t.userData.alive).map((t,i)=>({id:'pve-'+i,position:t.position.toArray(),yaw:t.rotation.y}))]):{seen:false,reason:''},teamId:turns.active()?.teamId,paused:state.paused,controls:localControls()&&canAct()});
    world.refuges.update(state.time,p=>shelters.isCollected(p));shelterView.sync();shelterActions.hidden=!turns.enabled;const currentId=turns.active()?.id;for(const b of shelterActions.querySelectorAll('[data-shelter]')){const kind=b.dataset.shelter;b.querySelector('span').textContent=shelterKeys[kind]+' · '+({cocoon:'Capullo',stone:'Piedra',anchor:'Ancla',echo:'Eco'}[kind])+' ×'+(currentId?shelters.kit(currentId)[kind]:0);b.disabled=!localControls()||!canAct()||state.paused||!currentId||!shelters.kit(currentId)[kind];}energyButton.disabled=!localControls()||!canAct()||state.paused||survivalFrame.fragments===0||survivalFrame.emergency>20;const safe=turns.enabled?shelters.guardFor(currentId):null,site=turns.enabled?shelters.nearby(currentId):null;const crystal=world.refuges.shards.filter(s=>!shelters.isCollected(s)).sort((a,b)=>player.position.distanceToSquared(new T.Vector3(...a.position))-player.position.distanceToSquared(new T.Vector3(...b.position)))[0];shelterHint.hidden=state.paused;const hint=state.time<shelterNoticeUntil?shelterNotice:safe?'Resguardado del PvE durante la espera · '+safe.kind:site?'E / Enter · cerrar turno en '+({rift:'grieta + capullo',bush:'arbusto anómalo',contested:'refugio disputado'}[site.kind]):crystal&&player.position.distanceTo(new T.Vector3(...crystal.position))<250?'Fragmento de energía · '+Math.round(player.position.distanceTo(new T.Vector3(...crystal.position))/10)+' m · E para recoger':'Q · fragmento: 22 s de luz · E recoge cristales';if(shelterHint.dataset.text!==hint){shelterHint.dataset.text=hint;shelterHint.replaceChildren(window.CRIcons.make(safe?.kind||site?.kind||'fragment'),document.createTextNode(hint));}
    presentTurns();const spoken=networkRole==='guest'?commentator.snapshot().current:commentator.update(state.time,turns.enabled?turns.snapshot():null);commentNode.hidden=!spoken||state.time>=spoken.until||state.paused;if(spoken&&commentNode.textContent!==spoken.text)commentNode.textContent=spoken.text;for(const button of consumableNode.querySelectorAll('[data-item]')){const key=button.dataset.item;button.querySelector('span').textContent=itemLabels[key]+' ×'+consumables[key];button.disabled=!localControls()||!canAct()||state.paused||consumables[key]===0;}
    expedition.present(yaw);
    updateAudio();
    const presentationDt=Math.max(0,Math.min(.1,state.time-lastPresentTime));lastPresentTime=state.time;
    terrorAudio.update(state.time,{dt:presentationDt,fear:survivalFrame.fear,darkness:survivalFrame.darkness,shelter:audioScene.environment?.shelter||0,paused:state.paused,player:player.position});
    document.getElementById('weapon-name').textContent=(selectedWeapon+1)+' · '+weapons[selectedWeapon].name;
    document.getElementById('ammo').textContent=strategy.enabled?'Usos '+(strategy.stock(myId)['weapon-'+selectedWeapon]||0)+' / 3 · munición '+ammo[selectedWeapon]:reloadTime>0?'RECARGA '+reloadTime.toFixed(1)+' s':ammo[selectedWeapon]+' / '+weapons[selectedWeapon].mag+' · reserva '+reserve[selectedWeapon];
    for(const button of document.querySelectorAll('[data-weapon]')){const i=Number(button.dataset.weapon);button.disabled=i===3&&!mortar.has();button.classList.toggle('selected',i===selectedWeapon);button.setAttribute('aria-pressed',String(i===selectedWeapon));}
    mortar.present(selectedWeapon===3&&!transit.active,selectedWeapon===3?aimPoint().point:null);
    if(turns.enabled){const snap=turns.snapshot(),team=snap.teams.find(t=>t.id===turns.active()?.teamId);document.getElementById('objective').textContent=strategy.enabled?'OBJETIVOS · '+snap.teams.map(t=>t.name+' '+t.score.toFixed(2)+'/'+snap.targetScore).join(' · '):snap.victoryRules.includes('last-team')?'ÚLTIMO EQUIPO EN PIE · eliminaciones permanentes · PvE activo':'DATOS +5 · PvE +1 · RIVAL +2 · META '+snap.targetScore+' · '+Math.ceil(Math.max(0,snap.matchSeconds-snap.elapsed)/60)+' min';const prompt=document.getElementById('interact-prompt'),index=world.sites.slice(0,3).findIndex(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<90);if(index>=0&&!strategy.enabled){prompt.hidden=false;prompt.textContent=captureChannel?'EXTRAYENDO · '+Math.floor(captureChannel.progress/2*100)+'% · quedate quieto':team?.captures.includes('relay-'+index)?'DATOS OBTENIDOS POR TU EQUIPO':'E · Extraer datos +5 · 2 segundos · despejar PvE';}}
    if(strategy.enabled&&!state.paused){const g=strategyState.goals.find(g=>!g.carrier&&player.position.distanceTo(new T.Vector3(...g.position))<g.radius);if(g){const prompt=document.getElementById('interact-prompt');prompt.hidden=false;prompt.textContent='E · '+g.name+(g.type==='relay'?' · mantener '+g.required+' cierres de turno':g.type==='extract'?' · entregar fragmento':['resonator','breach'].includes(g.type)?(g.type==='breach'&&!g.requires.every(id=>strategyState.goals.find(n=>n.id===id)?.complete.includes(turns.active()?.teamId))?' · sellada: faltan resonadores':g.complete.includes(turns.active()?.teamId)?' · completado':strategyState.channel?.goalId===g.id?' · SINTONIZANDO '+Math.floor((g.work[turns.active()?.teamId]||0)/g.workSeconds*100)+'% · quedate quieto':' · sintonizar '+g.workSeconds+' s · ruido'):'');}}
    const crates=supplies.snapshot().crates,closestCrate=crates.sort((a,b)=>player.position.distanceToSquared(new T.Vector3(...a.position))-player.position.distanceToSquared(new T.Vector3(...b.position)))[0];supplyNote.hidden=!closestCrate||state.paused;if(closestCrate){const d=Math.round(player.position.distanceTo(new T.Vector3(...closestCrate.position))/10),bearing=Math.atan2(-(closestCrate.position[0]-player.position.x),-(closestCrate.position[2]-player.position.z))-yaw;const arrow=Math.abs(Math.atan2(Math.sin(bearing),Math.cos(bearing)))<.7?'↑':Math.sin(bearing)>0?'→':'←';supplyNote.textContent=arrow+' '+supplies.labels[closestCrate.payload.type]+' · '+d+' m · '+(closestCrate.landed?'E para recoger':'cayendo');}
    const nearbySupply=supplies.near(player.position);if(nearbySupply&&!state.paused){const prompt=document.getElementById('interact-prompt');prompt.hidden=false;prompt.textContent='E · Recoger '+supplies.labels[nearbySupply.payload.type]+' · para '+(turns.active()?.name||'vos');}
    const atPortal=Math.hypot(player.position.x-world.portal.x,player.position.z-world.portal.z)<world.portal.radius;
    if(atPortal&&!state.paused){const prompt=document.getElementById('interact-prompt');prompt.hidden=false;prompt.textContent=transit.active?'SINGULARIDAD · tránsito dimensional':turns.enabled?'PARTIDA EN ESTA DIMENSIÓN · P: elegir mapa para la próxima':state.time<portalLock?'SINGULARIDAD · estabilizando':'E · Cruzar a '+world.portal.destination;}
    else if(!state.paused&&sound.focus()){const prompt=document.getElementById('interact-prompt');if(!prompt.textContent){prompt.hidden=false;prompt.textContent='E · Resonar';}}
    document.getElementById('dimension-flash').style.opacity=Math.max(0,(portalFlash-state.time)/.7)*.6;
    const ground=heightAt(player.position.x,player.position.z),altitude=Math.max(0,player.position.y-ground-PLAYER_RADIUS);
    shadow.position.set(player.position.x,ground+.65,player.position.z);shadow.scale.setScalar(Math.max(.45,1-altitude/220));shadow.material.opacity=Math.max(.12,.46-altitude/350);
    player.userData.core.material.emissiveIntensity=state.invincible>0?.48+Math.sin(state.time*18)*.12:.34;
    for(const t of targets){
      const d=t.userData;if(!d.alive)continue;
      d.health.quaternion.copy(t.quaternion.clone().invert().multiply(camera.quaternion));d.health.scale.x=Math.max(.02,d.hp/d.maxHp);
      d.health.visible=!d.isBoss&&t.position.distanceTo(player.position)<420&&(d.alert>0||d.hp<d.maxHp||d.flash>0);
      t.userData.core.material.emissiveIntensity=d.flash>0?1.8:.5;
      t.children[1].rotation.z=state.time*.65+d.phase;
      d.face.rotation.z=Math.sin(state.time*.65+d.phase)*.018+(d.windup>0?.035:0);
    }
    magenta.position.set(player.position.x+430,player.position.y+260,player.position.z-350);
    sun.position.set(player.position.x-900,player.position.y+1400,player.position.z+600);sun.target.position.copy(player.position);
    candleLight.color.set(survivalFrame.emergency>0?0xb0efd9:0xffbd72);candleLight.intensity=survivalFrame.lit?(survivalFrame.emergency>0?18000:10000)*survivalFrame.flicker:0;candleLight.distance=survivalFrame.lightRadius;
    regionFill.intensity=.28+(1-survivalFrame.darkness)*.72;sun.intensity=.48+(1-survivalFrame.darkness)*1.05;
    const seconds=Math.ceil(survivalFrame.fuel+survivalFrame.emergency);document.getElementById('candle-life').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');document.getElementById('match-count').textContent=survivalFrame.matches;
    document.body.dataset.candle=survivalFrame.lit?'lit':'out';document.body.dataset.fear=survivalFrame.stage;document.body.style.setProperty('--flame',String(survivalFrame.flicker));
    speedNode.textContent=Math.round(Math.hypot(velocity.x,velocity.z));
    distanceNode.textContent=Math.round(travelled/10)+' m';targetsNode.textContent=state.kills+' / '+targets.length;
    hpNode.textContent=Math.ceil(state.hp)+' / 100';document.getElementById('health-fill').style.width=state.hp+'%';
    dashNode.textContent=state.cooldown>0?state.cooldown.toFixed(1)+' s':'LISTO';
    document.body.style.setProperty('--hurt',String(state.hurt*1.8));
    document.querySelector('.crosshair').classList.toggle('hit',state.hit>0);
    const aim=aimPoint(),projected=aim.point.clone().project(camera);
    aimMarker.style.left=(projected.x+1)*50+'%';aimMarker.style.top=(1-projected.y)*50+'%';
    document.querySelector('.crosshair').classList.toggle('target',!!aim.target);
    messageNode.textContent=state.dead?'Núcleo destruido':state.won?'Zona despejada':state.paused?'Pausa':document.pointerLockElement===canvas?'C · cambiar cámara   Esc · liberar mouse':state.cameraMode==='fixed'?'Cámara fija · apuntá con el cursor':'Clic para capturar mouse · arrastrá con botón derecho si no se captura';
  }
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  function frameLoop(){
    try{
      settings.frame(performance.now());
      if(!window.CRCollisionWorld.finite(player.position)||!window.CRCollisionWorld.finite(velocity)){player.position.copy(safePlayer);velocity.set(0,0,0);accumulator=0;settings.issue('Estado del jugador recuperado',true);}
      if(!window.CRCollisionWorld.finite(camera.position)||camera.projectionMatrix.elements.some(v=>!Number.isFinite(v))){camera.position.copy(player.position).add(new T.Vector3(0,65,170));yaw=Number.isFinite(yaw)?yaw:0;pitch=Number.isFinite(pitch)?pitch:.18;cameraFocus.copy(player.position);camera.fov=settings.values.fov;camera.updateProjectionMatrix();updateCamera(1);settings.issue('Perspectiva recuperada',true);}
      const dt=Math.min(.05,clock.getDelta());
      if(networkRole==='host'&&networkReady&&turns.active()?.teamId==='team-1'&&performance.now()-lastRemoteInput>300)clearInput();
      if(networkRole==='guest'){if(remoteSnapshot){applyRemoteInterpolation(dt);updateCamera(dt);}}else if(!simulationManual&&!state.paused){accumulator+=dt;while(accumulator>=1/120){simulate(1/120);accumulator-=1/120;}updateCamera(dt);}
      world.update(state.time,state.paused?0:dt,player.position,transit.snapshot().intensity);
      if(state.time>=nextHealthCheck){nextHealthCheck=state.time+.5;const health=diagnoseScene();if(!health.ok)settings.issue(health.issues.join('; '));else safePlayer.copy(player.position);}
      present();humanoids.update(player,state.paused||simulationManual?0:dt,{speed:Math.hypot(velocity.x,velocity.z),yaw,grounded:state.grounded,attack:state.fireCooldown>0,hurt:state.hurt>0,dead:state.dead});for(const t of targets)humanoids.updateEnemy(t,state.paused||simulationManual?0:dt);humanoids.cameraFade(player,camera,transit.active);networkFrame();if(!contextLost){lightScreen.copy(player.position).add(new T.Vector3(0,16,0)).project(camera);terrorVisual.render(state.paused?0:dt,{fear:survivalFrame.fear,darkness:survivalFrame.darkness,flicker:survivalFrame.flicker,lightCenter:{x:(lightScreen.x+1)*.5,y:(lightScreen.y+1)*.5},lens:lensData,transitFade:transit.snapshot().fade,lightPower:survivalFrame.lit?(survivalFrame.emergency>0?1:.65):0});}frameSerial++;
    }catch(error){
      frameFaults++;lastFrameError={message:String(error?.message||error),stack:String(error?.stack||''),time:state.time};accumulator=0;clearInput();settings.issue(lastFrameError.message);if(frameFaults<=3)console.error('CR3D frame recovered:',error);
    }finally{requestAnimationFrame(frameLoop);}
  }
  function inputKey(code,value){
    const mapping={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
    if(mapping[code])input[mapping[code]]=value;
  }
  let dragging=false;
  addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
    if(networkRole==='guest'&&e.code==='KeyP'&&!e.repeat){guestMenu=!guestMenu;overlay.hidden=!guestMenu;return;}
    if(networkRole!=='off'&&e.code==='KeyN')return;
    if(e.code==='KeyP'&&!e.repeat&&!state.dead&&!state.won){setPaused(!state.paused);return;}
    if(e.code==='KeyN'&&!e.repeat){reset();return;}
    if(e.code==='KeyM'&&!e.repeat){expedition.toggleMap();return;}
    if(e.code==='KeyV'&&!e.repeat){const s=sound.snapshot();sound.settings(s.volume,!s.mute);return;}
    if(e.code==='KeyC'&&!e.repeat){const modes=['free','fixed','auto'];setMode(modes[(modes.indexOf(state.cameraMode)+1)%3]);return;}
    if(state.paused||state.dead||!localControls())return;
    if(networkRole==='guest'){guestKey(e);return;}
    if(e.code==='Enter'&&!e.repeat&&turns.enabled){turns.end();clearInput();return;}
    if(!canAct())return;
    startAudio();
    if(!e.repeat&&['KeyH','KeyJ','KeyK'].includes(e.code)){useConsumable({KeyH:'medkit',KeyJ:'shield',KeyK:'antidote'}[e.code]);return;}
    if(e.code==='KeyQ'&&!e.repeat){useEnergy();return;}if(!e.repeat&&['KeyB','KeyX','KeyT','KeyY'].includes(e.code)){useShelter({KeyB:'cocoon',KeyX:'stone',KeyT:'anchor',KeyY:'echo'}[e.code]);return;}
    if(e.code==='KeyG'&&!e.repeat){useTool();return;}if(e.code==='KeyR'&&!e.repeat){reload();return;}
    if(['Digit1','Digit2','Digit3','Digit4'].includes(e.code)){selectWeapon(Number(e.code.slice(-1))-1);return;}
    if(e.code==='KeyE'&&!e.repeat){interact();return;}
    inputKey(e.code,true);
    if(!e.repeat&&e.code==='Space')state.jumpBuffer=.16;
    if(!e.repeat&&(e.code==='ShiftLeft'||e.code==='ShiftRight'))state.dashBuffer=.12;
    if(e.code==='KeyF')shooting=true;
  });
  addEventListener('keyup',e=>{inputKey(e.code,false);if(e.code==='KeyF')shooting=false;});
  addEventListener('blur',()=>{dragging=false;clearInput();if(networkRole==='off')setPaused(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(networkRole==='off')setPaused(true);}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('mousedown',e=>{
    if(!localControls()||!canAct()||state.paused||state.dead)return;
    startAudio();
    if(e.button===0){shooting=true;if(networkRole!=='guest')fire();if(state.cameraMode!=='fixed'&&document.pointerLockElement!==canvas){try{const result=canvas.requestPointerLock();if(result&&result.catch)result.catch(()=>{});}catch(_){}}}
    if(e.button===2){dragging=true;aiming=true;}
  });
  addEventListener('mouseup',e=>{if(e.button===0)shooting=false;if(e.button===2){dragging=false;aiming=false;}});
  document.addEventListener('pointerlockchange',()=>{pointerAim.set(0,0);document.querySelector('.crosshair').style.left='50%';document.querySelector('.crosshair').style.top='50%';if(document.pointerLockElement!==canvas)clearInput();});
  document.addEventListener('pointerlockerror',()=>{messageNode.textContent='Usá botón derecho y arrastrá para girar.';});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;lastFrameError={message:'WebGL context lost',stack:'',time:state.time};});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;lastFrameError=null;resize();terrorVisual.resize();});
  addEventListener('mousemove',e=>{
    if(state.paused||!localControls())return;
    const locked=document.pointerLockElement===canvas;
    if(state.cameraMode!=='fixed'&&(locked||dragging)){
      yaw-=e.movementX*.0022;pitch=T.MathUtils.clamp(pitch+e.movementY*.0017,-.25,.72);state.lastMouse=state.time;pointerAim.set(0,0);
    }else if(!locked){pointerAim.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);}
    const cross=document.querySelector('.crosshair');cross.style.left=(pointerAim.x+1)*50+'%';cross.style.top=(1-pointerAim.y)*50+'%';
  });
  document.getElementById('camera-toggle').addEventListener('click',()=>{const modes=['free','fixed','auto'];setMode(modes[(modes.indexOf(state.cameraMode)+1)%3]);});
  document.getElementById('resume').addEventListener('click',()=>{if(networkRole==='guest'){guestMenu=false;overlay.hidden=true;}else setPaused(false);});document.getElementById('restart').addEventListener('click',()=>reset());
  document.getElementById('continue-save').addEventListener('click',()=>reset(true));
  for(const button of document.querySelectorAll('[data-weapon]'))button.addEventListener('click',()=>{if(!state.paused&&localControls()){startAudio();if(networkRole==='guest')networkActions.push('weapon-'+button.dataset.weapon);else selectWeapon(Number(button.dataset.weapon));}});
  const volumeNode=document.getElementById('volume');volumeNode.value=Math.round(sound.snapshot().volume*100);volumeNode.addEventListener('input',()=>{startAudio();sound.settings(Number(volumeNode.value)/100,sound.snapshot().mute);});
  addEventListener('pagehide',()=>{terrorAudio.dispose();terrorVisual.dispose();sound.dispose();});
  addEventListener('resize',()=>{resize();terrorVisual.resize();});scene.add(sun.target);resize();settings.sync();terrorVisual.resize();reset(!new URLSearchParams(location.search).has('qa'));updateCamera(1);ready=true;
  window.CR3D=Object.freeze({
    snapshot(){return {ready,characters:characterStyle.stats(),position:player.position.toArray(),speed:Math.hypot(velocity.x,velocity.z),travelled,worldSize:WORLD,projectiles:projectiles.length,targets:targets.filter(t=>t.userData.alive).length,cameraDistance:camera.position.distanceTo(player.position),state:{...state},height:player.position.y-heightAt(player.position.x,player.position.z)-PLAYER_RADIUS,world:world.stats(),expedition:expedition.snapshot(),audio:sound.snapshot(),survival:survival.snapshot(),lighting:{intensity:candleLight.intensity,radius:candleLight.distance},shelters:shelters.snapshot(),shelterViews:shelterView.stats(),terrorAudio:terrorAudio.snapshot(),post:terrorVisual.snapshot(),weapon:{name:weapons[selectedWeapon].name,ammo:ammo[selectedWeapon],reserve:reserve[selectedWeapon],reload:reloadTime},loadout:{ammo:[...ammo],reserve:[...reserve],items:{...consumables}},supplies:supplies.snapshot(),shelters:shelters.snapshot(),commentary:commentator.snapshot(),strategy:strategy.snapshot(networkRole==='guest'?networkTeam:null),strategyViews:strategyView.stats(),render:{triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,frameSerial,frameFaults,contextLost,lastFrameError}};},
    setInput(name,value){if(name in input)input[name]=!!value;if(name==='fire')shooting=!!value;if(name==='jump'&&value)state.jumpBuffer=.16;if(name==='dash'&&value)state.dashBuffer=.12;},
    fire,setMode,reset,setPaused,reload,selectWeapon,interact,useConsumable,useShelter,useEnergy,useTool,
    online:{host:hostNetwork,join:joinNetwork,leave:leaveNetwork,status(){return {role:networkRole,teamId:networkTeam,ready:networkReady,tick:networkLastTick,controls:localControls(),keys:{...input},fire:shooting,menu:!overlay.hidden};},testCommand:remoteInput},
    match:{start:startMatch,end(){turns.end();clearInput();},snapshot:turns.snapshot,status:turns.status,award:turns.award,capture:turns.capture,damage(id,amount,sourceId=null){const result=turns.damage(id,amount,sourceId);if(turns.active()?.id===id)state.hp=turns.active().hp;turnView.sync();return result;},positions(){return turns.members.map(m=>({id:m.id,position:m.id===turns.active()?.id?player.position.toArray():m.data.position}));}},
    mortar,terrorAudio,diagnostics(){return {scene:diagnoseScene(),performance:settings.snapshot(),collisions:collisions.audit(),camera:cameraRig.snapshot()};},
    audio:sound,
    continueRun(){reset(true);},
    teleport(x,z){player.position.set(x,heightAt(x,z)+PLAYER_RADIUS,z);velocity.set(0,0,0);for(let i=0;i<3;i++){collisions.resolve(player.position,PLAYER_RADIUS,velocity);player.position.y=Math.max(player.position.y,heightAt(player.position.x,player.position.z)+PLAYER_RADIUS);}safePlayer.copy(player.position);cameraFocus.copy(player.position);camera.position.copy(player.position).add(new T.Vector3(0,60,170));nextAudioScene=-1;updateCamera(1);},
    setCamera(y,p){yaw=y;pitch=T.MathUtils.clamp(p,-.25,.72);updateCamera(1);},
    // Deterministic QA drives the same fixed-step simulation and collision queries.
    test:{humanoidAudit(){return humanoids.audit();},characterAudit(){return {player:player.userData.face.userData.characterStyle,enemies:targets.map(t=>t.userData.face.userData.characterStyle),boss:boss.userData.face.userData.characterStyle,waiting:turnView.bodies().map(b=>b.userData.face?.userData.characterStyle),textures:characterStyle.stats()};},characterEncounter(){const p=player.position;for(let i=0;i<3;i++){const t=targets[i];t.userData.alive=true;t.visible=true;t.position.set(p.x+(i-1)*65,heightAt(p.x+(i-1)*65,p.z-85)+t.userData.radius,p.z-85);t.rotation.y=Math.PI;t.userData.home.copy(t.position);t.userData.cooldown=100;}},lensBlock(enabled){if(lensProbe){scene.remove(lensProbe);lensProbe.geometry.dispose();lensProbe.material.dispose();lensProbe=null;}if(enabled){lensProbe=new T.Mesh(new T.BoxGeometry(320,320,8),new T.MeshBasicMaterial({color:'#183338'}));lensProbe.position.copy(world.singularityPortal.position).addScaledVector(camera.position.clone().sub(world.singularityPortal.position).normalize(),50);scene.add(lensProbe);}},lens(enabled){if(typeof enabled==='boolean')lensEnabled=enabled;updateLens();return {amount:lensData.amount,radius:lensData.radius,center:lensData.center.toArray()};},frame(){present();lightScreen.copy(player.position).add(new T.Vector3(0,16,0)).project(camera);terrorVisual.render(0,{fear:survivalFrame.fear,darkness:survivalFrame.darkness,flicker:survivalFrame.flicker,lightCenter:{x:(lightScreen.x+1)*.5,y:(lightScreen.y+1)*.5},lens:lensData,transitFade:transit.snapshot().fade,lightPower:survivalFrame.lit?(survivalFrame.emergency>0?1:.65):0});},ground:heightAt,strategyState:strategy.snapshot,visibility:strategy.visibility,networkSnapshot:exportNetwork,toolAim,selectTool(k){if(strategy.catalog[k])selectedTool=k;},setActor(id,p,y=0){const m=turns.members.find(m=>m.id===id);if(m){m.data.position=[...p];m.data.yaw=y;}turnView.sync();},shelterSites(){return world.refuges.points;},energySites(){return world.refuges.shards;},readable:canRead,characterStyle,shelterState:shelters.snapshot,pveHit(id,amount){const body=turnView.bodies().find(b=>b.userData.actorId===id);return body?damageActor(body,amount):id===turns.active()?.id?takeDamage(amount,new T.Vector3()):false;},clearSupplies(){supplies.reset();},loadout(values){if(values){const n=window.CRLoadout.normalize(values);ammo=n.ammo;reserve=n.reserve;consumables=n.items;}return {ammo:[...ammo],reserve:[...reserve],items:{...consumables}};},drop(type){return supplies.spawn({id:turns.active()?.id||'solo',position:player.position.toArray()},type);},comment(kind,context){return commentator.say(kind,context,state.time,true);},manual(value){simulationManual=value;},step(seconds){for(let t=0;t<seconds;t+=1/120)simulate(1/120);updateCamera(1);world.update(state.time,1,player.position);present();},
      vertical(){return {...world.vertical};},positionAt(x,y,z){player.position.set(x,y,z);velocity.set(0,0,0);safePlayer.copy(player.position);updateCamera(1);},
      dimension(){return {id:dimensionId,name:dimensionId?'UMBRAL II':'UMBRAL I',size:WORLD,portal:{...world.portal,kind:world.singularityPortal.kind,visualRadius:world.singularityPortal.radius},content:{covers:world.content.covers,routes:world.content.routes.length,points:world.content.points||[]},transit:transit.snapshot(),terrainSample:[heightAt(700,400),heightAt(-800,-1200)],loaded:dimensions.filter(Boolean).length,visible:dimensions.filter(m=>m&&m.world.root.visible&&m.terrain.visible).length,trees:world.stats().trees,boxes:collisionBoxes.length,aesthetic:world.aesthetic(),grounded:Math.abs(player.position.y-heightAt(player.position.x,player.position.z)-PLAYER_RADIUS)<2};},
      survival(values){if(values)survival.configureForTest(values);survivalFrame=survival.snapshot();return survival.snapshot();},useMatch(){const used=survival.useMatch();survivalFrame=survival.snapshot();return used;},startTerrorAudio(){return startAudio();},
      faces(){return targets.map(t=>({boss:!!t.userData.isBoss,role:t.userData.role,curved:t.userData.face?.children[0]?.geometry.type==='SphereGeometry',textured:!!t.userData.face?.children[0]?.material.map,finite:Number.isFinite(t.userData.face?.rotation.z)}));},
      sites(){return world.sites;},boss(){return {hp:boss.userData.hp,alive:boss.userData.alive,position:boss.position.toArray()};},
      damageBoss(amount){damageEnemy(boss,amount);},clearAround(x,z){for(const t of targets){if(!t.userData.isBoss&&Math.hypot(t.position.x-x,t.position.z-z)<190){t.userData.alive=false;t.visible=false;}}},
      enemy(index){const t=targets[index];return {position:t.position.toArray(),hp:t.userData.hp,alive:t.userData.alive,windup:t.userData.windup};},
      reviveEnemy(index,x,z){const t=targets[index];t.userData.alive=true;t.userData.hp=t.userData.maxHp;t.visible=true;t.position.set(x,heightAt(x,z)+t.userData.radius,z);t.userData.cooldown=0;},
      arrangeEnemy(index,x,z){const t=targets[index];t.position.set(x,heightAt(x,z)+t.userData.radius,z);t.userData.cooldown=0;},
      shootActor(id){const body=turnView.bodies().find(b=>b.userData.actorId===id);if(!body)return false;spawnProjectile(player.position.clone(),body.position.clone().sub(player.position).normalize());return true;},
      shootAt(index){const t=targets[index];spawnProjectile(player.position.clone().add(new T.Vector3(0,8,0)),t.position.clone().sub(player.position).normalize());},
      cover(){return collisionBoxes[0].clone();},
      treeCover(){return world.colliders[0].clone();},
      collisionAudit(){let missed=0,compared=0;for(const b of collisionBoxes)for(const axis of ['x','z']){const a=b.min.clone().add(b.max).multiplyScalar(.5),end=a.clone();a[axis]=b.min[axis]-35;end[axis]=b.max[axis]+35;let expected=P.terrain(a,end,heightAt,3);for(const other of collisionBoxes){const t=P.sweptBox(a,end,other,3);if(t!==null&&(expected===null||t<expected))expected=t;}const indexed=collisions.hit(a,end,3);if(indexed!==expected)missed++;compared++;}return {boxes:collisionBoxes.map(b=>({min:b.min.toArray(),max:b.max.toArray()})),missed,compared};},
      recoverProbe(){player.position.x=NaN;camera.position.z=NaN;},
      acousticOcclusion, audioEnvironment(){return world.audioEnvironment(player.position,state.time);},
      clearMortarArena(){for(const t of targets){t.userData.alive=false;t.visible=false;}},
      mortarAim(x,z){const p=new T.Vector3(x,heightAt(x,z)+5,z).project(camera);pointerAim.set(p.x,p.y);},
      nearMiss(){const p=player.position.clone().add(new T.Vector3(48,0,-90));spawnProjectile(p,new T.Vector3(0,0,1),true);updateProjectiles(.75);},
      hitPlayer(amount){return takeDamage(amount,new T.Vector3());},
      aimAt(index){const v=targets[index].position.clone().project(camera);pointerAim.set(v.x,v.y);},
      cameraClear(){return worldHit(player.position.clone().add(new T.Vector3(0,15,0)),camera.position,4)===null;},
      blockedShot(){const b=collisionBoxes[0],y=(b.min.y+b.max.y)/2,z=(b.min.z+b.max.z)/2;const a=new T.Vector3(b.min.x-90,y,z),end=new T.Vector3(b.max.x+90,y,z);spawnProjectile(a,end.clone().sub(a));updateProjectiles(.5);return projectiles.length===0;},
      bodyClear(){return collisionBoxes.every(b=>player.position.distanceTo(player.position.clone().clamp(b.min,b.max))>=PLAYER_RADIUS-.1);},
      separated(){return targets.every(t=>!t.userData.alive||player.position.distanceTo(t.position)>=PLAYER_RADIUS+t.userData.radius-1);}}
  });
  frameLoop();
})();
