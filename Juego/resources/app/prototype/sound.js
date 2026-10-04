/* Procedural acoustics. 10 world units = 1 HUD metre. Independent cosmetic RNG. */
'use strict';
window.CRSound = function(options={}) {
  const UNIT=10, MAX_VOICES=32, MAX_EMITTERS=12, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const profiles={weapons:{ref:5,roll:.75,max:160,air:95,wet:.16},enemies:{ref:4,roll:1,max:100,air:55,wet:.14},boss:{ref:12,roll:.8,max:220,air:95,wet:.24},signals:{ref:5,roll:.8,max:110,air:75,wet:.2},biome:{ref:5,roll:.9,max:90,air:45,wet:.13},weather:{ref:28,roll:.65,max:250,air:120,wet:.2},combat:{ref:3,roll:1,max:80,air:50,wet:.12}};
  let ctx=null,master,meter,verb,verbReturn,noise,stereoNoise,growthBuffer,disposed=false;
  profiles.growth={ref:6,roll:.75,max:95,air:80,wet:.48};
  let growthFocus=null,lastGrowthFocus=null,nextGrain=0,nextHover=0,growthGrains=0,growthTouches=0,growthLevel=0;
  let seed=options.seed??3951,volume=.65,mute=false,paused=false,region=0,played=0,dropped=0,stolen=0,peakVoices=0;
  let lastTime=null,stepDistance=0,nextCall=1,nextRare=12,duckUntil=0,combatUntil=0,nextSpatial=0,lastFlyby=-1,probe=()=>0;
  let threat=0,duck=1,occlusionQueries=0,spatialEvents=0,flybys=0;
  let nextUnease=8,nextWonder=4,hush=0,uneaseCalls=0,wonderCalls=0;
  const buses={},sends={},active=new Set(),pool=[],emitters=[],beds=[],ownedSources=[],ownedNodes=[];
  const mixes=[1,0,0,0],samples=new Float32Array(2048),events={},listener={x:0,y:0,z:0,forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0}};
  let environment={emitters:[],weather:0,wet:false,shelter:0},sceneState={enemies:[],health:100};
  function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  function own(node){ownedNodes.push(node);return node;}
  function gain(value=1){const n=own(ctx.createGain());n.gain.value=value;return n;}
  function smooth(param,value,seconds=.08){param.setTargetAtTime(value,ctx.currentTime,seconds);}
  function distance(a,b=listener){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
  if(options.preferences!==false)try{const s=JSON.parse(localStorage.getItem('CR3D-audio')||'null');if(s){volume=Number.isFinite(s.volume)?clamp(s.volume):volume;mute=!!s.mute;}}catch(_){}

  function buildGraph(){
    master=gain(0);buses.master=master;
    for(const name of ['ambient','weather','biome','combat','weapons','enemies','boss','signals','growth'])buses[name]=gain(1);
    for(const name of ['ambient','combat','signals'])buses[name].connect(master);
    for(const name of ['weather','biome'])buses[name].connect(buses.ambient);
    buses.growth.connect(buses.ambient);
    for(const name of ['weapons','enemies','boss'])buses[name].connect(buses.combat);
    const high=own(ctx.createBiquadFilter());high.type='highpass';high.frequency.value=28;high.Q.value=.5;
    const compressor=own(ctx.createDynamicsCompressor());compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.2;
    const limiter=own(ctx.createWaveShaper()),curve=new Float32Array(4097);
    for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.88*Math.tanh(x/.88);}
    limiter.curve=curve;limiter.oversample='2x';meter=own(ctx.createAnalyser());meter.fftSize=2048;
    master.connect(high);high.connect(compressor);compressor.connect(limiter);limiter.connect(meter);meter.connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);stereoNoise=ctx.createBuffer(2,ctx.sampleRate*5,ctx.sampleRate);
    for(const buffer of [noise,stereoNoise])for(let ch=0;ch<buffer.numberOfChannels;ch++){const d=buffer.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1;}
    // Original voiced source: formant-weighted harmonics with slow vowel/detune drift.
    // No source recording from the reference is embedded or fetched by the game.
    const rate=22050,length=rate*7;growthBuffer=ctx.createBuffer(1,length,rate);const voiced=growthBuffer.getChannelData(0),notes=[146.8324,174.6141,220],weights=notes.map(()=>new Float32Array(18)),roll=Array.from({length:18},(_,h)=>1/Math.pow(h+1,.65));let voicedPeak=0;
    for(let i=0;i<length;i++){const t=i/rate,f1=530+110*Math.sin(t*.73),f2=1350+240*Math.sin(t*.41+1);let value=0;
      for(let n=0;n<3;n++){if(i%220===0)for(let h=1;h<=18;h++){const hz=notes[n]*h;weights[n][h-1]=(.06+Math.exp(-Math.pow((hz-f1)/230,2))*.7+Math.exp(-Math.pow((hz-f2)/380,2))*.43+Math.exp(-Math.pow((hz-2500)/540,2))*.17)*roll[h-1];}
        const f=notes[n]*(1+.0013*Math.sin(t*.9+n)),a=2*Math.PI*f*t+n*.73,sa=Math.sin(a),ca=Math.cos(a);let sh=sa,ch=ca;for(let h=0;h<18;h++){value+=sh*weights[n][h];const next=sh*ca+ch*sa;ch=ch*ca-sh*sa;sh=next;}}
      const edge=Math.min(1,t/.15,(7-t)/.15);voiced[i]=value*edge;voicedPeak=Math.max(voicedPeak,Math.abs(voiced[i]));}
    for(let i=0;i<length;i++)voiced[i]*=.78/Math.max(voicedPeak,.001);
    const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*2.1),ctx.sampleRate);
    for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<d.length;i++){const t=i/ctx.sampleRate;d[i]=t<.045?0:(rnd()*2-1)*Math.exp(-t*3.8)*.12;}for(const t of [.047,.083,.131])d[Math.floor((t+c*.004)*ctx.sampleRate)]+=.18;}
    verb=own(ctx.createConvolver());verb.buffer=impulse;verbReturn=gain(.32);verb.connect(verbReturn);verbReturn.connect(master);
    // Wet and direct ambient paths share ducking. Master mute is after all returns.
    for(const name of Object.keys(profiles)){sends[name]=gain(1);sends[name].connect(verb);}
    if(options.beds!==false){
      for(let i=0;i<4;i++)bed([480,220,1250,105][i],[.65,.9,1.8,.7][i],i===0?.095:0);
      bed(4200,6,.013);bed(2300,.6,.025,'weather');bed(320,.7,.009,'weather');
      bed(52,.5,.008,'biome',true);bed(78,.5,.004,'biome',true);bed(43,.5,0,'boss',true);bed(83,.8,0,'enemies',true);
      bed(1900,.5,0,'growth',false,.3,-.4);bed(2900,.5,0,'growth',false,.6,.4);
    }
  }
  function bed(frequency,q,level,bus='biome',tone=false,grainRate=0,pan=0){
    const source=own(tone?ctx.createOscillator():ctx.createBufferSource()),filter=own(ctx.createBiquadFilter()),amp=gain(level);
    if(tone){source.frequency.value=frequency;source.type='sine';}else{source.buffer=grainRate?growthBuffer:stereoNoise;source.loop=true;source.playbackRate.value=grainRate||(.7+rnd()*.5);}
    filter.type=tone||grainRate?'lowpass':'bandpass';filter.frequency.value=tone?400:frequency;filter.Q.value=q;
    source.connect(filter);filter.connect(amp);if(grainRate){const width=own(ctx.createStereoPanner());width.pan.value=pan;amp.connect(width);width.connect(buses[bus]);}else amp.connect(buses[bus]);source.start();ownedSources.push(source);beds.push({source,filter,amp});
  }
  function start(){
    if(disposed)return Promise.resolve(false);
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!options.context&&!AC)return Promise.resolve(false);ctx=options.context||new AC({latencyHint:'interactive'});buildGraph();}
    smooth(master.gain,paused||mute?0:volume,.025);
    return options.offline?Promise.resolve(true):ctx.resume().then(()=>true).catch(()=>false);
  }
  function spatial(position,category='enemies',override){
    const p=profiles[category]||profiles.combat,metres=distance(position)/UNIT;
    const blocked=override===undefined?(metres>2&&metres<p.max?(occlusionQueries++,clamp(probe(listener,position))):0):clamp(override);
    const ratio=clamp((metres-p.max*.7)/(p.max*.3)),horizon=1-ratio*ratio*(3-2*ratio),attenuation=p.ref/(p.ref+p.roll*(Math.max(metres,p.ref)-p.ref));
    const air=16000/(1+Math.pow(metres/p.air,1.7)*3);
    return {distance:metres,occlusion:blocked,cutoff:Math.max(260,air*Math.pow(.055,blocked)),gain:horizon*(1-.78*blocked),audibility:attenuation*horizon*(1-.78*blocked)};
  }
  function strip(category){
    let s=pool.pop();
    if(!s){const input=own(ctx.createGain()),filter=own(ctx.createBiquadFilter()),level=gain(),panner=own(ctx.createPanner()),send=gain();filter.type='lowpass';filter.Q.value=.5;
      input.connect(filter);filter.connect(level);level.connect(panner);panner.connect(send);panner.panningModel='HRTF';panner.distanceModel='inverse';s={input,filter,level,panner,send};}
    connectStrip(s,category);return s;
  }
  function connectStrip(s,category){const p=profiles[category];s.category=category;s.panner.refDistance=p.ref;s.panner.rolloffFactor=p.roll;s.panner.maxDistance=p.max;s.panner.connect(buses[category]);s.send.connect(sends[category]);s.send.gain.value=p.wet;}
  function disconnectStrip(s){s.panner.disconnect(buses[s.category]);s.send.disconnect();}
  function positionStrip(s,position,override,immediate=false){
    const d=spatial(position,s.category,override);s.metrics=d;
    for(const axis of ['x','y','z']){const p=s.panner['position'+axis.toUpperCase()];if(immediate)p.value=position[axis]/UNIT;else smooth(p,position[axis]/UNIT,.025);}
    if(immediate){s.filter.frequency.value=d.cutoff;s.level.gain.value=d.gain;}else{smooth(s.filter.frequency,d.cutoff,.12);smooth(s.level.gain,d.gain,.07);}
  }
  function retire(v,stop=false){
    if(v.released)return;v.released=true;active.delete(v);for(const n of v.nodes)n.disconnect();if(v.strip){disconnectStrip(v.strip);pool.push(v.strip);}
    if(stop)try{v.source.stop();}catch(_){}
  }
  function voice({frequency=220,end=100,duration=.3,level=.1,type='sine',noisy=false,grain=false,rate=.6,offset=0,position=null,category='combat',cutoff=5000,delay=0,priority=2,attack=.006,occlusion,velocity=null}){
    if(!ctx||(!options.offline&&ctx.state!=='running')||paused||mute||disposed)return false;
    if(position&&distance(position)>profiles[category].max*UNIT)return false;
    if(active.size>=MAX_VOICES){let victim=null;for(const v of active)if(v.priority<priority&&(!victim||v.priority<victim.priority))victim=v;
      if(!victim){dropped++;return false;}retire(victim,true);stolen++;}
    const source=noisy||grain?ctx.createBufferSource():ctx.createOscillator(),filter=ctx.createBiquadFilter(),amp=ctx.createGain(),at=ctx.currentTime+delay;
    if(grain){source.buffer=growthBuffer;source.playbackRate.value=rate;}else if(noisy){source.buffer=noise;source.playbackRate.value=.83+rnd()*.34;}else{source.type=type;source.frequency.setValueAtTime(Math.max(24,frequency),at);source.frequency.exponentialRampToValueAtTime(Math.max(24,end),at+duration);}
    filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.6;
    if(grain){const envelope=new Float32Array(128),rise=clamp(attack/duration,.03,.8);for(let i=0;i<128;i++){const u=i/127;envelope[i]=level*Math.pow(Math.sin(Math.PI/2*(u<rise?u/rise:(1-u)/(1-rise))),2);}amp.gain.setValueCurveAtTime(envelope,at,duration);}
    else {amp.gain.setValueAtTime(0,at);amp.gain.linearRampToValueAtTime(level,at+Math.min(attack,duration*.3));amp.gain.exponentialRampToValueAtTime(.00001,at+duration);}
    source.connect(filter);filter.connect(amp);const v={source,nodes:[source,filter,amp],priority,position:position?{x:position.x,y:position.y,z:position.z}:null,velocity,at,occlusion,released:false};
    if(position){v.strip=strip(category);positionStrip(v.strip,v.position,occlusion,true);amp.connect(v.strip.input);spatialEvents++;}else amp.connect(buses[category]);
    source.onended=()=>retire(v);active.add(v);peakVoices=Math.max(peakVoices,active.size);played++;
    if(grain){source.start(at,clamp(offset,0,Math.max(0,growthBuffer.duration-duration*rate-.02)));growthGrains++;}else if(noisy)source.start(at,rnd()*1.2);else source.start(at);source.stop(at+duration+.015);return true;
  }
  function event(kind,position,variant=0,extra={}){
    if(!ctx||mute||paused||disposed)return;
    const variation=.94+rnd()*.12,base={position,priority:2,...extra},play=v=>voice({...base,...v,delay:(extra.delay||0)+(v.delay||0)});
    events[kind]=(events[kind]||0)+1;
    if(kind.startsWith('growth-')){
      const settings={'growth-hover':[.95,.22,.6,.1],'growth-touch':[.38,.055,1.2,.13],'growth-bloom':[3.3,.8,.3,.11],'growth-air':[1.65,.4,.45,.034]}[kind];if(!settings)return;
      const [duration,attack,rate,level]=settings;play({grain:true,category:'growth',duration,attack,rate:rate*variation,offset:rnd()*4,level,cutoff:kind==='growth-touch'?6200:3200,priority:kind==='growth-air'?0:1});if(kind==='growth-touch')growthTouches++;
    }else if(kind==='shot'){
      variant=clamp(variant,0,2);play({category:'weapons',frequency:[420,640,170][variant]*variation,end:[78,115,38][variant],duration:[.2,.125,.4][variant],level:[.24,.18,.32][variant],type:'triangle',priority:4});
      play({category:'weapons',noisy:true,duration:[.045,.035,.09][variant],level:[.19,.16,.26][variant],cutoff:[6400,7600,4300][variant],attack:.001,priority:4});
      play({category:'weapons',noisy:true,duration:[.4,.24,.7][variant],level:[.042,.032,.085][variant],cutoff:950,delay:.035,priority:3});duckUntil=ctx.currentTime+.22;combatUntil=ctx.currentTime+3;
    }else if(kind==='mortar-shot'){
      play({category:'weapons',frequency:150,end:42,duration:.38,level:.3,type:'triangle',priority:4});play({category:'weapons',noisy:true,duration:.18,level:.19,cutoff:2100,priority:4});duckUntil=ctx.currentTime+.28;combatUntil=ctx.currentTime+3;
    }else if(kind==='explosion'){
      play({category:'weapons',noisy:true,duration:.095,level:.3,cutoff:5700,attack:.001,priority:4});play({category:'weapons',frequency:105,end:30,duration:.65,level:.34,type:'triangle',priority:4});play({category:'weapons',noisy:true,duration:.9,level:.13,cutoff:900,delay:.04,priority:3});duckUntil=ctx.currentTime+.3;combatUntil=ctx.currentTime+3;
    }else if(kind==='twig'){
      play({category:'biome',noisy:true,duration:.07,level:.07,cutoff:2400,priority:0});
      play({category:'biome',frequency:180,end:61,duration:.42,level:.028,type:'triangle',delay:.06,priority:0});
    }else if(kind==='dread'){
      play({category:'biome',frequency:89*variation,end:47,duration:2.8,level:.038,attack:.55,priority:0});
      play({category:'biome',noisy:true,duration:1.8,level:.025,cutoff:480,attack:.35,delay:.3,priority:0});
    }else if(kind==='curiosity'){
      for(let i=0;i<2;i++)play({grain:true,category:'growth',duration:1.3,level:.06,rate:.55+i*.07,offset:rnd()*4,attack:.25,delay:i*.28,priority:0});
    }else if(kind==='enemy-shot'){
      play({category:'enemies',frequency:230*variation,end:65,duration:.28,level:.22,type:'triangle',priority:4});play({category:'enemies',noisy:true,duration:.08,level:.13,cutoff:4200,priority:3});combatUntil=ctx.currentTime+2;
    }else if(['step','splash','land'].includes(kind)){
      const wet=kind==='splash';play({noisy:true,duration:wet?.3:.12,level:kind==='land'?.12:wet?.075:.042,cutoff:wet?1600:variant===1?2900:700,priority:1});if(wet)play({frequency:190*variation,end:55,duration:.2,level:.036,delay:.025,priority:1});
    }else if(kind==='dash'){play({noisy:true,duration:.28,level:.17,cutoff:3100,priority:3});play({frequency:110,end:340,duration:.22,level:.11,priority:3});}
    else if(kind==='jump')play({frequency:150,end:300,duration:.2,level:.075});
    else if(kind==='hit'||kind==='impact'){
      play({noisy:true,duration:.11,level:.15,cutoff:variant===1?850:variant===2?5400:2600});play({frequency:variant===2?640:110,end:variant===2?290:42,duration:variant===2?.32:.16,level:.08,type:variant===2?'sine':'triangle'});
    }else if(kind==='hurt'){
      play({position:null,frequency:78,end:34,duration:.35,level:.22,priority:4});play({position:null,noisy:true,duration:.13,level:.09,cutoff:700,priority:4});combatUntil=ctx.currentTime+4;
    }else if(kind==='warning')play({category:'enemies',frequency:225*variation,end:155,duration:.42,level:.14,type:'triangle',priority:4});
    else if(kind==='boss'){
      play({category:'boss',frequency:58,end:30,duration:1.5,level:.22,type:'triangle',priority:4});play({category:'boss',noisy:true,duration:1.3,level:.15,cutoff:780,priority:3});combatUntil=ctx.currentTime+4;
    }else if(kind==='relay'||kind==='reward'){for(let i=0;i<3;i++)play({category:'signals',frequency:[220,277,330][i],end:[220,277,330][i],duration:.45,level:.085,delay:i*.12,priority:3});}
    else if(kind==='reload'){play({category:'weapons',noisy:true,duration:.055,level:.075,cutoff:4100});play({category:'weapons',frequency:350,end:170,duration:.08,level:.055,delay:.22});}
    else if(kind==='flyby'){
      if(lastFlyby>ctx.currentTime-.075)return;lastFlyby=ctx.currentTime;flybys++;
      play({category:'enemies',noisy:true,duration:.23,level:.22,cutoff:7600,attack:.025,velocity:extra.velocity,priority:4});play({category:'enemies',frequency:960,end:360,duration:.18,level:.045,velocity:extra.velocity,priority:4});
    }
  }
  function setListener(position,forward=listener.forward,up=listener.up){
    Object.assign(listener,{x:position.x,y:position.y,z:position.z,forward:{x:forward.x,y:forward.y,z:forward.z},up:{x:up.x,y:up.y,z:up.z}});
    if(!ctx)return;const l=ctx.listener;for(const axis of ['x','y','z']){const c=axis.toUpperCase();l['position'+c].value=position[axis]/UNIT;l['forward'+c].value=forward[axis];l['up'+c].value=up[axis];}
  }
  function emitterSlot(){
    const e=emitters.find(v=>!v.id);if(e)return e;if(emitters.length>=MAX_EMITTERS)return null;
    const source=own(ctx.createBufferSource()),tone=own(ctx.createOscillator()),filter=own(ctx.createBiquadFilter()),amp=gain(0),toneAmp=gain(0),s=strip('biome');
    source.buffer=noise;source.loop=true;source.playbackRate.value=.8+rnd()*.4;filter.type='bandpass';filter.Q.value=.8;
    source.connect(filter);filter.connect(amp);amp.connect(s.input);tone.connect(toneAmp);toneAmp.connect(s.input);source.start();tone.start();ownedSources.push(source,tone);
    const item={source,tone,filter,amp,toneAmp,strip:s,id:null,last:0};emitters.push(item);return item;
  }
  function syncEmitters(time,descriptors){
    const selected=descriptors.filter(d=>d.position&&distance(d.position)<profiles[d.category||'biome'].max*UNIT).sort((a,b)=>(b.priority||0)-(a.priority||0)||distance(a.position)-distance(b.position)).slice(0,MAX_EMITTERS),ids=new Set(selected.map(e=>e.id));
    for(const e of emitters)if(e.id&&!ids.has(e.id)){smooth(e.amp.gain,0,.09);smooth(e.toneAmp.gain,0,.09);if(ctx.currentTime-e.last>.7)e.id=null;}
    for(const d of selected){let e=emitters.find(e=>e.id===d.id);if(!e)e=emitterSlot();if(!e)continue;
      const fresh=e.id!==d.id,category=d.category||'biome';if(e.strip.category!==category){disconnectStrip(e.strip);connectStrip(e.strip,category);}
      e.id=d.id;e.last=ctx.currentTime;e.descriptor=d;positionStrip(e.strip,d.position,undefined,fresh);
      const pulse=d.kind==='signal'?.12+.88*Math.pow(Math.max(0,Math.sin(time*2.8)),8):.65+.35*Math.sin(time*(d.kind==='enemy'?2.6:d.kind==='boss'?(d.phase===2?4.2:2.1):.7)+(d.phase||0));
      const texture={water:[690,.055,140,.007],reeds:[2900,.025,200,0],tree:[450,.018,92,.005],ruin:[170,.026,68,.012],crystal:[2300,.012,420,.016],thermal:[310,.037,54,.014],fauna:[3200,.007,1400,.003],enemy:[380,.023,105+(d.role||0)*65,.026],boss:[190,.04,36,.032],signal:[1200,.003,330,.018],'roll-water':[950,.1,73,.012],'roll-earth':[480,.05,64,.007],'roll-gravel':[2300,.058,89,.008]}[d.kind]||[650,.02,90,.004];
      const intensity=d.intensity??1;smooth(e.filter.frequency,texture[0],.3);smooth(e.tone.frequency,texture[2]*(1+.015*Math.sin(time*.8)),.15);smooth(e.amp.gain,texture[1]*pulse*intensity,.18);smooth(e.toneAmp.gain,texture[3]*pulse*intensity,.18);
    }
  }
  function ambientCall(){
    const anchors=environment.emitters||[],anchor=anchors.length?anchors[Math.floor(rnd()*anchors.length)]:null;if(!anchor)return;
    const base={category:'biome',position:anchor.position,priority:0};
    if(region===0){const f=170+rnd()*170;for(let i=0;i<3;i++)voice({...base,frequency:f,end:f*.68,duration:.19,level:.09,delay:i*.21,type:'triangle',cutoff:1200});voice({...base,frequency:1600,end:2200,duration:.12,level:.022,delay:.13});}
    if(region===1){voice({...base,noisy:true,duration:1,level:.08,cutoff:520});voice({...base,frequency:135,end:64,duration:.7,level:.06});}
    if(region===2)for(let i=0;i<3;i++)voice({...base,frequency:410+i*163,end:270+i*97,duration:1.1,level:.037,delay:i*.17});
    if(region===3){voice({...base,frequency:67,end:38,duration:1.7,level:.07,type:'triangle'});voice({...base,noisy:true,duration:1.3,level:.033,cutoff:950});}
  }
  function update(time,position,yaw,regionId,speed,wet,isPaused,details={}){
    const wasPaused=paused;paused=!!isPaused;region=Math.max(0,['umbral','forge','rift','heart'].indexOf(regionId));
    if(lastTime===null){nextCall=time+1;nextRare=time+18;nextUnease=time+8+rnd()*7;nextWonder=time+4;}
    const dt=lastTime===null?0:clamp(time-lastTime,0,.12);lastTime=time;if(details.environment)environment=details.environment;if(details.enemies)sceneState=details;
    setListener({x:position.x,y:position.y+14,z:position.z},details.forward||{x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)},details.up||{x:0,y:1,z:0});
    if(!ctx)return;if(paused&&!wasPaused)for(const v of [...active])retire(v,true);smooth(master.gain,paused||mute?0:volume,.025);if(paused||mute)return;
    const now=ctx.currentTime,near=(sceneState.enemies||[]).reduce((sum,e)=>sum+Math.max(0,1-distance(e.position)/600)*(e.aiming?.6:.22),0),boss=sceneState.boss;
    const pressure=boss?clamp(1-distance(boss.position)/1500)*(boss.phase===2?.55:.38):0;
    const danger=clamp(near+pressure+clamp((35-(sceneState.health??100))/35)*.5+(region===3?.12:0)+(now<combatUntil?.13:0));
    threat+=(danger-threat)*(1-Math.exp(-dt*(danger>threat?3:.5)));duck=now<duckUntil?.62:1;
    const secondWorld=details.dimension===1;
    growthLevel=(secondWorld?.95:.45)*(1-threat*.75);smooth(buses.growth.gain,growthLevel,.18);
    if(beds[11]){smooth(beds[11].amp.gain,secondWorld?.28:0,.65);smooth(beds[12].amp.gain,secondWorld?.17:0,.65);}
    const resonances=environment.resonances||[];growthFocus=null;let best=.945;
    for(const a of resonances){const dx=a.position.x-listener.x,dy=a.position.y-listener.y,dz=a.position.z-listener.z,d=Math.hypot(dx,dy,dz);if(d<30||d>500)continue;const alignment=(dx*listener.forward.x+dy*listener.forward.y+dz*listener.forward.z)/d;if(alignment>best){growthFocus=a;best=alignment;}}
    if(growthFocus&&growthFocus.id!==lastGrowthFocus&&time>=nextHover&&threat<.55&&spatial(growthFocus.position,'growth').occlusion<.5){event('growth-hover',growthFocus.position);lastGrowthFocus=growthFocus.id;nextHover=time+.8;}
    if(!growthFocus)lastGrowthFocus=null;
    if(time>=nextGrain){nextGrain=time+(secondWorld?1.6+rnd()*2:4+rnd()*5);if(threat<.4&&now>combatUntil){const anchor=resonances.length?resonances[Math.floor(rnd()*resonances.length)]:environment.emitters?.find(a=>['ruin','crystal','water'].includes(a.kind));if(anchor)event('growth-air',anchor.position);}}
    // Slow breathing spaces affect wildlife, never actionable combat cues.
    const hushTarget=Math.pow(Math.max(0,Math.sin(time*.055+region*.9)),6)*.55;
    hush+=(hushTarget-hush)*(1-Math.exp(-dt*.6));
    smooth(buses.ambient.gain,duck*(1-.2*threat),now<duckUntil?.009:.22);smooth(buses.combat.gain,1+threat*.07,.15);for(const name of ['biome','weather'])smooth(sends[name].gain,duck*(1-.2*threat),.08);
    smooth(verbReturn.gain,.22+clamp(environment.shelter||0)*.22+(region===2?.07:0),.8);
    const weights=environment.weights||[0,1,2,3].map(i=>i===region?1:0);
    for(let i=0;i<4;i++){mixes[i]+=(weights[i]-mixes[i])*(1-Math.exp(-dt/1.4));if(beds[i])smooth(beds[i].amp.gain,mixes[i]*[.105,.085,.062,.09][i]*(1-hush)*(secondWorld?.38:1),.4);}
    if(beds.length){smooth(beds[4].amp.gain,.024*mixes[0]*(.65+.35*Math.sin(time*7)),.07);smooth(beds[5].amp.gain,(environment.weather||0)*.06*(1-mixes[1]*.85),.8);smooth(beds[6].amp.gain,.017*(.7+.3*Math.sin(time*.31)),.4);
      for(let i=0;i<2;i++){smooth(beds[7+i].source.frequency,[52,64,73,36][region]*(i?1.501:1),1.2);smooth(beds[7+i].amp.gain,(region===3?.011:.006)*(i?.6:1),1);}
      smooth(beds[9].amp.gain,threat*.025*(.7+.3*Math.sin(time*(2+pressure*4))),.12);smooth(beds[10].amp.gain,threat*.009,.4);}
    stepDistance+=speed*dt;if(speed>20&&stepDistance>55){stepDistance%=55;event(wet?'splash':'step',position,region===1?1:0);}if(speed<1)stepDistance=0;
    if(now>=nextSpatial){nextSpatial=now+.1;
      const descriptors=[{id:'body-roll',kind:wet?'roll-water':region===1?'roll-gravel':'roll-earth',position,category:'combat',priority:4,intensity:clamp(speed/225)},...(environment.emitters||[]),...(sceneState.enemies||[]).map(e=>({...e,id:'enemy-'+e.id,kind:'enemy',category:'enemies',priority:3,intensity:e.aiming?1.4:1}))];
      if(boss)descriptors.push({...boss,id:'boss',kind:'boss',category:'boss',priority:5});if(sceneState.objective)descriptors.push({...sceneState.objective,id:'goal',kind:'signal',category:'signals',priority:2});syncEmitters(time,descriptors);
      for(const v of active)if(v.strip&&!v.velocity)positionStrip(v.strip,v.position,v.occlusion);
    }
    // Moving sources follow every render frame; expensive obstruction probes stay at 10 Hz.
    for(const e of emitters)if(e.id)positionStrip(e.strip,e.descriptor.position,e.strip.metrics.occlusion);
    for(const v of active)if(v.strip&&v.velocity){const elapsed=Math.max(0,now-v.at);positionStrip(v.strip,{x:v.position.x+v.velocity.x*elapsed,y:v.position.y+v.velocity.y*elapsed,z:v.position.z+v.velocity.z*elapsed},0);}
    if(time>nextCall){nextCall=time+4+rnd()*7+threat*4+hush*8;if(hush<.35)ambientCall();}
    if(time>nextUnease){nextUnease=time+14+rnd()*19;
      const anchors=(environment.emitters||[]).filter(a=>['tree','ruin','reeds','thermal'].includes(a.kind)&&distance(a.position)>80);
      if(threat<.45&&now>combatUntil&&anchors.length){const a=anchors[Math.floor(rnd()*anchors.length)];event(a.kind==='tree'||a.kind==='reeds'?'twig':'dread',a.position);uneaseCalls++;}}
    if(time>nextWonder){nextWonder=time+9+rnd()*8;const a=environment.mystery;
      if(a&&threat<.35&&now>combatUntil){event('curiosity',a.position);wonderCalls++;}}
    if(time>nextRare){nextRare=time+24+rnd()*29;const a=environment.emitters?.[0];if(a)voice({category:'weather',position:{x:a.position.x+300,y:a.position.y+900,z:a.position.z-650},noisy:true,duration:2.5,level:.14,cutoff:180,priority:0});}
  }
  function reset(){
    for(const v of [...active])retire(v,true);stepDistance=0;lastTime=null;nextCall=0;nextRare=12;duckUntil=combatUntil=0;threat=0;nextSpatial=0;lastFlyby=-1;sceneState={enemies:[],health:100};
    mixes.splice(0,4,1,0,0,0);nextUnease=8;nextWonder=4;hush=0;uneaseCalls=wonderCalls=0;growthFocus=lastGrowthFocus=null;nextGrain=nextHover=0;growthGrains=growthTouches=growthLevel=0;
    for(const b of beds.slice(11)){b.amp.gain.cancelScheduledValues(ctx.currentTime);b.amp.gain.value=0;}
    for(const e of emitters){e.id=null;for(const amp of [e.amp,e.toneAmp]){amp.gain.cancelScheduledValues(ctx.currentTime);amp.gain.value=0;}}
  }
  function settings(v,m){if(Number.isFinite(v))volume=clamp(v);mute=!!m;if(options.preferences!==false)try{localStorage.setItem('CR3D-audio',JSON.stringify({volume,mute}));}catch(_){}if(ctx){if(mute)for(const a of [...active])retire(a,true);smooth(master.gain,mute||paused?0:volume,.02);}}
  function snapshot(){
    let peak=0,sum=0;if(meter){meter.getFloatTimeDomainData(samples);for(const s of samples){peak=Math.max(peak,Math.abs(s));sum+=s*s;}}
    return {started:!!ctx,running:ctx?.state==='running',voices:active.size,voiceLimit:MAX_VOICES,peakVoices,played,dropped,stolen,volume,mute,region,paused,peak,rms:Math.sqrt(sum/samples.length),buses:Object.keys(buses),mixes:[...mixes],threat,duck,atmosphere:{hush,uneaseCalls,wonderCalls,nextUnease,nextWonder},
      growth:{source:'original-voiced-granular',grains:growthGrains,touches:growthTouches,focus:growthFocus?.id||null,level:growthLevel,pad:!!beds[11]&&beds[11].amp.gain.value>.001,soundscape:beds[11]?.amp.gain.value>.001?'resonant-growth':'natural-marsh'},emitters:emitters.filter(e=>e.id).length,emitterLimit:MAX_EMITTERS,panners:pool.length+emitters.length+[...active].filter(v=>v.strip).length,spatialEvents,flybys,occlusionQueries,events:{...events},listener:JSON.parse(JSON.stringify(listener)),
      sources:emitters.filter(e=>e.id).map(e=>({id:e.id,kind:e.descriptor.kind,position:{x:e.descriptor.position.x,y:e.descriptor.position.y,z:e.descriptor.position.z},category:e.strip.category,...e.strip.metrics})),latency:ctx?.baseLatency||0};
  }
  function dispose(){if(disposed)return;reset();disposed=true;for(const s of ownedSources)try{s.stop();}catch(_){}for(const n of ownedNodes)n.disconnect();if(ctx&&!options.offline)ctx.close();}
  return {start,event,update,reset,settings,snapshot,setListener,focus(){return growthFocus;},resonate(){if(!growthFocus||paused||!ctx)return false;event('growth-touch',growthFocus.position);return true;},setProbe(fn){probe=fn;},extension(name='ambient'){return ctx&&buses[name]?{context:ctx,destination:buses[name]}:null;},inspect:spatial,dispose,renderVoice:options.offline?voice:undefined,preview:()=>window.CRSound.renderProbe({kind:'stress'})};
};

// Offline QA renders the production graph, buffers, panners, filters and events.
window.CRSound.renderProbe=async function({distance=40,side=1,yaw=0,occlusion=0,kind='probe',exportAudio=false}={}){
  const worldMix=kind.startsWith('growth-world-'),seconds=kind==='growth-demo'?8:4,ctx=new OfflineAudioContext(2,48000*seconds,48000),engine=window.CRSound({context:ctx,offline:true,beds:worldMix,preferences:false,seed:901});
  await engine.start();engine.settings(.85,false);engine.setProbe(()=>occlusion);engine.setListener({x:0,y:0,z:0},{x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)});
  const p={x:distance*10*side,y:0,z:side===0?-distance*10:0};
  if(worldMix)engine.update(0,{x:0,y:0,z:0},0,'umbral',0,false,false,{dimension:kind==='growth-world-II'?1:0,health:100,enemies:[],environment:{emitters:[],resonances:[],weather:.5,weights:[1,0,0,0]}});
  else if(kind==='probe')engine.renderVoice({noisy:true,duration:1.4,level:.3,position:p,category:'enemies',cutoff:14000});
  else if(kind==='stress')for(let i=0;i<24;i++)engine.event(i%4===0?'boss':i%4===1?'enemy-shot':'shot',{x:(i%5-2)*30,y:0,z:-40},i%3,{delay:i*.07});
  else if(kind==='growth-demo'){engine.event('growth-hover',p);engine.event('growth-touch',p,0,{delay:1.6});engine.event('growth-bloom',p,0,{delay:2.7});}
  else engine.event(kind,p,kind==='shot'?2:0);
  const buffer=await ctx.startRendering(),channels=[];let peak=0;
  for(let ch=0;ch<2;ch++){const d=buffer.getChannelData(ch);let sum=0,diff=0;for(let i=0;i<d.length;i++){sum+=d[i]*d[i];if(i)diff+=(d[i]-d[i-1])**2;peak=Math.max(peak,Math.abs(d[i]));}channels.push({rms:Math.sqrt(sum/d.length),brightness:Math.sqrt(diff/Math.max(sum,1e-12))});}
  let tail=0;for(let c=0;c<2;c++){const data=buffer.getChannelData(c);for(let i=data.length-48000;i<data.length;i++)tail+=data[i]*data[i];}
  const stats=engine.snapshot();engine.dispose();const result={peak,channels,rms:Math.sqrt((channels[0].rms**2+channels[1].rms**2)/2),tailRms:Math.sqrt(tail/96000),voices:stats.peakVoices,spatialEvents:stats.spatialEvents};
  if(exportAudio){const bytes=new Uint8Array(44+buffer.length*4),view=new DataView(bytes.buffer),word=(at,s)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};word(0,'RIFF');view.setUint32(4,bytes.length-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,48000,true);view.setUint32(28,192000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,bytes.length-44,true);const left=buffer.getChannelData(0),right=buffer.getChannelData(1);for(let i=0;i<buffer.length;i++){view.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]))*32767),true);view.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]))*32767),true);}let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));result.wav=btoa(binary);}
  return result;
};
