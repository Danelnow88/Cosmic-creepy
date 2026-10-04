// ===== RENDER: enemigos =====
// Función de dibujo PURA para enemigos. game.js aporta ctx y frame al llamarla.
(() => {
  'use strict';
  const NV = window.NV;
  const TAU = Math.PI * 2;
  const COMMON_ENEMY_IDS = new Set(['drone', 'runner', 'tank', 'shielder', 'swarmlet', 'spitter', 'wisp', 'kamikaze']);
  const COMMON_VISUALS = {
    drone: { color: '#78cfff', rgb: '120,207,255', scale: 0.56 },
    runner: { color: '#ffd26a', rgb: '255,210,106', scale: 0.46 },
    tank: { color: '#8fd8ff', rgb: '143,216,255', scale: 0.50 },
    shielder: { color: '#caa7ff', rgb: '202,167,255', scale: 0.48 },
    swarmlet: { color: '#22d3ee', rgb: '34,211,238', scale: 0.58 },
    spitter: { color: '#59a7ff', rgb: '89,167,255', scale: 0.48 },
    wisp: { color: '#4ade80', rgb: '74,222,128', scale: 0.56 },
    kamikaze: { color: '#ff5f3d', rgb: '255,95,61', scale: 0.54 },
  };
  const WARM_CORE = { color: '#fff4cf', rgb: '255,244,207' };
  const WARM_CRACK = { color: '#ffe7d9', rgb: '255,231,217' };
  const WISP_HOSTILE_MARK_COLOR = '#d94b55';
  const DRONE_ROTORS = [[-24, -18], [24, -18], [-24, 18], [24, 18]];
  const DRONE_CRACK = [[-8, 0], [0, -3], [9, -1]];
  const RUNNER_CRACK_TOP = [[-8, -3], [5, -4], [18, -3], [29, -1]];
  const RUNNER_CRACK_BOTTOM = [[-8, 3], [5, 4], [18, 3], [29, 1]];
  const TANK_FEET = [-18, 5, 26];
  const TANK_CRACK_BODY = [[-18, 5], [2, 4], [20, 7]];
  const TANK_CRACK_TURRET = [[-14, 9], [0, 7], [12, 9]];
  const SHIELDER_NODES = [[10, 0, 2.2], [22, 0, 2.8], [34, 0, 2.2]];
  const SHIELDER_CRACK_CENTER = [[15, 0], [24, 0], [37, 0]];
  const SHIELDER_CRACK_TOP = [[8, -10], [16, -5], [23, -2]];
  const SHIELDER_CRACK_BOTTOM = [[8, 10], [16, 5], [23, 2]];
  const SWARMLET_ORBIT_SPEED = 1.35;
  const SPITTER_EYES = [[-17, -6, 3.3, 3.8], [-7, -10, 3.1, 3.5], [7, -10, 3.1, 3.5], [17, -6, 3.3, 3.8]];
  const SPITTER_TENTACLES = [-18, -8, 0, 8, 18];
  const SPITTER_CRACK_BODY = [[-8, 1], [0, 4], [8, 1]];
  const SPITTER_CRACK_NOZZLE = [[-1, 13], [0, 21], [1, 29]];
  const KAMIKAZE_EYES = [[-8, 5], [8, 5], [0, -9]];
  const STATIC_RGBA_ALPHAS = [0.1, 0.18, 0.2, 0.22, 0.24, 0.28, 0.3, 0.32, 0.34, 0.36, 0.42, 0.46, 0.48, 0.5, 0.55, 0.56, 0.6, 0.62, 0.64, 0.72, 0.78, 0.8, 0.86, 0.88, 0.9, 0.92, 0.94, 0.95, 0.96];

  function prepareRgba(color) {
    const cache = Object.create(null);
    for (const alpha of STATIC_RGBA_ALPHAS) cache[alpha] = 'rgba(' + color.rgb + ',' + alpha + ')';
    color.rgba = cache;
  }
  for (const id of COMMON_ENEMY_IDS) prepareRgba(COMMON_VISUALS[id]);
  prepareRgba(WARM_CORE);
  prepareRgba(WARM_CRACK);

  // ===== TEMPORAL (Fase 1): diagnóstico de rendimiento A/B, SOLO render =====
  // Cambia únicamente el cuerpo de los 8 enemigos comunes. No toca gameplay,
  // spawn, IA, hitbox, estados ni entidades. No se persiste (reload => 'full').
  //   'full'    -> visuales aprobados con faux glow explícito barato (default)
  //   'no-blur' -> mismo body/ojos base, sin las capas explícitas de glow
  //   'legacy'  -> omite el body especializado y usa el fallback geométrico previo
  let commonDiagMode = 'full';
  let commonFauxGlowEnabled = true;
  const COMMON_DIAG_MODES = ['full', 'no-blur', 'legacy'];
  const commonFacingCache = new WeakMap();
  const swarmletSeedCache = new WeakMap();
  let nextSwarmletSeed = 1;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function shortestAngle(from, to) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  function smoothFacing(e, key, target, blend) {
    let cached = commonFacingCache.get(e);
    if (!cached) { cached = Object.create(null); commonFacingCache.set(e, cached); }
    let angle = cached[key];
    if (!Number.isFinite(angle)) angle = target;
    else angle += shortestAngle(angle, target) * blend;
    cached[key] = angle;
    return angle;
  }
  function smoothScalar(e, key, target, blend) {
    let cached = commonFacingCache.get(e);
    if (!cached) { cached = Object.create(null); commonFacingCache.set(e, cached); }
    let value = cached[key];
    if (!Number.isFinite(value)) value = target;
    else value += (target - value) * blend;
    cached[key] = value;
    return value;
  }
  function stableSwarmletSeed(e) {
    let seed = swarmletSeedCache.get(e);
    if (seed === undefined) {
      seed = ((nextSwarmletSeed++ * 0.6180339887498949) % 1) * TAU;
      swarmletSeedCache.set(e, seed);
    }
    return seed;
  }
  function runnerFacing(e, dx, dy) {
    const state = e.intent && e.intent.state ? e.intent.state : e.flankState;
    let fx = dx, fy = dy;
    if ((state === 'attack' || state === 'COMMIT') && (Math.abs(e.commitDirX || 0) + Math.abs(e.commitDirY || 0) > 1e-6)) {
      fx = e.commitDirX; fy = e.commitDirY;
    } else if (state === 'recovery') {
      fx = -dx; fy = -dy;
    } else if (state === 'idle' || state === 'positioning' || !state) {
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const flankSide = e.flankSide === -1 ? -1 : 1;
      const flankOffset = 90 + flankSide * 30;
      fx = dx - (dy / dist) * flankOffset;
      fy = dy + (dx / dist) * flankOffset;
    }
    return Math.atan2(fy, fx);
  }
  function rgba(color, alpha) { return color.rgba[alpha] || ('rgba(' + color.rgb + ',' + alpha + ')'); }
  function neutralShadow(ctx) { ctx.shadowBlur = 0; }
  function under(ctx, width) {
    neutralShadow(ctx);
    ctx.strokeStyle = 'rgba(0,0,0,.88)'; ctx.lineWidth = width == null ? 6 : width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function fauxGlowStroke(ctx, color, width, alpha) {
    if (!commonFauxGlowEnabled) return;
    neutralShadow(ctx); ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function neon(ctx, color, width, spread, alpha) {
    const crispWidth = width == null ? 2 : width;
    const crispAlpha = alpha == null ? 0.92 : alpha;
    const glowSpread = spread == null ? 4 : spread;
    const glowAlpha = glowSpread >= 6 ? 0.34 : crispAlpha >= 0.9 ? 0.3 : 0.24;
    fauxGlowStroke(ctx, color, crispWidth + 1.8 + glowSpread * 0.48, glowAlpha);
    ctx.strokeStyle = rgba(color, crispAlpha);
    ctx.lineWidth = crispWidth; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    neutralShadow(ctx);
  }
  function darkFill(ctx) { neutralShadow(ctx); ctx.fillStyle = '#06080d'; ctx.fill(); }
  function crack(ctx, points, color, alpha, width) {
    neutralShadow(ctx); ctx.strokeStyle = rgba(color, alpha == null ? 0.6 : alpha);
    ctx.lineWidth = width == null ? 1.3 : width; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }
  function glowCore(ctx, x, y, radius, color, alpha) {
    const coreAlpha = alpha == null ? 0.7 : alpha;
    ctx.save(); neutralShadow(ctx);
    if (commonFauxGlowEnabled) {
      ctx.fillStyle = rgba(color, coreAlpha >= 0.7 ? 0.22 : coreAlpha >= 0.4 ? 0.18 : 0.1);
      ctx.beginPath(); ctx.arc(x, y, radius * 1.75 + 1.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = rgba(color, coreAlpha); ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    ctx.restore(); neutralShadow(ctx);
  }
  function canvasPoint(ctx, x, y) {
    const world = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    if (!world) return { x, y };
    return { x: world.a * x + world.c * y + world.e, y: world.b * x + world.d * y + world.f };
  }
  function localTarget(ctx, target) {
    if (!target) return;
    let tx = target.x, ty = target.y;
    if (typeof ctx.getTransform === 'function') {
      const m = ctx.getTransform();
      const det = m.a * m.d - m.b * m.c;
      if (Math.abs(det) > 1e-8) {
        const gx = target.x - m.e, gy = target.y - m.f;
        tx = (m.d * gx - m.c * gy) / det;
        ty = (-m.b * gx + m.a * gy) / det;
      }
    }
    return { x: tx, y: ty };
  }
  function eye(ctx, x, y, rx, ry, target, color) {
    if (!target) return;
    const dx = target.x - x, dy = target.y - y, distance = Math.max(0.001, Math.hypot(dx, dy));
    const px = dx / distance * rx * 0.38, py = dy / distance * ry * 0.38;
    ctx.save(); neutralShadow(ctx);
    ctx.fillStyle = '#020306'; ctx.beginPath(); ctx.ellipse(x, y, rx + 2, ry + 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ecf7f8'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#101217'; ctx.beginPath(); ctx.ellipse(x + px, y + py, rx * 0.42, ry * 0.46, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(color, 0.72); ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(x - px * 0.15, y - py * 0.15, Math.max(1, Math.min(rx, ry) * 0.14), 0, TAU); ctx.fill();
    ctx.restore(); neutralShadow(ctx);
  }

  function drawDrone(ctx, e, color, seed, t, target) {
    const bob = Math.sin(t * 2.2 + seed) * 1.1, spin = t * 12;
    ctx.save(); ctx.translate(0, bob); ctx.rotate(Math.sin(t * 1.8 + seed) * 0.04);
    for (const pos of DRONE_ROTORS) {
      const rx = pos[0], ry = pos[1]; ctx.beginPath(); ctx.moveTo(Math.sign(rx) * 8, Math.sign(ry) * 5);
      ctx.quadraticCurveTo(rx * 0.55, ry * 0.55, rx, ry); ctx.strokeStyle = rgba(color, 0.62); ctx.lineWidth = 3.3; ctx.lineCap = 'round'; ctx.stroke();
    }
    DRONE_ROTORS.forEach((pos, i) => {
      ctx.save(); ctx.translate(pos[0], pos[1]); ctx.beginPath(); ctx.ellipse(0, 0, 8, 8, 0, 0, TAU); under(ctx, 4.6); darkFill(ctx); neon(ctx, color, 1.55, 3, 0.8);
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.strokeStyle = rgba(color, 0.42); ctx.lineWidth = 1.4; ctx.stroke(); ctx.rotate(spin + i * 0.7);
      for (let blade = 0; blade < 2; blade++) { ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.1, blade * Math.PI, 0, TAU); ctx.strokeStyle = rgba(color, 0.32); ctx.lineWidth = 1.5; ctx.stroke(); }
      glowCore(ctx, 0, 0, 1.5, color, 0.42); ctx.restore();
    });
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.quadraticCurveTo(-10, -17, 6, -17); ctx.quadraticCurveTo(20, -16, 24, -4); ctx.quadraticCurveTo(25, 0, 24, 4); ctx.quadraticCurveTo(20, 16, 6, 17); ctx.quadraticCurveTo(-10, 17, -18, 6); ctx.quadraticCurveTo(-22, 0, -18, -6); ctx.closePath(); under(ctx, 6); darkFill(ctx); neon(ctx, color, 2.05, 4, 0.92);
    ctx.beginPath(); ctx.ellipse(9, 0, 9, 7, 0, 0, TAU); ctx.fillStyle = '#010204'; ctx.fill(); ctx.strokeStyle = rgba(color, 0.3); ctx.lineWidth = 1.1; ctx.stroke();
    const eyesTarget = localTarget(ctx, target);
    eye(ctx, 6, -1, 3.9, 4.5, eyesTarget, color); eye(ctx, 14, 1, 3.2, 3.8, eyesTarget, color); crack(ctx, DRONE_CRACK, color, 0.34, 1); glowCore(ctx, -6, 0, 1.8, color, 0.36); ctx.restore();
  }

  function drawRunner(ctx, e, color, seed, t, target, facingX, facingY) {
    const facing = smoothFacing(e, 'runner', runnerFacing(e, facingX, facingY), 0.34);
    ctx.save(); ctx.rotate(facing); ctx.translate(-1, 0); ctx.rotate(Math.sin(t * 4.6 + seed) * 0.018);
    for (let side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(-20, side * 3); ctx.quadraticCurveTo(-34, side * 2, -49, side * (10 + Math.sin(t * 5 + side) * 1.2)); ctx.strokeStyle = rgba(color, 0.64); ctx.lineWidth = 2.7; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-10, -13, 14, -14); ctx.quadraticCurveTo(31, -12, 42, -3); ctx.quadraticCurveTo(48, 0, 42, 3); ctx.quadraticCurveTo(31, 12, 14, 14); ctx.quadraticCurveTo(-10, 13, -22, 0); ctx.closePath(); under(ctx, 5.6); darkFill(ctx); neon(ctx, color, 1.95, 3.8, 0.94);
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(10, -7, 28, 0); ctx.quadraticCurveTo(10, 7, -6, 0); ctx.closePath(); under(ctx, 3.8); ctx.fillStyle = '#03060b'; ctx.fill(); neon(ctx, color, 1.2, 2.2, 0.5);
    for (let side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(-2, side * 4); ctx.quadraticCurveTo(-14, side * (12 + Math.sin(t * 6 + side) * 1.2), -20, side * 21); ctx.quadraticCurveTo(-23, side * 26, -30, side * 15); ctx.strokeStyle = rgba(color, 0.8); ctx.lineWidth = 3.7; ctx.lineCap = 'round'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-27, side * 15); ctx.lineTo(-37, side * 14); ctx.lineTo(-31, side * 20); ctx.closePath(); ctx.fillStyle = rgba(color, 0.2); ctx.fill(); ctx.strokeStyle = rgba(color, 0.64); ctx.lineWidth = 1.1; ctx.stroke(); }
    for (let side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(14, side * 5); ctx.quadraticCurveTo(19, side * 8, 20, side * 12); ctx.strokeStyle = rgba(color, 0.46); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(23, -6); ctx.lineTo(49, -2); ctx.lineTo(49, 2); ctx.lineTo(23, 6); ctx.quadraticCurveTo(30, 0, 23, -6); ctx.closePath(); under(ctx, 4.5); ctx.fillStyle = '#05070d'; ctx.fill(); neon(ctx, color, 1.5, 2.9, 0.8);
    const eyesTarget = localTarget(ctx, target);
    eye(ctx, 21, -5, 3.7, 4.1, eyesTarget, color); eye(ctx, 21, 5, 3.7, 4.1, eyesTarget, color); crack(ctx, RUNNER_CRACK_TOP, color, 0.34, 1); crack(ctx, RUNNER_CRACK_BOTTOM, color, 0.24, 1); glowCore(ctx, 0, 0, 1.6, color, 0.32); ctx.restore();
  }

  function drawTank(ctx, e, color, seed, t, target, facingX, facingY) {
    const bob = Math.sin(t * 0.8 + seed), recoil = Math.sin(t * 2 + seed) * 0.35, pulse = (Math.sin(t * 1.6 + seed) + 1) / 2;
    ctx.save(); ctx.translate(-4, 10 + bob); ctx.fillStyle = 'rgba(0,0,0,.30)'; ctx.beginPath(); ctx.ellipse(4, 18, 40, 7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-38, 6); ctx.lineTo(-18, -4); ctx.lineTo(18, -4); ctx.lineTo(33, 2); ctx.lineTo(37, 10); ctx.lineTo(26, 17); ctx.lineTo(-20, 17); ctx.lineTo(-36, 12); ctx.closePath(); under(ctx, 7); darkFill(ctx); neon(ctx, color, 2.25, 4.1, 0.94);
    ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(12, -9); ctx.lineTo(24, -4); ctx.lineTo(22, 3); ctx.lineTo(2, 4); ctx.lineTo(-10, 0); ctx.closePath(); under(ctx, 5.3); ctx.fillStyle = '#05070d'; ctx.fill(); neon(ctx, color, 1.75, 3.2, 0.78);
    ctx.save(); ctx.translate(8, -10); ctx.rotate(Math.atan2(facingY, facingX));
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.lineTo(15, -1); ctx.lineTo(14, 5); ctx.lineTo(-2, 6); ctx.lineTo(-9, 2); ctx.closePath(); under(ctx, 4.8); ctx.fillStyle = '#04070c'; ctx.fill(); neon(ctx, color, 1.55, 2.9, 0.72);
    ctx.save(); ctx.translate(10 - recoil, 0); ctx.beginPath(); ctx.moveTo(0, -2.8); ctx.lineTo(32, -2.8); ctx.lineTo(40, -1.2); ctx.lineTo(40, 1.2); ctx.lineTo(32, 2.8); ctx.lineTo(0, 2.8); ctx.closePath(); under(ctx, 4.2); ctx.fillStyle = '#03060b'; ctx.fill(); neon(ctx, color, 1.45, 2.8, 0.8); ctx.restore();
    crack(ctx, TANK_CRACK_TURRET, color, 0.18, 1); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-12, -6); ctx.lineTo(-4, -1); ctx.lineTo(-8, 8); ctx.lineTo(-22, 8); ctx.closePath(); under(ctx, 4.4); ctx.fillStyle = '#04070c'; ctx.fill(); neon(ctx, color, 1.3, 2.6, 0.6);
    for (const x of TANK_FEET) { ctx.beginPath(); ctx.moveTo(x - 5, 16); ctx.lineTo(x + 5, 16); ctx.lineTo(x + 4, 23); ctx.lineTo(x - 4, 23); ctx.closePath(); under(ctx, 3.8); ctx.fillStyle = '#04070c'; ctx.fill(); neon(ctx, color, 1.1, 2.2, 0.5); ctx.beginPath(); ctx.ellipse(x, 26, 5 + pulse * 0.2, 2.5 + pulse * 0.1, 0, 0, TAU); ctx.fillStyle = rgba(color, 0.1); ctx.fill(); ctx.strokeStyle = rgba(color, 0.28); ctx.lineWidth = 1; ctx.stroke(); }
    crack(ctx, TANK_CRACK_BODY, color, 0.2, 1); ctx.restore();
  }

  function drawShielder(ctx, e, color, seed, t, target, facingX, facingY) {
    const active = e.shield !== false && !(e.shieldCd > 0), sway = Math.sin(t * 1.6 + seed) * 1.5, pulse = (Math.sin(t * 2.2 + seed) + 1) / 2;
    const bladeOpen = smoothScalar(e, 'shielderBlades', active ? 0 : 1, 0.16);
    const facing = smoothFacing(e, 'shielder', Math.atan2(facingY, facingX), 0.24);
    ctx.save(); ctx.rotate(facing); ctx.translate(-2, sway); ctx.beginPath(); ctx.moveTo(-28, -16); ctx.quadraticCurveTo(-15, -30, 2, -18); ctx.quadraticCurveTo(8, 0, 2, 18); ctx.quadraticCurveTo(-15, 30, -28, 16); ctx.quadraticCurveTo(-35, 0, -28, -16); ctx.closePath(); under(ctx, 6); darkFill(ctx); neon(ctx, color, 2, 3.8, 0.88); eye(ctx, -15, 0, 5.8, 6.4, localTarget(ctx, target), color);
    const shieldAlpha = active ? 0.96 : 0.32;
    ctx.save(); ctx.translate(-7, -4); ctx.rotate(-bladeOpen * 0.32); ctx.translate(7, 4);
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.quadraticCurveTo(8, -26, 34, -28); ctx.quadraticCurveTo(45, -19 - pulse * 1.5, 45, -8); ctx.quadraticCurveTo(33, -2, 18, -1); ctx.quadraticCurveTo(2, -1, -7, -4); ctx.closePath(); under(ctx, 6.2); ctx.fillStyle = '#05070d'; ctx.fill(); neon(ctx, color, 2.3, active ? 4.6 : 1.5, shieldAlpha);
    ctx.restore(); ctx.save(); ctx.translate(-7, 4); ctx.rotate(bladeOpen * 0.32); ctx.translate(7, -4);
    ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(8, 26, 34, 28); ctx.quadraticCurveTo(45, 19 + pulse * 1.5, 45, 8); ctx.quadraticCurveTo(33, 2, 18, 1); ctx.quadraticCurveTo(2, 1, -7, 4); ctx.closePath(); under(ctx, 6.2); ctx.fillStyle = '#05070d'; ctx.fill(); neon(ctx, color, 2.3, active ? 4.6 : 1.5, shieldAlpha);
    ctx.restore();
    for (const n of SHIELDER_NODES) glowCore(ctx, n[0], n[1], n[2] + pulse * 0.25, color, active ? 0.66 + 0.08 * pulse : 0.2);
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(22, -3 - pulse * 0.8, 35, 0); ctx.strokeStyle = rgba(color, active ? 0.56 : 0.18); ctx.lineWidth = 1.5; ctx.stroke(); crack(ctx, SHIELDER_CRACK_CENTER, color, active ? 0.64 : 0.2, 1.3); crack(ctx, SHIELDER_CRACK_TOP, color, 0.24, 1); crack(ctx, SHIELDER_CRACK_BOTTOM, color, 0.24, 1); ctx.restore();
  }

  function drawSwarmlet(ctx, e, color, seed, t, target) {
    const orbit = t * SWARMLET_ORBIT_SPEED + seed;
    if (e.swarmState === 'regroup') ctx.globalAlpha *= 0.62;
    if (e.swarmReady) {
      const readyPulse = 0.5 + Math.sin(t * 10 + seed) * 0.5;
      ctx.beginPath(); ctx.arc(0, 0, 25 + readyPulse * 3, 0, TAU); ctx.strokeStyle = rgba(color, 0.46 + readyPulse * 0.24); ctx.lineWidth = 1.4; ctx.stroke();
    } else if (e.swarmState === 'commit') {
      const dirX = e.swarmCommitDirX || 0, dirY = e.swarmCommitDirY || 0;
      ctx.beginPath(); ctx.moveTo(-dirX * 19, -dirY * 19); ctx.lineTo(-dirX * 43, -dirY * 43); ctx.strokeStyle = rgba(color, 0.64); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    for (let i = 0; i < 3; i++) { const a = orbit + i * TAU / 3, px = Math.cos(a) * 14, py = Math.sin(a * 1.1) * 9; ctx.save(); ctx.translate(px, py); ctx.rotate(a * 0.25 + i * 0.7); ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(0, -7, 8, -2); ctx.lineTo(12, 0); ctx.lineTo(8, 2); ctx.quadraticCurveTo(0, 7, -8, 3); ctx.closePath(); under(ctx, 4); darkFill(ctx); neon(ctx, color, 1.4, 3, 0.9); eye(ctx, 2, 0, 2.5, 2.7, localTarget(ctx, target), color); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-13, 5 * Math.sin(t * 4 + i), -15, 0); ctx.strokeStyle = rgba(color, 0.55); ctx.lineWidth = 2.3; ctx.stroke(); ctx.restore(); }
  }

  function drawSpitter(ctx, e, color, seed, t, target) {
    const driftY = Math.sin(t * 1.8 + seed) * 2.4, sway = Math.sin(t * 1.1 + seed) * 1.6;
    const state = e.intent && e.intent.state ? e.intent.state : e.spitState;
    const windup = state === 'windup' ? clamp(1 - ((e.intent ? e.intent.stateTimer : e.spitTimer) || 0) / 0.6, 0, 1) : 0;
    const firing = state === 'attack' || e.spitFired === true;
    const pulse = clamp((Math.sin(t * 2.1 + seed) + 1) / 2 + windup * 0.7 + (firing ? 0.35 : 0), 0, 1.7);
    ctx.save(); ctx.translate(sway, -3 + driftY);
    ctx.beginPath(); ctx.moveTo(-30, -2); ctx.quadraticCurveTo(-23, -27, 0, -31); ctx.quadraticCurveTo(23, -27, 30, -2); ctx.quadraticCurveTo(22, 10, 0, 13); ctx.quadraticCurveTo(-22, 10, -30, -2); ctx.closePath(); under(ctx, 6); darkFill(ctx); neon(ctx, color, 2.25, 4.2 + windup * 5, 0.92);
    ctx.beginPath(); ctx.ellipse(0, -1, 16 + pulse * 2.2, 8 + pulse * 1.1, 0, 0, TAU); ctx.fillStyle = rgba(color, 0.13 + windup * 0.12); ctx.fill(); ctx.strokeStyle = rgba(color, 0.42 + windup * 0.25); ctx.lineWidth = 1.2; ctx.stroke();
    const eyesTarget = localTarget(ctx, target);
    for (const p of SPITTER_EYES) eye(ctx, p[0], p[1], p[2], p[3], eyesTarget, color);
    for (const x of SPITTER_TENTACLES) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.quadraticCurveTo(x + (x < 0 ? -2 : x > 0 ? 2 : 0), 17 + pulse * 2, x + (x < 0 ? -5 : x > 0 ? 5 : 0) + Math.sin(t * 2 + x) * 0.6, 24 + pulse * 0.8); ctx.strokeStyle = rgba(color, 0.48); ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(-11, 24, -5, 34); ctx.quadraticCurveTo(0, 41, 7, 34); ctx.quadraticCurveTo(13, 24, 9, 10); ctx.quadraticCurveTo(4, 15, -1, 15); ctx.quadraticCurveTo(-5, 15, -8, 10); ctx.closePath(); under(ctx, 5.2); ctx.fillStyle = '#05070d'; ctx.fill(); neon(ctx, color, 1.95, 3.9 + windup * 6, 0.86);
    ctx.beginPath(); ctx.ellipse(0, 25, 7 + pulse * 2.1, 8 + pulse * 1.3, 0, 0, TAU); ctx.fillStyle = rgba(color, 0.18 + windup * 0.2); ctx.fill(); ctx.strokeStyle = rgba(color, 0.72 + windup * 0.2); ctx.lineWidth = 1.5; ctx.stroke(); glowCore(ctx, 0, 25, 3.1 + pulse, firing ? WARM_CORE : color, 0.78);
    ctx.beginPath(); ctx.ellipse(0, 36, 5.6, 4.6, 0, 0, TAU); ctx.fillStyle = '#010204'; ctx.fill(); ctx.strokeStyle = rgba(color, 0.86); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -37, 14 + pulse * 1.2, 5 + pulse * 0.4, 0, 0, TAU); fauxGlowStroke(ctx, color, 4.2 + windup * 3.2, windup >= 0.66 ? 0.32 : windup > 0 ? 0.24 : 0.18); ctx.strokeStyle = rgba(color, 0.36 + windup * 0.28); ctx.lineWidth = 1.5; ctx.stroke(); neutralShadow(ctx);
    glowCore(ctx, -9, -37, 1.7, color, 0.42); glowCore(ctx, 9, -37, 1.7, color, 0.42); glowCore(ctx, -6, 43, 1.5, color, 0.34); glowCore(ctx, 6, 46, 1.4, color, 0.28); crack(ctx, SPITTER_CRACK_BODY, color, 0.28, 1); crack(ctx, SPITTER_CRACK_NOZZLE, color, 0.24, 1); ctx.restore();
  }

  function drawWisp(ctx, e, color, seed, t, target) {
    const driftY = Math.sin(t * 2.4 + seed) * 3, driftX = Math.sin(t * 1.2 + seed) * 1.8;
    const state = e.wispPhaseState || 'drift';
    const invScale = 1 / color.scale;
    if (state === 'mark') {
      const progress = clamp(1 - (e.wispPhaseTimer || 0) / 0.48, 0, 1);
      const mx = (e.wispTargetX - e.x) * invScale;
      const my = (e.wispTargetY - e.y) * invScale;
      const outer = (91 - progress * 23) * invScale;
      const pulse = (6 + Math.sin(t * 12 + seed) * 2) * invScale;
      ctx.save(); ctx.translate(mx, my); neutralShadow(ctx);
      ctx.globalAlpha = 0.45 + progress * 0.45;
      ctx.strokeStyle = WISP_HOSTILE_MARK_COLOR; ctx.lineWidth = 2.2 * invScale;
      ctx.beginPath(); ctx.arc(0, 0, outer, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.28 + progress * 0.5;
      ctx.beginPath(); ctx.arc(0, 0, (68 + pulse) * invScale, 0, TAU); ctx.stroke();
      const cross = (81 - progress * 10) * invScale;
      ctx.beginPath(); ctx.moveTo(-cross, 0); ctx.lineTo(-24 * invScale, 0); ctx.moveTo(cross, 0); ctx.lineTo(24 * invScale, 0); ctx.moveTo(0, -cross); ctx.lineTo(0, -24 * invScale); ctx.moveTo(0, cross); ctx.lineTo(0, 24 * invScale); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(driftX, -2 + driftY);
    if (state === 'phase_out') {
      const phase = clamp(1 - (e.wispPhaseTimer || 0) / 0.30, 0, 1);
      ctx.globalAlpha = 0.88 * (1 - phase * 0.72);
      ctx.scale(1 + phase * 0.35, 1 - phase * 0.55);
    } else {
      ctx.globalAlpha = state === 'recovery' ? 0.68 : 0.88;
    }
    if (state === 'pulse') {
      const flash = clamp((e.wispPhaseTimer || 0) / 0.12, 0, 1);
      ctx.strokeStyle = WISP_HOSTILE_MARK_COLOR; ctx.lineWidth = 2.4 * invScale;
      ctx.beginPath(); ctx.arc(0, 0, (68 - flash * 18) * invScale, 0, TAU); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.quadraticCurveTo(-8, -20, 4, -20); ctx.quadraticCurveTo(17, -18, 18, -4); ctx.lineTo(17, 11); ctx.quadraticCurveTo(12, 6 + Math.sin(t * 3.5) * 1.5, 8, 14); ctx.quadraticCurveTo(3, 7, -2, 15); ctx.quadraticCurveTo(-8, 7, -13, 12 + Math.sin(t * 3.2 + 1.1) * 1.4); ctx.quadraticCurveTo(-17, 3, -14, -5); ctx.closePath(); under(ctx, 5); ctx.fillStyle = 'rgba(3,7,8,.82)'; ctx.fill(); neon(ctx, color, 1.8, 6, 0.88); eye(ctx, 3, -5, 6.4, 7.1, localTarget(ctx, target), color); ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(0, 10 + Math.sin(t * 3.3) * 1.2, 11, 4); ctx.strokeStyle = rgba(color, 0.22); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }

  function drawKamikaze(ctx, e, color, seed, t, target) {
    const arm = e.armed ? clamp(1 - Math.max(e.fuse || 0, 0) / 0.8, 0, 1) : 0;
    const flash = arm * (0.5 + 0.5 * Math.sin(t * (7 + arm * 10))), spread = 8 + arm * 8;
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; ctx.save(); ctx.translate(Math.cos(a) * spread, Math.sin(a) * spread); ctx.rotate(a * 0.1); ctx.beginPath(); ctx.moveTo(-15, -8); ctx.quadraticCurveTo(0, -17, 15, -8); ctx.quadraticCurveTo(18, 4, 7, 13); ctx.quadraticCurveTo(-7, 16, -16, 4); ctx.closePath(); under(ctx, 5); darkFill(ctx); neon(ctx, color, 1.9, 3 + arm * 4, 0.95); ctx.restore(); }
    const coreRadius = 7 + arm * 2 + flash * 1.6;
    ctx.save(); neutralShadow(ctx); if (commonFauxGlowEnabled) { ctx.fillStyle = rgba(color, arm > 0.72 ? 0.36 : arm > 0 ? 0.28 : 0.18); ctx.beginPath(); ctx.arc(0, 0, coreRadius + 4 + arm * 4, 0, TAU); ctx.fill(); } ctx.fillStyle = arm > 0.72 ? 'rgba(255,245,232,' + (0.72 + flash * 0.25) + ')' : rgba(color, 0.78); ctx.beginPath(); ctx.arc(0, 0, coreRadius, 0, TAU); ctx.fill(); ctx.restore(); neutralShadow(ctx);
    const eyesTarget = localTarget(ctx, target), eyeSpread = 1 + arm * 0.05;
    for (const p of KAMIKAZE_EYES) eye(ctx, p[0] * eyeSpread, p[1] * eyeSpread, 3.5, 3.8, eyesTarget, color);
    if (arm > 0) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.2, cos = Math.cos(a), sin = Math.sin(a); ctx.beginPath(); ctx.moveTo(cos * 8, sin * 8); ctx.lineTo(cos * 14, sin * 14); ctx.lineTo(cos * 24, sin * 24); ctx.strokeStyle = rgba(WARM_CRACK, arm * 0.72); ctx.lineWidth = 1 + arm * 0.6; ctx.lineCap = 'round'; ctx.stroke(); }
  }

  const COMMON_DRAWERS = { drone: drawDrone, runner: drawRunner, tank: drawTank, shielder: drawShielder, swarmlet: drawSwarmlet, spitter: drawSpitter, wisp: drawWisp, kamikaze: drawKamikaze };
  NV.hasCommonEnemyVisual = function (enemyTypeId) { return COMMON_ENEMY_IDS.has(enemyTypeId); };

  function drawCommonEnemyBody(ctx, e, frame, player, offX, offY, visualTimeSeconds) {
    const profile = COMMON_VISUALS[e.enemyTypeId], drawer = COMMON_DRAWERS[e.enemyTypeId];
    if (!profile || !drawer) return false;
    // Diagnóstico 'legacy': no dibuja el body especializado; el fallback geométrico
    // previo (y los ojos genéricos) corren exactamente como antes de la integración.
    if (commonDiagMode === 'legacy') return false;
    // Tank no tiene ojos especializados: evita por completo getTransform/target.
    const target = player && e.enemyTypeId !== 'tank'
      ? canvasPoint(ctx, player.x - (e.x + offX), player.y - (e.y + offY))
      : null;
    const facingX = player ? player.x - e.x : 1;
    const facingY = player ? player.y - e.y : 0;
    const isSwarmlet = e.enemyTypeId === 'swarmlet';
    const seed = isSwarmlet ? stableSwarmletSeed(e) : hash01(e, 5) * TAU;
    const animationTime = isSwarmlet ? visualTimeSeconds : (frame || 0) / 60;
    const fauxGlowWasEnabled = commonFauxGlowEnabled;
    ctx.save();
    // El draw genérico entra con blur 4/8 (o 16 para la mecha). El body aprobado
    // administra sus propios glows y debe comenzar siempre desde sombra neutral.
    neutralShadow(ctx);
    ctx.scale(profile.scale, profile.scale);
    commonFauxGlowEnabled = commonDiagMode === 'full';
    try {
      drawer(ctx, e, profile, seed, animationTime, target, facingX, facingY);
    } finally {
      neutralShadow(ctx);
      commonFauxGlowEnabled = fauxGlowWasEnabled;
    }
    ctx.restore();
    return true;
  }

  // Ojos que miran al jugador: dos escleróticas blancas + pupilas orientadas.
  // Rojos en élites. Da identidad de "criatura" a las formas geométricas.
  NV.drawEnemyEyes = function (ctx, e, player) {
    if (!player) return;
    const r = e.radius;
    const eyeR = Math.max(1.6, r * 0.18);
    const sep = r * 0.34;               // separación entre ojos
    const fwd = Math.atan2(player.y - e.y, player.x - e.x);
    const ox = Math.cos(fwd) * sep * 0.4; // offset hacia el objetivo
    const oy = Math.sin(fwd) * sep * 0.4;
    for (const side of [-1, 1]) {
      const ex = side * sep + ox * 0.5;
      const ey = -r * 0.15 + oy * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.isElite ? '#ff2222' : '#10131c';
      ctx.beginPath(); ctx.arc(ex + Math.cos(fwd) * eyeR * 0.45, ey + Math.sin(fwd) * eyeR * 0.45, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  };

  // Hash estable por enemigo (solo lectura de e.x/e.y/radius): da banda asignada,
  // umbral de participación y fase individual. NUNCA escribe en e (no muta gameplay).
  function hash01(e, salt) {
    const v = Math.sin((e.x || 0) * 12.9898 + (e.y || 0) * 78.233 + (e.radius || 1) * 37.719 + salt * 43.1234) * 43758.5453;
    return v - Math.floor(v);
  }
  // Banda espectral asignada: sub 15% / graves 35% / medios 30% / agudos 20%.
  // Es energía POR BANDA (convención de mezcla), no separación de instrumentos.
  NV.enemyRhythmBand = function (e) {
    const h = hash01(e, 0);
    return h < 0.15 ? 'sub' : h < 0.5 ? 'graves' : h < 0.8 ? 'medios' : 'agudos';
  };

  NV.drawEnemy = function (ctx, e, frame, player, rhythm, visualTimeSeconds) {
    ctx.save();
    let rx = 0, ry = 0;
    if (rhythm && rhythm.enabled && rhythm.state === 'listening') {
      // Temblor visible pero estético. SOLO offsets locales de render: nunca
      // toca e.x/e.y/hitbox/datos de gameplay.
      // Bloque 4a: cada enemigo "escucha" una banda distinta del espectro y
      // participa según un umbral individual estable -> percusión suave = pocos
      // enemigos tiemblan; percusión intensa = casi todos, con amplitudes
      // heterogéneas. Señal = envolvente de SU banda (+ transientes de su banda).
      const band = NV.enemyRhythmBand(e);
      const bandSig = band === 'sub'
        ? Math.min(1, (rhythm.bass || 0) * 0.5 + (rhythm.kick || 0) * 0.9)
        : band === 'graves'
          ? Math.min(1, (rhythm.bass || 0) * 0.75 + (rhythm.kick || 0) * 0.55)
          : band === 'medios'
            ? Math.min(1, (rhythm.mids || 0) * 0.85 + (rhythm.snare || 0) * 0.8)
            : Math.min(1, (rhythm.highs || 0) + (rhythm.hats || 0) * 0.85);
      // Intensidad percusiva global (gate escalonado) + energía sostenida.
      const perc = Math.min(1, (rhythm.onset || 0) * 0.5 + (rhythm.kick || 0) * 0.3 + (rhythm.snare || 0) * 0.2 + (rhythm.hats || 0) * 0.15 + (rhythm.energy || 0) * 0.35);
      const energyBase = Math.min(1, (rhythm.energy || 0) * 1.6);
      const thr = 0.18 + hash01(e, 1) * 0.52; // umbral de participación 0.18-0.70
      const level = Math.max(0, Math.min(1, (bandSig - thr) / (1 - thr)));
      if (level > 0.02 && (perc > 0.05 || energyBase > 0.12)) {
        const seed = hash01(e, 2) * 6.28318;
        // Amplitud perceptible: hasta ~4.5px en golpes, escalada por cuánto
        // supera SU umbral. Fase individual (seed) => nunca perfectamente
        // sincronizados. Oscilación ~3Hz (5.5Hz aliasaba a shimmer invisible).
        const amp = Math.min(4.5, (0.9 + energyBase * 1.3 + bandSig * 3.4) * level);
        const fr = (frame || 0) * 0.31;
        rx = Math.sin(fr + seed) * amp;
        ry = Math.cos(fr * 0.87 + seed * 1.7) * amp * 0.62;
        // Expuesto para diagnóstico/verificación en consola.
        rhythm.jitterAmp = Math.round(Math.hypot(rx, ry) * 100) / 100;
        rhythm.jitterActive = true;
        rhythm.jitterBand = band;
      } else {
        rhythm.jitterActive = false;
        rhythm.jitterAmp = 0;
        rhythm.jitterBand = band;
      }
    }
    // Gesto de ataque (daño de contacto): el atacante se abalanza visualmente hacia
    // el jugador (lunge). 100% decorativo: no muta datos de gameplay ni la hitbox.
    let lx = 0, ly = 0;
    if (e.atkFlash > 0 && player) {
      const atk = Math.min(1, Math.max(0, (e.atkFlash || 0) / 0.45));
      const fwd = Math.atan2(player.y - e.y, player.x - e.x);
      lx = Math.cos(fwd) * Math.sin(atk * Math.PI) * e.radius * 0.45;
      ly = Math.sin(fwd) * Math.sin(atk * Math.PI) * e.radius * 0.45;
    }
    ctx.translate(e.x + rx + lx, e.y + ry + ly);
    ctx.fillStyle = e.color;
    // Glow base moderado (neón presente pero barato): 4/8 en vez de 10/14.
    // Los glows intensos quedan reservados a transitorios importantes (atkFlash,
    // kamikaze armado / mecha, jefe) donde de verdad aportan feedback.
    ctx.shadowBlur = e.isElite ? 8 : 4;
    ctx.shadowColor = e.color;
    // KAMIKAZE armado: parpadeo rápido + anillo de mecha expansivo (aviso claro de peligro)
    if (e.armed) {
      const blink = 0.45 + Math.sin(frame * 0.55) * 0.55;
      ctx.globalAlpha = blink;
      ctx.strokeStyle = '#ff5f3d';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 16; ctx.shadowColor = '#ff5f3d';
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 6 + (0.8 - Math.max(e.fuse, 0)) * 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = Math.sin(frame * 0.55) > 0 ? '#ffffff' : '#ff5f3d';
      ctx.shadowColor = '#ffffff';
    }

    const r = e.radius;
    // Diagnóstico: el target especializado se calcula DENTRO del body, de modo que
    // el modo 'legacy' no paga ningún getTransform extra (comparación A/B limpia).
    const specializedBody = drawCommonEnemyBody(ctx, e, frame, player, rx + lx, ry + ly, visualTimeSeconds || 0);

    // Fallback Canvas2D. El wrapper de game.js omite este dibujo cuando el mesh
    // WebGL de este enemigo ya está listo.
    if (specializedBody) {
      // Los ocho comunes usan las siluetas aprobadas; el resto conserva el fallback.
    } else if (e.shape === 'specter' && typeof NV.drawSpecter2D === 'function') {
      NV.drawSpecter2D(ctx, e, frame, player);
    } else if (e.shape === 'hex') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    } else if (e.shape === 'triangle') {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.87, r * 0.5); ctx.lineTo(-r * 0.87, r * 0.5); ctx.closePath(); ctx.fill();
    } else if (e.shape === 'diamond') {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
    } else if (e.shape === 'atom') {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + frame * 0.1; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.3, a, 0, Math.PI * 2); ctx.stroke(); }
    } else if (e.shape === 'rock') {
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const rr = r * (0.7 + (i / 7) * 0.3); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      // Brillo interior
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const rr = r * (0.38 + (i / 7) * 0.16); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    } else if (e.shape === 'dot') {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.arc(r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }

    if (e.isElite) {
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    }

    // Fusión de enemigos: indicador provisorio MUY explícito para testear lectura.
    // No toca gameplay; usa e.fusionLevel generado por engine/enemies.js.
    if ((e.fusionLevel || 0) > 0) {
      const lvl = e.fusionLevel || 1;
      const pulse = 0.65 + Math.sin(frame * 0.16 + lvl) * 0.25;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = e.color || '#ffe04a';
      ctx.lineWidth = 4;
      ctx.shadowColor = e.color || '#ffe04a';
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(0, 0, r + 8 + pulse * 5, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      if (ctx.fillText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(NV.fusionMilestoneLabel ? NV.fusionMilestoneLabel(lvl) : ('FUSION ' + lvl), 0, -r - 18);
      }
      ctx.restore();
    }
    if ((e.fusionInterruptFlash || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, e.fusionInterruptFlash / 0.7);
      ctx.strokeStyle = '#7cf8ff'; ctx.lineWidth = 3; ctx.shadowBlur = 0;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(0, 0, r + 12, 0.35, Math.PI * 1.55); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    // C2 — Dron: el anillo lateral comunica formación; durante la señal, la
    // trayectoria convergente deja claro que el contacto está por activarse.
    if (e.enemyTypeId === 'drone' && e.droneState) {
      const cfg = NV.ENEMY_ROLE_REWORK && NV.ENEMY_ROLE_REWORK.drone;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(240,123,173,.58)';
      ctx.lineWidth = 1.6;
      if (e.droneState === 'signal' && cfg) {
        const progress = Math.max(0, Math.min(1, 1 - (e.droneTimer || 0) / cfg.signal));
        ctx.globalAlpha = 0.5 + progress * 0.4;
        ctx.setLineDash([5, 4]);
        const dx = (player ? player.x : e.x) - e.x;
        const dy = (player ? player.y : e.y) - e.y;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx, dy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(0, 0, r + 5 + progress * 5, 0, Math.PI * 2 * progress); ctx.stroke();
      } else if (e.droneState === 'press') {
        ctx.strokeStyle = 'rgba(255,92,158,.82)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r + 5, -0.65, 0.65); ctx.stroke();
      } else {
        ctx.globalAlpha = e.droneState === 'recovery' ? 0.28 : 0.42;
        ctx.beginPath(); ctx.arc(0, 0, r + 5, -1.0, 1.0); ctx.stroke();
      }
      ctx.restore();
    }

    // C1/K2 — Tanque: mira fija durante la carga del cañón. La bala irá a la
    // posición marcada, por lo que salir de la línea es la respuesta legible.
    if (e.enemyTypeId === 'tank' && !e.isElite && e.tankCannonState) {
      ctx.save();
      ctx.shadowBlur = 0;
      if (e.tankCannonState === 'windup') {
        const total = (NV.ENEMY_ROLE_REWORK && NV.ENEMY_ROLE_REWORK.tank.windup) || 0.9;
        const progress = Math.max(0, Math.min(1, 1 - (e.tankCannonTimer || 0) / total));
        const tx = (Number.isFinite(e.tankCannonTargetX) ? e.tankCannonTargetX : e.x) - e.x;
        const ty = (Number.isFinite(e.tankCannonTargetY) ? e.tankCannonTargetY : e.y) - e.y;
        const td = Math.max(1, Math.hypot(tx, ty));
        ctx.strokeStyle = 'rgba(255,82,92,' + (0.48 + progress * 0.42) + ')';
        ctx.lineWidth = 2 + progress * 1.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(tx / td * (r + 5), ty / td * (r + 5)); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(0, 0, r + 7 + progress * 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
        ctx.fillStyle = 'rgba(255,82,92,' + (0.72 + progress * 0.25) + ')';
        ctx.beginPath(); ctx.arc(tx, ty, 4 + progress * 3, 0, Math.PI * 2); ctx.fill();
      } else if (e.tankCannonState === 'recovery') {
        ctx.strokeStyle = 'rgba(255,207,118,.52)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r + 7, 0.25, Math.PI - 0.25); ctx.stroke();
      }
      ctx.restore();
    }

    // Rally del comandante: feedback barato y común a cualquier aliado buffeado.
    if ((e.rallyTimer || 0) > 0) {
      const rallyPulse = 0.5 + Math.sin((frame || 0) * 0.24) * 0.5;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.42 + rallyPulse * 0.25;
      ctx.strokeStyle = '#ffe24a';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, r + 5 + rallyPulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Congelante persistente: helper visual compartido (#11). 100% visual.
    if (typeof NV.drawFrozenStatus === 'function') NV.drawFrozenStatus(ctx, e, frame, r);
    else if (e.slowUntil > 0) {
      const cold = 0.5 + Math.sin(frame * 0.35) * 0.5; // parpadeo suave
      ctx.fillStyle = 'rgba(103,232,249,' + (cold * 0.22) + ')';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#67e8f9';
      ctx.globalAlpha = cold * 0.6;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    if (NV.drawEnemyHitFeedback) NV.drawEnemyHitFeedback(ctx, e, e.radius);

    ctx.shadowBlur = 0;
    // Ojos: skip para espectros (drawSpecter2D los dibuja con seguimiento al jugador)
    if (!specializedBody && e.shape !== 'specter') {
      NV.drawEnemyEyes(ctx, e, player);
    }

    // SPITTER WINDUP (F07): telégrafo geométrico mínimo y barato. Solo lectura
    // de e.intent/e.spitAim*: aim snapshot + arco de carga. Visible con calidad
    // reducida (sin partículas/shadow/explosión; trazo simple con globalAlpha).
    if (e.behavior === 'ranged' && e.enemyTypeId !== 'specter_core' && e.intent && e.intent.state === 'windup') {
      const ax = (e.spitAimX != null ? e.spitAimX : (player ? player.x : e.x));
      const ay = (e.spitAimY != null ? e.spitAimY : (player ? player.y : e.y));
      const aa = Math.atan2(ay - e.y, ax - e.x);
      const windupTotal = 0.6;
      const windupT = Math.min(1, Math.max(0, 1 - (e.intent.stateTimer || 0) / windupTotal));
      ctx.strokeStyle = 'rgba(255,224,74,' + (0.35 + windupT * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(aa) * (r + 26), Math.sin(aa) * (r + 26)); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r + 4 + windupT * 5, aa - 0.9, aa + 0.9); ctx.stroke();
    }

    // SPECTER CORE WINDUP: rojo hostil para ataque inminente; el cuerpo conserva identidad.
    if (e.enemyTypeId === 'specter_core' && e.coreZoneState === 'windup') {
      const p = Math.min(1, Math.max(0, 1 - (e.coreZoneTimer || 0) / 0.55));
      const pulse = 0.5 + Math.sin(frame * 0.22) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.45 + p * 0.45;
      ctx.strokeStyle = '#ff3b4f';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r + 5 + p * 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
      ctx.globalAlpha = 0.25 + pulse * 0.25;
      ctx.fillStyle = '#b51f31';
      ctx.beginPath(); ctx.arc(0, 0, Math.max(3, r * (0.22 + p * 0.18)), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Legibilidad del atacante (daño de contacto): halo blanco de selección +
    // anillo rojo reforzado -> se lee por encima de los superpuestos. Solo visual.
    if (e.atkFlash > 0 && player) {
      const atk = Math.min(1, Math.max(0, (e.atkFlash || 0) / 0.45));
      const fwd = Math.atan2(player.y - e.y, player.x - e.x);

      // Halo blanco exterior de selección (destaca al atacante por encima del resto).
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();

      // Anillo principal: doble trazo (rojo exterior + blanco interior) expansivo.
      const reach = e.radius + 8 + (1 - atk) * 18;
      const gap = 1.1 + (1 - atk) * 0.45;
      ctx.strokeStyle = '#ff3040';
      ctx.lineWidth = 5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff3040';
      ctx.beginPath();
      ctx.arc(0, 0, reach, fwd + gap, fwd - gap, true);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff3040';
      ctx.beginPath();
      ctx.arc(0, 0, reach - 5, fwd - 0.5, fwd + 0.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

        ctx.restore();
  };

  // Patrón de guiones del tether: constante de módulo (no se reasigna por frame).
  const HOOK_TETHER_DASH = [14, 7];

  // ===== F3: Hook/Pull rendering (Cheap O(1) visuals, world-space) =====
  // Called from game.js world render flow AFTER enemies/player are drawn and
  // BEFORE the world transform is restored. ctx já tiene setTransform(world).
  // Visuales: windup telegraph, hook head + source line, tether source-player line.
  // No particles, no gradients, no extra render pass. Legibilidad mejorada (misma
  // cota O(1)): lineas mas gruesas/opacas, nucleo de carga en el archer, pua del
  // gancho orientada por velocidad y tether GUIONADO animado sobre el jugador.
  NV.drawHookEffects = function (ctx, hookSystem, player) {
    if (!hookSystem || !hookSystem.srcEnemy || !player) return;
    const B = NV.BALANCE;
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Windup telegraph: linea source->player + arco de carga + nucleo que crece.
    if (hookSystem.phase === 'windup') {
      const src = hookSystem.srcEnemy;
      const w = Math.min(1, Math.max(0, 1 - (hookSystem.windupTimer || 0) / B.HOOK_WINDUP_TIME));
      const aa = Math.atan2(player.y - src.y, player.x - src.x);
      ctx.strokeStyle = 'rgba(255,178,74,' + (0.45 + w * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      const arcR = (src.radius || 12) + 16 + w * 10;
      ctx.beginPath();
      ctx.arc(src.x, src.y, arcR, aa - 0.55, aa + 0.55);
      ctx.stroke();
      // Nucleo de carga: crecimiento monótono con el progreso del windup.
      ctx.fillStyle = 'rgba(255,210,140,' + (0.5 + w * 0.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(src.x, src.y, 2.5 + w * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Projectile: cabeza del gancho + linea source->projectile + pua orientada.
    if (hookSystem.phase === 'projectile' && hookSystem.projectile) {
      const p = hookSystem.projectile;
      const src = hookSystem.srcEnemy;
      ctx.strokeStyle = 'rgba(92,50,18,0.95)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (src) { ctx.moveTo(src.x, src.y); }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,178,74,0.98)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash(HOOK_TETHER_DASH);
      ctx.beginPath();
      if (src) { ctx.moveTo(src.x, src.y); }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const sp = Math.hypot(p.vx || 0, p.vy || 0) || 1;
      const ux = (p.vx || 0) / sp, uy = (p.vy || 0) / sp;
      ctx.beginPath();
      ctx.moveTo(p.x - ux * 7 - uy * 5, p.y - uy * 7 + ux * 5);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x - ux * 7 + uy * 5, p.y - uy * 7 - ux * 5);
      ctx.strokeStyle = '#ff3b4f';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ff3b4f';
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Tether: linea GUIONADA animada source->player + anillo y chevron en el jugador.
    // O(1): 1 linea + 1 anillo + 1 chevron. Source VIVO (sigue al archer si se mueve).
    if (hookSystem.phase === 'tether') {
      const src = hookSystem.srcEnemy;
      if (!src) return;
      const tt = hookSystem.tetherTimer || 0;
      ctx.strokeStyle = 'rgba(92,50,18,0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,178,74,0.98)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash(HOOK_TETHER_DASH);
      // El offset avanza con la cuenta atrás del tether: el flujo apunta al archer.
      ctx.lineDashOffset = (tt * 60) % (HOOK_TETHER_DASH[0] + HOOK_TETHER_DASH[1]);
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      const pr = (player.radius || 20) + 5;
      ctx.strokeStyle = '#ff3b4f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, pr, 0, Math.PI * 2);
      ctx.stroke();
      const pa = Math.atan2(src.y - player.y, src.x - player.x);
      const cx = Math.cos(pa), cy = Math.sin(pa);
      ctx.beginPath();
      ctx.moveTo(player.x + cx * pr - cy * 6, player.y + cy * pr + cx * 6);
      ctx.lineTo(player.x + cx * (pr + 6), player.y + cy * (pr + 6));
      ctx.lineTo(player.x + cx * pr + cy * 6, player.y + cy * pr - cx * 6);
      ctx.stroke();
    }

    ctx.restore();
  };

  // ===== TEMPORAL (Fase 1): API de diagnóstico A/B, SOLO render =====
  // Cambia únicamente el cuerpo de los 8 enemigos comunes. No muta gameplay,
  // entidades, spawn, IA, hitbox ni balance. No se persiste: reload => 'full'.
  NV.setCommonEnemyDiagnosticMode = function (mode) {
    const next = String(mode == null ? '' : mode).trim().toLowerCase();
    if (COMMON_DIAG_MODES.indexOf(next) < 0) return commonDiagMode;
    commonDiagMode = next;
    return commonDiagMode;
  };
  NV.getCommonEnemyDiagnosticMode = function () { return commonDiagMode; };
  // Inicia una ventana de medición limpia reutilizando el monitor existente.
  NV.startCommonEnemyDiagnosticSample = function () {
    if (NV.performanceMonitor && typeof NV.performanceMonitor.reset === 'function') {
      NV.performanceMonitor.reset();
      return true;
    }
    return false;
  };
  NV.startHydraDiagnosticSample = NV.startCommonEnemyDiagnosticSample;
  // Snapshot de solo lectura: modo + métricas existentes del monitor + ratio de escala.
  NV.getCommonEnemyDiagnosticSnapshot = function () {
    const perf = (NV.performanceMonitor && typeof NV.performanceMonitor.getSnapshot === 'function')
      ? NV.performanceMonitor.getSnapshot() : null;
    const telemetry = perf ? perf.telemetry : null;
    const canvas = NV.canvas;
    const dpr = (NV.viewport && typeof NV.viewport.getEffectiveDpr === 'function')
      ? NV.viewport.getEffectiveDpr() : null;
    let cssWidth = null, cssHeight = null;
    if (canvas && typeof canvas.getBoundingClientRect === 'function') {
      try {
        const rect = canvas.getBoundingClientRect();
        cssWidth = rect.width; cssHeight = rect.height;
      } catch (_) { /* diagnóstico: rect no disponible */ }
    }
    const wm = NV.worldMetrics || {};
    const viewW = wm.viewW || 900;
    const viewH = wm.viewH || 520;
    const backingWidth = canvas ? canvas.width : null;
    const backingHeight = canvas ? canvas.height : null;
    // Mismo cálculo que game.js.resizeCanvas(): escala mundo -> backing store.
    const scaleX = backingWidth ? backingWidth / viewW : null;
    const scaleY = backingHeight ? backingHeight / viewH : null;
    const settings = (typeof NV.getSettings === 'function') ? NV.getSettings() : NV.settings;
    const policy = (typeof NV.getVisualBudget === 'function') ? NV.getVisualBudget() : null;
    const runtime = (typeof NV.getRuntimeSnapshot === 'function') ? NV.getRuntimeSnapshot() : null;
    const medianRafMs = perf && perf.frame ? perf.frame.p50 : null;
    return {
      diagnosticMode: commonDiagMode,
      hydraDiagnosticMode: (typeof NV.getHydraDiagnosticMode === 'function') ? NV.getHydraDiagnosticMode() : null,
      hostiles: telemetry ? telemetry.hostiles : null,
      lightHostiles: telemetry ? telemetry.lightHostiles : null,
      mediumHostiles: telemetry ? telemetry.mediumHostiles : null,
      heavyHostiles: telemetry ? telemetry.heavyHostiles : null,
      hydraFamilyHostiles: telemetry ? telemetry.hydraFamilyHostiles : null,
      specializedCommonHostiles: telemetry ? telemetry.specializedCommonHostiles : null,
      otherSpectralHostiles: telemetry ? telemetry.otherSpectralHostiles : null,
      byEnemyTypeId: telemetry ? telemetry.byEnemyTypeId : null,
      quality: (settings && settings.graphics && settings.graphics.quality) || null,
      effectiveVisualTier: (telemetry && telemetry.effectiveVisualTier) || (policy ? policy.tier : null),
      effectiveDpr: dpr,
      mobile: !!(NV.capabilities && NV.capabilities.isMobile),
      frames: perf ? perf.frames : null,
      frame: perf ? perf.frame : null,
      draw: perf ? perf.draw : null,
      update: perf ? perf.update : null,
      framesAbove6_06: perf ? perf.framesAbove6_06 : null,
      framesAbove6_94: perf ? perf.framesAbove6_94 : null,
      framesAbove8_33: perf ? perf.framesAbove8_33 : null,
      framesAbove11_11: perf ? perf.framesAbove11_11 : null,
      framesAbove16_7: perf ? perf.framesAbove16_7 : null,
      framesAbove25: perf ? perf.framesAbove25 : null,
      framesAbove33: perf ? perf.framesAbove33 : null,
      worstSinceReset: perf ? perf.worstSinceReset : null,
      refresh: {
        medianRafMs: medianRafMs,
        approximateHz: medianRafMs > 0 ? 1000 / medianRafMs : null,
        pageHidden: (typeof document !== 'undefined') ? !!document.hidden : null,
        paused: runtime ? !!runtime.paused : null,
      },
      canvas: {
        cssWidth: cssWidth, cssHeight: cssHeight,
        backingWidth: backingWidth, backingHeight: backingHeight,
        effectiveDpr: dpr,
      },
      world: {
        viewW: viewW, viewH: viewH,
        scaleX: scaleX, scaleY: scaleY,
        ratio: (scaleX && scaleY) ? (scaleX / scaleY) : null,
      },
    };
  };
  NV.logCommonEnemyDiagnosticSnapshot = function () {
    const snapshot = NV.getCommonEnemyDiagnosticSnapshot();
    if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
      console.log('[commonEnemyDiagnostic]', snapshot);
    }
    return snapshot;
  };
  NV.getHydraDiagnosticSnapshot = NV.getCommonEnemyDiagnosticSnapshot;
  NV.logHydraDiagnosticSnapshot = function () {
    const snapshot = NV.getHydraDiagnosticSnapshot();
    if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
      console.log('[hydraDiagnostic]', snapshot);
    }
    return snapshot;
  };
})();
