/* Candle resource + hidden fear state. Pure simulation: no DOM, rendering or audio. */
(() => {
  'use strict';
  window.CRCandleFear = function CRCandleFear(options={}) {
    const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const config={fuelSeconds:240,matches:3,matchSeconds:22,burnRate:1,fearRise:.145,fearRecovery:.052,...options};
    let seed=options.seed??0x5749434b,nextGust=9,gust=0,events=[];
    const state={fuel:config.fuelSeconds,emergency:0,matches:config.matches,lit:true,fear:0,darkness:.28,flicker:1,movementMultiplier:1,aggressionMultiplier:1,stage:'calm'};
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
    function emit(type,intensity=1){events.push({type,intensity});}
    function update(dt,environment={}){
      dt=clamp(Number(dt)||0,0,.1);
      const exposure=clamp(environment.windExposure??.25),enemy=clamp(environment.enemyPressure??0),health=clamp((environment.health??100)/100);
      if(state.lit){
        if(state.emergency>0){state.emergency=Math.max(0,state.emergency-dt);if(state.emergency===0&&state.fuel<=0){state.lit=false;emit('dark');}}
        else {state.fuel=Math.max(0,state.fuel-dt*config.burnRate*(1+exposure*.16));if(state.fuel===0){state.lit=false;emit('candle-out');}}
      }
      nextGust-=dt*(.35+exposure*1.4+enemy*.35);
      if(nextGust<=0){gust=.35+random()*.65;nextGust=7+random()*16;emit('gust',gust);if(state.lit&&state.emergency<=0&&exposure>.72&&random()<.12+.18*enemy){state.lit=false;emit('wind-out');}}
      gust=Math.max(0,gust-dt*1.55);
      const tremor=.035*Math.sin((environment.time||0)*21.7)+.018*Math.sin((environment.time||0)*37.1);
      state.flicker=state.lit?clamp(1-tremor-gust*.46-enemy*.18,.18,1.08):0;
      const ambient=clamp(environment.ambientDarkness??.78),light=state.lit?clamp(.72*state.flicker+.18):0;
      state.darkness=clamp(ambient*(1-light)+(.16*ambient)+(state.lit?0:.62));
      const rise=state.darkness*config.fearRise+enemy*.21+(1-health)*.065;
      const recover=(1-state.darkness)*config.fearRecovery*(enemy<.1?1:.2);
      state.fear=clamp(state.fear+(rise-recover)*dt);
      state.movementMultiplier=1-clamp((state.fear-.55)/.45)*.12;
      state.aggressionMultiplier=1+clamp((state.fear-.35)/.65)*.22;
      const next=state.fear>=.82?'panic':state.fear>=.58?'disturbed':state.fear>=.3?'uneasy':'calm';
      if(next!==state.stage){state.stage=next;emit('fear-'+next,state.fear);}
      state.fragments=state.matches;state.lightRadius=state.lit?(state.emergency>0?550:380):60;
      return state;
    }
    function useMatch(){
      if(state.matches<=0||state.emergency>20)return false;
      state.matches--;state.lit=true;state.emergency=config.matchSeconds;state.flicker=1;state.darkness=.15;gust=0;emit('match',1);return true;
    }
    function extinguish(reason='forced'){if(!state.lit)return false;state.lit=false;state.emergency=0;emit(reason,1);return true;}
    function reset(){state.fuel=config.fuelSeconds;state.emergency=0;state.matches=config.matches;state.lit=true;state.fear=0;state.darkness=.28;state.flicker=1;state.movementMultiplier=state.aggressionMultiplier=1;state.stage='calm';nextGust=9;gust=0;events=[];}
    function snapshot(){return {...state,fragments:state.matches,lightRadius:state.lit?(state.emergency>0?550:380):60,fuelRatio:clamp(state.fuel/config.fuelSeconds),eventsPending:events.length};}
    function drainEvents(){const out=events;events=[];return out;}
    function configureForTest(values={}){for(const key of ['fuel','emergency','matches','fear'])if(Number.isFinite(values[key]))state[key]=Math.max(0,values[key]);if(typeof values.lit==='boolean')state.lit=values.lit;}
    function restore(values){configureForTest(values);for(const key of ['darkness','flicker','movementMultiplier','aggressionMultiplier'])if(Number.isFinite(values[key]))state[key]=values[key];if(typeof values.stage==='string')state.stage=values.stage;events=[];}
    function addFragment(){if(state.matches>=6)return false;state.matches++;return true;}
    return {addFragment,useFragment:useMatch,restore,update,useMatch,extinguish,reset,snapshot,drainEvents,configureForTest};
  };
})();
