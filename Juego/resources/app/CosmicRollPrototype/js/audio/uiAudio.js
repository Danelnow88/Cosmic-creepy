// Delegación: un hover por control, no por cada hijo. No crea settings ni mixer.
(() => {
  'use strict';
  const NV=window.NV;
  if(typeof document==='undefined'||!document.addEventListener)return;
  const selector='button,[role="button"],select,input[type="range"],input[type="checkbox"],input[type="radio"],.offer,.inv-slot,.loadout-slot,[data-char]';
  const control=target=>target&&target.closest?target.closest(selector):null;
  const enabled=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&!el.classList.contains('disabled');
  let lastHover=null,previousState=null,previousPaused=false,focused=true,lastPointerAt=-1000;
  document.addEventListener('pointerover',event=>{
    const el=control(event.target);if(!enabled(el)||el===control(event.relatedTarget)||el===lastHover)return;
    lastHover=el;if(NV.audioCtx&&NV.sfx)NV.sfx.ui('hover');
  });
  document.addEventListener('pointerout',event=>{if(control(event.target)!==control(event.relatedTarget))lastHover=null;});
  document.addEventListener('focusin',event=>{if(performance.now()-lastPointerAt>100&&enabled(control(event.target))&&NV.audioCtx)NV.sfx.ui('select');});
  document.addEventListener('pointerdown',()=>{lastPointerAt=performance.now();NV.setAudioHidden(document.hidden);NV.initAudio();},{passive:true});
  document.addEventListener('keydown',event=>{if(!event.repeat){NV.setAudioHidden(document.hidden);NV.initAudio();}});
  document.addEventListener('click',event=>{
    const el=control(event.target);if(!enabled(el))return;
    // Estas acciones ya emiten compra/venta/equipar desde su resultado real.
    if(el.closest('.offer,.inv-slot,.loadout-slot')||el.classList.contains('inv-remove'))return;
    const id=el.id.toLowerCase();
    if(/settings/.test(id)&&!/tab|mute/.test(id))return; // El panel confirma apertura/cierre reales.
    NV.sfx.ui(/back|close|cancel/.test(id)?'back':/play|start|skip|confirm/.test(id)?'confirm':'select');
  });
  document.addEventListener('change',event=>{if(enabled(control(event.target)))NV.sfx.ui('setting');});
  NV.updateAudioLifecycle=env=>{
    if(env.hidden!==document.hidden)env={...env,hidden:document.hidden};
    NV.setAudioHidden(env.hidden||!focused);
    if(env.paused&&!previousPaused){NV.stopAudioVoices('music');NV.stopAudioVoices('sfxAmbient');NV.stopSectorLaserSound();}
    if(previousState&&previousState!==env.state&&env.state==='shop')NV.sfx.ui('open');
    previousState=env.state;previousPaused=env.paused;
  };
  document.addEventListener('visibilitychange',()=>{NV.setAudioHidden(document.hidden);if(document.hidden&&NV.audio)NV.audio.stopAllWeapons();});
  window.addEventListener('blur',()=>{focused=false;NV.setAudioHidden(true);if(NV.audio)NV.audio.stopAllWeapons();});
  window.addEventListener('focus',()=>{focused=true;NV.setAudioHidden(document.hidden);});
})();
