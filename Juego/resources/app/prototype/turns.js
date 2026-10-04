/* Match authority: objective score, repeated attacks, downed actors and bounded rounds. */
(function(root){'use strict';
function create({onChange=()=>{},onEnd=()=>{},onFinish=()=>{},onRespawn=()=>{},onSupply=()=>{},turnSeconds=45,settleSeconds=5}={}){
 let enabled=false,teams=[],members=[],activeId=null,phase='off',remaining=0,turn=0,teamCursor=-1,eventId=0,elapsed=0,matchSeconds=600,targetScore=20,winner=null,result=null,victoryRules=['last-team'],tactical=false;const events=[];
 const active=()=>members.find(m=>m.id===activeId)||null,teamOf=id=>teams.find(t=>t.id===members.find(m=>m.id===id)?.teamId);
 function emit(type,data={}){events.push({id:++eventId,type,...data});if(events.length>64)events.shift();}
 const permanentDeath=()=>victoryRules.includes('last-team');
 const text=(value,limit)=>{const s=String(value??'').trim();return typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s),x=>x.segment).slice(0,limit).join(''):Array.from(s).slice(0,limit).join('');};
 function evaluateVictory(){
   if(permanentDeath()){const alive=teams.filter(t=>members.some(m=>m.teamId===t.id&&m.hp>0));if(alive.length<=1)return {winner:alive[0]?.id||null,reason:alive.length?'last-team':'no-survivors'};}
   if(victoryRules.includes('score')&&teams.some(t=>t.score>=targetScore)||victoryRules.includes('time')&&elapsed>=matchSeconds){const sorted=[...teams].sort((a,b)=>b.score-a.score);return {winner:sorted[0]?.score>sorted[1]?.score?sorted[0].id:null,reason:elapsed>=matchSeconds?'time':'score'};}
   return null;
 }
 function finish(outcome){if(phase==='complete')return;winner=outcome.winner;result={...outcome,survivors:members.filter(m=>m.hp>0&&m.teamId===winner).map(m=>({id:m.id,profileId:m.profileId,name:m.name,avatar:m.avatar,hp:m.hp}))};phase='complete';remaining=0;emit('match-complete',{winner,reason:result.reason});onFinish(winner,result);}
 function respawn(m){m.hp=100;m.statuses=[];m.protectedUntil=elapsed+3;m.data.velocity=[0,0,0];if(m.data.spawn)m.data.position=[...m.data.spawn];m.data.ammo=[7,0,0,0];m.data.reserve=[0,0,0,0];m.data.weapon=0;m.data.cooldown=0;m.data.survival=null;emit('respawn',{actorId:m.id});onRespawn(m);}
 function next(){const outcome=evaluateVictory();if(outcome){finish(outcome);return;}const previous=active();let current=null;
   for(let i=0;i<teams.length&&!current;i++){teamCursor=(teamCursor+1)%teams.length;const team=teams[teamCursor],roster=members.filter(m=>m.teamId===team.id);for(let j=0;j<roster.length;j++){team.cursor=(team.cursor+1)%roster.length;const candidate=roster[team.cursor];if(!permanentDeath()||candidate.hp>0){current=candidate;break;}}}
   if(!current){finish({winner:null,reason:'no-survivors'});return;}if(current.hp<=0)respawn(current);activeId=current.id;remaining=turnSeconds;phase='active';turn++;emit('turn-start',{actorId:activeId,turn});onChange(previous,current);
 }
 function start(config={}){
   tactical=!!config.tactical;turnSeconds=Math.max(10,Math.min(180,Number(config.turnSeconds)||turnSeconds));matchSeconds=Math.max(60,Math.min(1800,Number(config.matchSeconds)||600));targetScore=Math.max(5,Math.min(100,Number(config.targetScore)||20));
   victoryRules=Array.isArray(config.victoryRules)?[...new Set(config.victoryRules.filter(r=>['last-team','score','time'].includes(r)))]:config.mode==='objectives'?['score','time']:['last-team'];if(!victoryRules.length)victoryRules=['last-team'];
   const input=config.teams||[{name:'Equipo de prueba 1',members:['Carlitos','Martín']},{name:'Equipo de prueba 2',members:['Julián','Eduardo']}];
   if(input.length<2||input.length>4||input.some(t=>!Array.isArray(t.members)||t.members.length<1||t.members.length>6))throw Error('Use 2–4 teams with 1–6 members');
   teams=input.map((t,i)=>({id:'team-'+i,profileId:text(t.profileId||'team-profile-'+i,64),name:text(t.name,30)||'Equipo de prueba '+(i+1),cursor:-1,score:0,captures:[]}));members=[];
   for(let i=0;i<input.length;i++)for(let j=0;j<input[i].members.length;j++){const raw=input[i].members[j],p=raw&&typeof raw==='object'?raw:{name:raw};members.push({id:'actor-'+i+'-'+j,profileId:text(p.profileId||'player-profile-'+i+'-'+j,64),teamId:teams[i].id,name:text(p.name,24)||'Jugador '+(j+1),avatar:text(p.avatar,2),cosmetics:{skinId:'default'},hp:100,statuses:[],deaths:0,protectedUntil:0,gear:{},objective:permanentDeath()?'Último equipo en pie':'Relés +5 · PvE +1 · Rival +2 · Caída −1',data:{}});}
   enabled=true;teamCursor=-1;activeId=null;turn=elapsed=0;winner=result=null;events.length=0;eventId=0;next();emit('match-start');
 }
 function end(reason='manual'){if(!enabled||phase!=='active')return false;phase='settling';remaining=settleSeconds;onEnd(active());emit('turn-end',{actorId:activeId,reason});return true;}
 function award(actorId,points,reason='pve'){if(!enabled||phase==='complete'||!Number.isFinite(points))return false;const team=teamOf(actorId);if(!team)return false;team.score=Math.max(0,Math.round((team.score+points)*100)/100);emit('score',{teamId:team.id,points,reason});return true;}
 function down(m,sourceId){m.hp=0;m.deaths++;m.statuses=[];award(m.id,tactical?0:-1,'downed');const source=members.find(a=>a.id===sourceId);if(source&&source.teamId!==m.teamId)award(sourceId,tactical?.05:2,'pvp');emit('downed',{actorId:m.id,sourceId:source?.id||null});}
 function damage(id,amount,sourceId=null){const m=members.find(m=>m.id===id);if(!enabled||phase==='complete'||!m||m.hp<=0||elapsed<m.protectedUntil||!Number.isFinite(amount))return false;const source=members.find(m=>m.id===sourceId);if(source&&source.id!==m.id&&source.teamId===m.teamId)return false;m.hp=Math.max(0,m.hp-Math.max(0,amount)*(m.statuses.some(s=>s.type==='shield')?.5:1));emit('damage',{actorId:id,amount});if(m.hp===0)down(m,sourceId);return true;}
 function tick(dt){if(!enabled||phase==='complete')return;dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;elapsed+=dt;
   for(const m of members){for(const s of m.statuses){const duration=Math.min(dt,s.remaining);s.remaining=Math.max(0,s.remaining-dt);if(s.type==='poison'&&m.hp>0)damage(m.id,(s.rate||1)*duration);}m.statuses=m.statuses.filter(s=>s.remaining>0);}
   const outcome=evaluateVictory();if(phase==='active'&&(active()?.hp<=0||outcome))end('resolution');else if(phase==='supply'&&outcome){phase='settling';remaining=settleSeconds;}
   remaining=Math.max(0,remaining-dt);if(remaining===0){if(phase==='active')end('timeout');else if(phase==='settling'){const final=evaluateVictory();if(final)finish(final);else{phase='supply';remaining=2.8;emit('supply');onSupply();}}else next();}
 }
 function capture(id,site){const team=teamOf(id);if(!enabled||phase!=='active'||id!==activeId||!['relay-0','relay-1','relay-2'].includes(site)||!team||team.captures.includes(site))return false;team.captures.push(site);return award(id,5,'objective');}
 function status(id,type,seconds=20,rate=1){const m=members.find(m=>m.id===id);if(!enabled||phase==='complete'||!m||m.hp<=0||!['poison','shield'].includes(type))return false;const next={type,remaining:Math.max(0,Math.min(120,Number(seconds)||0)),rate:Math.max(0,Math.min(10,Number(rate)||0))},existing=m.statuses.find(s=>s.type===type);if(existing){existing.remaining=Math.max(existing.remaining,next.remaining);existing.rate=Math.max(existing.rate,next.rate);}else m.statuses.push(next);return true;}
 function clearStatus(id,type){const m=members.find(m=>m.id===id);if(!m)return false;const before=m.statuses.length;m.statuses=m.statuses.filter(s=>s.type!==type);return before!==m.statuses.length;}
 function stop(){enabled=false;phase='off';activeId=null;members=[];teams=[];result=null;}
 function snapshot(){return {tactical,enabled,phase,activeId,remaining,turn,turnSeconds,elapsed,matchSeconds,targetScore,victoryRules:[...victoryRules],winner,result:result?{...result,survivors:result.survivors.map(m=>({...m}))}:null,teams:teams.map(t=>({...t,captures:[...t.captures]})),members:members.map(m=>({id:m.id,profileId:m.profileId,teamId:m.teamId,name:m.name,avatar:m.avatar,cosmetics:{...m.cosmetics},hp:m.hp,deaths:m.deaths,protectedUntil:m.protectedUntil,statuses:m.statuses.map(s=>({...s})),objective:m.objective,gear:{...m.gear}})),events:events.map(e=>({...e}))};}
 function restore(s,positions=[]){tactical=!!s.tactical;enabled=!!s.enabled;phase=s.phase;activeId=s.activeId;remaining=s.remaining;turn=s.turn;turnSeconds=s.turnSeconds;elapsed=s.elapsed;matchSeconds=s.matchSeconds;targetScore=s.targetScore;victoryRules=[...(s.victoryRules||['score','time'])];winner=s.winner;result=s.result?{...s.result,survivors:s.result.survivors.map(m=>({...m}))}:null;teams=s.teams.map(t=>({...t,captures:[...t.captures]}));const old=new Map(members.map(m=>[m.id,m.data]));members=s.members.map(m=>({...m,cosmetics:{...m.cosmetics},statuses:m.statuses.map(a=>({...a})),data:m.hidden?{}:old.get(m.id)||{}}));for(const p of positions){const m=members.find(m=>m.id===p.id);if(m)m.data.position=[...p.position];}}
 return {start,stop,end,tick,damage,status,clearStatus,active,award,capture,restore,snapshot,get members(){return members;},get enabled(){return enabled;},get phase(){return phase;}};
}
if(typeof module==='object')module.exports={create};else root.CRTurns={create};
})(typeof window==='object'?window:globalThis);
