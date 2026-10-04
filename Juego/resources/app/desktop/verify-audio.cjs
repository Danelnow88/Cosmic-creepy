'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({win,errors,root})=>{
 const out=path.join(root,'qa-audio');fs.mkdirSync(out,{recursive:true});
 const evaluate=code=>win.webContents.executeJavaScript(code,true),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const cases=[],measurements={},check=(name,value)=>{assert(value,name);cases.push(name);};
 const run=code=>evaluate('(()=>{'+code+'})()'),snapshot=()=>evaluate('CR3D.audio.snapshot()');
 await run('CR3D.reset();CR3D.test.manual(true);CR3D.audio.settings(.65,false);CR3D.test.step(.1);');
 await evaluate('CR3D.audio.start()');await wait(300);
 let a=await snapshot();
 check('Nine mix buses exist in the running production graph',['master','ambient','weather','biome','combat','weapons','enemies','boss','signals'].every(b=>a.buses.includes(b)));
 check('Environmental anchors create spatial sources',a.emitters>0&&a.panners>0);
 const anchored=await evaluate('CR3D.test.audioEnvironment()');
 check('Starting marsh has actual water and vegetation sound anchors',anchored.emitters.some(e=>e.kind==='water')&&anchored.emitters.some(e=>e.kind==='tree'||e.kind==='reeds'));
 for(const [name,config] of Object.entries({near:{distance:3},far:{distance:65},clear:{distance:35},blocked:{distance:35,occlusion:1},right:{distance:10},turned:{distance:10,yaw:Math.PI},stress:{kind:'stress'}})){
   measurements[name]=await evaluate('CRSound.renderProbe('+JSON.stringify(config)+')');
 }
 check('Rendered near source is substantially louder than far source',measurements.near.rms>measurements.far.rms*3);
 check('Rendered obstruction reduces actual RMS',measurements.blocked.rms<measurements.clear.rms*.55);
 check('Rendered obstruction removes high frequency energy',measurements.blocked.channels[1].brightness<measurements.clear.channels[1].brightness*.7);
 check('Right-hand source is measurably localized in stereo',measurements.right.channels[1].rms>measurements.right.channels[0].rms*1.12);
 check('Turning the listener reverses the perceived side',measurements.turned.channels[0].rms>measurements.turned.channels[1].rms*1.12);
 check('Production weapon/boss stress mix has signal and headroom',measurements.stress.rms>.001&&measurements.stress.peak<.95&&measurements.stress.voices<=32);
 for(const kind of ['growth-hover','growth-touch','growth-bloom'])measurements[kind]=await evaluate('CRSound.renderProbe('+JSON.stringify({kind,distance:6})+')');
 check('All granular gestures render real signal with headroom',['growth-hover','growth-touch','growth-bloom'].every(k=>measurements[k].rms>.0001&&measurements[k].peak<.35&&measurements[k].spatialEvents>0));
 check('Touch is spectrally brighter than slowed hover',measurements['growth-touch'].channels[1].brightness>measurements['growth-hover'].channels[1].brightness*1.2);
 check('Portal bloom retains its long acoustic tail',measurements['growth-bloom'].tailRms>measurements['growth-hover'].tailRms*2);
 measurements.growthBlocked=await evaluate('CRSound.renderProbe({kind:"growth-hover",distance:6,occlusion:1})');check('Granular gestures obey world obstruction',measurements.growthBlocked.rms<measurements['growth-hover'].rms*.6);
 measurements.growthDirector=await evaluate(`(async()=>{const e=CRSound({preferences:false,seed:712});await e.start();const p={x:0,y:0,z:0},details={health:100,enemies:[],environment:{resonances:[{id:'relic',position:{x:0,y:14,z:-150}}],emitters:[]}};e.update(0,p,0,'umbral',0,false,false,details);const entry=e.snapshot();e.update(.2,p,0,'umbral',0,false,false,details);e.update(.4,p,0,'umbral',0,false,false,details);const hold=e.snapshot();const touched=e.resonate(),touch=e.snapshot();e.update(.5,p,Math.PI,'umbral',0,false,false,details);const away=e.snapshot(),miss=e.resonate();details.enemies=Array.from({length:8},()=>({position:{x:0,y:0,z:-50},aiming:true}));for(let t=.6;t<2;t+=.1)e.update(t,p,Math.PI,'umbral',0,false,false,details);const danger=e.snapshot();e.settings(.65,true);const muted=e.snapshot();e.reset();const reset=e.snapshot();e.dispose();return {entry,hold,touched,touch,away,miss,danger,muted,reset};})()`);
 const g=measurements.growthDirector;
 check('Gaze triggers one hover gesture and never retriggers each frame',g.entry.growth.focus==='relic'&&g.entry.events['growth-hover']===1&&g.hold.events['growth-hover']===1);
 check('Resonating responds to focused relics and stops when looking away',g.touched&&g.touch.growth.touches===1&&!g.away.growth.focus&&!g.miss);
 check('Hostile proximity ducks the new granular layer',g.danger.growth.level<g.entry.growth.level*.55);
 check('Mute and restart retire granular voices and focus',g.muted.voices===0&&g.reset.growth.grains===0&&!g.reset.growth.focus);
 const demo=await evaluate('CRSound.renderProbe({kind:"growth-demo",distance:6,side:0,exportAudio:true})');fs.writeFileSync(path.join(out,'growth-gestures.wav'),Buffer.from(demo.wav,'base64'));delete demo.wav;measurements.growthDemo=demo;
 for(const name of ['I','II']){const mix=await evaluate('CRSound.renderProbe('+JSON.stringify({kind:'growth-world-'+name,exportAudio:true})+')');fs.writeFileSync(path.join(out,'umbral-'+name+'-soundscape.wav'),Buffer.from(mix.wav,'base64'));delete mix.wav;measurements['soundscape'+name]=mix;}
 check('Rendered Umbral II has a distinct sustained resonant mix',measurements.soundscapeII.rms>measurements.soundscapeI.rms*1.25&&measurements.soundscapeII.peak<.35);
 for(const kind of ['twig','dread','curiosity']){measurements[kind]=await evaluate('CRSound.renderProbe('+JSON.stringify({kind,distance:12})+')');check(kind+' renders a quiet spatial cue with headroom',measurements[kind].rms>.00001&&measurements[kind].peak<.25&&measurements[kind].spatialEvents>0);}
 measurements.director=await evaluate(`(async()=>{const e=CRSound({preferences:false,seed:711});await e.start();const p={x:0,y:0,z:0},details={health:100,enemies:[],environment:{emitters:[{kind:'tree',id:'tree-test',position:{x:130,y:20,z:-180}}],mystery:{position:{x:150,y:18,z:-190}}}};for(let t=0;t<100;t+=.1)e.update(t,p,0,'umbral',0,false,false,details);const calm=e.snapshot();e.event('shot',p);e.update(150,p,0,'umbral',0,false,false,details);const combat=e.snapshot();e.update(200,p,0,'umbral',0,false,true,details);const paused=e.snapshot();e.reset();const reset=e.snapshot();e.dispose();return {calm,combat,paused,reset};})()`);
 const d=measurements.director;
 check('Quiet exploration produces spaced unease and mystery cues',d.calm.atmosphere.uneaseCalls>0&&d.calm.atmosphere.wonderCalls>0&&d.calm.atmosphere.hush>=0&&d.calm.atmosphere.hush<=.55);
 check('Combat and pause suppress decorative suspense cues',d.combat.atmosphere.uneaseCalls===d.calm.atmosphere.uneaseCalls&&d.combat.atmosphere.wonderCalls===d.calm.atmosphere.wonderCalls&&d.paused.atmosphere.wonderCalls===d.combat.atmosphere.wonderCalls);
 check('Atmosphere reset clears pacing and transient voices',d.reset.atmosphere.uneaseCalls===0&&d.reset.atmosphere.wonderCalls===0&&d.reset.voices===0);
 await run('CR3D.teleport(-430,-1050);');const mystery=await evaluate('CR3D.test.audioEnvironment()');check('Hidden stone site has a real world acoustic position',mystery.mystery&&mystery.mystery.position.x===-430);await run('CR3D.reset();');
 measurements.cover=await run('const b=CR3D.test.cover(),y=(b.min.y+b.max.y)/2,z=(b.min.z+b.max.z)/2;return CR3D.test.acousticOcclusion({x:b.min.x-30,y,z},{x:b.max.x+30,y,z});');
 check('Real world cover occludes multiple acoustic rays',measurements.cover>=2/3);
 measurements.clearRay=await evaluate('CR3D.test.acousticOcclusion({x:0,y:600,z:0},{x:100,y:600,z:0})');
 check('An unobstructed elevated ray remains open',measurements.clearRay===0);
 await run('CR3D.setCamera(Math.PI/2,.4);CR3D.test.step(.1);');a=await snapshot();
 check('Listener follows rendered camera yaw and pitch',a.listener.forward.x<-.8&&a.listener.forward.y<-.1);
 await run('CR3D.reset();CR3D.teleport(2400,2000);for(let i=0;i<65;i++)CR3D.test.step(.1);');
 measurements.forge=await snapshot();
 check('Crossing regions crossfades the real ambient mix',measurements.forge.region===1&&measurements.forge.mixes[1]>.9&&measurements.forge.mixes[0]<.1);
 await run('CR3D.fire();CR3D.test.step(.01);');measurements.shot=await snapshot();
 check('Weapon fire ducks atmosphere',measurements.shot.duck<.8);
 await wait(350);await run('CR3D.test.step(.1);');check('Ducking releases after the transient',(await snapshot()).duck===1);
 await run('CR3D.reset();CR3D.test.nearMiss();');check('A real passing hostile projectile triggers a flyby',(await snapshot()).flybys>0);
 await run('CR3D.reset();for(let i=0;i<3;i++){const s=CR3D.test.sites()[i];CR3D.test.clearAround(s.x,s.z);CR3D.teleport(s.x,s.z);CR3D.interact();}const b=CR3D.test.boss();CR3D.teleport(b.position[0],b.position[2]+450);for(let i=0;i<10;i++)CR3D.test.step(.1);');
 await wait(900);measurements.boss=await snapshot();
 check('Live boss drives proximity tension and a localized persistent layer',measurements.boss.threat>.2&&measurements.boss.sources.some(s=>s.id==='boss'));
 await run('CR3D.audio.settings(.65,true);');await wait(800);check('Mute includes reverb and persistent sources',(await snapshot()).rms<.0001);
 await run('CR3D.audio.settings(.65,false);CR3D.setPaused(true);');await wait(800);check('Pause includes all returns and pressure layers',(await snapshot()).rms<.0001);
 await run('CR3D.setPaused(false);CR3D.test.step(.1);');await wait(300);check('Audio resumes after pause',(await snapshot()).rms>0);
 await run('CR3D.reset();for(let i=0;i<100;i++)CR3D.audio.event("boss",{x:0,y:40,z:-50});');a=await snapshot();
 check('Transient budget remains bounded under overload',a.voices<=32&&a.dropped+a.stolen>0);
 // In manual mode simulation time remains fixed, so no new scheduled calls are emitted.
 await wait(1900);check('Natural onended cleanup releases every transient',(await snapshot()).voices===0);
 for(let i=0;i<4;i++){await run('CR3D.reset();CR3D.fire();CR3D.test.step(.1);');await wait(120);}
 a=await snapshot();check('Repeated restart reuses a bounded spatial pool',a.panners<=44&&a.emitters<=12);
 check('Spatial occlusion updates run in the actual game',a.occlusionQueries>0&&a.spatialEvents>0);
 await run('CR3D.reset();CR3D.test.manual(false);');await wait(200);
 fs.writeFileSync(path.join(out,'05-audio-world.png'),(await win.webContents.capturePage()).toPNG());
 check('Audio integration creates no renderer errors',errors.length===0);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,cases,measurements,final:await snapshot(),errors},null,2));
 console.log('AUDIO QA PASS: '+cases.length+' checks; errors='+errors.length);
};
