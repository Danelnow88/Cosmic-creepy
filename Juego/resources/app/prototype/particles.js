/* CRParticles · lenguaje "chispa mágica / polvo estelar" · 0.17.1
   Singleton: UN Points de 2000 slots con BufferGeometry dinámica en la escena,
   aditivo, texturas glow/estrella procedurales. Sin EffectComposer ni render
   target propio: convive con el único pase de terror-visual.js.
   API: spawn('trail'|'hit'|'death'|'pickup'|'crate-land',pos,opts) ·
        emitter(key,pos|null,opts) · update(dt) · clear · dispose · snapshot
   LOD: >3 familias activas → conteos ×0.5. Tope global: 2000 vivas. */
(function(root){
'use strict';
const CAP=2000,TAU=Math.PI*2;
const PALETTES={gold:['#ffd97a','#ffb066'],violet:['#c07bff','#9a6bff'],cyan:['#7de8ff','#bafaff'],fire:['#ff5a2a','#ffb066'],white:['#ffffff','#eafcff']};
const FAMILIES=['trail','hit','debuff','death','pickup','crate'];
let T=null,scene=null,points=null,geometry=null,material=null,ready=false,clock=0;
let seed=0x9e3779b9;
function rnd(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;}
const slots=[];
for(let i=0;i<CAP;i++)slots.push({life:0,max:0,age:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,grav:0,damp:0,size:0,r:1,g:1,b:1,a0:1,tex:0,grow:0,delay:0,family:'hit',ai:-1});
const freeList=[],active=[],emitters=Object.create(null);
for(let i=CAP-1;i>=0;i--)freeList.push(i);
const familyLive={trail:0,hit:0,debuff:0,death:0,pickup:0,crate:0};
let live=0,spawned=0,dropped=0;
const posA=new Float32Array(CAP*3),colA=new Float32Array(CAP*3),sizeA=new Float32Array(CAP),alphaA=new Float32Array(CAP),texA=new Float32Array(CAP);
function colorOf(v){const c=new T.Color();if(v&&v.isColor)c.copy(v);else if(typeof v==='number'||typeof v==='string')c.set(v);return c;}
function pair(kind){return PALETTES[kind]||PALETTES.gold;}
function lod(){let n=0;for(let i=0;i<FAMILIES.length;i++)if(familyLive[FAMILIES[i]]>0)n++;return n>3?.5:1;}
function emit(family,x,y,z,vx,vy,vz,size,life,r,g,b,tex,grow,delay,damp,grav,a0){
  if(live>=CAP){dropped++;return false;}
  const i=freeList.pop();
  if(i===undefined){dropped++;return false;}
  const p=slots[i];
  p.life=life;p.max=life;p.age=0;p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;
  p.size=size;p.r=r;p.g=g;p.b=b;p.tex=tex;p.grow=grow;p.delay=delay;p.damp=damp;p.grav=grav;p.a0=a0;p.family=family;
  p.ai=active.push(i)-1;live++;spawned++;familyLive[family]++;
  return true;
}
function killAt(i){
  const p=slots[i],last=active[active.length-1];
  active[p.ai]=last;slots[last].ai=p.ai;active.pop();
  p.life=0;p.ai=-1;alphaA[i]=0;sizeA[i]=0;
  familyLive[p.family]=Math.max(0,familyLive[p.family]-1);
  live--;freeList.push(i);
}

function makeGlow(){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.25,'rgba(255,255,255,.9)');
  grad.addColorStop(.55,'rgba(255,255,255,.28)');grad.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grad;g.fillRect(0,0,64,64);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}
function makeStar(){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d');g.translate(64,64);
  const core=g.createRadialGradient(0,0,0,0,0,24);
  core.addColorStop(0,'rgba(255,255,255,1)');core.addColorStop(.4,'rgba(255,255,255,.55)');core.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=core;g.beginPath();g.arc(0,0,24,0,TAU);g.fill();
  function spike(len,w,rot){
    g.save();g.rotate(rot);
    for(const dir of[1,-1]){
      const gr=g.createLinearGradient(0,0,dir*len,0);
      gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.beginPath();g.moveTo(0,-w);g.lineTo(dir*len,0);g.lineTo(0,w);g.closePath();g.fill();
    }
    g.restore();
  }
  spike(58,6,0);spike(58,6,Math.PI/2);spike(30,4.5,Math.PI/4);spike(30,4.5,-Math.PI/4);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}
function init(deps){
  if(ready)return api;
  T=deps&&deps.T;scene=deps&&deps.scene;
  if(!T||!scene)return api;
  geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(posA,3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aColor',new T.BufferAttribute(colA,3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aSize',new T.BufferAttribute(sizeA,1).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aAlpha',new T.BufferAttribute(alphaA,1).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aTex',new T.BufferAttribute(texA,1).setUsage(T.DynamicDrawUsage));
  material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,
    uniforms:{uGlow:{value:makeGlow()},uStar:{value:makeStar()}},
    vertexShader:'attribute float aSize;attribute float aAlpha;attribute float aTex;attribute vec3 aColor;varying vec3 vColor;varying float vAlpha;varying float vTex;void main(){vColor=aColor;vAlpha=aAlpha;vTex=aTex;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(0.,aSize)*(420./max(1.,-mv.z));gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform sampler2D uGlow;uniform sampler2D uStar;varying vec3 vColor;varying float vAlpha;varying float vTex;void main(){vec4 tex=mix(texture2D(uGlow,gl_PointCoord),texture2D(uStar,gl_PointCoord),step(.5,vTex));float a=tex.a*vAlpha;if(a<.008)discard;gl_FragColor=vec4(vColor*tex.rgb,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  points=new T.Points(geometry,material);
  points.frustumCulled=false;points.name='cr-particles';
  scene.add(points);
  ready=true;
  return api;
}
function sparkDebuff(e){
  const pal=pair(e.kind),base=e.color!=null?colorOf(e.color):colorOf(pal[0]);
  const alt=e.color!=null?colorOf('#ffffff'):colorOf(pal[1]);
  const k=rnd()*.55,ang=rnd()*TAU,rad=2+rnd()*7,star=rnd()<.1;
  emit('debuff',
    e.x+Math.cos(ang)*rad,e.y+(rnd()-.3)*11,e.z+Math.sin(ang)*rad,
    (rnd()-.5)*12,14+rnd()*24,(rnd()-.5)*12,
    star?3.6:1.4+rnd()*1.3,.7+rnd()*.5,
    base.r+(alt.r-base.r)*k,base.g+(alt.g-base.g)*k,base.b+(alt.b-base.b)*k,
    star?1:0,0,0,.55,2,.95);
}
function update(dt){
  if(!ready)return;
  dt=Number.isFinite(dt)?Math.min(.05,Math.max(0,dt)):0;
  if(dt>0){
    clock+=dt;
    const factor=lod();
    for(const key in emitters){
      const e=emitters[key];
      e.accum+=e.rate*dt*factor;
      let n=Math.floor(e.accum);
      if(n>0){e.accum-=n;if(n>8)n=8;while(n-->0)sparkDebuff(e);}
    }
    for(let k=0;k<active.length;k++){
      const i=active[k],p=slots[i];
      p.age+=dt;
      if(p.delay>0)p.delay-=dt;
      else{
        p.vy+=p.grav*dt;
        if(p.damp>0){const f=Math.exp(-p.damp*dt);p.vx*=f;p.vy*=f;p.vz*=f;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        p.life-=dt;
      }
      if(p.life<=0){killAt(i);k--;continue;}
      const j=i*3;
      posA[j]=p.x;posA[j+1]=p.y;posA[j+2]=p.z;
      colA[j]=p.r;colA[j+1]=p.g;colA[j+2]=p.b;
      const frac=p.life/p.max;
      alphaA[i]=p.a0*Math.min(1,p.age*7)*Math.pow(frac,.75);
      sizeA[i]=p.grow?p.size*Math.sin(Math.PI*(1-frac)):p.size;
      texA[i]=p.tex;
    }
  }
  geometry.attributes.position.needsUpdate=true;
  geometry.attributes.aColor.needsUpdate=true;
  geometry.attributes.aSize.needsUpdate=true;
  geometry.attributes.aAlpha.needsUpdate=true;
  geometry.attributes.aTex.needsUpdate=true;
}
const TRAIL={
  thin:{n:1,sizeMin:1.5,sizeMax:2.7,lifeMin:.3,lifeMax:.55,amp:2.2,spin:0,swirl:2,star:.12},
  compact:{n:2,sizeMin:2.1,sizeMax:3.6,lifeMin:.4,lifeMax:.65,amp:3.5,spin:5,swirl:6,star:.08},
  loops:{n:2,sizeMin:2.6,sizeMax:4.6,lifeMin:.5,lifeMax:.8,amp:7,spin:15,swirl:14,star:.1},
  sinuous:{n:2,sizeMin:1.9,sizeMax:3.3,lifeMin:.6,lifeMax:.9,amp:8,spin:2.4,swirl:8,star:.12},
  crate:{n:2,sizeMin:2.4,sizeMax:4.2,lifeMin:.5,lifeMax:.8,amp:3.6,spin:4,swirl:5,star:.1}};
function spawnTrail(pos,opts){
  const cfg=TRAIL[opts.flavor]||TRAIL.thin,pal=pair(opts.kind||'white');
  const base=colorOf(opts.color||pal[0]),alt=colorOf(opts.color?'#ffffff':pal[1]);
  let dx=0,dy=-1,dz=0;
  const d=opts.dir;
  if(d&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isFinite(d.z)){
    const len=Math.hypot(d.x,d.y,d.z);
    if(len>1e-5){dx=d.x/len;dy=d.y/len;dz=d.z/len;}
  }
  let ux=-dz,uy=0,uz=dx;
  if(Math.hypot(ux,uz)<1e-4){ux=1;uy=0;uz=0;}
  const ul=Math.hypot(ux,uy,uz)||1;ux/=ul;uy/=ul;uz/=ul;
  const cx=dy*uz-dz*uy,cy=dz*ux-dx*uz,cz=dx*uy-dy*ux;
  const n=Math.max(1,Math.round(cfg.n*lod()));let stars=0;
  for(let i=0;i<n;i++){
    const theta=cfg.spin*clock+rnd()*TAU,r=cfg.amp*(.5+rnd()*.5);
    const co=Math.cos(theta)*r,si=Math.sin(theta)*r,s1=Math.sin(theta),c1=Math.cos(theta);
    const sx=(-ux*s1+cx*c1)*cfg.swirl,sy=(-uy*s1+cy*c1)*cfg.swirl,sz=(-uz*s1+cz*c1)*cfg.swirl;
    const k=rnd()*.45,st=rnd()<cfg.star;
    if(st)stars++;
    emit('trail',pos.x+ux*co+cx*si,pos.y+uy*co+cy*si,pos.z+uz*co+cz*si,
      sx+(rnd()-.5)*6,sy+(rnd()-.5)*6,sz+(rnd()-.5)*6,
      st?4.5+rnd()*5:cfg.sizeMin+rnd()*(cfg.sizeMax-cfg.sizeMin),
      st?.4:cfg.lifeMin+rnd()*(cfg.lifeMax-cfg.lifeMin),
      base.r+(alt.r-base.r)*k,base.g+(alt.g-base.g)*k,base.b+(alt.b-base.b)*k,
      st?1:0,0,0,1.4,-3,.9);
  }
  return n+stars;
}
function spawnHit(pos,opts){
  const pal=pair(opts.kind);
  const base=colorOf(opts.color!=null?opts.color:pal[0]);
  const alt=colorOf(opts.color!=null?'#ffffff':pal[1]);
  const count=Math.max(4,Math.round((opts.count!=null?opts.count:26)*lod()));
  const speed=opts.speed!=null?opts.speed:95,grav=opts.grav!=null?opts.grav:-70;
  let stars=0;
  for(let i=0;i<count;i++){
    const z=rnd()*2-1,ang=rnd()*TAU,rad=Math.sqrt(Math.max(0,1-z*z));
    const sp=speed*(.35+rnd()*.75),k=rnd()*.6,st=rnd()<.07;
    if(st)stars++;
    emit('hit',pos.x,pos.y,pos.z,
      Math.cos(ang)*rad*sp,z*sp*.6+16,Math.sin(ang)*rad*sp,
      st?4+rnd()*4:1.5+rnd()*2.1,.3+rnd()*.22,
      base.r+(alt.r-base.r)*k,base.g+(alt.g-base.g)*k,base.b+(alt.b-base.b)*k,
      st?1:0,0,0,3.1,grav,.95);
  }
  const extra=Math.max(0,Math.round((opts.stars!=null?opts.stars:(count>=20?2:1))*lod()));
  for(let i=0;i<extra;i++){
    emit('hit',pos.x+(rnd()-.5)*7,pos.y+(rnd()-.5)*7,pos.z+(rnd()-.5)*7,
      (rnd()-.5)*26,18+rnd()*40,(rnd()-.5)*26,
      6+rnd()*8,.35+rnd()*.22,1,1,1,1,0,0,3.4,-60,1);
    stars++;
  }
  return count+stars;
}
function spawnDeath(pos,opts){
  const team=colorOf(opts.color||'#ffffff'),hot=colorOf('#ffffff'),gold=colorOf(PALETTES.gold[0]);
  const radius=Math.max(6,opts.radius!=null?opts.radius:18);
  const count=Math.max(60,Math.round((opts.count!=null?opts.count:1000)*lod()));
  let stars=0;
  for(let i=0;i<count;i++){
    const z=rnd()*2-1,ang=rnd()*TAU,rad=Math.sqrt(Math.max(0,1-z*z));
    const dx=Math.cos(ang)*rad,dy=z,dz=Math.sin(ang)*rad;
    const rr=radius*(.55+rnd()*.5);
    const isGold=rnd()<.22;
    const c1=isGold?gold:team,c2=isGold?gold:hot;
    const k=isGold?rnd()*.5:rnd()*.35;
    const st=rnd()<.035;if(st)stars++;
    const sp=12+rnd()*rnd()*72;
    emit('death',pos.x+dx*rr,pos.y+dy*rr,pos.z+dz*rr,
      dx*sp,dy*sp+5,dz*sp,
      st?5+rnd()*6:1.3+rnd()*1.9,
      .95+rnd()*.55,
      c1.r+(c2.r-c1.r)*k,c1.g+(c2.g-c1.g)*k,c1.b+(c2.b-c1.b)*k,
      st?1:0,0,.22+rnd()*.3,1.6,-26,.9);
  }
  return count+stars;
}
function spawnPickup(pos,opts){
  const pal=pair(opts.kind||'gold');
  const base=colorOf(opts.color!=null?opts.color:pal[0]);
  const alt=colorOf(opts.color!=null?'#ffffff':pal[1]);
  const count=Math.max(8,Math.round((opts.count!=null?opts.count:50)*lod()));
  for(let i=0;i<count;i++){
    const k=rnd()*.5,st=rnd()<.07;
    emit('pickup',pos.x+(rnd()-.5)*8,pos.y+rnd()*4,pos.z+(rnd()-.5)*8,
      (rnd()-.5)*85,50+rnd()*100,(rnd()-.5)*85,
      st?4+rnd()*4:1.6+rnd()*1.9,.28+rnd()*.14,
      base.r+(alt.r-base.r)*k,base.g+(alt.g-base.g)*k,base.b+(alt.b-base.b)*k,
      st?1:0,0,0,2.2,-170,.95);
  }
  const stars=Math.max(0,Math.round((opts.stars!=null?opts.stars:3)*lod()));
  for(let i=0;i<stars;i++){
    emit('pickup',pos.x+(rnd()-.5)*10,pos.y+2+rnd()*6,pos.z+(rnd()-.5)*10,
      (rnd()-.5)*30,35+rnd()*55,(rnd()-.5)*30,
      9+rnd()*8,.3+rnd()*.2,
      Math.min(1,base.r+.2),Math.min(1,base.g+.2),Math.min(1,base.b+.2),
      1,1,0,2.6,-60,1);
  }
  return count+stars;
}
function spawnCrateLand(pos,opts){
  const base=colorOf(opts.color||'#ffd97a'),alt=colorOf('#ffffff');
  const radial=Math.max(6,Math.round(34*lod()));
  for(let i=0;i<radial;i++){
    const ang=rnd()*TAU,sp=55+rnd()*55,k=rnd()*.5;
    emit('crate',pos.x,pos.y+3,pos.z,
      Math.cos(ang)*sp,10+rnd()*34,Math.sin(ang)*sp,
      1.8+rnd()*2,.5+rnd()*.25,
      base.r+(alt.r-base.r)*k,base.g+(alt.g-base.g)*k,base.b+(alt.b-base.b)*k,
      0,0,0,2.6,-240,.95);
  }
  const ring=Math.max(4,Math.round(22*lod()));
  for(let i=0;i<ring;i++){
    const ang=i/ring*TAU+rnd()*.12,sp=95+rnd()*40;
    emit('crate',pos.x+Math.cos(ang)*2.5,pos.y+2,pos.z+Math.sin(ang)*2.5,
      Math.cos(ang)*sp,3+rnd()*7,Math.sin(ang)*sp,
      1.5+rnd()*1.4,.4+rnd()*.2,
      base.r+(alt.r-base.r)*.3,base.g+(alt.g-base.g)*.3,base.b+(alt.b-base.b)*.3,
      0,0,0,1.6,-60,.95);
  }
  const stars=Math.max(1,Math.round(2*lod()));
  for(let i=0;i<stars;i++){
    emit('crate',pos.x+(rnd()-.5)*8,pos.y+4+rnd()*5,pos.z+(rnd()-.5)*8,
      (rnd()-.5)*20,25+rnd()*35,(rnd()-.5)*20,
      8+rnd()*6,.35+rnd()*.2,1,1,1,1,1,0,2.6,-70,1);
  }
  return radial+ring+stars;
}
function spawn(type,pos,opts){
  if(!ready||!pos)return 0;
  opts=opts||{};
  if(type==='trail')return spawnTrail(pos,opts);
  if(type==='hit')return spawnHit(pos,opts);
  if(type==='death')return spawnDeath(pos,opts);
  if(type==='pickup')return spawnPickup(pos,opts);
  if(type==='crate-land')return spawnCrateLand(pos,opts);
  return 0;
}
function emitter(key,position,opts){
  if(!ready||!key)return;
  if(!position){delete emitters[key];return;}
  opts=opts||{};
  const e=emitters[key]||{accum:0,rate:120};
  e.x=position.x;e.y=position.y;e.z=position.z;
  e.kind=opts.kind||e.kind||'gold';
  if(opts.color!=null)e.color=opts.color;
  if(Number.isFinite(opts.rate))e.rate=Math.max(1,Math.min(600,opts.rate));
  emitters[key]=e;
}
function clear(){
  while(active.length)killAt(active[active.length-1]);
  for(const key in emitters)delete emitters[key];
  alphaA.fill(0);sizeA.fill(0);
  clock=0;
}
function dispose(){
  clear();
  if(points&&scene)scene.remove(points);
  if(geometry)geometry.dispose();
  if(material){
    if(material.uniforms.uGlow.value)material.uniforms.uGlow.value.dispose();
    if(material.uniforms.uStar.value)material.uniforms.uStar.value.dispose();
    material.dispose();
  }
  points=null;geometry=null;material=null;ready=false;
}
function snapshot(){
  return {ready,cap:CAP,active:live,draw:active.length,emitters:Object.keys(emitters).length,
    lod:lod(),byFamily:{trail:familyLive.trail,hit:familyLive.hit,debuff:familyLive.debuff,
      death:familyLive.death,pickup:familyLive.pickup,crate:familyLive.crate},
    spawned,dropped};
}
const api={init,spawn,emitter,update,clear,dispose,snapshot};
root.CRParticles=api;
})(typeof window!=='undefined'?window:globalThis);