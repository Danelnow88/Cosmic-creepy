/* Pickups, ballistic prediction and compact fire effects. Simulation uses the same 120 Hz sweep as preview. */
window.CRMortar=function({T,scene,camera,player,state,heightAt,worldHit,targets,additionalTargets=()=>[],owner=()=>null,persist=()=>true,physics,sound,damageEnemy,damagePlayer}){
 const STEP=1/120,GRAVITY=280,RADIUS=5,BLAST=42,MAX_SHELLS=6,MAX_BLASTS=4,TELEMETRY_POINTS=100,TELEMETRY_RESPONSE=32;
 const clamp=T.MathUtils.clamp,root=new T.Group();root.name='mortar-system';scene.add(root);
 let owned=false,prediction=null,shots=0,explosions=0,lastImpact=null,seed=721;
 let telemetryInitialized=false,telemetryFrames=0,lastTelemetryClock=0,lastTelemetryState=0,lastTelemetryText='',maxTelemetrySegment=0;
 const telemetryAim=new T.Vector3();
 const shells=[],effects=[],pickupPosition={x:65,z:65},node=document.getElementById('pickup-prompt'),readout=document.getElementById('mortar-readout');
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const iconCanvas=document.createElement('canvas');iconCanvas.width=iconCanvas.height=128;const ic=iconCanvas.getContext('2d');ic.strokeStyle='#ffd99b';ic.fillStyle='#20322c';ic.lineWidth=7;ic.lineCap='round';ic.lineJoin='round';ic.beginPath();ic.moveTo(22,103);ic.lineTo(103,103);ic.moveTo(47,101);ic.lineTo(63,59);ic.lineTo(87,101);ic.stroke();ic.beginPath();ic.moveTo(45,76);ic.lineTo(75,25);ic.lineTo(96,37);ic.lineTo(65,89);ic.closePath();ic.fill();ic.stroke();ic.beginPath();ic.ellipse(86,30,13,7,.5,0,Math.PI*2);ic.fillStyle='#070c12';ic.fill();ic.stroke();
 const iconMap=new T.CanvasTexture(iconCanvas),pickup=new T.Group();root.add(pickup);pickup.position.set(pickupPosition.x,heightAt(pickupPosition.x,pickupPosition.z)+10,pickupPosition.z);
 const pedestal=new T.Mesh(new T.CylinderGeometry(13,16,5,20),new T.MeshStandardMaterial({color:'#455650',metalness:.5,roughness:.5}));pickup.add(pedestal);
 const barrel=new T.Mesh(new T.CylinderGeometry(4,5,22,16),new T.MeshStandardMaterial({color:'#394b48',metalness:.7,roughness:.35}));barrel.position.set(0,13,0);barrel.rotation.z=-.45;pickup.add(barrel);
 const badge=new T.Sprite(new T.SpriteMaterial({map:iconMap,transparent:true,depthWrite:false}));badge.position.y=43;badge.scale.set(27,27,1);pickup.add(badge);
 const pickupHalo=new T.Mesh(new T.TorusGeometry(17,.6,6,40),new T.MeshBasicMaterial({color:'#e3b873',transparent:true,opacity:.6}));pickupHalo.rotation.x=Math.PI/2;pickupHalo.position.y=3;pickup.add(pickupHalo);
 const equipped=barrel.clone();equipped.geometry=barrel.geometry;equipped.material=barrel.material;equipped.position.set(17,17,-3);equipped.rotation.z=-.35;player.add(equipped);equipped.visible=false;
 const pathArray=new Float32Array(TELEMETRY_POINTS*3),pathGeometry=new T.BufferGeometry();pathGeometry.setAttribute('position',new T.BufferAttribute(pathArray,3));
 const line=new T.Line(pathGeometry,new T.LineBasicMaterial({color:'#ffd99b',transparent:true,opacity:.85,depthWrite:false}));line.frustumCulled=false;root.add(line);
 const ribbonGeometry=new T.BufferGeometry(),ribbonArray=new Float32Array(TELEMETRY_POINTS*2*3),ribbonIndices=[];for(let i=0;i<TELEMETRY_POINTS-1;i++)ribbonIndices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);ribbonGeometry.setAttribute('position',new T.BufferAttribute(ribbonArray,3));ribbonGeometry.setIndex(ribbonIndices);const ribbon=new T.Mesh(ribbonGeometry,new T.MeshBasicMaterial({color:'#ffc56d',transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));ribbon.frustumCulled=false;root.add(ribbon);
 const beadArray=new Float32Array(18*3),beadGeometry=new T.BufferGeometry();beadGeometry.setAttribute('position',new T.BufferAttribute(beadArray,3));
 const beads=new T.Points(beadGeometry,new T.PointsMaterial({color:'#fff1c7',size:3,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false}));beads.frustumCulled=false;root.add(beads);
 const ringArray=new Float32Array(65*3),ringGeometry=new T.BufferGeometry();ringGeometry.setAttribute('position',new T.BufferAttribute(ringArray,3));
 const ring=new T.Line(ringGeometry,new T.LineBasicMaterial({color:'#ffb95f',transparent:true,opacity:.8,depthWrite:false}));ring.frustumCulled=false;root.add(ring);
 const targetDot=new T.Mesh(new T.SphereGeometry(2,12,8),new T.MeshBasicMaterial({color:'#fff2d0'}));root.add(targetDot);
 const flashMap=radialTexture();beads.material.map=flashMap;beads.material.size=4;beads.material.blending=T.AdditiveBlending;const fireMaps=[],smokeMaps=[];for(let i=0;i<4;i++){fireMaps.push(cloudTexture(i,false));smokeMaps.push(cloudTexture(i,true));}
 function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffe8');g.addColorStop(.18,'#ffe0a8b0');g.addColorStop(.5,'#e8661733');g.addColorStop(1,'#b72a0000');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
 function cloudTexture(variant,smoke){
   const c=document.createElement('canvas');c.width=c.height=192;const x=c.getContext('2d'),data=x.createImageData(192,192);
   const hash=(a,b)=>{const v=Math.sin(a*127.1+b*311.7+variant*83)*43758.5453;return v-Math.floor(v);};
   function noise(a,b){const i=Math.floor(a),j=Math.floor(b);let u=a-i,v=b-j;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
   for(let y=0;y<192;y++)for(let a=0;a<192;a++){const px=(a-96)/96,py=(y-96)/96,r=Math.hypot(px,py),n=noise(a/43,y/43)*.6+noise(a/17,y/17)*.28+noise(a/7,y/7)*.12,density=clamp((1-r)*1.7+(n-.5)*.9,0,1),i=(y*192+a)*4;
     if(smoke){const shade=36+56*n+20*(1-py);data.data[i]=shade*.95;data.data[i+1]=shade*.94;data.data[i+2]=shade;data.data[i+3]=Math.pow(density,1.45)*190;}
     else{const heat=clamp(density*.8+n*.4,0,1);data.data[i]=255;data.data[i+1]=45+heat*195;data.data[i+2]=8+Math.pow(heat,3)*190;data.data[i+3]=Math.pow(density,1.2)*230;}
   }
   x.putImageData(data,0,0);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
 }
 for(let i=0;i<MAX_SHELLS;i++){
   const body=new T.Mesh(new T.SphereGeometry(RADIUS,20,14),new T.MeshStandardMaterial({color:'#54483a',emissive:'#ff8e28',emissiveIntensity:.4,roughness:.36,metalness:.65}));body.visible=false;body.castShadow=true;root.add(body);
   const trail=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(12*3),3)),new T.LineBasicMaterial({color:'#e6b276',transparent:true,opacity:.45,depthWrite:false}));trail.visible=false;trail.frustumCulled=false;root.add(trail);shells.push({body,trail,active:false,elapsed:0,origin:new T.Vector3(),velocity:new T.Vector3()});
 }
 for(let i=0;i<MAX_BLASTS;i++){
   const g=new T.Group();root.add(g);g.visible=false;
   const flash=new T.Sprite(new T.SpriteMaterial({map:flashMap,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));flash.position.y=12;g.add(flash);
   const core=new T.Mesh(new T.SphereGeometry(1,24,16),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:0},opacity:{value:1}},vertexShader:'uniform float age; varying vec3 pLocal; void main(){vec3 p=position; p.x+=sin(p.y*7.+age*14.)*.12; p.z+=cos(p.y*9.-age*12.)*.13;p.y=p.y*1.15+sin(p.x*5.+p.z*4.+age*8.)*.12;pLocal=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform float age;uniform float opacity;varying vec3 pLocal;float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){vec3 p=pLocal*4.+vec3(age*1.4,-age*5.,0.);float v=n(p)*.6+n(p*2.1)*.3+n(p*4.2)*.1;float heat=smoothstep(.18,.85,v+(1.-abs(pLocal.y))*.22);vec3 c=mix(vec3(1.4,.055,.002),vec3(3.,1.15,.14),heat);gl_FragColor=vec4(c,opacity*(.7+.3*v));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));g.add(core);
   const fire=[],smoke=[],sparks=[];
   for(let j=0;j<10;j++){const s=new T.Sprite(new T.SpriteMaterial({map:fireMaps[j%4],transparent:true,depthWrite:false,blending:T.AdditiveBlending}));g.add(s);fire.push(s);}
   for(let j=0;j<12;j++){const s=new T.Sprite(new T.SpriteMaterial({map:smokeMaps[j%4],transparent:true,depthWrite:false,opacity:0}));g.add(s);smoke.push(s);}
   for(let j=0;j<22;j++){const s=new T.Mesh(new T.SphereGeometry(.45,5,4),new T.MeshBasicMaterial({color:'#ffcf7e',transparent:true}));g.add(s);sparks.push({mesh:s,velocity:new T.Vector3()});}
   const scorch=new T.Mesh(new T.CircleGeometry(13,28),new T.MeshBasicMaterial({color:'#0e0d09',transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));scorch.rotation.x=-Math.PI/2;root.add(scorch);
   // Keep lights allocated and visible to avoid shader recompilation on each detonation.
   const light=new T.PointLight('#ffbc64',0,145,2);scene.add(light);
   effects.push({g,flash,core,fire,smoke,sparks,scorch,light,active:false,age:0,position:new T.Vector3(),wet:false});
 }
 function sample(origin,velocity,t,out=new T.Vector3()){return out.copy(origin).addScaledVector(velocity,t).add(new T.Vector3(0,-.5*GRAVITY*t*t,0));}
 function sweep(a,b){let t=worldHit(a,b,RADIUS),body=null;for(const enemy of [...targets,...additionalTargets()]){if(!enemy.userData.alive)continue;const hit=physics.sphere(a,b,enemy.position,enemy.userData.radius+RADIUS);if(hit!==null&&(t===null||hit<t)){t=hit;body=enemy;}}return t===null?null:{t,body};}
 function prepare(aim){
   const origin=player.position.clone().add(new T.Vector3(0,28,0)),delta=aim.clone().sub(origin);delta.y=0;
   if(delta.lengthSq()<1)camera.getWorldDirection(delta);delta.y=0;delta.normalize();
   const range=clamp(Math.hypot(aim.x-origin.x,aim.z-origin.z),100,650),target=origin.clone().addScaledVector(delta,range);target.y=heightAt(target.x,target.z)+RADIUS;
   const duration=Math.sqrt(2*range/GRAVITY),velocity=target.clone().sub(origin).divideScalar(duration);velocity.y+=.5*GRAVITY*duration;
   let impact=target.clone(),flight=duration,hitBody=false;
   for(let i=1;i<=Math.ceil((duration+.5)/STEP);i++){const a=sample(origin,velocity,(i-1)*STEP),b=sample(origin,velocity,i*STEP),hit=sweep(a,b);
     if(hit){impact=a.lerp(b,hit.t);flight=((i-1)+hit.t)*STEP;hitBody=!!hit.body;break;}
   }
   // Physics stays swept at 120 Hz; rendering samples the solved curve uniformly.
   // This prevents visible faceting without changing collision or impact truth.
   const points=[];for(let i=0;i<TELEMETRY_POINTS;i++)points.push(sample(origin,velocity,flight*i/(TELEMETRY_POINTS-1)));
   points[points.length-1].copy(impact);
   prediction={origin,velocity,impact,flight,points,hitBody,blocked:flight<duration*.6,range:origin.distanceTo(impact)};return prediction;
 }
 function collect(){if(owned||player.position.distanceTo(pickup.position)>70||state.paused||state.dead)return false;owned=true;pickup.visible=false;try{if(persist())localStorage.setItem('CR3D-inventory-v1',JSON.stringify({mortar:true}));}catch(_){}sound.event('reward',pickup.position);return true;}
 function detonate(position,damage,cosmetic=false,sourceId=owner()){
   const e=effects.find(e=>!e.active)||effects.reduce((a,b)=>a.age>b.age?a:b);e.active=true;e.age=0;e.position.copy(position);e.g.position.copy(position);e.g.visible=true;e.light.position.copy(position).add(new T.Vector3(0,10,0));e.wet=position.y<heightAt(position.x,position.z)+9;
   for(const [j,s] of e.fire.entries()){const a=j*2.39996;s.userData={a,r:4+rnd()*7,lift:16+rnd()*24,rot:rnd()*6.28};s.material.rotation=s.userData.rot;}
   for(const [j,s] of e.smoke.entries()){const a=j*2.39996;s.userData={a,r:3+rnd()*7,lift:38+rnd()*32,size:20+rnd()*8,rot:rnd()*6.28};s.material.rotation=s.userData.rot;}
   for(const s of e.sparks){s.mesh.position.set(0,0,0);const a=rnd()*6.28,sp=25+rnd()*42;s.velocity.set(Math.cos(a)*sp,22+rnd()*72,Math.sin(a)*sp);s.mesh.visible=true;}
   e.scorch.position.set(position.x,heightAt(position.x,position.z)+.7,position.z);e.scorch.visible=e.wet;e.scorch.material.opacity=.45;
   const acoustic=position.clone().add(new T.Vector3(0,4,0));sound.event('explosion',acoustic);explosions++;lastImpact=position.clone();e.serial=explosions;if(cosmetic)return;
   for(const enemy of [...targets,...additionalTargets()]){if(!enemy.userData.alive)continue;const d=Math.max(0,enemy.position.distanceTo(position)-enemy.userData.radius);if(d>BLAST)continue;const from=position.clone().addScaledVector(enemy.position.clone().sub(position).normalize(),RADIUS+1);if(worldHit(from,enemy.position)!==null)continue;damageEnemy(enemy,Math.round(damage*(1-d/BLAST*.75)),sourceId);}
   const ownDistance=Math.max(0,player.position.distanceTo(position)-18);if(ownDistance<BLAST&&worldHit(acoustic,player.position)===null)damagePlayer(Math.round(25*(1-ownDistance/BLAST)),player.position.clone().sub(position).normalize(),sourceId);
 }
 function fire(aim,damage){if(!owned)return false;const s=shells.find(s=>!s.active);if(!s)return false;const p=prepare(telemetryInitialized?telemetryAim:aim);s.active=true;s.elapsed=0;s.origin.copy(p.origin);s.velocity.copy(p.velocity);s.damage=damage;s.ownerId=owner();s.body.position.copy(s.origin);s.body.visible=s.trail.visible=true;const data=s.trail.geometry.attributes.position;for(let j=0;j<12;j++)data.setXYZ(j,s.origin.x,s.origin.y,s.origin.z);data.needsUpdate=true;shots++;sound.event('mortar-shot',s.origin);return true;}
 function update(dt,visualOnly=false){
   for(const s of visualOnly?[]:shells){if(!s.active)continue;const a=sample(s.origin,s.velocity,s.elapsed);s.elapsed+=dt;const b=sample(s.origin,s.velocity,s.elapsed),hit=sweep(a,b);s.body.position.copy(hit?a.lerp(b,hit.t):b);s.body.rotation.x+=dt*4;
     if(hit||s.elapsed>4){detonate(s.body.position,s.damage,false,s.ownerId);s.active=false;s.body.visible=s.trail.visible=false;continue;}
     const data=s.trail.geometry.attributes.position;for(let j=0;j<12;j++){const p=sample(s.origin,s.velocity,Math.max(0,s.elapsed-j*.013));data.setXYZ(j,p.x,p.y,p.z);}data.needsUpdate=true;
   }
   for(const e of effects){if(!e.active)continue;e.age+=dt;const t=e.age;
     if(t>3.2){e.active=false;e.g.visible=false;e.light.intensity=0;e.scorch.visible=false;continue;}
     e.flash.scale.setScalar(38+Math.min(t,.08)*170);e.flash.material.opacity=Math.max(0,1-t/.13);e.light.intensity=1800*Math.exp(-t*14);
     e.core.visible=t<.8;e.core.position.y=18+t*24;e.core.scale.setScalar((14+Math.sin(Math.min(1,t/.65)*Math.PI)*6)*(1-Math.min(1,t/.9)*.3));e.core.material.uniforms.age.value=t;e.core.material.uniforms.opacity.value=Math.max(0,1-t/.8)*.92;
     for(const [j,s] of e.fire.entries()){const d=s.userData,k=clamp(t/.75,0,1);s.position.set(Math.cos(d.a)*d.r*k,9+d.lift*k,Math.sin(d.a)*d.r*k);s.scale.setScalar((18+Math.sin(k*Math.PI)*12)*(j%2?.8:1));s.material.opacity=Math.pow(1-k,1.2)*.28;s.material.color.setRGB(1,.65-k*.35,.35-k*.3);}
     for(const [j,s] of e.smoke.entries()){const d=s.userData,k=clamp((t-.07)/2.9,0,1);s.position.set(Math.cos(d.a)*d.r*(1+k*1.8)+t*3,d.lift*k+6,Math.sin(d.a)*d.r*(1+k*1.8));s.scale.setScalar(d.size*(.5+k*1.3));s.material.opacity=Math.min(1,t*6)*Math.pow(1-k,1.5)*(t<.4?.3:.65);s.material.rotation=d.rot+t*(j%2?.12:-.13);s.material.color.setRGB(1+Math.max(0,.3-t)*2,1+Math.max(0,.25-t),1);}
     for(const s of e.sparks){if(!s.mesh.visible)continue;s.mesh.position.addScaledVector(s.velocity,dt);s.velocity.y-=120*dt;s.mesh.material.opacity=Math.max(0,1-t/1.05);if(t>1.05||s.mesh.position.y+e.position.y<heightAt(s.mesh.position.x+e.position.x,s.mesh.position.z+e.position.z))s.mesh.visible=false;}
     e.scorch.material.opacity=.42*Math.max(0,1-t/3.2);
   }
 }
 function present(equippedNow,aim){
   pickup.visible=!owned;badge.position.y=43+Math.sin(state.time*2)*2;pickupHalo.rotation.z=state.time*.3;equipped.visible=equippedNow;
   const facing=camera.getWorldDirection(new T.Vector3()),heading=Math.atan2(-facing.x,-facing.z);equipped.rotation.y=heading;equipped.position.set(17*Math.cos(heading),17,-17*Math.sin(heading));
   const near=!owned&&player.position.distanceTo(pickup.position)<70;node.hidden=!near||state.paused;node.textContent='E · Recoger mortero · ranura 4';document.getElementById('interact-prompt').hidden=near;
   const show=equippedNow&&!state.paused&&!state.dead;line.visible=ribbon.visible=beads.visible=ring.visible=targetDot.visible=show;readout.hidden=!show;
   if(!show){telemetryInitialized=false;return;}
   const now=performance.now()/1000,realDt=lastTelemetryClock?clamp(now-lastTelemetryClock,0,1/20):1/60,simulationDt=clamp(state.time-lastTelemetryState,0,1/20),dt=Math.max(realDt,simulationDt);
   lastTelemetryClock=now;lastTelemetryState=state.time;
   if(!telemetryInitialized){telemetryAim.copy(aim);telemetryInitialized=true;}else telemetryAim.lerp(aim,1-Math.exp(-TELEMETRY_RESPONSE*dt));
   // Re-evaluate on every rendered frame. Prediction has no fixed refresh cadence.
   prepare(telemetryAim);telemetryFrames++;
   const p=prediction,count=TELEMETRY_POINTS;maxTelemetrySegment=0;
   for(let i=0;i<count;i++){const point=p.points[i];pathArray.set(point.toArray(),i*3);if(i){const j=(i-1)*3,dx=point.x-pathArray[j],dy=point.y-pathArray[j+1],dz=point.z-pathArray[j+2];maxTelemetrySegment=Math.max(maxTelemetrySegment,Math.hypot(dx,dy,dz));}}
   pathGeometry.setDrawRange(0,count);pathGeometry.attributes.position.needsUpdate=true;
   for(let i=0;i<count;i++){const point=new T.Vector3().fromArray(pathArray,i*3),next=new T.Vector3().fromArray(pathArray,(i<count-1?i+1:i-1)*3),tangent=i<count-1?next.sub(point):point.clone().sub(next),side=tangent.cross(camera.position.clone().sub(point)).normalize().multiplyScalar(.7);ribbonArray.set(point.clone().add(side).toArray(),i*6);ribbonArray.set(point.clone().sub(side).toArray(),i*6+3);}ribbonGeometry.setDrawRange(0,(count-1)*6);ribbonGeometry.attributes.position.needsUpdate=true;
   for(let i=0;i<18;i++){const t=((i/18+state.time*.25)%1)*p.flight,point=sample(p.origin,p.velocity,t);beadArray.set(point.toArray(),i*3);}beadGeometry.attributes.position.needsUpdate=true;
   for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,x=p.impact.x+Math.cos(a)*BLAST,z=p.impact.z+Math.sin(a)*BLAST;ringArray.set([x,heightAt(x,z)+1.5,z],i*3);}ringGeometry.attributes.position.needsUpdate=true;
   line.material.color.set(p.blocked?'#ff826c':'#ffd99b');ribbon.material.color.copy(line.material.color);targetDot.position.copy(p.impact);
   const text=(p.blocked?'COBERTURA · ':'CAÍDA · ')+Math.round(p.range/10)+' m · '+p.flight.toFixed(1)+' s · radio 4.2 m';if(text!==lastTelemetryText){readout.textContent=text;lastTelemetryText=text;}
 }
 function travel(){const keep=owned;reset(true);owned=keep;pickup.position.y=heightAt(pickupPosition.x,pickupPosition.z)+10;pickup.visible=!owned;}
 function reset(continueRun){owned=false;if(continueRun)try{owned=!!JSON.parse(localStorage.getItem('CR3D-inventory-v1')||'null')?.mortar;}catch(_){}else try{localStorage.removeItem('CR3D-inventory-v1');}catch(_){}
   prediction=null;telemetryInitialized=false;telemetryFrames=0;lastTelemetryClock=lastTelemetryState=0;lastTelemetryText='';maxTelemetrySegment=0;for(const s of shells){s.active=false;s.body.visible=s.trail.visible=false;}for(const e of effects){e.active=false;e.g.visible=e.scorch.visible=false;e.light.intensity=0;}pickup.position.y=heightAt(pickupPosition.x,pickupPosition.z)+10;pickup.visible=!owned;
 }
 let lastNetworkExplosion=0;
 return {networkSnapshot(){return {shells:shells.filter(s=>s.active).map(s=>s.body.position.toArray()),blasts:effects.filter(e=>e.active).map(e=>({serial:e.serial,position:e.position.toArray()}))};},importNetwork(data){for(let i=0;i<shells.length;i++){shells[i].body.visible=!!data.shells[i];shells[i].trail.visible=false;if(data.shells[i])shells[i].body.position.fromArray(data.shells[i]);}for(const b of [...data.blasts].sort((a,b)=>a.serial-b.serial))if(b.serial>lastNetworkExplosion){lastNetworkExplosion=b.serial;detonate(new T.Vector3(...b.position),0,true);}},setOwned(value){owned=!!value;},collect,fire,update,present,reset,travel,has(){return owned;},snapshot(){return {owned,shots,explosions,shells:shells.filter(s=>s.active).length,effects:effects.filter(e=>e.active).length,radius:BLAST,pickup:{...pickupPosition},lastImpact:lastImpact?.toArray(),telemetry:{standard:'render-cadence-exponential',points:TELEMETRY_POINTS,response:TELEMETRY_RESPONSE,frames:telemetryFrames,maxSegment:maxTelemetrySegment},prediction:prediction?{impact:prediction.impact.toArray(),flight:prediction.flight,blocked:prediction.blocked,range:prediction.range}:null};},test:{prepare(aim){return prepare(new T.Vector3(...aim)).impact.toArray();},sweep(a,b){return !!sweep(new T.Vector3(...a),new T.Vector3(...b));},detonate(position,damage){detonate(new T.Vector3(...position),damage);},shells(){return shells.filter(s=>s.active).map(s=>s.body.position.toArray());}}};
};
