// ===== RENDER: hazards / speaker mines =====
// Todas las transformaciones son locales al canvas: nunca alteran x/y/hitbox.
(() => {
  'use strict';
  const NV = window.NV = window.NV || {};

  function drawTelegraph(ctx, mine) {
    const total = (NV.BALANCE && NV.BALANCE.SPEAKER_MINE_TELEGRAPH_DURATION) || 0.9;
    const p = Math.max(0, Math.min(1, mine.stateTime / total));
    const pulse = 0.5 + 0.5 * Math.sin(mine.simTime * 18 + mine.phaseOffset);
    ctx.save();
    // Anillo de warning que pulsa (visible incluso con partículas pesadas).
    // Frontera peligrosa = rojo hostil de warning (misma familia que la zona del Core).
    ctx.globalAlpha = 0.35 + pulse * 0.4;
    ctx.strokeStyle = '#ff6474'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(mine.x, mine.y, 18 + p * 14, 0, Math.PI * 2); ctx.stroke();
    // Concentric warning waves: marcación rítmica de zona peligrosa.
    // Capa decorativa: conserva la identidad rosa del parlante, no el cian amigo.
    ctx.globalAlpha = 0.14 + p * 0.18;
    ctx.strokeStyle = '#ff4da6'; ctx.lineWidth = 1.7;
    for (let i = 1; i <= 4; i++) {
      const r = 16 + p * (12 + i * 5);
      ctx.beginPath(); ctx.arc(mine.x, mine.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Mini ghost silhouette (preview del woofer) para identidad de parlante.
    ctx.globalAlpha = 0.10 + p * 0.2;
    ctx.fillStyle = '#ff4da6';
    ctx.beginPath(); ctx.arc(mine.x, mine.y, 4.5 + p * 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBody(ctx, mine, rhythm, policy, groove) {
    const pose = NV.speakerMinePose(mine, rhythm, groove);
    const full = !policy || policy.tier === 'full';
    const reduced = !policy || policy.tier !== 'minimal';
    const hue = rhythm && Number.isFinite(rhythm.hue) ? rhythm.hue : 330;
    const accent = 'hsl(' + Math.round(hue) + ',90%,62%)';
    const det = mine.state === 'detonating';
    ctx.save();
    ctx.translate(mine.x + pose.sway, mine.y + pose.bob);
    ctx.rotate(pose.tilt);
    ctx.scale(pose.scaleX * (det ? 1.32 : 1), pose.scaleY * (det ? 0.46 : 1));
    if (full) { ctx.shadowColor = '#ff3d8d'; ctx.shadowBlur = 14; }

    // Patas: peso alternado (pie plantado opuesto al movimiento del cuerpo).
    ctx.fillStyle = '#171522';
    ctx.fillRect(-12 + pose.feet, 12, 7, 5);
    ctx.fillRect(5 + pose.feet, 12, 7, 5);

    // Caja oscura + borde de peligro: armed = frontera roja activa, resto = identidad.
    ctx.fillStyle = '#090b13';
    ctx.strokeStyle = mine.state === 'armed' ? '#ff3b4f' : '#ff4da6';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-14, -14); ctx.lineTo(12, -14); ctx.lineTo(15, -10);
    ctx.lineTo(15, 12); ctx.lineTo(11, 15); ctx.lineTo(-12, 15); ctx.lineTo(-15, 11); ctx.lineTo(-15, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Woofer principal siempre presente y legible (inclusive minimal).
    ctx.fillStyle = '#151a28'; ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 3, 7.5 * pose.woofer, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath(); ctx.arc(0, 3, 2.3 * pose.woofer, 0, Math.PI * 2); ctx.fill();

    // Tweeter/segundo cono y tornillos: decorativos (reducidos por tier).
    if (reduced) {
      ctx.fillStyle = '#23283a'; ctx.strokeStyle = '#ff4da6'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, -7, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (full) {
      ctx.fillStyle = '#7cf8ff';
      for (const x of [-10, 10]) for (const y of [-9, 10]) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawCoreZone(ctx, zone, debugHitbox) {
    const arming = zone.state === 'arming' || zone.cameraWarningRemaining > 0;
    const expiring = zone.state === 'expiring';
    const armProgress = arming ? Math.max(0, Math.min(1, zone.stateTime / Math.max(0.001, zone.armTime))) : 1;
    const fade = expiring ? Math.max(0, 1 - zone.stateTime / 0.18) : 1;
    const pulse = 0.5 + 0.5 * Math.sin(zone.simTime * 9);
    const r = zone.radius * (arming ? 0.30 + armProgress * 0.70 : 1);
    ctx.save();
    ctx.globalAlpha = fade * (arming ? 0.18 + armProgress * 0.22 : 0.34 + pulse * 0.12);
    ctx.fillStyle = arming ? '#b51f31' : '#ff3b4f';
    ctx.beginPath(); ctx.arc(zone.x, zone.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = fade * (arming ? 0.68 : 0.90);
    ctx.strokeStyle = arming ? '#ff6474' : '#ff3b4f';
    ctx.lineWidth = arming ? 2.5 : 3.5;
    ctx.setLineDash(arming ? [7, 6] : []);
    ctx.beginPath(); ctx.arc(zone.x, zone.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = fade * (0.30 + pulse * 0.30);
    ctx.strokeStyle = '#8f1223'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(zone.x, zone.y, Math.max(5, r * (0.35 + pulse * 0.18)), 0, Math.PI * 2); ctx.stroke();
    if (debugHitbox) {
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  NV.drawSectorEmitters = function (ctx, W, H, wave, hazards, enabled) {
    if(!enabled)return;
    for(const h of hazards||[]) {
      if(!h.laserHead||h.state==='dead')continue;
      const emergence=h.state==='telegraph'?Math.min(1,h.stateTime/h.emergeTime):h.state==='recovery'?Math.max(0,1-h.stateTime/h.recoveryTime):1;
      const charge=h.state==='telegraph'?Math.max(0,(h.stateTime-h.emergeTime)/(h.telegraphTime-h.emergeTime)):h.state==='active'?1:0;
      ctx.save();
      if(h.side==='top')ctx.translate(h.x,0);
      else {ctx.translate(h.side==='right'?W:0,h.y);ctx.rotate(h.side==='right'?Math.PI/2:-Math.PI/2);}
      ctx.translate(0,-62*(1-emergence));ctx.shadowBlur=0;
      const metal=ctx.createLinearGradient(-23,0,23,0);
      metal.addColorStop(0,'#344858');metal.addColorStop(.28,'#bacbd4');metal.addColorStop(.48,'#eff9ff');metal.addColorStop(.68,'#728a9b');metal.addColorStop(1,'#243642');
      ctx.fillStyle=metal;ctx.strokeStyle='#8fa7b7';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-22,-38);ctx.lineTo(-22,-8);ctx.lineTo(-4,30);ctx.lineTo(4,30);ctx.lineTo(22,-8);ctx.lineTo(22,-38);ctx.closePath();ctx.fill();ctx.stroke();
      for(const [y,r] of [[-6,25],[10,17],[23,10]]) {
        ctx.strokeStyle='#bddee5';ctx.lineWidth=3;
        ctx.beginPath();ctx.ellipse(0,y,r,5,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#64ccd4';ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(0,y+1,r-2,3,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.fillStyle=metal;ctx.beginPath();ctx.arc(0,38,4,0,Math.PI*2);ctx.fill();
      if(charge>0) {
        const radius=2+charge*9;
        ctx.globalAlpha=.2;ctx.fillStyle='#ff6474';ctx.beginPath();ctx.arc(0,38,radius+5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;ctx.beginPath();ctx.arc(0,38,radius,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff3ef';ctx.beginPath();ctx.arc(-radius*.2,38-radius*.2,radius*.42,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
  };

  function drawSectorHazard(ctx, hazard, visualPolicy, debugHitbox) {
    if(hazard.laserHead) {
      if(hazard.state==='recovery'||hazard.stateTime<hazard.emergeTime&&hazard.state==='telegraph')return;
      ctx.save();ctx.shadowBlur=0;
      const active=hazard.state==='active' && !(hazard.cameraWarningRemaining>0),vertical=hazard.kind==='vent';
      const x=vertical?hazard.x:hazard.side==='right'?hazard.W-38:38;
      const y=vertical?38:hazard.y;
      const endX=vertical?x:hazard.side==='right'?0:hazard.W,endY=vertical?hazard.H:y;
      const line=()=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);ctx.stroke();};
      ctx.strokeStyle='#ff6474';ctx.globalAlpha=active?1:.55;ctx.lineWidth=active?hazard.width:1;
      ctx.setLineDash(active?[]:[3,9]);line();ctx.setLineDash([]);
      if(active){ctx.strokeStyle='#fff0ed';ctx.lineWidth=1.5;line();}
      if(debugHitbox){ctx.strokeStyle='#ffffff';ctx.lineWidth=hazard.width;ctx.globalAlpha=.2;line();}
      ctx.restore();return;
    }
    const warning = hazard.state === 'telegraph' || hazard.cameraWarningRemaining > 0;
    const recovery = hazard.state === 'recovery';
    const duration = warning ? hazard.telegraphTime : recovery ? hazard.recoveryTime : hazard.activeTime;
    const progress = Math.max(0, Math.min(1, hazard.stateTime / Math.max(0.001, duration)));
    const pulse = 0.5 + 0.5 * Math.sin((hazard.simTime || 0) * (warning ? 12 : 22));
    const alpha = recovery ? (1 - progress) * 0.25 : warning ? 0.10 + pulse * 0.10 : 0.28 + pulse * 0.10;
    const signals = NV.HOSTILE_SIGNALS;
    const damageColor = signals ? signals.damage : '#ff3b4f';
    const edge = warning ? (signals ? signals.warning : '#ff6474') : damageColor;
    ctx.save();
    ctx.fillStyle = damageColor; ctx.strokeStyle = edge;
    ctx.lineWidth = warning ? 3 : 4;
    ctx.setLineDash(warning ? [12, 9] : []);
    ctx.globalAlpha = alpha;
    if (hazard.kind === 'vent') {
      ctx.fillRect(hazard.x - hazard.width * 0.5, 0, hazard.width, hazard.H);
      ctx.strokeRect(hazard.x - hazard.width * 0.5, 1, hazard.width, hazard.H - 2);
    } else if (hazard.kind === 'rift') {
      ctx.fillRect(0, hazard.y - hazard.width * 0.5, hazard.W, hazard.width);
      ctx.strokeRect(1, hazard.y - hazard.width * 0.5, hazard.W - 2, hazard.width);
    } else if (hazard.kind === 'pulse') {
      // Banda completa de colisión, con los dos bordes reales visibles.
      ctx.strokeStyle = damageColor; ctx.lineWidth = hazard.width;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = warning ? 0.72 : 0.95;
      ctx.lineWidth = warning ? 2.5 : 4; ctx.strokeStyle = edge;
      for (const radius of [Math.max(0, hazard.radius - hazard.width * 0.5), hazard.radius + hazard.width * 0.5]) {
        ctx.beginPath(); ctx.arc(hazard.x, hazard.y, radius, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (!warning && !recovery && (hazard.kind === 'vent' || hazard.kind === 'rift')) {
      // Núcleo brillante dentro del volumen rojo: no agranda el hitbox.
      ctx.globalAlpha=.9; ctx.fillStyle='#ffe4e7';
      if(hazard.kind === 'vent') ctx.fillRect(hazard.x-2,0,4,hazard.H);
      else ctx.fillRect(0,hazard.y-2,hazard.W,4);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = recovery ? (1 - progress) * 0.5 : 0.90;
    ctx.fillStyle = '#07101b';
    const preferredX = hazard.kind === 'vent' ? hazard.x : hazard.kind === 'rift' ? 72 : hazard.x;
    const preferredY = hazard.kind === 'vent' ? 34 : hazard.kind === 'rift' ? hazard.y : hazard.y - hazard.radius - hazard.width * 0.6;
    const text = warning ? (hazard.hint || ('SALÍ DE LA ZONA · ' + hazard.label)) : hazard.label + ' ACTIVO · NO TOCAR';
    ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const textW = Math.max(110, Math.min(hazard.W - 20, text.length * 7.2));
    const labelX = Math.max(textW * 0.5 + 10, Math.min(hazard.W - textW * 0.5 - 10, preferredX));
    const labelY = Math.max(16, Math.min(hazard.H - 16, preferredY));
    ctx.fillRect(labelX - textW * 0.5, labelY - 12, textW, 24);
    ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.strokeRect(labelX - textW * 0.5, labelY - 12, textW, 24);
    ctx.fillStyle = edge; ctx.fillText(text, labelX, labelY + 1);
    if (debugHitbox) {
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      if (hazard.kind === 'vent') ctx.strokeRect(hazard.x - hazard.width * 0.5, 0, hazard.width, hazard.H);
      else if (hazard.kind === 'rift') ctx.strokeRect(0, hazard.y - hazard.width * 0.5, hazard.W, hazard.width);
      else { ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  // --- P3.1: notas musicales geométricas (no dependen de fuentes) ---
  function drawNote(ctx, n) {
    if (!n || n.alpha <= 0) return;
    const size = n.size || 4.2;
    const a = Math.max(0, Math.min(1, n.alpha));
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rot || 0);
    ctx.globalAlpha = a;
    ctx.fillStyle = n.hue; ctx.strokeStyle = n.hue; ctx.lineWidth = 1.3;
    // cabeza circular
    ctx.beginPath(); ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2); ctx.fill();
    // tallo
    ctx.beginPath(); ctx.moveTo(0, -size * 0.85); ctx.lineTo(0, size * 0.25); ctx.stroke();
    // abanico/pulgar (flag) o segunda nota (eighth): geometría minimalista
    if (n.type === 'flagged') {
      ctx.beginPath(); ctx.moveTo(0, -size * 0.85); ctx.quadraticCurveTo(size * 0.7, -size * 0.6, size * 1.1, -size * 0.3); ctx.stroke();
    } else if (n.type === 'eighth') {
      ctx.beginPath(); ctx.arc(size * 0.42, -size * 0.85, size * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  NV.drawMusicalNotes = function (ctx, notes, visualPolicy) {
    if (!notes || !notes.length) return;
    for (let i = 0; i < notes.length; i++) drawNote(ctx, notes[i], visualPolicy);
  };

  NV.drawHazards = function (ctx, hazards, rhythm, visualPolicy, debugHitbox, notes, groove) {
    for (const mine of hazards || []) {
      if (!mine || mine.state === 'dead') continue;
      if (mine.type === 'coreZone') { drawCoreZone(ctx, mine, debugHitbox); continue; }
      if (mine.type === 'sectorHazard') { drawSectorHazard(ctx, mine, visualPolicy, debugHitbox); continue; }
      if (mine.type !== 'speakerMine') continue;
      if (mine.state === 'spawning' || mine.cameraWarningRemaining > 0) drawTelegraph(ctx, mine);
      drawBody(ctx, mine, rhythm, visualPolicy, groove);
      if (debugHitbox) {
        ctx.save(); ctx.strokeStyle = 'rgba(124,248,255,0.75)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mine.x, mine.y, mine.triggerRadius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
    if (notes && notes.length) NV.drawMusicalNotes(ctx, notes, visualPolicy);
  };
})();
