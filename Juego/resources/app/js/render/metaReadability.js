// ===== META VIS: lectura espacial (solo render/diagnóstico) =====
(() => {
  'use strict';
  const NV = window.NV;
  const CELL = 64;
  NV.metaDensityInfo = new WeakMap();

  // ===== Paleta emocional unificada =====
  // peligro / info fría / advertencia / densidad-agrupamiento / seguro.
  NV.META_VIS_PALETTE = {
    danger: '#FF3333',
    dangerSoft: '#FF8800',
    info: '#33CCFF',
    infoCold: '#00FFFF',
    warn: '#FFCC00',
    warnAmber: '#FFAA00',
    density: '#AA66FF',
    densityAlt: '#FF66AA',
    safe: '#66FF33',
  };

  // Toggles individuales (accesibilidad: cada efecto puede apagarse solo).
  NV.META_VIS_OPTIONS = {
    density: true,
    contact: true,
    damage: true,
    autofire: true,
    intent: true,
    legend: true,
  };

  NV.setMetaVisOption = function (key, enabled) {
    if (!(key in NV.META_VIS_OPTIONS)) return false;
    NV.META_VIS_OPTIONS[key] = !!enabled;
    return true;
  };

  // Contexto de render compartido: t (segundos), saturación (0..1),
  // urgencia (0..1) y gain (multiplicador global de intensidad).
  function metaEnv(env) {
    env = env || {};
    return {
      t: env.t || 0,
      saturation: Math.max(0, Math.min(1, env.saturation || 0)),
      urgency: Math.max(0, Math.min(1, env.urgency || 0)),
      gain: env.gain == null ? 1 : Math.max(0, Math.min(2, env.gain)),
    };
  }
  NV.resolveMetaEnv = metaEnv;

  const META_FOG_MAX = 10; // tope de brumas por frame (rendimiento)

  NV.buildDensityField = function (enemies) {
    const grid = new Map(), info = new WeakMap();
    for (const e of enemies || []) {
      if (!e || e.dead) continue;
      const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL), key = cx + ',' + cy;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(e);
    }
    let comparisons = 0;
    for (const e of enemies || []) {
      if (!e || e.dead) continue;
      const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
      let nearby = 0, overlap = 0, localChecks = 0;
      scan: for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const cell = grid.get(gx + ',' + gy);
        if (!cell) continue;
        for (const other of cell) {
          if (other === e || other.dead) continue;
          comparisons++;
          localChecks++;
          const d = Math.hypot(other.x - e.x, other.y - e.y);
          if (d <= 54) nearby++;
          const combined = (e.radius || 0) + (other.radius || 0);
          if (combined > 0 && d < combined) overlap += 1 - d / combined;
          // La señal ya queda visualmente saturada; no necesitamos contar toda
          // la masa. Tope fijo => costo lineal incluso con 80 superpuestos.
          if (localChecks >= 12) break scan;
        }
      }
      info.set(e, { nearby, overlap, intensity: Math.min(1, nearby / 7 + overlap * 0.22) });
    }
    return { info, comparisons, count: grid.size };
  };

  // (ver NV.drawDensityFog) — el contorno por-enemigo fue reemplazado por neblina.

  NV.drawContactReadability = function (ctx, e, player, debug, env) {
    if (!player || !e || e.dead) return false;
    if (!NV.META_VIS_OPTIONS.contact) return false;
    const e2 = metaEnv(env);
    const contactRadius = e.radius + 20; // espejo visual exacto; no participa en colisión
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    const imminent = d < contactRadius + 18;
    if (!debug && !imminent && !(e.atkFlash > 0)) return false;
    const closeness = Math.max(0, Math.min(1, 1 - (d - contactRadius) / 18));
    ctx.save();
    if (debug) {
      // Modo técnico: anillo blanco punteado, sin duda de debug.
      ctx.globalAlpha = 0.34 * e2.gain;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, contactRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Anillo de advertencia con borde aserrado giratorio.
      const danger = e.atkFlash > 0 || closeness > 0.62;
      const teeth = 10;
      const wobble = 0.75 + (danger ? 0.35 : 0.1) * Math.sin(e2.t * (danger ? 9 : 5) * Math.PI * 2);
      ctx.globalAlpha = Math.min(0.6, (danger ? 0.34 : 0.08) + closeness * 0.2) * e2.gain;
      ctx.strokeStyle = danger ? NV.META_VIS_PALETTE.danger : NV.META_VIS_PALETTE.dangerSoft;
      ctx.lineWidth = danger ? 2.5 : 1.4;
      ctx.beginPath();
      for (let i = 0; i <= teeth; i++) {
        const a = e2.t * (danger ? 1.6 : 0.5) + (i / teeth) * Math.PI * 2;
        const rr = contactRadius * (1 + 0.045 * Math.sin(a * (danger ? 14 : 9) + e2.t * 3));
        const x = e.x + Math.cos(a) * rr * wobble, y = e.y + Math.sin(a) * rr * wobble;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    return true;
  };

  NV.drawDamageFeedback = function (ctx, player, feedback, env) {
    if (!feedback || feedback.life <= 0) return false;
    if (!NV.META_VIS_OPTIONS.damage) return false;
    const e2 = metaEnv(env);
    const t = Math.max(0, Math.min(1, feedback.life / 0.55));
    ctx.save();
    // Sin línea de origen de daño: solo feedback local anclado al jugador.
    ctx.globalAlpha = t * 0.28 * e2.gain;
    ctx.strokeStyle = feedback.critical ? NV.META_VIS_PALETTE.warn : NV.META_VIS_PALETTE.dangerSoft;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(player.x, player.y, 22 + (1 - t) * 22, 0, Math.PI * 2); ctx.stroke();
    if (feedback.flash > 0) {
      ctx.globalAlpha = Math.min(0.5, feedback.flash * 8) * e2.gain;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(player.x, player.y, 12 + feedback.flash * 30, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return true;
  };

  NV.drawAutofireTarget = function (ctx, target, frame, player, inRange, debug, env) {
    if (!NV.META_VIS_OPTIONS.autofire) return false;
    const e2 = metaEnv(env);
    ctx.save();
    if (!target || target.dead) {
      // F09.5 — ELIMINADO: círculo punteado "Buscando" alrededor del jugador.
      // Era el contorno segmentado redundante visible durante oleadas/eventos/jefes
      // (radio 34, setLineDash [4,4]). El estado de autoapuntado ya se lee en el
      // retículo sobre el objetivo y en el HUD; sin draws, sin coste extra.
      ctx.restore();
      return false;
    }
    const r = (target.radius || 10) + 8;
    const safe = inRange !== false;
    // Retículo minimalista estático (aro + cruz), sin rotación ni pulso.
    // Base limpia para futuras reglas de autoapuntado / meta de uso.
    // Fuera de rango = info fría amiga: el ROJO queda reservado al peligro hostil entrante.
    ctx.globalAlpha = (safe ? 0.35 : 0.22) * e2.gain;
    ctx.strokeStyle = safe ? NV.META_VIS_PALETTE.safe : '#66CCFF';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    // Aro fino alrededor del objetivo.
    ctx.beginPath();
    ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Cuatro ticks de cruz cardinales (mínimos, dejan hueco central).
    const tick = Math.max(3, r * 0.4);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(target.x + c * (r + 2), target.y + s * (r + 2));
      ctx.lineTo(target.x + c * (r + 2 + tick), target.y + s * (r + 2 + tick));
      ctx.stroke();
    }
    // Línea de mira desde el jugador (solo debug).
    if (debug && player) {
      ctx.globalAlpha = 0.1 * e2.gain;
      ctx.strokeStyle = NV.META_VIS_PALETTE.info;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(target.x, target.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return true;
  };

  NV.drawEnemyIntent = function (ctx, e, player, env) {
    if (!e || e.dead || !player || !NV.META_VIS_OPTIONS.intent) return false;
    const e2 = metaEnv(env);
    let drawn = false;
    ctx.save();
    if (e.behavior === 'ranged') {
      const d = Math.hypot(player.x - e.x, player.y - e.y);
      if (d <= 170) {
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        // Semicírculo de "estacionamiento" con líneas radiales.
        ctx.globalAlpha = 0.14 * e2.gain;
        ctx.strokeStyle = NV.META_VIS_PALETTE.info;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 8, a - Math.PI / 2, a + Math.PI / 2); ctx.stroke();
        for (let i = -2; i <= 2; i++) {
          const aa = a + i * Math.PI / 8;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(aa) * (e.radius + 5), e.y + Math.sin(aa) * (e.radius + 5));
          ctx.lineTo(e.x + Math.cos(aa) * (e.radius + 9), e.y + Math.sin(aa) * (e.radius + 9));
          ctx.stroke();
        }
        drawn = true;
      }
    }
    ctx.restore();
    return drawn;
  };

  // ===== META-VIS-02b: neblina de densidad =====
  // Gradiente radial pulsante que emana de los núcleos de masa. Violeta en
  // densidad normal, naranja cuando el solapamiento es extremo. Partículas
  // de "calor" se elevan en núcleos muy comprimidos. Tope por frame.
  NV.drawDensityFog = function (ctx, enemies, info, env) {
    if (!NV.META_VIS_OPTIONS.density || !enemies) return false;
    const e2 = metaEnv(env);
    const dim = e2.gain * (1 - 0.45 * e2.saturation);
    let drawn = 0;
    for (const en of enemies) {
      if (drawn >= META_FOG_MAX) break;
      if (!en || en.dead) continue;
      const d = info && info.get ? info.get(en) : null;
      if (!d || d.intensity < 0.3) continue;
      drawn++;
      const pulse = 0.85 + 0.15 * Math.sin(e2.t * 2 + en.x * 0.013);
      const radius = en.radius * 2.2 + (d.nearby || 0) * 3;
      const hot = (d.overlap || 0) > 1.2;
      const gradient = ctx.createRadialGradient(en.x, en.y, 0, en.x, en.y, radius);
      gradient.addColorStop(0, hot ? 'rgba(255,136,76,0.16)' : 'rgba(170,102,255,0.13)');
      gradient.addColorStop(0.45, hot ? 'rgba(255,100,50,0.08)' : 'rgba(150,80,220,0.06)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, dim * pulse);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(en.x, en.y, radius, 0, Math.PI * 2);
      ctx.fill();
      // Partículas de calor en núcleos muy comprimidos.
      if (d.intensity > 0.6) {
        for (let i = 0; i < 3; i++) {
          const seed = (i + 1) * 0.37 + en.x * 0.003 + en.y * 0.001;
          const angle = seed * Math.PI * 2;
          const drift = (e2.t * 22 + seed * 40) % (radius * 0.8);
          const px = en.x + Math.cos(angle) * drift;
          const py = en.y + Math.sin(angle) * drift - ((e2.t * 26 + seed * 50) % 24);
          ctx.globalAlpha = Math.min(0.35, dim * (0.05 + 0.05 * Math.sin(e2.t * 3 + seed * 9)));
          ctx.fillStyle = hot ? '#ffb37a' : '#c9a0ff';
          ctx.beginPath();
          ctx.arc(px, py, 1 + ((seed * 7) % 1.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    return drawn > 0;
  };
})();