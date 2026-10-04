// Protección mínima off-screen. Consume la única worldMetrics del viewport;
// no crea cámara ni cambia estadísticas/patrones. Reconciliación física sólo
// ante resize de Dynamic Arena, nunca durante seguimiento o draw.
(() => {
  'use strict';
  const NV = window.NV;
  NV.cameraThreatReady = function (entity, dt, rect, warningTime) {
    const v = NV.viewport, m = NV.worldMetrics;
    if (!v || !v.intersectsWorldRect || !m || (m.arenaW <= m.viewW && m.arenaH <= m.viewH)) return true;
    const visible = rect.visible === undefined ? v.intersectsWorldRect(rect.x, rect.y, rect.w, rect.h) : rect.visible;
    if (!visible) {
      entity.cameraWasHidden = true;
      entity.cameraVisibleLastFrame = false;
      entity.cameraWarningRemaining = warningTime;
      return false;
    }
    // Un ataque que nació visible conserva exactamente su funcionamiento.
    if (!entity.cameraWasHidden) return true;
    if (!entity.cameraVisibleLastFrame) { entity.cameraVisibleLastFrame = true; return false; }
    entity.cameraWarningRemaining = Math.max(0, entity.cameraWarningRemaining - Math.max(0, dt || 0));
    return entity.cameraWarningRemaining <= 0;
  };
  NV.cameraHazardReady = function (h, dt) {
    const r = h.kind === 'pulse' ? h.radius + h.width / 2 : h.radius || h.triggerRadius || 20;
    const rect = h.kind === 'vent' ? { x:h.x-h.width/2, y:38, w:h.width, h:h.H-38 }
      : h.kind === 'rift' ? { x:0, y:h.y-h.width/2, w:h.W, h:h.width }
      : { x:h.x-r, y:h.y-r, w:r*2, h:r*2 };
    if (h.kind==='pulse' && NV.worldMetrics) {
      // El bbox puede cruzar la cámara sin que sea visible el anillo peligroso.
      const m=NV.worldMetrics,left=m.viewX,right=left+m.viewW,top=m.viewY,bottom=top+m.viewH;
      const nearX=Math.max(left,Math.min(right,h.x)),nearY=Math.max(top,Math.min(bottom,h.y));
      const minimum=Math.hypot(nearX-h.x,nearY-h.y);
      const maximum=Math.hypot(Math.max(Math.abs(left-h.x),Math.abs(right-h.x)),Math.max(Math.abs(top-h.y),Math.abs(bottom-h.y)));
      rect.visible=minimum<=r && maximum>=Math.max(0,h.radius-h.width/2);
    }
    return NV.cameraThreatReady(h, dt, rect, .55);
  };
  // Dynamic Arena puede achicarse al rotar/resize. Reconciliar UNA vez fuera
  // de draw mantiene pickups alcanzables; hazards movidos siempre reavisan.
  NV.reconcileArenaAfterResize = function (st) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    st.player.x = clamp(st.player.x,20,st.W-20);
    st.player.y = clamp(st.player.y,30,st.H-20);
    for (const enemy of st.enemies) if (!enemy.dead && NV.keepEnemyInArena) {
      const x=enemy.x,y=enemy.y;NV.keepEnemyInArena(enemy,st.W,st.H);
      if ((x!==enemy.x||y!==enemy.y) && NV.beginEnemyArrival) NV.beginEnemyArrival(enemy,{announceSpawn:true});
    }
    for (const items of [st.pickups,st.weaponPickups,st.bossChests]) for (const p of items || []) {
      p.x=clamp(p.x,40,st.W-40);p.y=clamp(p.y,40,st.H-40);
    }
    if (st.boss) {
      if (NV.bossVisibleArenaPosition) {
        const point=NV.bossVisibleArenaPosition(st.boss,st.W,st.H);st.boss.x=point.x;st.boss.y=point.y;
      }
      if (st.boss.encounter) { st.boss.encounter.stage='recovery';st.boss.encounter.t=.65; }
    }
    for (const h of st.hazards) {
      if (h.type==='sectorHazard') continue; // Engine sectorial cancela/reavisa al cambiar W/H.
      const radius=h.radius||h.triggerRadius||20;
      const x=clamp(h.x,radius+8,st.W-radius-8),y=clamp(h.y,radius+8,st.H-radius-8);
      if(x===h.x&&y===h.y)continue;
      if(h.type==='speakerMine'){h.x=x;h.y=y;h.state='spawning';h.stateTime=0;}
      else h.state='dead'; // No trasladar una zona activa encima del jugador.
    }
  };
})();
