// Oracle capturado ANTES de integrar: no se regenera desde el renderer nuevo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/pilot-approved-commands.json','utf8'));
const box={window:{NV:{}},Math:Object.create(Math)},NV=box.window.NV;
for(const file of ['js/core/state.js','js/data/gameData.js','js/data/pilotAnimationBaseline.js','js/render/pilotGeometry.js','js/render/pilotAppearance.js','js/render/player.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),box);
assert.deepEqual(JSON.parse(JSON.stringify(NV.pilotAppearance.shapes)),fixture.shapes);
assert.deepEqual(JSON.parse(JSON.stringify(NV.PILOT_ANIMATION_BASELINE.settings)),fixture.settings);
box.Math.random=()=>{throw Error('El dibujo de producción no debe consumir RNG de gameplay');};
let samples=0;
for(const [id,frames] of Object.entries(fixture.samples))for(const [f,expected] of Object.entries(frames)){
  const commands=[],stack=[],state={globalAlpha:1,shadowBlur:0},methods=new Map();
  const ctx=new Proxy(state,{get(target,key){if(key in target)return target[key];if(!methods.has(key))methods.set(key,(...args)=>{commands.push({op:key,args});if(key==='save')stack.push({...state});if(key==='restore'){const saved=stack.pop();for(const k of Object.keys(state))delete state[k];Object.assign(state,saved);}});return methods.get(key);},set(target,key,value){commands.push({set:key,value});target[key]=value;return true;}});
  const player={x:0,y:0,character:id,hp:100,maxHp:100,invuln:0,phase:0,bulwark:0,shield:0,overdrive:0},before=JSON.stringify(player);
  NV.drawPlayer(ctx,player,NV.CHARACTERS,Number(f));
  assert.equal(stack.length,0);assert.equal(JSON.stringify(player),before);
  const actual=JSON.parse(JSON.stringify(commands));
  assert.equal(actual.length,expected.length,id+' comandos '+f);
  for(let i=0;i<actual.length;i++){
    const a=actual[i],e=expected[i];assert.equal(a.op,e.op,id+' op '+i);assert.equal(a.set,e.set);
    if(a.args){assert.equal(a.args.length,e.args.length);a.args.forEach((v,j)=>typeof v==='number'?assert(Math.abs(v-e.args[j])<1e-9,id+' frame '+f+' comando '+i+' arg '+j+': '+v+' != '+e.args[j]):assert.equal(v,e.args[j]));}
    else if(typeof a.value==='number')assert(Math.abs(a.value-e.value)<1e-9);else assert.equal(a.value,e.value);
  }samples++;
}
console.log('PASS pilot_production_appearance: '+samples+' muestras exactas, RNG intacto, estado intacto');
