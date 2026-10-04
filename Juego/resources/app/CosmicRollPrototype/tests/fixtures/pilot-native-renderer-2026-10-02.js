// ===== RENDER: jugador (nave/piloto + auras) =====
// Función de dibujo PURA. game.js aporta ctx, player, CHARACTERS, frame.
(() => {
  'use strict';
  const NV = window.NV;
  // NEW: Visual utility functions for advanced rendering effects
  function NV_drawLiquidInkBlob(ctx, cx, cy, radius, points, noise, speed, fillColor, strokeColor, glowColor, seed, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      let angle = (i / points) * Math.PI * 2;
      let n1 = Math.sin(angle * 4 + t * 8 * speed + seed);
      let n2 = Math.cos(angle * 3 - t * 10 * speed + seed * 2);
      let jitter = (Math.random() - 0.5) * 2.5;
      let r = radius + (n1 + n2) * noise + jitter;
      let x = Math.cos(angle) * r;
      let y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    ctx.restore();
  }
  function NV_drawFlowingPatterns(ctx, cx, cy, radius, color, count, seed, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < count; i++) {
      let progress = ((t * 0.8 + (i / count)) % 1);
      let alpha = Math.sin(progress * Math.PI);
      let currentR = radius * (0.2 + progress * 0.75);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(Math.cos(t + i + seed) * 6, Math.sin(t * 1.2 + i) * 6, currentR, currentR * 0.45, t + i, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function NV_drawDripsAndMelts(ctx, cx, cy, radius, color, glowColor, seed, t) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      let pAngle = (i / 6) * Math.PI * 2 + t * 1.5 + seed;
      let dripY = Math.sin(t * 4 + i) * 15;
      let px = cx + Math.cos(pAngle) * (radius + 8);
      let py = cy + Math.sin(pAngle) * (radius + 8) + dripY;
      let pSize = 3 + Math.sin(t * 8 + i) * 2;
      if (pSize > 0) {
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const reducedMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function drawFivePointStar(ctx, outerRadius, innerRadius) {
    ctx.beginPath();
    for (let point = 0; point < 10; point++) {
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      const radius = point % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  NV.drawPlayerStunStars = function (ctx, player, char, frame) {
    if (!player || !(player.stun > 0) || !char) return false;

    const effectScale = Math.max(20, Number(char.size) || 20);
    const centerY = -effectScale * 2.05;
    const orbitX = effectScale * 0.74;
    const orbitY = effectScale * 0.26;
    const baseStarSize = effectScale * 0.24;
    const timeSeconds = (Number(frame) || 0) / 60;
    const reducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
    const orbitSpeed = reducedMotion ? 0.35 : 1.75;
    const pulseAmplitude = reducedMotion ? 0.02 : 0.06;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 225, 120, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, centerY, orbitX, orbitY, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const angle = timeSeconds * orbitSpeed + i * Math.PI * 2 / 5;
      const depthScale = 0.86 + Math.sin(angle) * 0.14;
      const pulse = 1 + Math.sin(timeSeconds * 4 + i * 1.7) * pulseAmplitude;
      const starSize = baseStarSize * depthScale * pulse;
      const x = Math.cos(angle) * orbitX;
      const y = centerY + Math.sin(angle) * orbitY;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle * 1.8 + i * 0.35);
      ctx.fillStyle = i % 2 === 0 ? '#f7c55b' : '#e9ae40';
      ctx.strokeStyle = '#8a6130';
      ctx.lineWidth = Math.max(1.35, effectScale * 0.075);
      ctx.shadowColor = 'rgba(247, 197, 91, 0.22)';
      ctx.shadowBlur = 2;
      drawFivePointStar(ctx, starSize, starSize * 0.48);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'rgba(0, 0, 0, 0)';
      const highlightOuter = starSize * 0.42;
      ctx.fillStyle = 'rgba(255, 241, 190, 0.85)';
      drawFivePointStar(ctx, highlightOuter, highlightOuter * 0.48);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    return true;
  };

  NV.drawPlayerPhantomPossession = function (ctx, player, char, frame) {
    const possession = player && player.phantomPossession;
    if (!possession || !possession.active || !char) return false;
    const reducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
    const angle = Number.isFinite(possession.forceAngle) ? possession.forceAngle : (Number(possession.entryAngle) || 0);
    const size = Math.max(18, Number(char.size) || 20);
    const pulse = reducedMotion ? 0 : Math.sin((Number(frame) || 0) * 0.11) * 1.8;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Silueta espectral desplazada detrás del piloto.
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#b8efff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-5, -4, size + 7 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(5, 2, size + 10 - pulse * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Dos ojos fijos, distintos de la corona de stun.
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#d9fbff';
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 1.4;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.ellipse(side * size * 0.34, -size * 1.32, size * 0.22, size * 0.11, side * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#35134f';
      ctx.beginPath();
      ctx.arc(side * size * 0.34 + Math.cos(angle) * 1.5, -size * 1.32 + Math.sin(angle) * 1.5, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9fbff';
    }

    // Wisps ornamentales; se reducen, pero no desaparecen los indicadores útiles.
    if (!reducedMotion) {
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = '#c9f8ff';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * 0.5 + 0.35;
        const r = size * (1.15 + (i & 1) * 0.18);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, size * 0.16, a, a + 1.4);
        ctx.stroke();
      }
    }

    // Chevron direccional: autoridad visual exacta del forceAngle.
    ctx.rotate(angle);
    ctx.translate(size + (possession.dangerActive ? 29 : 24), 0);
    ctx.globalAlpha = possession.dangerActive ? 1 : 0.95;
    ctx.strokeStyle = '#b8efff';
    ctx.fillStyle = 'rgba(217, 70, 239, 0.22)';
    ctx.lineWidth = possession.dangerActive ? 3.6 : 3;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-7, -9);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Entrada visible durante los primeros 0.35 s de posesión.
    const transition = Math.max(0, Number(possession.transition) || 0);
    const owner = possession.owner;
    if (transition > 0 && owner) {
      const progress = 1 - transition / 0.35;
      const sx = (Number(owner.phantomEntryStartX) || player.x) - player.x;
      const sy = (Number(owner.phantomEntryStartY) || player.y) - player.y;
      ctx.save();
      ctx.strokeStyle = '#b8efff';
      ctx.lineWidth = reducedMotion ? 1.5 : 2.2;
      for (let i = 0; i < (reducedMotion ? 3 : 5); i++) {
        const band = (i - 2) * 4;
        ctx.globalAlpha = (1 - progress) * (0.25 + i * 0.08);
        ctx.beginPath();
        ctx.moveTo(sx, sy + band);
        ctx.quadraticCurveTo(sx * 0.45, sy * 0.45 - band, 0, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = (1 - progress) * 0.75;
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * (0.65 + progress * 0.65), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return true;
  };

  NV.drawPlayer = function (ctx, player, CHARACTERS, frame, presentation) {
    const char = CHARACTERS[player.character];
    ctx.save();
    ctx.translate(player.x, player.y);
    if (presentation) {
      const visualScale = presentation.scale == null ? 1 : presentation.scale;
      const visualScaleX = presentation.scaleX == null ? visualScale : presentation.scaleX;
      const visualScaleY = presentation.scaleY == null ? visualScale : presentation.scaleY;
      const visualAlpha = presentation.alpha == null ? 1 : presentation.alpha;
      ctx.scale(visualScaleX, visualScaleY);
      ctx.globalAlpha = visualAlpha;
      if (presentation.flourish > 0) {
        const flourish = Math.max(0, Math.min(1, presentation.flourish));
        const signature = NV.PILOT_TRANSITIONS && NV.PILOT_TRANSITIONS[player.character];
        const motif = signature ? signature.flourish : 'layer-lock';
        const accent = signature ? signature.accent : char.color;
        ctx.save();
        ctx.globalAlpha = flourish * 0.62;
        ctx.strokeStyle = accent; ctx.shadowColor = accent;
        ctx.shadowBlur = 10; ctx.lineWidth = 2.25;
        const radius = char.size + 7 + (1 - flourish) * 14;
        if (motif === 'shield-reform') {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 3;
            const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        } else if (motif === 'orbit-sync') {
          ctx.save(); ctx.rotate((1 - flourish) * 0.45);
          ctx.beginPath(); ctx.ellipse(0, 0, radius + 8, radius * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.rotate(-0.75);
          ctx.beginPath(); ctx.ellipse(0, 0, radius + 3, radius * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else if (motif === 'energy-compress') {
          for (let i = 0; i < 3; i++) {
            const a = frame * 0.05 + i * Math.PI * 2 / 3;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * radius, Math.sin(a) * radius, 2.5 + flourish * 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha *= 0.55;
          ctx.beginPath(); ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }

    NV.drawPlayerPhantomPossession(ctx, player, char, frame);

    const invulnBlink = player.invuln > 0 && !(player.phase > 0 || player.bulwark > 0) && Math.floor(player.invuln * 20) % 2 === 0;
    const stunBlink = player.stun > 0 && Math.floor(player.stun * 20) % 2 === 0;
    const criticalHealth = player.hp > 0 && player.hp / player.maxHp <= 0.25;
    ctx.globalAlpha = invulnBlink ? 0.4 : (stunBlink ? 0.6 : 1);

    // Señal visual de vida crítica: un contorno rojo late alrededor de cualquier personaje.
    if (criticalHealth) {
      const pulse = 0.35 + Math.sin(frame * 0.22) * 0.25;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ff3048';
      ctx.shadowColor = '#ff3048';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, char.size + 10 + Math.sin(frame * 0.18) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Estado especial pertenece al jugador pero no modifica su posición/hitbox.
    if (NV.drawSpecialPlayerLayer) NV.drawSpecialPlayerLayer(ctx, player, char, frame, 'behind');

    // #11: estelas cinéticas detrás del cuerpo (sin aros genéricos concéntricos).
    if (typeof NV.drawPlayerConsumableEffects === 'function') NV.drawPlayerConsumableEffects(ctx, player, char, frame, 'behind');

    const breathe = Math.sin(frame * 0.05) * 1.5;
    const bob = Math.sin(frame * 0.12) * 2;
    ctx.translate(0, bob + breathe);
    ctx.save();
    if (NV.applySpecialBodyTransform) NV.applySpecialBodyTransform(ctx, player);

    
    // Escudo de consumible: campo de fuerza dedicado (#11). Visible mientras
    // `player.shield > 0` y NO hay fase activa. Se conserva esta guarda para
    // no alterar el gameplay existente.
    if (player.shield > 0) {
      if (typeof NV.drawPlayerConsumableEffects === 'function') NV.drawPlayerConsumableEffects(ctx, player, char, frame, 'front');
      else {
        const shieldPulse = 0.35 + Math.sin(frame * 0.2) * 0.2;
        ctx.strokeStyle = '#7cf8ff';
        ctx.globalAlpha = shieldPulse;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#7cf8ff';
        ctx.shadowBlur = 14;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.arc(0, 0, char.size + 18, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = shieldPulse * 0.8;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, char.size + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = invulnBlink ? 0.4 : 1;
        ctx.shadowBlur = 0;
      }
    }

    // Overdrive persistente heredado: queda desactivado como capa principal (#11).
    // La identidad direccional vive en la capa 'behind'; este bloque solo existe
    // como fallback si el renderer dedicado no está cargado.
    if (player.overdrive > 0 && typeof NV.drawPlayerConsumableEffects !== 'function') {
      const odPulse = 0.45 + Math.sin(frame * 0.45) * 0.25;
      ctx.strokeStyle = '#caa7ff';
      ctx.globalAlpha = odPulse * 0.35;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#caa7ff';
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(0, 0, char.size + 23 + Math.sin(frame * 0.25) * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = odPulse * 0.28;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, char.size + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = invulnBlink ? 0.4 : 1;
      ctx.shadowBlur = 0;
    }

    // F09.4: el aura pulsante genérica alrededor del jugador fue ELIMINADA.
    // Era el contorno redundante visible en gameplay y en el preview del
    // lobby (se confundía con el indicador de cooldown de la habilidad).
    // Se conservan: parpadeo de invuln/stun, contorno rojo de vida crítica,
    // zona/aura de Fase Fantasma, escudo de Muralla y anillos de ENJAMBRE.
    // (No se deja alpha residual: el cuerpo se dibuja opaco salvo blink.)
    ctx.globalAlpha = invulnBlink ? 0.4 : 1;

    ctx.shadowBlur = 30;
    ctx.shadowColor = char.color;
    // F09.4: el aura pulsante genérica alrededor del jugador fue ELIMINADA
    // (era el contorno redundante visible en gameplay y en el lobby).
    // La identidad del cuerpo se conserva vía glow + formas por piloto.
    const size = char.size;
    const cid = char.id || player.character;

    if (cid === 'boti') {
      const t = frame * 0.025;
      NV_drawDripsAndMelts(ctx, 0, 0, size * 0.9, '#00f0ff', '#00f0ff', 1, t);
      NV_drawLiquidInkBlob(ctx, 0, 4, size * 0.7, 12, 3.5, 1.2, '#021536', '#0066ff', '#0066ff', 1, t);
      NV_drawLiquidInkBlob(ctx, 0, 0, size * 0.95, 16, 5, 1.0, '#042b5c', '#00f0ff', '#00f0ff', 2, t);
      NV_drawFlowingPatterns(ctx, 0, 0, size * 0.86, '#70f3ff', 5, 1, t);
    } else if (cid === 'nova') {
      // NOVA (MARS) – adapted from visual prototype
      const t = frame * 0.025;
      NV_drawDripsAndMelts(ctx, 0, 0, size * (45 / 46), '#ff3300', '#ff6600', 2, t);
      NV_drawLiquidInkBlob(ctx, size * (-12 / 46), size * (-8 / 46), size * (24 / 46), 10, size * (8 / 46), 1.6, '#4a0800', '#ff9900', '#ff9900', 3, t);
      NV_drawLiquidInkBlob(ctx, 0, 0, size, 14, size * (12 / 46), 1.1, '#2b0500', '#ff3300', '#ff3300', 4, t);
      NV_drawFlowingPatterns(ctx, 0, 0, size * (42 / 46), '#ffaa00', 4, 2, t);
    } else if (cid === 'rook') {
      // ROOK (JUPITER) – adapted from visual prototype
      const t = frame * 0.025;
      NV_drawDripsAndMelts(ctx, 0, 0, size, '#eab308', '#a855f7', 3, t);
      NV_drawLiquidInkBlob(ctx, 0, 0, size, 18, size * (11 / 50), 0.9, '#1e0a2a', '#a855f7', '#a855f7', 5, t);
      NV_drawFlowingPatterns(ctx, 0, 0, size * (48 / 50), '#fef08a', 6, 3, t);
    } else if (cid === 'swarm') {
      // SWARM (SATURN) – adapted from visual prototype
      const t = frame * 0.025;
      NV_drawDripsAndMelts(ctx, 0, 0, size * (40 / 38), '#ffee77', '#ffee77', 4, t);
      NV_drawLiquidInkBlob(ctx, 0, 0, size, 12, size * (7 / 38), 1.0, '#241c02', '#ffee77', '#ffee77', 6, t);
      NV_drawFlowingPatterns(ctx, 0, 0, size * (36 / 38), '#ffffff', 3, 4, t);

      // Animated rings for SATURN
      ctx.save();
      ctx.rotate(0.35 + Math.sin(t * 2) * 0.06);

      for (let a = 0; a < 2; a++) {
        const ringProgress = ((t * 0.6 + a * 0.5) % 1);
        const ringAlpha = Math.sin(ringProgress * Math.PI);

        ctx.globalAlpha = ringAlpha;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          size * ((65 + ringProgress * 25) / 38),
          size * ((20 + ringProgress * 8) / 38),
          0,
          0,
          Math.PI * 2
        );

        ctx.strokeStyle = a === 0 ? '#ffee77' : '#ffffff';
        ctx.lineWidth = 3 - ringProgress * 1.5;
        ctx.shadowColor = '#ffee77';
        ctx.shadowBlur = 12;
        ctx.stroke();
      }

      ctx.restore();
    }

    if (NV.drawSpecialPlayerLayer) NV.drawSpecialPlayerLayer(ctx, player, char, frame, 'front');
    // Ojos
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, -1, 2.5, 0, Math.PI * 2); ctx.arc(5, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = char.eyeColor;
    ctx.beginPath(); ctx.arc(-5, -1, 1.2, 0, Math.PI * 2); ctx.arc(5, -1, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // sólo deformación corporal; no afecta efectos mundo/stun.

    ctx.shadowBlur = 0;
    NV.drawPlayerStunStars(ctx, player, char, frame);
    ctx.restore();
  };
})();
