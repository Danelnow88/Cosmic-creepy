/* Authored cosmetic interpretation of Growth: no external code/assets or gameplay hooks. */
window.CRGrowth=function({T,root,heightAt,hash,surfaces}){
 const shaders=[],forms=[],group=new T.Group();group.name='growth-aesthetic';root.add(group);
 function iridescent(material,strength=.18){
   const previous=material.onBeforeCompile;
   material.onBeforeCompile=shader=>{previous.call(material,shader);shader.uniforms.growthTime={value:0};
     shader.fragmentShader='uniform float growthTime;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
       float gFacing=abs(dot(normal,normalize(vViewPosition)));
       float gRim=pow(1.-clamp(gFacing,0.,1.),2.4);
       vec3 gOil=.5+.5*cos(vec3(0.,2.1,4.2)+(1.-gFacing)*7.5+vViewPosition.y*.006+sin(growthTime*.12)*.2);
       diffuseColor.rgb+=gOil*gRim*${strength.toFixed(3)};
       totalEmissiveRadiance+=gOil*gRim*${(strength*.3).toFixed(3)};
     `);shaders.push(shader);};
   material.customProgramCacheKey=()=>('growth-iridescent-'+strength);material.needsUpdate=true;
 }
 // Existing timber stays dark, with a restrained oil-film edge rather than full neon.
 for(const material of surfaces){material.metalness=.32;material.roughness=.5;iridescent(material,.16);}
 const branchMat=new T.MeshStandardMaterial({color:'#565e69',metalness:.72,roughness:.3});iridescent(branchMat,.52);
 const stems=new T.InstancedMesh(new T.CylinderGeometry(.88,1,1,7),branchMat,1800);stems.receiveShadow=true;group.add(stems);
 const buds=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshStandardMaterial({color:'#aaa9a0',emissive:'#292443',emissiveIntensity:.35,metalness:.65,roughness:.28}),160);group.add(buds);
 const object=new T.Object3D(),up=new T.Vector3(0,1,0);let stemCount=0,budCount=0;
 function branch(start,direction,length,radius,depth,seed){
   const points=[];const side=new T.Vector3(direction.z,.12,-direction.x).normalize();
   for(let j=0;j<=10;j++){const u=j/10;points.push(start.clone().addScaledVector(direction,length*u).addScaledVector(side,Math.sin(u*Math.PI)*length*.14));}
   for(let j=0;j<10;j++){const a=points[j],b=points[j+1],delta=b.clone().sub(a);object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(up,delta.clone().normalize());const r=radius*(1-j/10*.45);object.scale.set(r,delta.length()*1.045,r);object.updateMatrix();stems.setMatrixAt(stemCount++,object.matrix);}
   const tip=points[10];
   if(depth<2){for(let j=0;j<3;j++){const a=seed*1.93+j*2.094;branch(tip,new T.Vector3(Math.cos(a)*.66,.58+hash(seed,j)*.3,Math.sin(a)*.66).normalize(),length*.55,radius*.48,depth+1,seed*3+j+1);}}
   else {object.position.copy(tip);object.quaternion.identity();object.scale.setScalar(1.1+radius);object.updateMatrix();buds.setMatrixAt(budCount++,object.matrix);}
 }
 const anchors=[[-110,-630],[-435,-755],[180,-960],[-720,-1200],[620,-1550],[1400,-1200],[-1500,-800],[-1900,-1900],[950,-2550],[-680,460],[430,1100],[-2500,800]];
 for(let i=0;i<anchors.length;i++){const [x,z]=anchors[i],h=105+hash(i,431)*65;branch(new T.Vector3(x,heightAt(x,z),z),new T.Vector3(.12,.98,.08).normalize(),h,5.5,0,i+31);}
 stems.count=stemCount;buds.count=budCount;stems.computeBoundingSphere();buds.computeBoundingSphere();
 const glassMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform float time;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),2.8);vec3 c=mix(vec3(.22,.34,.44),vec3(.62,.4,.75),.5+.5*sin(time*.13+n.y*3.));gl_FragColor=vec4(c,.025+f*.42);}' });
 const coreMat=new T.MeshStandardMaterial({color:'#4c5067',metalness:.65,roughness:.24,emissive:'#18192a',emissiveIntensity:.35});iridescent(coreMat,.8);
 const coreHook=coreMat.onBeforeCompile;coreMat.onBeforeCompile=shader=>{coreHook(shader);shader.vertexShader='uniform float growthTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed *= 1. + .15*sin(position.x*.23+growthTime*.32)*sin(position.y*.21-growthTime*.19)*cos(position.z*.24);');};
 for(let i=0;i<6;i++){const [x,z]=anchors[i],radius=19+hash(i,441)*9;const orb=new T.Group();orb.position.set(x+32,heightAt(x,z)+100+hash(i,442)*45,z);group.add(orb);
   orb.add(new T.Mesh(new T.SphereGeometry(radius,24,18),glassMat));const core=new T.Mesh(new T.IcosahedronGeometry(radius*.58,3),coreMat);orb.add(core);forms.push({orb,core,y:orb.position.y,phase:i});}
 const count=1600,positions=new Float32Array(count*3),phases=new Float32Array(count);
 for(let i=0;i<count;i++){const x=(hash(i,461)-.5)*3000,z=(hash(i,462)-.5)*3300;positions.set([x,heightAt(x,z)+18+hash(i,463)*260,z],i*3);phases[i]=hash(i,464)*6.28;}
 const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3));dustGeometry.setAttribute('phase',new T.BufferAttribute(phases,1));
 const dustMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'uniform float time;attribute float phase;varying float fade;void main(){vec3 p=position;p.x+=sin(time*.1+phase)*8.;p.y+=sin(time*.18+phase)*7.;vec4 v=modelViewMatrix*vec4(p,1.);fade=(.2+.18*sin(phase+time*.25))*(1.-smoothstep(250.,1200.,-v.z));gl_PointSize=clamp(380./max(1.,-v.z),1.,3.);gl_Position=projectionMatrix*v;}',fragmentShader:'varying float fade;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.66,.75,.8,(1.-smoothstep(.08,.5,d))*fade);}' });
 const dust=new T.Points(dustGeometry,dustMat);group.add(dust);
 return {resonances(){return forms.map((f,i)=>({id:'growth-orb-'+i,position:{x:f.orb.position.x,y:f.orb.position.y,z:f.orb.position.z}}));},update(time){for(const s of shaders)s.uniforms.growthTime.value=time;glassMat.uniforms.time.value=dustMat.uniforms.time.value=time;for(const f of forms){f.orb.position.y=f.y+Math.sin(time*.33+f.phase)*4;f.core.rotation.set(time*.065+f.phase,time*.09,Math.sin(time*.1+f.phase)*.12);}},stats(){return {style:'growth-marsh',sculptures:anchors.length,stems:stemCount,orbs:forms.length,particles:count,cosmetic:true};}};
};
