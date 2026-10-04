/* Saved graphics preferences and bounded live diagnostics. */
window.CRSettings=function({apply,diagnose}){
 const defaults={quality:'balanced',shadows:true,effects:true,fps:true,fov:58},values={...defaults};try{Object.assign(values,JSON.parse(localStorage.getItem('CR3D-settings-v1')||'{}'));}catch(_){}
 if(!['low','balanced','high'].includes(values.quality))values.quality='balanced';values.fov=Math.max(45,Math.min(80,Number(values.fov)||58));
 const panel=document.createElement('section');panel.className='settings-panel';panel.innerHTML='<h2>Ajustes</h2><label>Calidad<select data-setting="quality"><option value="low">Rendimiento</option><option value="balanced">Equilibrada</option><option value="high">Alta</option></select></label><label>Sombras<input type="checkbox" data-setting="shadows"></label><label>Efectos de pánico<input type="checkbox" data-setting="effects"></label><label>Mostrar FPS<input type="checkbox" data-setting="fps"></label><label>Campo de visión<input type="range" min="45" max="80" data-setting="fov"></label><div><button type="button" id="check-scene">Verificar escena</button><button type="button" id="reset-settings">Restablecer</button></div><output id="scene-result">Diagnóstico listo</output>';
 document.getElementById('game-overlay').append(panel);const fpsNode=document.createElement('div');fpsNode.className='performance-meter';document.body.append(fpsNode);
 const history=new Float32Array(120);let cursor=0,count=0,last=performance.now(),next=0,violations=0,recoveries=0,lastIssue='',frames=0,fps=0,p95=0;
 function sync(){for(const n of panel.querySelectorAll('[data-setting]')){const v=values[n.dataset.setting];if(n.type==='checkbox')n.checked=!!v;else n.value=v;}apply({...values});}
 function save(){try{localStorage.setItem('CR3D-settings-v1',JSON.stringify(values));}catch(_){}sync();}
 panel.addEventListener('change',e=>{const key=e.target.dataset.setting;if(!key)return;values[key]=e.target.type==='checkbox'?e.target.checked:key==='fov'?Number(e.target.value):e.target.value;save();});
 panel.querySelector('#reset-settings').onclick=()=>{Object.assign(values,defaults);save();};
 panel.querySelector('#check-scene').onclick=()=>{const r=diagnose();panel.querySelector('output').textContent=r.ok?'Escena válida · '+r.boxes+' colisiones':r.issues.join(' · ');};
 function frame(now){const ms=Math.max(.01,now-last);last=now;history[cursor]=ms;cursor=(cursor+1)%history.length;count=Math.min(count+1,history.length);frames++;if(now<next)return;next=now+500;const samples=Array.from(history.slice(0,count)).sort((a,b)=>a-b);fps=1000/(samples.reduce((a,b)=>a+b,0)/count);p95=samples[Math.floor((count-1)*.95)];fpsNode.hidden=!values.fps;fpsNode.textContent=Math.round(fps)+' FPS · '+p95.toFixed(1)+' ms'+(violations?' · alertas '+violations:'');}
 function issue(message,recovered=false){violations++;if(recovered)recoveries++;lastIssue=message;}
 function snapshot(){return {values:{...values},fps,p95,frames,violations,recoveries,lastIssue};}
 return {values,sync,frame,issue,snapshot,check:diagnose};
};
