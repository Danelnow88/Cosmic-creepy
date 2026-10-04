// Encuentros de producción: cada ataque tiene aviso -> ejecución -> recuperación.
// La puntería se captura al iniciar el aviso. Ninguna bala sigue al jugador.
(() => {
  'use strict';
  const NV = window.NV;
  const TAU = Math.PI * 2;
  const PROFILES = Object.freeze({
    repeater: { name: 'RÁFAGA', windup: .62, recovery: .95, speed: 320, damage: 12, count: 1, radius: 4, style: 'bossRepeater', pulses: 3 },
    heavy: { name: 'ARTILLERÍA', windup: .90, recovery: 1.30, speed: 290, damage: 28, count: 3, spread: .33, radius: 8, style: 'bossHeavyShell' },
    summon: { name: 'PORTALES', windup: .85, recovery: 1.65, speed: 200, damage: 14, count: 5, spread: .45, radius: 5, style: 'bossOrb' },
    spread: { name: 'ANILLO · BUSCÁ EL HUECO', windup: 1.05, recovery: 1.50, speed: 200, damage: 17, count: 10, ring: true, radius: 5, style: 'bossSpreadDisc' },
    beam: { name: 'LANZA CARGADA', windup: 1.05, recovery: 1.30, speed: 520, damage: 32, count: 1, radius: 7, style: 'bossChargedLance' },
    volley: { name: 'DOBLE ABANICO', windup: .72, recovery: 1.15, speed: 290, damage: 14, count: 5, spread: .23, radius: 4, style: 'bossVolleyDart', pulses: 2 },
    bomb: { name: 'BOMBAS LENTAS', windup: .95, recovery: 1.25, speed: 155, damage: 23, count: 3, spread: .48, radius: 10, style: 'bossBomb' },
    orbs: { name: 'TRÍADA ESPECTRAL', windup: .78, recovery: 1.05, speed: 230, damage: 15, count: 3, spread: .42, radius: 5, style: 'bossOrb' },
    split: { name: 'ESPORAS', windup: .72, recovery: 1.00, speed: 260, damage: 16, count: 5, spread: .25, radius: 5, style: 'bossSplitShard' },
    rage: { name: 'PULSO DEL VACÍO', windup: .82, recovery: 1.00, speed: 270, damage: 19, count: 5, spread: .28, radius: 6, style: 'bossRageCore' },
  });
  // Regla anti-espera compartida: no reemplaza los ataques propios del jefe.
  // Sólo castiga permanecer prácticamente inmóvil durante varios segundos con
  // un círculo grande, lento y completamente esquivable.
  const IDLE_TRIGGER = 2.6;
  const IDLE_WARNING = 0.95;
  const IDLE_RADIUS = 54;
  const IDLE_MOVE_RESET = 20;
  NV.BOSS_ENCOUNTER_PROFILES = PROFILES;
  NV.bossEncounterTiming = function (difficulty) {
    // Dificultad por ventanas de lectura y castigo, no sólo multiplicadores de HP.
    if (difficulty === 'easy') return { windup: 1.18, recovery: 1.10, idleWarning: 1.10 };
    if (difficulty === 'hard') return { windup: .82, recovery: .72, idleWarning: .75 };
    return { windup: 1, recovery: 1, idleWarning: IDLE_WARNING };
  };
  // Misma resistencia del primer jefe probado por el jugador; después crece de
  // forma lineal y más lenta, no cuadrática. Las fases crean la dificultad.
  NV.bossEncounterHp = (type, wave, difficulty) => Math.round((type.hp + 500 + Math.max(0, Math.min(50, wave) - 5) * 95 + Math.max(0, wave - 50) * 45) * 1.8 * difficulty);
  // El hueco no nace encima del piloto: hay que leerlo y desplazarse un carril.
  // Elegimos el lado que deja espacio dentro de la arena, no un escape hacia una pared.
  NV.guardianRingPattern = function (x, y, player, W, H, phase2, cast, ringCount) {
    const count = ringCount || (phase2 ? 12 : 10), step = TAU / count;
    const aim = Math.atan2(player.y - y, player.x - x);
    const distance = Math.max(100, Math.hypot(player.x - x, player.y - y));
    const preferred = cast % 2 === 0 ? 1 : -1;
    const candidates = [preferred, -preferred].map(side => {
      const gap = aim + side * step;
      const dx = Math.cos(gap), dy = Math.sin(gap);
      const depthX = Math.abs(dx) < 1e-9 ? Infinity : ((dx > 0 ? W - 24 : 24) - x) / dx;
      const depthY = Math.abs(dy) < 1e-9 ? Infinity : ((dy > 0 ? H - 24 : 24) - y) / dy;
      const travel = Math.max(0, Math.min(distance, depthX, depthY));
      const safePoint = { x: x + dx * travel, y: y + dy * travel };
      return { gap, safePoint, travel, movement: Math.hypot(safePoint.x-player.x,safePoint.y-player.y) };
    });
    const chosen = candidates[0].travel >= distance - 1e-6 ? candidates[0] : candidates[1].movement < candidates[0].movement ? candidates[1] : candidates[0];
    return { gap: chosen.gap, step, safePoint: chosen.safePoint,
      rays: Array.from({ length: count - 1 }, (_, i) => chosen.gap + (i + 1) * step) };
  };
  function rays(profile, angle, phase2, cast, primary) {
    // JEFE enseña dos lecturas distintas desde la primera fase: una línea
    // fijada y, en el siguiente turno, un abanico de tres carriles. Ambos se
    // anuncian completos antes del primer disparo y dejan recovery real.
    if (primary === 'repeater') {
      const fan = phase2 || cast % 2 === 1;
      return fan ? [angle - .26, angle, angle + .26] : [angle];
    }
    if (primary === 'heavy') {
      const count = phase2 ? 5 : 3;
      const gap = cast % 2 === 0 ? .22 : .48;
      return Array.from({ length: count }, (_, i) => angle + (i - (count - 1) / 2) * gap);
    }
    const ring = profile.ring || (primary === 'split' && cast % 2 === 1) || (primary === 'rage' && cast % 2 === 1) || (primary === 'orbs' && phase2 && cast % 2 === 1);
    let count = ring ? (primary === 'split' ? 9 : primary === 'rage' ? 13 : profile.count + (phase2 ? 2 : 0)) : profile.count;
    if (!ring && phase2 && (primary === 'beam' || primary === 'repeater')) count = primary === 'beam' ? 3 : 2;
    const result = [];
    if (ring) {
      // Se elimina la dirección central: existe un hueco real mayor que el cuerpo.
      for (let i = 1; i < count; i++) result.push(angle + i * TAU / count);
    } else for (let i = 0; i < count; i++) result.push(angle + (i - (count - 1) / 2) * (profile.spread || .30));
    return result;
  }
  function minions(b, st, variant) {
    let made = 0;
    for (const dx of [-65, 0, 65]) {
      const before = st.enemies.length;
      st.spawnMinion(Math.max(35, Math.min(st.W - 35, b.x + dx)), Math.min(st.H - 50, b.y + 70), variant);
      if (st.enemies.length > before) {
        made++;
        if (variant === 'mutant') {
          const e = st.enemies[st.enemies.length - 1];
          e.radius = 17; e.hp = e.maxHp = Math.round(Math.min(220, b.maxHp * .055));
          e.speed = 85; e.color = '#9cff72'; e.score = 35; e.xp = 30;
          e.broodTimer = 2; e.damage = 10;
        }
      }
    }
    return made;
  }
  function emit(b, st, a, origin) {
    const p = PROFILES[b.primaryAttack] || PROFILES.repeater;
    const pos = b.encounter;
    if (st.bullets.length >= st.MAX_BULLETS || st.enemyBulletCount() >= st.MAX_ENEMY_BULLETS) return false;
    st.bullets.push({ x: origin ? origin.x : pos.x, y: origin ? origin.y : pos.y + 36, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed,
      damage: p.damage, color: b.color, radius: p.radius, isEnemy: true, dead: false,
      stunChance: 0, stunDuration: 0, sourceEnemy: b, sourceType: 'boss', projectileStyle: p.style });
    return true;
  }
  NV.updateBossEncounter = function (b, dt, st) {
    if (b.hp <= 0 || b.dead) return;
    const p = PROFILES[b.primaryAttack] || PROFILES.repeater;
    const difficulty = st.difficulty || NV.runDifficulty || 'normal';
    const timing = NV.bossEncounterTiming(difficulty);
    // Difícil enseña la lectura avanzada desde el inicio; cruzar 50% aún
    // cambia silueta/fase, cancela el cast y añade una segunda capa anunciada.
    const hard = difficulty === 'hard';
    const advancedPattern = !!b.phase2 || hard;
    let e = b.encounter;
    if (!e) e = b.encounter = { stage: 'recovery', t: .65, cast: 0, phase: false, rays: [],
      idleAnchorX: st.player.x, idleAnchorY: st.player.y, idleTime: 0, idlePressure: null, idleCooldown: 0 };
    if (!Number.isFinite(e.idleAnchorX)) { e.idleAnchorX = st.player.x; e.idleAnchorY = st.player.y; }
    e.idleCooldown = Math.max(0, (e.idleCooldown || 0) - dt);
    const movedFromAnchor = Math.hypot(st.player.x - e.idleAnchorX, st.player.y - e.idleAnchorY);
    let createdIdlePressure = false;
    if (movedFromAnchor >= IDLE_MOVE_RESET) {
      e.idleAnchorX = st.player.x; e.idleAnchorY = st.player.y; e.idleTime = 0;
    } else if (!st.sectorPressureActive && !e.idlePressure && e.idleCooldown <= 0) {
      e.idleTime = (e.idleTime || 0) + dt;
      if (e.idleTime >= IDLE_TRIGGER) {
        e.idlePressure = { x: st.player.x, y: st.player.y, t: timing.idleWarning, duration: timing.idleWarning, radius: IDLE_RADIUS };
        createdIdlePressure = true;
        e.idleTime = 0;
      }
    }
    if (e.idlePressure && !createdIdlePressure) {
      const idle = e.idlePressure;
      idle.t -= dt;
      if (idle.t <= 0) {
        const inside = Math.hypot(st.player.x - idle.x, st.player.y - idle.y) <= idle.radius + (st.player.radius || 9);
        if (inside && st.applyPlayerDamage) {
          const damage = Math.min(32, 16 + Math.floor((st.wave || 5) / 5) * 2);
          const hit = st.applyPlayerDamage(damage, { cause: 'boss-idle-pressure', enemy: b, allowCrit: false, allowDodge: false });
          if (hit && hit.killed && st.onPlayerKilled) st.onPlayerKilled(hit);
        }
        if (st.spawnExplosion) st.spawnExplosion(idle.x, idle.y, 14, '#ff3b4f', .45);
        e.idlePressure = null; e.idleCooldown = 1.15;
        e.idleAnchorX = st.player.x; e.idleAnchorY = st.player.y;
      }
    }
    if (e.phase !== !!b.phase2) {
      // La transición cancela el ataque anterior; jamás se acumula con otro cast.
      e.stage = 'recovery'; e.t = .90; e.phase = !!b.phase2;
      b.phase2SignaturePending = false;
      if (b.primaryAttack === 'split' && !b.split) {
        b.split = true;
        const made = minions(b, st, 'mutant');
        if (st.showBanner) st.showBanner('MUTACIÓN · NÚCLEO Y ' + made + ' BROTES', '#9cff72');
      }
    }
    e.t -= dt;
    if (e.stage === 'recovery') {
      if (e.t > 0) return;
      // Alternancia con el láser ambiental, no dos avisos simultáneos. Un salto
      // propio debe completar su aviso antes de fijar el origen del ataque.
      if (st.sectorPressureActive || (b.worldMove && b.worldMove.target)) return;
      if (NV.cameraThreatReady && !NV.cameraThreatReady(b, dt,
        { x: b.x - b.radius, y: b.y - b.radius, w: b.radius * 2, h: b.radius * 2 }, .6)) return;
      e.stage = 'windup'; e.t = p.windup * timing.windup; e.x = b.x; e.y = b.y;
      if (st.sfx && st.sfx.telegraph) st.sfx.telegraph({ x: b.x, worldWidth: st.W });
      e.angle = Math.atan2(st.player.y - (b.y + 36), st.player.x - b.x);
      e.rays = rays(p, e.angle, advancedPattern, e.cast, b.primaryAttack);
      e.origins = null;
      e.gap = null;
      e.label = b.primaryAttack === 'repeater' && e.rays.length > 1 ? 'ABANICO · BUSCÁ UN LADO' : p.name;
      if (b.primaryAttack === 'heavy') e.label = e.cast % 2 === 0 ? 'OBUSES · SALÍ DEL CENTRO' : 'ARTILLERÍA · BUSCÁ UN HUECO';
      e.pulses = b.primaryAttack === 'repeater' && e.rays.length > 1 ? 2 : (p.pulses || 1);
      if (b.primaryAttack === 'spread') {
        if (advancedPattern && e.cast % 2 === 1) {
          // Segunda lectura: abanico corto apuntado, no otro anillo acumulado.
          e.rays = [e.angle - .30, e.angle, e.angle + .30];
          e.label = 'ABANICO · SALÍ DE LAS MIRAS';
        } else {
          const ring = NV.guardianRingPattern(e.x, e.y + 36, st.player, st.W, st.H, advancedPattern, e.cast);
          e.rays = ring.rays; e.gap = ring.gap;
          e.label = 'ANILLO · BUSCÁ EL HUECO';
        }
      }
      if (b.primaryAttack === 'beam') {
        if (e.cast % 2 === 0) {
          // Batería de tres lanzas paralelas, con separación física entre tubos.
          e.origins = [-42,0,42].map(dx => ({ x:Math.max(24,Math.min(st.W-24,e.x+dx)), y:e.y+36 }));
          e.rays = e.origins.map(() => e.angle);
          e.label = 'TRES LANZAS · SALÍ DE LAS MIRAS';
        } else {
          const count = advancedPattern ? 5 : 3;
          e.rays = Array.from({length:count},(_,i)=>e.angle+(i-(count-1)/2)*.24);
          e.label = 'LANZAS ABIERTAS · BUSCÁ UN LADO';
        }
      }
      if(b.primaryAttack==='volley' && e.cast%2===0) {
        // NÉMESIS: pinza desde dos baterías; el siguiente turno alterna con
        // doble abanico central. Orígenes y puntería se fijan durante el aviso.
        const count=advancedPattern?5:3;
        const origins=[-58,58].map(dx=>({x:Math.max(24,Math.min(st.W-24,e.x+dx)),y:e.y+36}));
        e.rays=[];e.origins=[];
        for(const origin of origins){
          const aim=Math.atan2(st.player.y-origin.y,st.player.x-origin.x);
          // Separación táctica aproximadamente constante a distancia: antes
          // las balas se abrían tanto que un paseo de 45 px quedaba entre ellas.
          // Se fija una sola vez y se anuncia completa; no predice ni persigue.
          const distance=Math.hypot(st.player.x-origin.x,st.player.y-origin.y);
          const spread=Math.max(.12,Math.min(.32,Math.atan2(42,Math.max(1,distance))));
          for(let i=0;i<count;i++){e.rays.push(aim+(i-(count-1)/2)*spread);e.origins.push({...origin});}
        }
        e.pulses=1;e.label='PINZA · SALÍ DEL CRUCE';
      }
      if (b.primaryAttack === 'bomb') {
        // COLOSO alterna una pared de tres bombas paralelas con artillería
        // abierta. Los huecos entre tubos existen también en la colisión.
        if (e.cast % 2 === 0) {
          e.origins = [-56, 0, 56].map(dx => ({ x: Math.max(24, Math.min(st.W - 24, e.x + dx)), y: e.y + 36 }));
          e.rays = e.origins.map(() => e.angle);
          e.label = 'BOMBAS PARALELAS · BUSCÁ UN HUECO';
        } else {
          const count = advancedPattern ? 5 : 3;
          e.rays = Array.from({ length: count }, (_, i) => e.angle + (i - (count - 1) / 2) * .48);
          e.label = 'ARTILLERÍA ABIERTA · SALÍ DEL CENTRO';
        }
      }
      if (b.primaryAttack === 'orbs') {
        // FANTASMA abre dos focos espectrales: ambas miras se anuncian desde
        // donde nacen las orbes. Alterna con un anillo cuyo hueco no sigue al piloto.
        if (e.cast % 2 === 0) {
          const origins = [-44, 44].map(dx => ({ x: Math.max(24, Math.min(st.W - 24, e.x + dx)), y: e.y + 36 }));
          e.origins = []; e.rays = [];
          for (const origin of origins) {
            const aim = Math.atan2(st.player.y - origin.y, st.player.x - origin.x);
            for (const offset of [-.38, 0, .38]) { e.origins.push({ ...origin }); e.rays.push(aim + offset); }
          }
          e.label = 'FOCOS ESPECTRALES · SALÍ DE LAS MIRAS';
        } else {
          const ring = NV.guardianRingPattern(e.x, e.y + 36, st.player, st.W, st.H, advancedPattern, e.cast);
          e.rays = ring.rays; e.gap = ring.gap;
          e.label = 'ONDA ESPECTRAL · BUSCÁ EL HUECO';
        }
      }
      if (b.primaryAttack === 'split') {
        // MUTANTE conserva los brotes de fase dos y alterna garras apuntadas
        // con esporas radiales. La división es invocación, no tres bosses nuevos.
        if (e.cast % 2 === 0) {
          const count = advancedPattern ? 7 : 5;
          e.rays = Array.from({ length: count }, (_, i) => e.angle + (i - (count - 1) / 2) * .25);
          e.label = 'GARRAS · SALÍ DEL ABANICO';
        } else {
          const ring = NV.guardianRingPattern(e.x, e.y + 36, st.player, st.W, st.H, advancedPattern, e.cast, advancedPattern ? 14 : 10);
          e.rays = ring.rays; e.gap = ring.gap;
          e.label = 'ESPORAS · BUSCÁ EL HUECO';
        }
      }
      if (b.primaryAttack === 'rage') {
        // APOCALIPSIS: tres núcleos fijan una descarga convergente, seguida
        // de una corona. Nunca se añade una segunda mira después del aviso.
        if (e.cast % 2 === 0) {
          e.origins = []; e.rays = [];
          for (const dx of [-68, 0, 68]) {
            const origin = { x: Math.max(24, Math.min(st.W - 24, e.x + dx)), y: e.y + 36 };
            const aim = Math.atan2(st.player.y - origin.y, st.player.x - origin.x);
            const offsets = advancedPattern ? [-.36, -.18, 0, .18, .36] : [-.28, 0, .28];
            for (const offset of offsets) { e.origins.push({ ...origin }); e.rays.push(aim + offset); }
          }
          e.label = 'TRES NÚCLEOS · SALÍ DEL CRUCE';
        } else {
          const ring = NV.guardianRingPattern(e.x, e.y + 36, st.player, st.W, st.H, advancedPattern, e.cast, advancedPattern ? 16 : 14);
          e.rays = ring.rays; e.gap = ring.gap;
          e.label = 'CORONA DEL VACÍO · BUSCÁ EL HUECO';
        }
      }
      if (b.primaryAttack === 'summon') {
        if (e.cast % 2 === 0) {
          // Tres portales fijos: cada mira se anuncia desde su origen real.
          e.origins = [-65, 0, 65].map(dx => ({ x: Math.max(35, Math.min(st.W - 35, e.x + dx)), y: Math.min(st.H - 50, e.y + 70) }));
          e.rays = e.origins.map(origin => Math.atan2(st.player.y - origin.y, st.player.x - origin.x));
          e.label = 'PORTALES · SALÍ DE LAS MIRAS';
        } else {
          e.label = 'ABANICO DEL VACÍO';
          if (advancedPattern) e.pulses = 2;
        }
      }
      // Segunda capa desde las MISMAS miras en fase dos de Difícil; no
      // snapshots sorpresa entre pulsos ni dobles invocaciones de esbirros.
      if (hard && b.phase2) e.pulses = Math.max(2, e.pulses);
      return;
    }
    b.x = e.x; b.y = e.y;
    if (e.t > 0) return;
    if (e.stage === 'windup') {
      e.stage = 'fire';
      if (b.primaryAttack === 'summon' && e.cast % 2 === 0) minions(b, st, 'default');
      const sound = st.sfx && st.sfx.bossAttack && st.sfx.bossAttack[b.primaryAttack];
      if (sound) sound();
      if (NV.playtest && NV.playtest.enabled && NV.playtest.bossAttackExecuted) NV.playtest.bossAttackExecuted(b, b.primaryAttack);
    }
    for (let i = 0; i < e.rays.length; i++) emit(b, st, e.rays[i], e.origins && e.origins[i]);
    e.pulses--;
    if (e.pulses > 0) e.t = .20;
    else { e.stage = 'recovery'; e.t = p.recovery * timing.recovery * (b.phase2 ? .82 : 1); e.cast++; }
  };
  // Evolución de fusiones: un pulso anunciado y fijo, con daño acotado. No crea
  // proyectiles ni nuevas entidades; sigue los topes de la simulación original.
  NV.updateFusionThreats = function (dt, st) {
    for (const e of st.enemies) {
      if (e.dead || e.arrival || e.waveCleanup || !(e.fusionLevel >= 2)) continue;
      if (!e.fusionPulse) e.fusionPulse = { stage: 'cooldown', t: 3.5, x: e.x, y: e.y };
      const p = e.fusionPulse;
      // Si el círculo aparece al desplazar la cámara, conservar una ventana
      // visible antes de detonar. La entidad y su IA siguen simulándose fuera.
      const cameraReady = !NV.cameraThreatReady || NV.cameraThreatReady(p, dt,
        { x: p.x - 65, y: p.y - 65, w: 130, h: 130 }, .55);
      if (p.stage === 'windup') {
        const required = Math.max(8, (e.maxHp || e.hp || 0) * 0.08);
        if (Number.isFinite(p.startHp) && p.startHp - e.hp >= required) {
          p.stage = 'cooldown'; p.t = 5.5; p.startHp = null;
          e.fusionInterruptFlash = 0.7;
          if (st.addFloatText) st.addFloatText(e.x, e.y - e.radius - 22, 'PULSO INTERRUMPIDO', '#7cf8ff');
          if (st.spawnExplosion) st.spawnExplosion(e.x, e.y, 8, '#7cf8ff', .25);
          continue;
        }
      }
      p.t -= dt;
      if (p.t > 0) continue;
      if (p.stage === 'cooldown') { p.stage = 'windup'; p.t = .85; p.x = e.x; p.y = e.y; p.startHp = e.hp; }
      else {
        // Un círculo entero coherente con su dibujo; no se usa el radio visual del enemigo.
        if (cameraReady && Math.hypot(st.player.x - p.x, st.player.y - p.y) < 65) {
          const hit = st.applyPlayerDamage(Math.min(22, 10 + e.fusionLevel * 3), { cause: 'fusion-pulse', enemy: e, allowCrit: false, allowDodge: false });
          if (hit && hit.killed && st.onPlayerKilled) st.onPlayerKilled();
        }
        if (st.spawnExplosion) st.spawnExplosion(p.x, p.y, 12, '#ff766f', .4);
        p.stage = 'cooldown'; p.t = 4.5; p.startHp = null;
      }
    }
  };
  NV.drawEncounterWarnings = function (ctx, boss, enemies) {
    const signals = NV.HOSTILE_SIGNALS;
    const warningColor = signals ? signals.warning : '#ff6474';
    ctx.save(); ctx.shadowBlur = 0;
    if (boss && !boss.dead && boss.worldMove && boss.worldMove.target) {
      const move = boss.worldMove, target = move.target;
      ctx.strokeStyle = warningColor; ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(target.x, target.y, boss.radius + 8, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(target.x, target.y, (boss.radius + 8) * Math.max(.1, 1 - move.elapsed / .5), 0, TAU); ctx.stroke();
    }
    for (const e of enemies) {
      const p = e.fusionPulse;
      if (e.dead || !p || p.stage !== 'windup') continue;
      ctx.strokeStyle = warningColor; ctx.fillStyle = 'rgba(255,72,64,.13)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 65, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 65 * Math.max(0, 1 - p.t / .85), 0, TAU); ctx.stroke();
    }
    if (boss && !boss.dead && boss.encounter && boss.encounter.stage === 'windup') {
      const e = boss.encounter;
      const m = NV.worldMetrics;
      const rayLength = m ? Math.hypot(m.arenaW, m.arenaH) : 800;
      ctx.strokeStyle = warningColor; ctx.lineWidth = 2; ctx.setLineDash([7, 7]);
      for (let i = 0; i < e.rays.length; i++) {
        const a = e.rays[i], origin = e.origins && e.origins[i];
        const x = origin ? origin.x : e.x, y = origin ? origin.y : e.y + 36;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rayLength, y + Math.sin(a) * rayLength); ctx.stroke();
        if (origin) { ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke(); }
      }
      ctx.setLineDash([]); ctx.fillStyle = '#ffbec0'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(e.label, e.x, Math.max(18, e.y - boss.radius - 10));
      if (Number.isFinite(e.gap)) {
        // Una guía corta marca el carril vacío; no promete invulnerabilidad ni
        // dibuja una zona de daño diferente de las trayectorias reales.
        const x = e.x, y = e.y + 36, a = e.gap;
        ctx.strokeStyle = '#7cf8ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 55, y + Math.sin(a) * 55);
        ctx.lineTo(x + Math.cos(a) * 105, y + Math.sin(a) * 105);
        for (const side of [-1, 1]) {
          ctx.moveTo(x + Math.cos(a) * 105, y + Math.sin(a) * 105);
          ctx.lineTo(x + Math.cos(a) * 87 + Math.cos(a + Math.PI / 2) * side * 9,
            y + Math.sin(a) * 87 + Math.sin(a + Math.PI / 2) * side * 9);
        }
        ctx.stroke();
      }
    }
    if (boss && !boss.dead && boss.encounter && boss.encounter.idlePressure) {
      const idle = boss.encounter.idlePressure;
      const p = Math.max(0, Math.min(1, 1 - idle.t / idle.duration));
      ctx.globalAlpha = 0.16 + p * 0.18; ctx.fillStyle = signals ? signals.damage : '#ff3b4f';
      ctx.beginPath(); ctx.arc(idle.x, idle.y, idle.radius, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = warningColor; ctx.lineWidth = 3;
      // El borde fijo corresponde al daño. El anillo interior sólo cuenta el aviso.
      ctx.setLineDash([7, 7]);
      ctx.beginPath(); ctx.arc(idle.x, idle.y, idle.radius, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(idle.x, idle.y, idle.radius * (1 - p * .82), 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('¡MOVETE!', idle.x, idle.y - idle.radius - 10);
    }
    ctx.restore();
  };
})();
