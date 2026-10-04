/* Authored singularity. No light/bloom may lift the world's exposure. */
window.CRSingularity=function({T,root,portal,heightAt}){
 const radius=21,inner=24.5,outer=61,g=new T.Group();g.position.set(portal.x,heightAt(portal.x,portal.z)+56,portal.z);root.add(g);
 const core=new T.Mesh(new T.SphereGeometry(radius,48,32),new T.MeshBasicMaterial({color:0x000000}));g.add(core);
 const frame=new T.Group();frame.rotation.set(.16,.4,.06);g.add(frame);
 const normal=new T.Vector3(),axisU=new T.Vector3(),axisV=new T.Vector3();
 const uniforms={uTime:{value:0},uAmount:{value:0},uCenter:{value:g.position},uNormal:{value:normal},uAxisU:{value:axisU},uAxisV:{value:axisV},uInner:{value:inner},uOuter:{value:outer}};
 const material=new T.ShaderMaterial({uniforms,side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
 vertexShader:`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`precision highp float;uniform float uTime,uAmount,uInner,uOuter;uniform vec3 uCenter,uNormal,uAxisU,uAxisV;varying vec3 vWorld;
 float wave(float a,float r){return .5+.24*sin(a*9.+r*.18)+.16*sin(a*17.-r*.31)+.10*sin(a*29.+r*.47);}
 void main(){vec3 p=vWorld-uCenter;vec3 q=p-uNormal*dot(p,uNormal);float r=length(q),t=(r-uInner)/(uOuter-uInner);
 if(t<0.||t>1.)discard;vec3 radial=q/max(r,.001),tangent=normalize(cross(uNormal,radial)),view=normalize(cameraPosition-vWorld);
 float angle=atan(dot(q,uAxisV),dot(q,uAxisU)),orbit=uTime*.42*pow(uInner/max(r,uInner),1.5);
 float cloud=wave(angle-orbit,r),filament=.5+.5*sin(t*100.+cloud*3.-uTime*.2);
 float structure=.72+.20*cloud+.08*filament;
 float limb=dot(tangent,view);float doppler=clamp(1.+limb*.5,.45,1.5);
 float heat=pow(1.-t,1.35),edge=smoothstep(0.,.08,t)*(1.-smoothstep(.7,1.,t));
 vec3 warm=mix(vec3(.19,.075,.035),vec3(.72,.34,.12),heat);
 warm=mix(warm,vec3(.92,.70,.38),smoothstep(.55,1.,heat));
 float strength=min(1.15,(.24+1.15*heat)*structure*doppler*edge*(1.+uAmount*.18));
 gl_FragColor=vec4(warm*strength,min(.72,strength));}`});
 const disk=new T.Mesh(new T.RingGeometry(inner,outer,160,12),material);disk.rotation.x=-Math.PI/2;frame.add(disk);
 // Tiny particles follow continuous spirals; no bright straight streaks.
 const count=72,data=new Float32Array(count*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(data,3));
 const dust=new T.Points(geometry,new T.PointsMaterial({color:'#cba275',size:1.3,sizeAttenuation:true,transparent:true,opacity:.16,depthWrite:false,blending:T.AdditiveBlending}));dust.frustumCulled=false;frame.add(dust);
 function update(time,intensity=0){const amount=T.MathUtils.clamp(intensity,0,1);uniforms.uTime.value=time;uniforms.uAmount.value=amount;
 normal.set(0,1,0).applyEuler(frame.rotation).normalize();axisU.set(1,0,0).applyEuler(frame.rotation).normalize();axisV.set(0,0,1).applyEuler(frame.rotation).normalize();
 dust.material.opacity=.12+amount*.20;
 for(let i=0;i<count;i++){const f=(time*(.06+amount*.12)+i/count)%1,r=radius+4+(1-f)*(outer-radius+8),a=i*2.399+f*2.6;data.set([Math.cos(a)*r,Math.sin(i*1.7)*2*(1-f),Math.sin(a)*r],i*3);}geometry.attributes.position.needsUpdate=true;}
 update(0);return {position:g.position,normal,update,kind:'black-hole',radius,outerRadius:outer,visual:'dark-horizon-v3'};
};
window.CRTransit=function({T,scene,player}){
 const materialPairs=[];const proxy=new T.Group(),body=player.userData.rolling.clone(true);body.add(player.userData.face.clone(true));proxy.add(body);proxy.visible=false;scene.add(proxy);
 body.traverse(o=>{if(!o.isMesh)return;const convert=m=>{const clone=m.clone();clone.transparent=true;clone.depthWrite=m.depthWrite;materialPairs.push([m,clone]);return clone;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.castShadow=false;});
 const materials=[];body.traverse(o=>{if(o.isMesh)materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
 const start=new T.Vector3(),destination=new T.Vector3(),up=new T.Vector3(0,1,0),direction=new T.Vector3();
 let elapsed=0,active=false,committed=false,commit=null;
 function opacity(value){for(const [source,clone] of materialPairs)clone.opacity=source.opacity*value;}
 function cancel(){active=false;proxy.visible=false;proxy.scale.set(1,1,1);proxy.quaternion.identity();player.visible=true;opacity(1);commit=null;}
 function resetProxy(){cancel();committed=false;elapsed=0;}
 function begin(point,onCommit){if(active)return false;active=true;elapsed=0;committed=false;commit=onCommit;start.copy(player.position);destination.copy(point);direction.subVectors(destination,start);if(direction.lengthSq()<1e-6)direction.set(0,0,-1);else direction.normalize();
 for(const [source,clone] of materialPairs){if(source.color)clone.color.copy(source.color);if(source.emissive)clone.emissive.copy(source.emissive);}body.quaternion.copy(player.userData.rolling.quaternion);proxy.position.copy(start);proxy.quaternion.setFromUnitVectors(up,direction);proxy.scale.set(1,1,1);opacity(1);proxy.visible=true;player.visible=false;return true;}
 function tick(dt){if(!active)return;elapsed+=dt;const f=Math.min(1,elapsed/2.35),fall=f*f*(3-2*f),tide=T.MathUtils.smoothstep(f,.12,.78),collapse=T.MathUtils.smoothstep(f,.78,1);
 proxy.position.lerpVectors(start,destination,fall);const remaining=proxy.position.distanceTo(destination),long=Math.max(.005,Math.min(1+tide*3.2,remaining/18+1)*(1-collapse)),thin=Math.max(.005,(1-tide*.65)*(1-collapse));
 proxy.scale.set(thin,long,thin);opacity(1-T.MathUtils.smoothstep(f,.90,1));
 if(elapsed>=2.35&&!committed){committed=true;proxy.visible=false;const fn=commit;commit=null;fn();player.visible=true;}
 if(elapsed>=3.05)cancel();}
 return {begin,tick,cancel,resetProxy,get active(){return active;},snapshot(){return {active,elapsed,committed,duration:3.05,intensity:active&&!committed?Math.sin(Math.min(1,elapsed/2.35)*Math.PI*.7):0,proxyPosition:proxy.position.toArray(),proxyScale:proxy.scale.toArray(),horizon:destination.toArray(),fade:active?T.MathUtils.smoothstep(elapsed,2.12,2.34)*(1-T.MathUtils.smoothstep(elapsed,2.44,3.04)):0,preservesAppearance:true};}};
};
