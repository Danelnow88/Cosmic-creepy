// ===== ENGINE: telemetría de playtest (F08 gate humano) =====
// Diagnóstico AGREGADO y MUESTREADO para la primera puerta de playtest humano.
// Reglas de diseño:
//  - OFF por defecto: cada punto de integración es un guard booleano
//    (`if (NV.playtest ...)`), cero coste medible en producción normal.
//  - Se activa con `?playtest=1` (game.js init) o desde consola con
//    `NV.playtest.enable()`. Se desactiva con `NV.playtest.disable()`.
//  - Sin console spam, sin DOM, sin allocations por frame en los agregados (WeakMap para
//    detectar transiciones de intent y atribuir burns sin mutar entidades de gameplay).
//  - `NV.playtest.snapshot()` devuelve un objeto plano para pegar en un issue.
//  - Módulo independiente: el juego funciona idéntico sin este archivo
//    (todos los consumers hacen guard `if (NV.playtest ...)`).
(() => {
  'use strict';
  const NV = window.NV = window.NV || {};
  let enabled = false;
  let data = null;

  function fresh() {
    return {
      frames: 0,
      run: { character: null, difficulty: null, simTime: 0 },
      weapons: { byId: {}, totalSwitches: 0, transitions: {} },
      bosses: { completed: [], active: null },
      dash: { attempted: 0, succeeded: 0, failed: 0, exhaustedFrames: 0 },
      combat: { shots: 0, hits: 0, pierce2Plus: 0, maxHitsPerBullet: 0, fireMode: null },
      runner: { stateTime: {}, commits: 0 },
      spitter: { stateTime: {}, windups: 0, shots: 0, recoveryCycles: 0 },
    };
  }
  function bump(map, key, dt) { map[key] = (map[key] || 0) + dt; }
  function normalCounters() {
    return { equippedTime: 0, shots: 0, hits: 0, rawDamage: 0,
      effectiveDamage: 0, overkillDamage: 0, kills: 0, bySource: {}, bounceOrdinal: {} };
  }
  function weapon(id) {
    if (!id) return null;
    return data.weapons.byId[id] || (data.weapons.byId[id] = { equippedTime: 0, shots: 0, normal: normalCounters() });
  }
  function addDamage(counter, raw, effective, killed) {
    counter.hits++;
    counter.rawDamage += raw;
    counter.effectiveDamage += effective;
    counter.overkillDamage += Math.max(0, raw - effective);
    if (killed) counter.kills++;
  }
  // Progresión reportada por gameplay (nivel/fusión REALES). La telemetría no
  // recalcula ninguna fórmula: solo guarda el último estado y sus máximos.
  function progression(entry) {
    if (!entry.progression) {
      entry.progression = { currentLevel: 0, currentFusion: 0, maxLevelSeen: 0, maxFusionSeen: 0,
        firstLevelSeen: null, firstFusionSeen: null };
    }
    return entry.progression;
  }
  // Copia compacta de un mapa { id: { level, fusion } } supplied por gameplay.
  function copyWeaponStates(states) {
    const out = {};
    if (!states || typeof states !== 'object') return out;
    for (const id of Object.keys(states)) {
      const s = states[id];
      if (!s || !Number.isFinite(s.level) || !Number.isFinite(s.fusion)) continue;
      out[id] = { level: s.level, fusion: s.fusion };
    }
    return out;
  }
  let prevStates = new WeakMap(); // identidad de enemigo -> último estado de intent (solo lectura de e)
  let burnSources = new WeakMap();
  let enemyBurnSources = new WeakMap();
  let bossAttackState = new WeakMap();

  function phaseBucket(boss) { return boss && boss.phase2 ? 'phase2' : 'phase1'; }
  function attackCounter(bucket, attackType) {
    bucket[attackType] = (bucket[attackType] || 0) + 1;
  }
  function intervalStats(bucket, attackType) {
    return bucket[attackType] || (bucket[attackType] = { count: 0, sum: 0, min: null, max: null });
  }
  function recordBossSelection(boss, attackType) {
    if (!enabled || !data.bosses.active || !boss || !attackType) return;
    const phase = phaseBucket(boss);
    attackCounter(data.bosses.active.attackSelected[phase], attackType);
    bossAttackState.set(boss, { attackType, phase, lastExecutionElapsed: null });
  }

  NV.playtest = {
    get enabled() { return enabled; },
    enable() { enabled = true; },
    disable() { enabled = false; },
    reset() { data = fresh(); prevStates = new WeakMap(); burnSources = new WeakMap(); enemyBurnSources = new WeakMap(); bossAttackState = new WeakMap(); },
    startRun(character, difficulty, initialWeaponId) {
      if (!enabled) return;
      data.run.character = character;
      data.run.difficulty = difficulty;
      weapon(initialWeaponId);
    },
    weaponSwitch(fromId, toId) {
      if (!enabled || !fromId || !toId || fromId === toId) return;
      weapon(fromId); weapon(toId);
      data.weapons.totalSwitches++;
      bump(data.weapons.transitions, fromId + '>' + toId, 1);
    },
    // Progresión real del arma equipada. Solo agrega hechos; no altera gameplay.
    weaponProgression(weaponId, level, fusion) {
      if (!enabled || !weaponId || !Number.isFinite(level) || !Number.isFinite(fusion)) return;
      const prog = progression(weapon(weaponId));
      if (prog.firstLevelSeen === null) {
        prog.firstLevelSeen = level; // primera observación = primer uso del arma en la run
        prog.firstFusionSeen = fusion;
      }
      prog.currentLevel = level;
      prog.currentFusion = fusion;
      if (level > prog.maxLevelSeen) prog.maxLevelSeen = level;
      if (fusion > prog.maxFusionSeen) prog.maxFusionSeen = fusion;
    },
    bossStart(wave, name, pattern, maxHp, weaponStates) {
      if (!enabled) return;
      data.bosses.active = { wave, name, pattern, maxHp, elapsed: 0, hits: 0, damage: 0,
        attackSelected: { phase1: {}, phase2: {} },
        attackExecuted: { phase1: {}, phase2: {} },
        executionIntervals: { phase1: {}, phase2: {} },
        timeToPhase2: null, hpAtPhase2: null,
        weaponStateStart: copyWeaponStates(weaponStates),
        byWeapon: {}, bySource: { direct: { hits: 0, damage: 0 }, splash: { hits: 0, damage: 0 } } };
    },
    bossAttackInitial(boss, attackType) {
      if (!enabled || !data.bosses.active || !boss || !attackType || bossAttackState.has(boss)) return;
      recordBossSelection(boss, attackType);
    },
    bossAttackSelected(boss, attackType) {
      recordBossSelection(boss, attackType);
    },
    bossAttackExecuted(boss, attackType) {
      if (!enabled || !data.bosses.active || !boss || !attackType) return;
      const phase = phaseBucket(boss);
      const active = data.bosses.active;
      attackCounter(active.attackExecuted[phase], attackType);
      const state = bossAttackState.get(boss);
      if (!state || state.attackType !== attackType) return;
      if (state.phase !== phase) {
        state.phase = phase;
        state.lastExecutionElapsed = null;
        return;
      }
      if (state.lastExecutionElapsed !== null) {
        const interval = active.elapsed - state.lastExecutionElapsed;
        if (Number.isFinite(interval) && interval >= 0) {
          const stats = intervalStats(active.executionIntervals[phase], attackType);
          stats.count++;
          stats.sum += interval;
          stats.min = stats.min === null ? interval : Math.min(stats.min, interval);
          stats.max = stats.max === null ? interval : Math.max(stats.max, interval);
        }
      }
      state.lastExecutionElapsed = active.elapsed;
    },
    bossPhase2(hp) {
      if (!enabled || !data.bosses.active || data.bosses.active.timeToPhase2 !== null) return;
      data.bosses.active.timeToPhase2 = data.bosses.active.elapsed;
      data.bosses.active.hpAtPhase2 = Number.isFinite(hp) ? hp : null;
    },
    bossHit(weaponId, amount, source) {
      if (!enabled || !data.bosses.active || !Number.isFinite(amount) || amount <= 0) return;
      const boss = data.bosses.active;
      const id = weaponId || 'unknown';
      const kind = source || 'direct';
      const byWeapon = boss.byWeapon[id] || (boss.byWeapon[id] = { hits: 0, damage: 0 });
      const bySource = boss.bySource[kind] || (boss.bySource[kind] = { hits: 0, damage: 0 });
      boss.hits++; boss.damage += amount;
      byWeapon.hits++; byWeapon.damage += amount;
      bySource.hits++; bySource.damage += amount;
    },
    bossBurnSource(boss, weaponId) {
      if (enabled && boss) burnSources.set(boss, weaponId);
    },
    bossBurnHit(boss, amount) {
      if (enabled && boss) this.bossHit(burnSources.get(boss), amount, 'burn');
    },
    enemyBurnSource(enemy, weaponId) {
      if (enabled && enemy) enemyBurnSources.set(enemy, weaponId || null);
    },
    enemyBurnHit(enemy, amount, hpBefore, hpAfter) {
      if (enabled && enemy) this.weaponEnemyHit(enemyBurnSources.get(enemy), 'burn', amount, hpBefore, hpAfter);
    },
    bossEnd(weaponStates) {
      if (!enabled || !data.bosses.active) return;
      data.bosses.active.weaponStateEnd = copyWeaponStates(weaponStates);
      data.bosses.completed.push(data.bosses.active);
      data.bosses.active = null;
    },
    // --- eventos de dash (movement.js) ---
    dashEvent(kind) {
      if (!enabled) return;
      if (kind === 'succeeded' || kind === 'failed') {
        data.dash.attempted++;
        data.dash[kind]++;
      }
    },
    setExhaustedFrame() { if (enabled) data.dash.exhaustedFrames++; },
    // --- eventos de combate (game.js / bullets.js) ---
    setFireMode(mode) { if (enabled) data.combat.fireMode = mode || null; },
    shot(weaponId) {
      if (!enabled) return;
      data.combat.shots++;
      const entry = weapon(weaponId);
      if (entry) {
        entry.shots++;
        if (!data.bosses.active) entry.normal.shots++;
      }
    },
    // Solo aplicaciones reales a enemigos normales; nunca consultar el arma equipada aquí.
    // bounceOrdinal (1..3) es detalle DIAGNÓSTICO del Arco: no altera ni duplica los
    // totales, que ya se contabilizan una sola vez en `normal` y en `bySource.bounce`.
    weaponEnemyHit(weaponId, source, rawDamage, hpBefore, hpAfter, bounceOrdinal) {
      if (!enabled || !weaponId || !Number.isFinite(rawDamage) || rawDamage <= 0 ||
          !Number.isFinite(hpBefore) || hpBefore <= 0 || !Number.isFinite(hpAfter)) return;
      const effective = Math.max(0, Math.min(hpBefore, hpBefore - Math.max(0, hpAfter)));
      const killed = hpAfter <= 0;
      const normal = weapon(weaponId).normal;
      const kind = source || 'direct';
      const bucket = normal.bySource[kind] || (normal.bySource[kind] = {
        hits: 0, rawDamage: 0, effectiveDamage: 0, overkillDamage: 0, kills: 0 });
      addDamage(normal, rawDamage, effective, killed);
      addDamage(bucket, rawDamage, effective, killed);
      if (kind === 'bounce' && Number.isFinite(bounceOrdinal) && bounceOrdinal >= 1 && bounceOrdinal <= 3) {
        const key = String(bounceOrdinal);
        const ord = normal.bounceOrdinal[key] || (normal.bounceOrdinal[key] = {
          hits: 0, rawDamage: 0, effectiveDamage: 0, overkillDamage: 0, kills: 0 });
        addDamage(ord, rawDamage, effective, killed);
      }
    },
    bulletHit(hitCount) {
      if (!enabled) return;
      data.combat.hits++;
      if (hitCount > data.combat.maxHitsPerBullet) data.combat.maxHitsPerBullet = hitCount;
      if (hitCount >= 2) data.combat.pierce2Plus++; // balas que atravesaron 2+ objetivos (alineación Rifle)
    },
    // --- muestreo de intents Runner/Spitter (game.js, 1 llamada por enemigo/frame) ---
    observeEnemy(e, dt) {
      if (!enabled || !e || e.dead || !e.intent) return;
      const s = e.intent.state;
      const prev = prevStates.get(e);
      if (e.behavior === 'flank') {
        bump(data.runner.stateTime, s, dt);
        if (prev === 'attack' && s !== 'attack') data.runner.commits++; // COMMIT -> RECOVERY completado
      } else if (e.behavior === 'ranged') {
        bump(data.spitter.stateTime, s, dt);
        if (prev !== 'windup' && s === 'windup') data.spitter.windups++;
        if (prev === 'windup' && s !== 'windup') data.spitter.shots++; // windup -> disparo único
        if (prev === 'recovery' && s !== 'recovery') data.spitter.recoveryCycles++;
      }
      prevStates.set(e, s);
    },
    frame(dt, weaponId) {
      if (!enabled) return;
      data.frames++;
      if (!Number.isFinite(dt) || dt <= 0) return;
      data.run.simTime += dt;
      const entry = weapon(weaponId);
      if (entry) {
        entry.equippedTime += dt;
        if (!data.bosses.active) entry.normal.equippedTime += dt;
      }
      if (data.bosses.active) data.bosses.active.elapsed += dt;
    },
    snapshot() { return JSON.parse(JSON.stringify(data)); },
  };
  NV.playtest.reset();
})();