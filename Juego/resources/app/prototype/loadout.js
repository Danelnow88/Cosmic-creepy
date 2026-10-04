/* Finite ammunition and consumables. Shared by local authority and host. */
(function(root){'use strict';
const magazines=[14,28,6,3],initialReserve=[28,56,12,3],limits=[84,168,36,9],itemKeys=['medkit','shield','antidote'];
function fresh(){return {ammo:[...magazines],reserve:[...initialReserve],items:{medkit:1,shield:1,antidote:1}};}
function normalize(value){const freshValue=fresh();return {ammo:magazines.map((m,i)=>Math.max(0,Math.min(m,Math.floor(Number(value?.ammo?.[i])||0)))),reserve:limits.map((m,i)=>Math.max(0,Math.min(m,Math.floor(Number(value?.reserve?.[i]??freshValue.reserve[i])||0)))),items:Object.fromEntries(itemKeys.map(k=>[k,Math.max(0,Math.min(3,Math.floor(Number(value?.items?.[k]??1)||0)))]))};}
function reload(loadout,index){if(index<0||index>3)return 0;const n=Math.min(magazines[index]-loadout.ammo[index],loadout.reserve[index]);if(n<=0)return 0;loadout.ammo[index]+=n;loadout.reserve[index]-=n;return n;}
function pickup(loadout,payload){let changed=false;if(payload.type==='ammo'){for(let i=0;i<4;i++){const n=Math.min(limits[i]-loadout.reserve[i],payload.amounts?.[i]||0);if(n>0){loadout.reserve[i]+=n;changed=true;}}}else if(itemKeys.includes(payload.type)&&loadout.items[payload.type]<3){loadout.items[payload.type]++;changed=true;}return changed;}
const api={fresh,normalize,reload,pickup,magazines,limits,itemKeys};if(typeof module==='object')module.exports=api;else root.CRLoadout=api;
})(typeof window==='object'?window:globalThis);
