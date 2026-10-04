const assert=require('node:assert/strict'),P=require('./physics.js'),C=require('./collision-world.js');
const c=C.create({physics:P,heightAt:()=>-100,half:3600});
const box={min:{x:0,y:-20,z:-20},max:{x:.1,y:20,z:20}};c.rebuild([box]);
for(const speed of [10,100,1000]){const p={x:-30,y:0,z:0},v={x:speed,y:0,z:0};c.move(p,{x:speed,y:0,z:0},4,v);assert(p.x<0);assert(c.clear(p,3.99));}
for(const p of [{x:0,y:0,z:0},{x:0,y:19,z:0},{x:0,y:-19,z:0},{x:.05,y:0,z:19}]){c.resolve(p,4);assert(c.clear(p,3.99));}
assert.throws(()=>c.rebuild([{min:{x:NaN,y:0,z:0},max:{x:1,y:1,z:1}}]));
c.rebuild([box]);assert.throws(()=>c.hit({x:NaN,y:0,z:0},{x:0,y:0,z:0}));
assert.equal(c.hit({x:-30,y:0,z:0},{x:30,y:0,z:0}),.5);
const cluster=[{min:{x:-20,y:-50,z:-20},max:{x:5,y:50,z:20}},{min:{x:-5,y:-50,z:-20},max:{x:20,y:50,z:20}}];c.rebuild(cluster);const trapped={x:0,y:0,z:0};c.resolve(trapped,4);assert(c.clear(trapped,3.99));
const ground=C.create({physics:P,heightAt:()=>0});ground.rebuild([{min:{x:-20,y:-10,z:-20},max:{x:20,y:80,z:20}}]);const embedded={x:0,y:4,z:0};ground.resolve(embedded,4);assert(embedded.y>=4&&ground.clear(embedded,3.99));
const stair=C.create({physics:P,heightAt:()=>0});stair.rebuild([{min:{x:0,y:0,z:-40},max:{x:50,y:8,z:40}}]);let walker={x:-22,y:18,z:0};stair.move(walker,{x:35,y:-.1,z:0},18,{x:50,y:0,z:0},14);assert(walker.x>0&&walker.y>=26&&stair.clear(walker,17.99));
stair.rebuild([{min:{x:0,y:0,z:-40},max:{x:50,y:45,z:40}}]);walker={x:-22,y:18,z:0};stair.move(walker,{x:35,y:-.1,z:0},18,{x:50,y:0,z:0},14);assert(walker.x<0);
stair.rebuild([{min:{x:0,y:0,z:-40},max:{x:50,y:8,z:40}},{min:{x:-40,y:38,z:-40},max:{x:60,y:45,z:40}}]);walker={x:-22,y:18,z:0};stair.move(walker,{x:35,y:-.1,z:0},18,{x:50,y:0,z:0},14);assert(walker.y<38&&stair.clear(walker,17.99));
console.log('15 collision-world regression checks passed');
