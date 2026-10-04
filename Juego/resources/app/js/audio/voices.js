// Primitivas compartidas, un solo NV.audioCtx y el mixer existente.
(() => {
  'use strict';
  const NV=window.NV, voices=new Set(), gates=Object.create(null);
  const caps={music:14,weapons:16,sfxUI:8,sfxPlayer:16,sfxEnemies:12,sfxAmbient:8};
  const ranks={music:0,weapons:1,sfxUI:1,sfxPlayer:3,sfxEnemies:2,sfxAmbient:2};
  const stats={created:0,rejected:0,stolen:0,peak:0};
  let seed=0x4e564f49,noise=null,noiseCtx=null,hidden=false;
  NV.audioRandom=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  NV.allowAudioEvent=(key,interval)=>{
    if(!NV.audioCtx||!NV.soundOn||hidden)return false;
    const t=NV.audioCtx.currentTime;
    if(gates[key]!=null&&t-gates[key]<interval)return false;
    gates[key]=t;return true;
  };
  function release(v,immediate) {
    if(v.released&&!immediate)return;v.released=true;
    if(immediate){try{v.source.stop();}catch(_){}v.cleanup();return;}
    const t=NV.audioCtx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(Math.max(.0001,v.gain.gain.value),t);
    v.gain.gain.linearRampToValueAtTime(0,t+.012);
    v.end=t+.015;try{v.source.stop(v.end);}catch(_){v.cleanup();}
  }
  NV.soundVoice=s=>{
    const ctx=NV.audioCtx;if(!ctx||!NV.soundOn||hidden)return null;
    const channel=s.channel||'sfxEnemies',priority=s.priority==null?(ranks[channel]||0):s.priority;
    for(const v of voices)if(v.end<=ctx.currentTime)release(v,true);
    const same=Array.from(voices).filter(v=>v.channel===channel);
    if(same.length>=(caps[channel]||8)||voices.size>=48){
      const pool=same.length>=(caps[channel]||8)?same:Array.from(voices);
      const victim=pool.filter(v=>v.priority<=priority).sort((a,b)=>a.priority-b.priority||a.start-b.start)[0];
      if(!victim){stats.rejected++;return null;}release(victim,true);stats.stolen++;
    }
    // La partitura usa instantes absolutos; los SFX conservan su delay relativo.
    const start=Number.isFinite(s.at)?Math.max(ctx.currentTime,s.at):ctx.currentTime+Math.max(0,s.delay||0);
    const dur=Math.max(.015,s.duration||.1);
    const source=s.noise?ctx.createBufferSource():ctx.createOscillator();
    const filter=ctx.createBiquadFilter(),gain=ctx.createGain(),nodes=[source,filter,gain];
    if(s.noise){
      if(!noise||noiseCtx!==ctx){noiseCtx=ctx;noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
        const data=noise.getChannelData(0);let smooth=0;
        for(let i=0;i<data.length;i++){smooth=smooth*.35+(NV.audioRandom()*2-1)*.65;data[i]=smooth;}}
      source.buffer=noise;source.loop=true;
    }else{
      source.type=s.type||'sine';source.frequency.setValueAtTime(Math.max(20,s.freq||220),start);
      if(s.endFreq)source.frequency.exponentialRampToValueAtTime(Math.max(20,s.endFreq),start+Math.min(dur,s.glideTime||dur));
    }
    filter.type=s.noise?'bandpass':'lowpass';filter.Q.value=s.q||.65;
    filter.frequency.setValueAtTime(s.filter||(s.noise?1100:2400),start);
    if(s.endFilter)filter.frequency.exponentialRampToValueAtTime(Math.max(40,s.endFilter),start+dur);
    const level=Math.max(.0001,Math.min(.25,s.volume==null?.03:s.volume));
    const attack=Math.min(dur*.2,s.attack||.004),hold=Math.min(Math.max(0,s.hold||0),dur-attack-.001);
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(level,start+attack);
    if(!s.loop){
      if(hold>0)gain.gain.setValueAtTime(level,start+attack+hold);
      gain.gain.exponentialRampToValueAtTime(.0001,start+dur);
    }
    source.connect(filter);filter.connect(gain);
    const target=s.destination||NV.channelFor(channel);
    if(ctx.createStereoPanner&&(Number.isFinite(s.pan)||Number.isFinite(s.x))){
      const p=ctx.createStereoPanner(),pan=Number.isFinite(s.pan)?s.pan:NV.panForX(s.x,s.worldWidth);
      p.pan.setValueAtTime(Math.max(-.65,Math.min(.65,pan)),start);gain.connect(p);p.connect(target);nodes.push(p);
    }else gain.connect(target);
    const v={source,gain,channel,priority,start,end:s.loop?Infinity:start+dur+.005,released:false,
      cleanup(){voices.delete(v);for(const n of nodes)if(n.disconnect)n.disconnect();},stop(){release(v,false);}};
    source.onended=v.cleanup;voices.add(v);stats.created++;stats.peak=Math.max(stats.peak,voices.size);
    if(s.noise)source.start(start,NV.audioRandom()*1.5);else source.start(start);
    if(!s.loop)source.stop(v.end);return v;
  };
  NV.stopAudioVoices=channel=>{for(const v of Array.from(voices))if(!channel||v.channel===channel)release(v,false);};
  NV.getAudioVoiceStats=()=>({...stats,active:voices.size,limit:48,byChannel:Object.fromEntries(Object.keys(caps).map(c=>[c,Array.from(voices).filter(v=>v.channel===c).length]))});
  NV.setAudioHidden=value=>{hidden=!!value;if(hidden){NV.stopAudioVoices();if(NV.stopSectorLaserSound)NV.stopSectorLaserSound();}};
  NV.isAudioHidden=()=>hidden;
})();
