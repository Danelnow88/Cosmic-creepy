/* One spatial index for bodies, camera, weapons and acoustic queries. */
(function(root){
 'use strict';
 const axes=['x','y','z'],finite=p=>p&&axes.every(a=>Number.isFinite(p[a]));
 function create({physics,heightAt,half=3600,cellSize=180}){
  const boxes=[],cells=new Map();let queries=0,contacts=0;
  function rebuild(source){boxes.length=0;cells.clear();for(const b of source){if(!finite(b.min)||!finite(b.max)||axes.some(a=>b.min[a]>b.max[a]))throw Error('Invalid collision bounds');boxes.push(b);for(let x=Math.floor(b.min.x/cellSize);x<=Math.floor(b.max.x/cellSize);x++)for(let z=Math.floor(b.min.z/cellSize);z<=Math.floor(b.max.z/cellSize);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);}}}
  function nearby(a,b=a,pad=0){const found=new Set();if(!finite(a)||!finite(b))return found;queries++;for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+pad)/cellSize);x++)for(let z=Math.floor((Math.min(a.z,b.z)-pad)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+pad)/cellSize);z++)for(const box of cells.get(x+','+z)||[])found.add(box);return found;}
  function hit(a,b,radius=0){if(!finite(a)||!finite(b))throw Error('Non-finite collision segment');let first=physics.terrain(a,b,heightAt,radius);for(const bounds of nearby(a,b,radius)){const t=physics.sweptBox(a,b,bounds,radius);if(t!==null&&(first===null||t<first))first=t;}return first;}
  function penetration(p,r,b){const q={x:Math.max(b.min.x,Math.min(b.max.x,p.x)),y:Math.max(b.min.y,Math.min(b.max.y,p.y)),z:Math.max(b.min.z,Math.min(b.max.z,p.z))},n={x:p.x-q.x,y:p.y-q.y,z:p.z-q.z},d=Math.hypot(n.x,n.y,n.z);if(d>=r-1e-5)return null;if(d>1e-7)return {normal:{x:n.x/d,y:n.y/d,z:n.z/d},depth:r-d};let best=null;for(const a of axes)for(const sign of [-1,1]){const depth=sign<0?p[a]-b.min[a]+r:b.max[a]-p[a]+r;if(a==='y'&&sign<0&&p.y-depth<heightAt(p.x,p.z)+r)continue;if(!best||depth<best.depth){best={normal:{x:0,y:0,z:0},depth};best.normal[a]=sign;}}return best;}
  function resolve(p,r,velocity){
   if(!finite(p))throw Error('Non-finite body position');let supported=false;
   for(let pass=0;pass<8;pass++){let changed=false;for(const b of nearby(p,p,r)){const c=penetration(p,r,b);if(!c)continue;contacts++;changed=true;for(const a of axes)p[a]+=c.normal[a]*(c.depth+.002);if(c.normal.y>.55)supported=true;if(velocity){const into=axes.reduce((sum,a)=>sum+velocity[a]*c.normal[a],0);if(into<0)for(const a of axes)velocity[a]-=c.normal[a]*into;}}if(!changed)break;}
   const limit=half-r-5;for(const a of ['x','z'])if(Math.abs(p[a])>limit){p[a]=Math.sign(p[a])*limit;if(velocity)velocity[a]=0;}
   // Overlapping solid clusters can make sequential corrections oscillate.
   // Use a bounded nearest-free search only when ordinary contacts cannot converge.
   if(!clear(p,r-.001)){let found=null;for(let ring=1;ring<=20&&!found;ring++)for(let i=0;i<16;i++){const a=i*Math.PI/8,d=ring*r*.6,q={x:Math.max(-limit,Math.min(limit,p.x+Math.cos(a)*d)),y:p.y,z:Math.max(-limit,Math.min(limit,p.z+Math.sin(a)*d))};q.y=Math.max(q.y,heightAt(q.x,q.z)+r);if(clear(q,r)){found=q;break;}}if(!found){let top=p.y;for(const b of nearby(p,p,r))top=Math.max(top,b.max.y+r+.01);const q={x:p.x,y:top,z:p.z};if(clear(q,r))found=q;}if(found){Object.assign(p,found);if(velocity)for(const a of axes)velocity[a]=0;}}
   return supported;
  }
  // Subdivide by sphere radius, so a fast dash cannot skip even a thin wall.
  function move(p,delta,r,velocity,maxStep=0){const count=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y,delta.z)/Math.max(1,r*.45)));let supported=false;for(let i=0;i<count;i++){for(const a of axes)p[a]+=delta[a]/count;if(maxStep>0&&Math.hypot(delta.x,delta.z)>0&&(!velocity||velocity.y<=0)){const foot=p.y-r;const tops=[...nearby(p,p,r)].filter(b=>penetration(p,r,b)&&b.max.y>=foot&&b.max.y-foot<=maxStep).map(b=>b.max.y+r+.003).sort((a,b)=>a-b);for(const y of tops){const q={x:p.x,y,z:p.z};if(clear(q,r)&&![...nearby(p,q,r)].some(b=>b.min.y>p.y&&physics.box(p,q,b,r)!==null)){p.y=y;supported=true;if(velocity)velocity.y=0;break;}}}supported=resolve(p,r,velocity)||supported;const ground=heightAt(p.x,p.z)+r;if(p.y<ground){p.y=ground;if(velocity)velocity.y=Math.max(0,velocity.y);supported=true;}}return supported;}
  function clear(p,r=.01){return finite(p)&&[...nearby(p,p,r)].every(b=>!penetration(p,r,b));}
  function audit(){return {boxes:boxes.length,cells:cells.size,invalid:boxes.filter(b=>!finite(b.min)||!finite(b.max)).length,queries,contacts};}
  return {boxes,rebuild,nearby,hit,resolve,move,clear,audit,penetration};
 }
 const api={create,finite};if(typeof module==='object')module.exports=api;else root.CRCollisionWorld=api;
})(typeof window==='object'?window:globalThis);
