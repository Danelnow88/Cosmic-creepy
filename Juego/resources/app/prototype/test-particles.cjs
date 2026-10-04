/* Prueba lógica de CRParticles sin navegador (stub mínimo de THREE).
   Cubre: spawn/update/expiración, LOD >3 familias, tope 2000, emisores. */
'use strict';
const assert=require('node:assert');
function makeTHREE(){
  class Color{
    constructor(v){this.isColor=true;this.r=1;this.g=1;this.b=1;if(v!=null)this.set(v);}
    set(v){
      if(v&&v.isColor)return this.copy(v);
      if(typeof v==='number'){this.r=((v>>16)&255)/255;this.g=((v>>8)&255)/255;this.b=(v&255)/255;return this;}
      let s=String(v==null?'#ffffff':v).replace('#','');
      if(s.length===3)s=s.replace(/(.)/g,'$1$1');
      const n=parseInt(s,16);
      this.r=((n>>16)&255)/255;this.g=((n>>8)&255)/255;this.b=(n&255)/255;return this;
    }
    copy(c){this.r=c.r;this.g=c.g;this.b=c.b;return this;}
  }
  class BufferAttribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false;}setUsage(){return this;}}
  class BufferGeometry{constructor(){this.attributes={};}setAttribute(n,a){this.attributes[n]=a;return this;}dispose(){}}
  class ShaderMaterial{constructor(o){Object.assign(this,o);}dispose(){}}
  class Points{constructor(g,m){this.geometry=g;this.material=m;}}
  return {Color,BufferAttribute,BufferGeometry,ShaderMaterial,Points,
    AdditiveBlending:2,DynamicDrawUsage:35044,SRGBColorSpace:'srgb'};
}
require('./particles.js');
const fx=globalThis.CRParticles;
assert(fx&&typeof fx.spawn==='function','singleton CRParticles expuesto');
const THREE=makeTHREE();
const scene={added:[],add(o){this.added.push(o);},remove(o){this.added=this.added.filter(x=>x!==o);}};
assert.strictEqual(fx.init({T:THREE,scene}),fx,'init idempotente');
assert.strictEqual(scene.added.length,1,'un único Points agregado a la escena');
const pos={x:0,y:40,z:0};
function steps(n,dt){for(let i=0;i<n;i++)fx.update(dt);}

// 1 · hit: nace, vive ~0.4 s y expira solo.
let s=fx.spawn('hit',pos,{kind:'gold',count:26});
assert(s>=26,'hit emite el conteo pedido');
assert(fx.snapshot().active>=26,'partículas vivas registradas');
steps(100,.05); // 5 s
assert.strictEqual(fx.snapshot().active,0,'hit expira sin residuos');

// 2 · trail no infinito: emite por llamada y muere.
s=fx.spawn('trail',pos,{flavor:'loops',color:'#ffd97a',dir:{x:0,y:-1,z:0}});
assert(s>=1,'trail emite');
steps(60,.05);
assert.strictEqual(fx.snapshot().active,0,'trail expira');

// 3 · death conserva la forma durante el delay (0.22-0.52 s).
s=fx.spawn('death',pos,{color:'#70c9af',radius:18,count:200});
assert(s>=200,'death emite ~200 (LOD posible)');
fx.update(.1);
assert(fx.snapshot().byFamily.death>0,'death sigue viva tras 0.1 s (fase de forma)');
steps(120,.05);
assert.strictEqual(fx.snapshot().active,0,'death expira en <6 s');

// 4 · LOD: 4 familias activas → factor 0.5.
fx.spawn('trail',pos,{});
fx.spawn('hit',pos,{});
fx.spawn('pickup',pos,{});
fx.spawn('death',pos,{count:100});
assert.strictEqual(fx.snapshot().lod,.5,'LOD activo con >3 familias');
fx.clear();

// 5 · Tope global 2000.
for(let i=0;i<10;i++)fx.spawn('death',{x:i,y:40,z:0},{count:1000});
const snap=fx.snapshot();
assert(snap.active<=2000,'tope global respetado');
assert(snap.dropped>0,'excedente registrado como dropped');
fx.clear();

// 6 · Emisor continuo (debuff): ritmo ~rate/s y se detiene al retirarlo.
fx.emitter('deb-test',{x:5,y:40,z:5},{kind:'violet',rate:100});
steps(10,.05); // 0.5 s
const during=fx.snapshot().active;
assert(during>=25&&during<=80,'emisor ~50 partículas en 0.5 s (obtuvo '+during+')');
assert(fx.snapshot().emitters===1,'emisor registrado');
fx.emitter('deb-test',null);
assert(fx.snapshot().emitters===0,'emisor retirado');
steps(60,.05);
assert.strictEqual(fx.snapshot().active,0,'chispas del emisor expiran');

// 7 · crate-land y tipos desconocidos.
assert(fx.spawn('crate-land',pos,{})>0,'crate-land emite');
assert.strictEqual(fx.spawn('no-existe',pos,{}),0,'tipo desconocido no emite');
steps(60,.05);
assert.strictEqual(fx.snapshot().active,0,'crate-land expira');
fx.clear();
assert.strictEqual(fx.snapshot().active,0,'clear deja todo en cero');
console.log('PASS: 7 pruebas de CRParticles (spawn, expiración, LOD, tope 2000, emisores).');