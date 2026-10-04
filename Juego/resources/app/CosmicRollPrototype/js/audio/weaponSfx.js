// Armas: transitorio, cuerpo y firma sobre el mixer/allocator únicos.
// Gameplay ya disparó: audio no modifica proyectiles, cadencia ni daño.
(() => {
  'use strict';
  const NV=window.NV;
  const PRESETS={
    pistol:{type:'ballistic',body:175,end:80,band:1700,tail:.13,volume:.105},
    rifle:{type:'ballistic',body:145,end:62,band:1200,tail:.18,volume:.11},
    smg:{type:'ballistic',body:210,end:105,band:1900,tail:.065,volume:.075},
    shotgun:{type:'shotgun',body:105,end:42,band:800,tail:.26,volume:.15},
    sniper:{type:'ballistic',body:120,end:38,band:1450,tail:.39,volume:.145},
    laser:{type:'energy',body:850,end:300,band:1400,tail:.14,volume:.075},
    plasma:{type:'plasma',body:310,end:95,band:700,tail:.29,volume:.12},
    flamethrower:{type:'flame',body:72,end:65,band:950,tail:.28,volume:.09},
    bow:{type:'bow',body:440,end:220,band:1800,tail:.22,volume:.075},
    railgun:{type:'railgun',body:650,end:55,band:950,tail:.40,volume:.13}
  };
  const heat={},recent=[],stats={fireCalls:0,suppressed:0,flameIgnitions:0,byWeapon:{}};
  const flame={active:false,lastSeen:0,voices:[]};
  let weaponBus=null,weaponMaster=.85,debug=false;
  NV.WEAPON_SFX_PRESETS=PRESETS;NV.WEAPON_MASTER=weaponMaster;
  const now=()=>NV.audioCtx?NV.audioCtx.currentTime:0;
  function getWeaponBus(){
    const ctx=NV.audioCtx;if(!ctx)return null;
    const parent=NV.mixer&&NV.mixer.weapons||NV.channelFor('weapons');
    if(!weaponBus||weaponBus.ctx!==ctx||weaponBus.parent!==parent){
      const input=ctx.createGain(),ceiling=ctx.createGain();input.gain.value=1;ceiling.gain.setValueAtTime(weaponMaster,now());
      input.connect(ceiling);ceiling.connect(parent);weaponBus={ctx,parent,input,ceiling};NV.weaponBus=weaponBus;
    }
    return weaponBus.input;
  }
  NV.getWeaponBus=getWeaponBus;
  NV.setWeaponVolume=v=>{weaponMaster=Math.max(0,Math.min(1,Number.isFinite(+v)?+v:.85));NV.WEAPON_MASTER=weaponMaster;if(weaponBus)weaponBus.ceiling.gain.setValueAtTime(weaponMaster,now());return weaponMaster;};
  function voice(s,opts){return NV.soundVoice&&NV.soundVoice({...opts,...s,channel:'weapons',destination:getWeaponBus()});}
  function stopFlame(){for(const v of flame.voices)if(v)v.stop();flame.voices=[];flame.active=false;}
  function startFlame(opts){
    if(!NV.audioCtx||!NV.soundOn)return;
    flame.lastSeen=now();if(flame.active&&flame.voices.some(v=>v&&!v.released))return;
    stopFlame();
    stats.flameIgnitions++;
    voice({noise:true,filter:1600,endFilter:500,duration:.10,volume:.07},opts);
    flame.voices=[voice({noise:true,filter:950,q:.45,loop:true,attack:.06,volume:.115},opts),
      voice({freq:72,type:'triangle',filter:200,loop:true,attack:.1,volume:.028},opts)];
    flame.active=flame.voices.some(Boolean);
  }
  function weaponFire(id,opts={}){
    stats.fireCalls++;const p=PRESETS[id]||PRESETS.pistol;
    const counter=stats.byWeapon[id]||(stats.byWeapon[id]={shots:0,suppressed:0});counter.shots++;
    if(!NV.soundOn||!NV.audioCtx)return null;
    if(id==='flamethrower'){startFlame(opts);return null;}
    const t=now(),h=heat[id]||(heat[id]={last:-99,value:0});
    if(t-h.last<.026){counter.suppressed++;stats.suppressed++;return null;}
    const rapid=t-h.last<(id==='smg'?.15:.30);
    h.value=rapid?Math.min(1,h.value+.18):Math.max(0,h.value-(t-h.last)*1.5);h.last=t;
    const variation=1+(NV.audioRandom()-.5)*.035;
    const gain=p.volume*(1-h.value*.30)*(opts.crit?1.04:1),dur=p.tail*(1-h.value*.28);
    const body=voice({freq:p.body*variation,endFreq:p.end,duration:dur,type:p.type==='energy'?'sine':'triangle',filter:1500,volume:gain},opts);
    voice({noise:true,filter:p.band*(1-h.value*.18),endFilter:p.band*.4,duration:Math.min(.18,dur),volume:gain*(p.type==='bow'?.25:.8)},opts);
    if(id==='plasma')voice({freq:95,endFreq:45,type:'sine',duration:.24,volume:.06},opts);
    if(id==='bow')voice({freq:660,endFreq:440,type:'sine',duration:.14,volume:.023,delay:.015},opts);
    if(id==='railgun'||id==='sniper')voice({freq:68,endFreq:32,type:'sine',duration:.32,volume:.065,delay:.015},opts);
    recent.push({id,preset:p.type,t,created:!!body,suppressed:false,reason:null,heat:h.value,volume:gain,duration:dur});if(recent.length>24)recent.shift();
    return null;
  }
  NV.audio=Object.assign(NV.audio||{},{
    weaponFire,
    weaponStart(id,opts){if(id==='flamethrower')startFlame(opts);},
    weaponStop(id){if(id==='flamethrower')stopFlame();},
    reload(id,opts){if(id==='shotgun'&&NV.allowAudioEvent('pump',.15))voice({noise:true,filter:850,duration:.08,volume:.04,delay:.015},opts);},
    stopAllWeapons(){stopFlame();if(NV.stopAudioVoices)NV.stopAudioVoices('weapons');for(const k in heat)delete heat[k];},
    update(env){const e=env||{};if(flame.active&&(e.hidden||e.paused||e.state!=='playing'||now()-flame.lastSeen>.4))stopFlame();},
    getWeaponSfxStats(){return {...stats,debug,continuous:{flamethrower:flame.active},voices:NV.getAudioVoiceStats&&NV.getAudioVoiceStats(),recent:recent.slice()};},
    getRecentWeaponEvents(){return recent.slice();},setDebug(value){debug=!!value;}
  });
})();
