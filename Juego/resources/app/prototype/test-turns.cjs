'use strict';
const assert=require('node:assert/strict'),{create}=require('./turns.js');const order=[],t=create({onChange:(a,b)=>order.push(b.name)});t.start();function step(n){for(let i=0;i<n*120;i++)t.tick(1/120);}
for(let i=0;i<4;i++){t.end();step(8.0);}assert.deepEqual(order.slice(0,5),['Carlitos','Julián','Martín','Eduardo','Carlitos']);
t.status('actor-0-1','poison',10,2);step(2);assert(t.members[1].hp<97);t.status('actor-0-1','shield',10);const hp=t.members[1].hp;t.damage('actor-0-1',20);assert.equal(t.members[1].hp,hp-10);
t.start({mode:'objectives'});t.damage('actor-1-0',1000,'actor-0-0');t.damage('actor-1-1',1000,'actor-0-0');step(.1);assert.equal(t.phase,'active');assert.equal(t.snapshot().teams[0].score,4);
t.end();step(8.0);assert.equal(t.active().hp,100);assert.equal(t.phase,'active');assert.equal(t.damage(t.active().id,1000,'actor-0-0'),false);
t.start({mode:'objectives'});assert(t.capture('actor-0-0','relay-0'));assert(!t.capture('actor-0-0','relay-0'));assert(!t.capture('actor-1-0','relay-0'));assert.equal(t.snapshot().teams[0].score,5);
t.award('actor-0-0',15);step(5.2);assert.equal(t.phase,'complete');assert.equal(t.snapshot().winner,'team-0');
t.start({mode:'objectives',matchSeconds:60});step(66);assert.equal(t.phase,'complete');assert.equal(t.snapshot().winner,null);
t.start({turnSeconds:10});step(10.1);assert.equal(t.phase,'settling');step(8.0);assert.equal(t.active().name,'Julián');
// A high score and expired match clock cannot override survival victory.
t.start({matchSeconds:60});t.award('actor-0-0',100);step(66);assert.notEqual(t.phase,'complete');
t.start({teams:[{name:'Rival',members:['A','B']},{name:'Dulce de leche',members:[{name:'Julián',avatar:'👾',profileId:'julian'},'Eduardo']}]});
t.award('actor-0-0',99);for(const id of ['actor-0-0','actor-0-1','actor-1-1'])t.damage(id,1000);t.damage('actor-1-0',99);step(.1);assert.equal(t.phase,'settling');step(5.1);
assert.equal(t.snapshot().winner,'team-1');assert.equal(t.snapshot().result.reason,'last-team');assert.deepEqual(t.snapshot().result.survivors,[{id:'actor-1-0',profileId:'julian',name:'Julián',avatar:'👾',hp:1}]);
const frozen=t.snapshot();assert.equal(t.damage('actor-1-0',1),false);step(10);assert.deepEqual(t.snapshot(),frozen);
t.start();t.members.forEach(m=>t.damage(m.id,1000));step(5.2);assert.equal(t.snapshot().winner,null);assert.equal(t.snapshot().result.reason,'no-survivors');
t.start({teams:[{members:['A']},{members:['B']}]});t.status('actor-1-0','poison',2,10);t.damage('actor-1-0',99);step(5.2);assert.equal(t.snapshot().winner,'team-0');
t.start({teams:[{members:['A']},{members:['B']}]});t.damage('actor-1-0',1000);step(1);t.damage('actor-0-0',1000);step(4.3);assert.equal(t.snapshot().result.reason,'no-survivors');
t.start({teams:Array.from({length:4},(_,i)=>({name:'T'+i,members:['A'+i,'B'+i]}))});t.damage('actor-1-0',1000);t.damage('actor-1-1',1000);t.damage('actor-2-0',1000);t.end();step(8);assert.equal(t.active().id,'actor-2-1');assert.equal(t.members.find(m=>m.id==='actor-2-0').hp,0);
assert.throws(()=>t.start({teams:[{members:['A']}]}));t.stop();assert.equal(t.enabled,false);console.log('TURNS RULES PASS: survival/1HP winner, permanent elimination, skip dead, poison, mutual draw, immutable result, optional objectives, turn order');
