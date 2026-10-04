/* Procedural fear layer. Reuses CRSound's AudioContext and ambient bus. */
(() => {
  'use strict';
  window.CRTerrorAudio = function CRTerrorAudio(options={}) {
    const sound=options.sound,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    let ctx=null,input=null,windGain=null,windFilter=null,metalGain=null,metalFilter=null,started=false,starting=null,disposed=false,seed=options.seed??7319,nextWhisper=5;
    const ownedSources=[],ownedNodes=[],active=new Set();
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
    function own(node){ownedNodes.push(node);return node;}
    function noise(seconds=3){const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(random()*2-1)*.075)/1.075;data[i]=brown*3.2;}return buffer;}
    function loop(buffer,rate,filter,gain){const source=own(ctx.createBufferSource());source.buffer=buffer;source.loop=true;source.playbackRate.value=rate;source.connect(filter);filter.connect(gain);source.start();ownedSources.push(source);}
    async function build(){
      if(disposed)return false;if(started){if(ctx?.state==='suspended')await ctx.resume();return true;}
      await sound.start();if(disposed)return false;const graph=sound.extension?.('ambient');if(!graph)return false;
      ctx=graph.context;input=own(ctx.createDynamicsCompressor());input.threshold.value=-20;input.knee.value=16;input.ratio.value=3;input.connect(graph.destination);
      windGain=own(ctx.createGain());windGain.gain.value=0;windFilter=own(ctx.createBiquadFilter());windFilter.type='lowpass';windFilter.frequency.value=650;windFilter.Q.value=.7;
      metalGain=own(ctx.createGain());metalGain.gain.value=0;metalFilter=own(ctx.createBiquadFilter());metalFilter.type='bandpass';metalFilter.frequency.value=310;metalFilter.Q.value=8;
      const buffer=noise(4);loop(buffer,.71,windFilter,windGain);loop(buffer,.37,metalFilter,metalGain);windGain.connect(input);metalGain.connect(input);started=true;return true;
    }
    function start(){if(starting)return starting;starting=build().finally(()=>{starting=null;});return starting;}
    function spatial(position,{level=.04,duration=.8,frequency=280,noisy=false}={}){
      if(!started||active.size>=8)return false;
      if(!position||![position.x,position.y,position.z].every(Number.isFinite))return false;
      const now=ctx.currentTime,source=noisy?ctx.createBufferSource():ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=ctx.createPanner();
      if(noisy)source.buffer=noise(Math.min(1,duration));else {source.type='triangle';source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.53),now+duration);}
      filter.type='lowpass';filter.frequency.value=noisy?1800:900;panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=40;panner.rolloffFactor=1;panner.maxDistance=1400;
      panner.positionX.value=position.x;panner.positionY.value=position.y;panner.positionZ.value=position.z;
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+Math.min(.08,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      source.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(input);source.start(now);source.stop(now+duration+.02);active.add(source);source.onended=()=>{active.delete(source);for(const node of [source,filter,gain,panner])node.disconnect();};return true;
    }
    function update(time,data={}){
      if(!started)return;const fear=clamp(data.fear),dark=clamp(data.darkness),shelter=clamp(data.shelter),paused=!!data.paused,now=ctx.currentTime;
      const target=paused?0:.018+dark*.052+fear*.025;windGain.gain.setTargetAtTime(target,now,.7);metalGain.gain.setTargetAtTime(paused?0:fear*fear*.027,now,.9);
      windFilter.frequency.setTargetAtTime(220+(1-shelter)*900-fear*180,now,.65);metalFilter.frequency.setTargetAtTime(240+fear*190,now,.8);
      nextWhisper-=data.dt||0;if(nextWhisper<=0){nextWhisper=7+random()*15-fear*4;if(!paused&&fear>.32&&data.player){const a=random()*Math.PI*2,r=170+random()*260;spatial({x:data.player.x+Math.cos(a)*r,y:data.player.y+25+random()*35,z:data.player.z+Math.sin(a)*r},{level:.016+fear*.018,duration:1.2+random(),frequency:180+random()*170,noisy:random()>.45});}}
    }
    function react(event,position){if(!started)return;if(event.type==='gust')spatial(position,{level:.025*event.intensity,duration:.75,noisy:true});if(event.type==='match')spatial(position,{level:.055,duration:.24,frequency:760});if(event.type==='candle-out'||event.type==='wind-out')spatial(position,{level:.065,duration:1.1,frequency:86});if(event.type==='fear-panic')spatial(position,{level:.09,duration:1.5,frequency:48});}
    function reset(){nextWhisper=5;for(const source of [...active])try{source.stop();}catch(_){}active.clear();if(ctx){windGain?.gain.setValueAtTime(0,ctx.currentTime);metalGain?.gain.setValueAtTime(0,ctx.currentTime);}}
    function snapshot(){return {started,wind:windGain?.gain.value||0,metal:metalGain?.gain.value||0,voices:active.size,voiceLimit:8,sharedContext:!!ctx,permanentNodes:ownedNodes.length};}
    function dispose(){if(disposed)return;reset();disposed=true;for(const source of ownedSources)try{source.stop();}catch(_){}for(const node of ownedNodes)try{node.disconnect();}catch(_){}ownedSources.length=ownedNodes.length=0;}
    return {start,update,react,reset,snapshot,dispose,whisper:spatial};
  };
})();
