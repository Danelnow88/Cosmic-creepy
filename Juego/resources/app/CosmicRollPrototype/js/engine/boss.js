// ===== ENGINE: jefes (movimiento por patrón, fases, ataques y proyectiles/esbirros) =====
// updateBoss muta el objeto boss (por ref) y devuelve los primitivos let que cambian en game.js
// (score, shards, wave, shake) además del propio boss (que se reasigna a null al morir).
// spawnBossProj/spawnMinion empujan por ref a bullets/enemies.
(() => {
  'use strict';
  const NV = window.NV;

  function canSpawn(st, count, heavyCount) {
    if (NV.canSpawnHostileBatch) return NV.canSpawnHostileBatch(st, count, heavyCount);
    if (st.ignoreHostileBudget === true) return true;
    const bossCount = st.boss && !st.boss.dead ? 1 : 0;
    let aliveEnemies = 0, heavy = bossCount;
    for (const e of st.enemies) {
      if (e.dead) continue;
      aliveEnemies++;
      if (e.isElite || e.hostileClass === 'heavy') heavy++;
    }
    return aliveEnemies + bossCount + count <= (st.MAX_HOSTILES || st.MAX_ENEMIES || 30)
      && heavy + (heavyCount || 0) <= (st.MAX_HEAVY_HOSTILES || 7);
  }

  NV.canSpawnBoss = function (st) {
    return canSpawn(st, 1, 1);
  };

  // Mantiene visible cuerpo, núcleo peligroso y telegraph. El renderer más ancho
  // usa hasta ~2.1× el radio físico entre púas y accesorios; este margen evita
  // pantalla sin cambiar tamaño, HP ni colisiones.
  NV.bossVisibleArenaPosition = function (boss, width, height) {
    const radius = Math.max(1, Number(boss && boss.radius) || 1);
    const maxMargin = Math.max(1, Math.min(width, height) * 0.5 - 2);
    const margin = Math.min(maxMargin, radius * 2.1 + 10);
    return {
      x: Math.max(margin, Math.min(width - margin, Number(boss && boss.x) || width * .5)),
      y: Math.max(margin, Math.min(height - margin, Number(boss && boss.y) || height * .5)),
      margin,
    };
  };

  // ---- IA: puntería predictiva (apunta a donde ESTARÁ el jugador, con 80% de lead para que sea esquivable) ----
  NV.predictAim = function (b, st, projSpeed) {
    const p = st.player;
    const dx = p.x - b.x, dy = p.y - b.y;
    const vx = p.moveVx || 0, vy = p.moveVy || 0;
    if (!projSpeed || (!vx && !vy)) return Math.atan2(dy, dx);
    const t = Math.min(0.8, Math.hypot(dx, dy) / projSpeed);
    return Math.atan2(dy + vy * t * 0.8, dx + vx * t * 0.8);
  };

  // ---- Proyectil del jefe (puntería predictiva, salida debajo del cuerpo; stun opcional por disparo) ----
  // F4: el stunDuration viaja en la bala; si el ataque no define el suyo, usa el
  // default de balance (familias comunes = 0.5s). El roll de chance NO ocurre
  // aquí: lo resuelve tryApplyPlayerStun en el impacto (roll único).
  NV.spawnBossProj = function (b, speed, damage, count, spread, color, radius, st, stun, stunDuration, projectileStyle) {
    if (!b) return;
    const cnt = count || 1;
    const baseAngle = NV.predictAim(b, st, speed);
    const spreadA = spread || 0;
    const sc = (stun !== undefined ? stun : b.stunChance) || 0;
    const sd = stunDuration !== undefined ? stunDuration : (NV.BALANCE && NV.BALANCE.PLAYER_STUN_DEFAULT_DURATION) || 0.5;
    for (let i = 0; i < cnt && st.bullets.length < st.MAX_BULLETS && st.enemyBulletCount() < st.MAX_ENEMY_BULLETS; i++) {
      const a = cnt > 1 ? baseAngle + (i - (cnt - 1) / 2) * spreadA : baseAngle;
      st.bullets.push({ x: b.x, y: b.y + 40, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage: damage, color: color || b.color, radius: radius || 5, isEnemy: true, dead: false, stunChance: sc, stunDuration: sd, sourceEnemy: b, sourceType: 'boss', projectileStyle: projectileStyle || 'genericBolt' });
    }
  };

  // ---- IA adaptativa: elige el ataque según el estado del jugador/arena ----
  // Cada jefe conserva su ataque primario como identidad; rota entre un pool secundario propio.
  NV.AI_SECONDARY = {
    repeater: ['spread', 'volley'], heavy: ['volley', 'bomb'], summon: ['orbs', 'spread'],
    spread: ['volley', 'repeater'], beam: ['heavy', 'spread'], volley: ['spread', 'repeater'],
    bomb: ['heavy', 'volley'], orbs: ['spread', 'volley'], split: ['volley', 'spread'], rage: ['heavy', 'beam'],
  };
  NV.selectBossAttack = function (b, st) {
    const p = st.player;
    const dist = Math.hypot(p.x - b.x, p.y - b.y);
    const pool = NV.AI_SECONDARY[b.primaryAttack] || ['volley', 'spread'];
    const lowHp = p.maxHp > 0 && p.hp / p.maxHp < 0.35;
    if (b.primaryAttack === 'summon') {
      // Identidad invocadora: invoca salvo que la arena esté saturada.
      return st.enemies.length >= 15 ? 'repeater' : 'summon';
    }
    if (lowHp && dist < 280) return 'volley';           // remate agresivo si el jugador está herido y cerca
    if (dist > 380) return pool[0];                      // lejos: presión a distancia
    if (st.enemies.length < 3 && b.phase2) return pool[1]; // fase 2 con arena limpia: cambia de registro
    return b.primaryAttack;                              // por defecto, su mecánica única
  };

  // ---- Esbirro (funciona incluso durante pelea con jefe) ----
  NV.spawnMinion = function (x, y, st, summonVariant) {
    if (!canSpawn(st, 1, 0)) return false;
    const t = st.ENEMY_TYPES[0];
    const type = NV.BOSS_MINION_TYPE;
    const hp = Math.round(20 * (1 + st.wave * 0.3));
    const e = NV.buildEnemyEntityFromResolved({
      x: x, y: y,
      hp: hp, maxHp: hp,
      speed: t.speed + st.wave * 2,
      radius: 9, color: t.color, shape: type.shape,
      enemyTypeId: type.id,
      hostileClass: type.hostileClass,
      movementClass: type.movementClass,
      score: 8, xp: 8,
      dead: false, behavior: type.behavior,
      angle: Math.random() * Math.PI * 2, erraticTimer: 0,
      knockbackRes: 0, knockVelX: 0, knockVelY: 0,
      damage: 8,
      shield: false, shieldCd: 0, resist: 0,
      hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
      erraticTargetAngle: 0,
      shootTimer: 0, stunChance: 0, stunDuration: 0,
      coreZoneOwnerId: 0,
    });
    e.isElite = false;
    e.eliteDamage = 8;
    e.stun = 0;
    e.noFuse = type.noFuse;
    e.summonVariant = summonVariant || 'default';
    if (NV.keepEnemyInArena) NV.keepEnemyInArena(e, st.W, st.H);
    if (NV.beginEnemyArrival) NV.beginEnemyArrival(e, st);
    st.enemies.push(e);
    return true;
  };

  // ---- Ataques propios de cada jefe ----
  // El 11º argumento de proj() es projectileStyle: SOLO presentacion. El color
  // semantico lo decide el efecto (stunChance) en el renderer hostil, no aqui.
  NV.runBossAttack = function (b, dt, st) {
    b.atkTimer = (b.atkTimer || 0) + dt;
    const s = b.attack;
    const proj = (speed, damage, count, spread, color, radius, stun, stunDuration, style) => {
      const before = st.bullets.length;
      st.spawnBossProj(b, speed, damage, count, spread, color, radius, st, stun, stunDuration, style);
      return st.bullets.length > before;
    };
    const minion = st.spawnMinion;
    const attackExecuted = () => {
      if (NV.playtest && NV.playtest.enabled && NV.playtest.bossAttackExecuted) NV.playtest.bossAttackExecuted(b, s);
      // Al cruzar 50% cada jefe debe mostrar al menos una vez su herramienta
      // principal antes de que la IA adaptativa pueda cambiar de registro.
      if (b.phase2SignaturePending && s === b.primaryAttack) {
        b.phase2SignaturePending = false;
        b.phase2SignatureTimer = 0;
        b.aiTimer = 0;
      }
    };
    switch (s) {
      case 'repeater':
        if (b.atkTimer >= (b.phase2 ? 0.18 : 0.22)) { st.sfx.bossAttack.repeater(); if (proj(360, b.phase2 ? 11 : 13, b.phase2 ? 2 : 1, 0.09, undefined, undefined, undefined, 0.75, 'bossRepeater')) attackExecuted(); b.atkTimer = 0; }
        break;
      case 'heavy':
        if (b.atkTimer >= 1.35) { st.sfx.bossAttack.heavy(); if (proj(420, 42, 1, 0, undefined, undefined, 0.30, 1.50, 'bossHeavyShell')) attackExecuted(); b.atkTimer = 0; } // golpe pesado: stun 0.30 / 1.50s (F4)
        break;
      case 'summon':
        if (b.atkTimer >= 2.6 && st.enemies.length < 26) {
          if (canSpawn(Object.assign({}, st, { boss: b }), 3, 0)) {
            st.sfx.bossAttack.summon();
            minion(b.x, b.y + 40); minion(b.x + 30, b.y + 20); minion(b.x - 30, b.y + 20);
            attackExecuted();
            b.atkTimer = 0;
          }
        }
        break;
      case 'spread':
        if (b.atkTimer >= 1.25) {
          st.sfx.bossAttack.spread();
          // Espiral rotante: cada ráfaga rota el anillo, cubriendo más ángulos entre casts
          b.spiralOff = (b.spiralOff || 0) + 0.35;
          const cnt = b.phase2 ? 12 : 9;
          const before = st.bullets.length;
          for (let i = 0; i < cnt; i++) {
            const a = b.spiralOff + (i / cnt) * Math.PI * 2;
            if (st.bullets.length >= st.MAX_BULLETS || st.enemyBulletCount() >= st.MAX_ENEMY_BULLETS) break;
            st.bullets.push({ x: b.x, y: b.y + 40, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, damage: 18, color: b.color, radius: 5, isEnemy: true, dead: false, stunChance: b.stunChance || 0, stunDuration: 0.90, sourceEnemy: b, sourceType: 'boss', projectileStyle: 'bossSpreadDisc' });
          }
          if (st.bullets.length > before) attackExecuted();
          b.atkTimer = 0;
        }
        break;
      case 'beam':
        if (b.atkTimer >= 3.6) { st.sfx.bossAttack.beam(); if (proj(560, b.phase2 ? 34 : 44, b.phase2 ? 2 : 1, 0.14, '#ff5f9b', 9, 0.40, 2.00, 'bossChargedLance')) attackExecuted(); b.atkTimer = 0; b.beamWarned = false; } // láser cargado: stun 0.40 / 2.00s (F4)
        else if (b.atkTimer >= 3.1 && !b.beamWarned) {
          b.beamWarned = true; st.triggerFlash('#ff5f9b');
          st.addFloatText(b.x, b.y - 60, '¡CARGANDO LÁSER!', '#ff5f9b');
        }
        break;
      case 'volley':
        // Cadena de proyectiles: ráfaga principal + ráfaga rápida de seguimiento
        if (b.atkTimer >= (b.chaining ? 0.18 : 0.95)) {
          st.sfx.bossAttack.volley(); if (proj(420, b.phase2 ? 17 : 20, b.phase2 ? 7 : 5, b.phase2 ? 0.19 : 0.24, undefined, undefined, undefined, 0.75, 'bossVolleyDart')) attackExecuted(); b.atkTimer = 0; b.chaining = !b.chaining;
        }
        break;
      case 'bomb':
        if (b.atkTimer >= 1.6) { st.sfx.bossAttack.bomb(); if (proj(200, b.phase2 ? 22 : 34, b.phase2 ? 3 : 1, 0.34, undefined, undefined, 0.35, 1.75, 'bossBomb')) attackExecuted(); b.atkTimer = 0; } // bomba: stun 0.35 / 1.75s (F4)
        break;
      case 'orbs':
        if (b.atkTimer >= 1.1) {
          st.sfx.bossAttack.orbs();
          const orbCount = b.phase2 ? 3 : 1;
          const baseA = NV.predictAim(b, st, 300) + (b.phase2 ? 0 : (Math.random() - 0.5) * 0.4);
          let spawned = false;
          for (let i = 0; i < orbCount; i++) {
            if (st.bullets.length >= st.MAX_BULLETS || st.enemyBulletCount() >= st.MAX_ENEMY_BULLETS) break;
            const a = baseA + (i - (orbCount - 1) / 2) * 0.30;
            st.bullets.push({ x: b.x, y: b.y + 40, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, damage: b.phase2 ? 15 : 18, color: '#ff3b4f', radius: 5, isEnemy: true, dead: false, stunChance: b.stunChance || 0, stunDuration: 1.00, sourceEnemy: b, sourceType: 'boss', projectileStyle: 'bossOrb' });
            spawned = true;
          }
          if (spawned) attackExecuted();
          b.atkTimer = 0;
        }
        break;
      case 'split':
        if (!b.split && b.hp <= b.maxHp / 2) {
          if (canSpawn(Object.assign({}, st, { boss: b }), 3, 0)) {
            b.split = true; st.sfx.bossAttack.split();
            const made = [
              minion(b.x - 70, b.y + 45, 'mutant'),
              minion(b.x, b.y + 80, 'mutant'),
              minion(b.x + 70, b.y + 45, 'mutant'),
            ].filter(Boolean).length;
            if (made > 0) {
              if (st.triggerFlash) st.triggerFlash('#32cd32');
              if (st.spawnExplosion) st.spawnExplosion(b.x, b.y, 46, '#32cd32', 1.1);
              if (st.showBanner) st.showBanner('¡MUTACIÓN! 3 CLONES', '#32cd32');
              if (st.addFloatText) st.addFloatText(b.x, b.y - b.radius - 24, '¡SE DIVIDIÓ!', '#9cff72', 18);
            }
          }
        }
        if (b.atkTimer >= 1.15) { st.sfx.bossAttack.split(); if (proj(340, b.phase2 ? 19 : 24, b.phase2 ? 2 : 1, 0.24, undefined, undefined, undefined, 1.10, 'bossSplitShard')) attackExecuted(); b.atkTimer = 0; }
        break;
      case 'rage':
        {
          const hpct = b.hp / b.maxHp;
          const cd = 0.55 + hpct * 1.2;
          if (b.atkTimer >= cd) { st.sfx.bossAttack.rage(); if (proj(460, b.phase2 ? 20 : 26, b.phase2 ? 3 : 1, 0.22, undefined, undefined, undefined, 0.90, 'bossRageCore')) attackExecuted(); b.atkTimer = 0; }
        }
        break;
      default:
        if (b.atkTimer >= 1.1) { if (proj(320, 18)) attackExecuted(); b.atkTimer = 0; }
    }
  };

  // ---- Reacción de dolor/enojo: golpe fuerte => globo de texto (con cooldown interno) ----
  const BOSS_RAGE_TEXTS = [
    '@%$#!',
    '#@#$!*',
    '¡GRRRR!',
    '¡PAJERO!',
    '¿AH, SÍ?',
    '¡VENÍ, DALE!',
    '¡COMEME LOS HUEVOS!',
    '¡YA VAS A VER!',
    '¡AHORA VAS A VER!',
    '¡NO JODAS!',
    '¡AGUANTÁ!',
    '¡LA PUTA MADRE!',
    '¡LA RE PUTÍSIMA MADRE!',
    '¡ME DOLIÓ, FORRO!',
    '¡¿QUÉ HACÉS?!',
    '¡¿QUÉ MIRÁS TONTÍN?!',
    '¡DALE PETE, PEGÁ!',
    '¡ESO NO FUE NADA!',
    '¡¿ESO ES TODO?!',
    '¡TE ESTOY ESPERANDO!',
    '¡TE VOY A HACER MIERDA!',
    '¡TE HAGO CACA!',
    '¡TE VOY A ROMPER TODO!',
    '¡NO ME ROMPAS LAS BOLAS!'
  ];
  NV.BOSS_RAGE_TEXTS = BOSS_RAGE_TEXTS.slice();
  const FRIENDLY_RAGE_TEXTS = ['¡SISTEMA EN ALERTA!', '¡CHISPAS!', '¡BUEN DISPARO!', '¡MIS CIRCUITOS!', '¡TODAVÍA SIGO AQUÍ!', '¡ESO NO FUE NADA!'];
  NV.bossHitReaction = function (boss, damage, addFloatText) {
    if (!boss || boss.dead) return false;
    if (damage > 0 && boss.hp > 0 && NV.sfx && NV.sfx.impact) NV.sfx.impact('boss', { x: boss.x });
    if ((boss.rageCd || 0) > 0) return false;
    // Solo reacciona a golpes contundentes (≥2.5% de su vida máxima).
    if (damage < boss.maxHp * 0.025) return false;
    const pool = NV.settings && NV.settings.gameplay && NV.settings.gameplay.familyFriendly === false ? BOSS_RAGE_TEXTS : FRIENDLY_RAGE_TEXTS;
    const txt = pool[Math.floor(Math.random() * pool.length)];
    addFloatText(boss.x, boss.y - boss.radius - 14, txt, '#ff5f5f', 14, {
      bossReaction: true,
      boss,
      bossX: boss.x,
      bossY: boss.y,
      bossRadius: boss.radius
    });
    boss.rageCd = 1.6;
    return true;
  };

  // Cada identidad conserva su ritmo: persecución, flancos, órbita, retirada,
  // circuitos y saltos. Son metas de MUNDO, nunca bounds de cámara.
  const WORLD_MOVEMENT = Object.freeze({
    chase: { speed: 150, rate: .40, reachX: .18, reachY: .21 },
    charge: { speed: 170, rate: .28, reachX: .30, reachY: .24 },
    summon: { speed: 100, rate: .25, reachX: .23, reachY: .30 },
    circle: { speed: 170, rate: .48, reachX: .30, reachY: .32 },
    burst: { speed: 190, rate: .65, reachX: .27, reachY: .19 },
    teleport: { speed: 160, rate: .60, reachX: .28, reachY: .28 },
    slow_charge: { speed: 105, rate: .20, reachX: .32, reachY: .26 },
    phase: { speed: 200, rate: .55, reachX: .26, reachY: .33 },
    split: { speed: 145, rate: .36, reachX: .23, reachY: .28 },
    rage: { speed: 185, rate: .46, reachX: .31, reachY: .32 },
  });
  NV.BOSS_WORLD_MOVEMENT = WORLD_MOVEMENT;
  NV.updateBossWorldMovement = function (b, dt, st, slowMult) {
    const W = st.W || 900, H = st.H || 520;
    const p = st.player || { x: W * .5, y: H * .5 };
    // Congelar durante aviso/disparo: origen, rayos y cuerpo nunca divergen.
    if (b.encounter && b.encounter.stage !== 'recovery') return;
    const start = NV.bossVisibleArenaPosition(b, W, H);
    b.x = start.x; b.y = start.y;
    const profile = WORLD_MOVEMENT[b.pattern] || WORLD_MOVEMENT.chase;
    const angle = (b.timer || 0) * profile.rate;
    let x = p.x + Math.cos(angle) * W * profile.reachX;
    let y = p.y + Math.sin(angle) * H * profile.reachY;
    if (b.pattern === 'charge' || b.pattern === 'slow_charge') {
      // Barridos diagonales largos, no oscilación horizontal sobre Y=100.
      x = p.x + Math.cos(angle) * W * profile.reachX;
      y = p.y + Math.sin(angle * 1.3) * H * profile.reachY;
    } else if (b.pattern === 'burst' || b.pattern === 'split') {
      y = p.y + Math.sin(angle * 1.7) * H * profile.reachY;
    } else if (b.pattern === 'summon') {
      // El invocador se retira al flanco y deja espacio para sus portales.
      y = p.y - Math.cos(angle * .8) * H * profile.reachY;
    }
    const distance = Math.hypot(b.x - p.x, b.y - p.y);
    // Si el piloto cambia de región, regresar en vez de seguir patrullando
    // lejos. La distancia es engagement, no un límite físico del viewport.
    if (distance > 500) b.worldEngaging = true;
    else if (distance < 320) b.worldEngaging = false;
    if (b.worldEngaging) {
      const a = Math.atan2(b.y - p.y, b.x - p.x);
      x = p.x + Math.cos(a) * 230; y = p.y + Math.sin(a) * 170;
    }
    const target = NV.bossVisibleArenaPosition({ x, y, radius: b.radius }, W, H);
    const step = Math.max(0, dt) * profile.speed * (slowMult == null ? 1 : slowMult) * (b.phase2 ? 1.15 : 1);
    const dx = target.x - b.x, dy = target.y - b.y, length = Math.hypot(dx, dy);
    if (b.pattern === 'teleport') {
      const move = b.worldMove || (b.worldMove = { elapsed: 0, cooldown: 1.6, target: null });
      if (!move.target) {
        move.cooldown -= Math.max(0, dt);
        if (move.cooldown <= 0 && length > 100) {
          move.target = { x: target.x, y: target.y }; move.elapsed = 0;
        }
      } else {
        move.elapsed += Math.max(0, dt);
        if (move.elapsed >= .5) {
          // Destino anunciado durante medio segundo; nunca materializar encima
          // del piloto si éste entró allí mientras se cargaba el salto.
          if (Math.hypot(move.target.x - p.x, move.target.y - p.y) > b.radius + 65) {
            if (st.spawnExplosion) st.spawnExplosion(b.x, b.y, 12, b.color, .45);
            b.x = move.target.x; b.y = move.target.y;
            if (st.spawnExplosion) st.spawnExplosion(b.x, b.y, 12, b.color, .45);
          }
          move.target = null; move.cooldown = 1.6;
        }
        return;
      }
    }
    if (length > .001) {
      const fraction = Math.min(1, step / length);
      b.x += dx * fraction; b.y += dy * fraction;
    }
  };

  // ---- Movimiento/fases/muerte del jefe ----
  NV.updateBoss = function (dt, st) {
    const boss = st.boss;
    if (!boss || boss.dead) return { score: st.score, shards: st.shards, wave: st.wave, shake: st.shake, boss };
    const W = st.W || 900, H = st.H || 520;
    if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    const _bossHitSlowActive = boss.hitSlowUntil > 0;
    const _bossHitSlowMult = _bossHitSlowActive ? NV.hitSlowFor("BOSS").multiplier : 1;
    if (boss.hitSlowUntil > 0) boss.hitSlowUntil = Math.max(0, boss.hitSlowUntil - dt);
    if (boss.hitSlowImmunity > 0) boss.hitSlowImmunity = Math.max(0, boss.hitSlowImmunity - dt);
    if (!boss.encounter || boss.encounter.stage === 'recovery') boss.timer += dt * _bossHitSlowMult;
    if ((boss.rageCd || 0) > 0) boss.rageCd -= dt;

    NV.updateBossWorldMovement(boss, dt, st, _bossHitSlowMult);

    const visiblePosition = NV.bossVisibleArenaPosition(boss, W, H);
    boss.x = visiblePosition.x;
    boss.y = visiblePosition.y;

    let shake = st.shake || 0;
    let score = st.score, shards = st.shards, wave = st.wave;

    if (NV.playtest && NV.playtest.enabled && NV.playtest.bossAttackInitial) NV.playtest.bossAttackInitial(boss, boss.attack);

    boss.primaryAttack = boss.primaryAttack || boss.attack;

    // === FASE 2 (por debajo del 50% de HP) ===
    if (!boss.phase2 && boss.hp > 0 && boss.hp <= boss.maxHp * 0.5) {
      boss.phase2 = true;
      if (NV.playtest && NV.playtest.enabled && NV.playtest.bossPhase2) NV.playtest.bossPhase2(boss.hp);
      boss.attack = boss.primaryAttack;
      boss.atkTimer = 0;
      boss.aiTimer = 0;
      boss.phase2SignaturePending = true;
      boss.phase2SignatureTimer = 0;
      st.showBanner('¡FASE 2! ' + boss.name, '#ff5f9b');
      st.triggerFlash('#ff5f9b');
      shake = Math.max(shake, 0.8);
      // Firma sonora de transición de fase (Tarea 3, idea 6): distinta del bossEnter.
      if (st.sfx && st.sfx.bossPhaseShift) st.sfx.bossPhaseShift();
    }
    if (boss.phase2) {
      // runBossAttack ya suma dt: sólo el 20% adicional, nunca otro reloj entero.
      if (!NV.updateBossEncounter) boss.atkTimer = (boss.atkTimer || 0) + dt * .2;
      if (!boss.encounter || boss.encounter.stage === 'recovery') boss.timer += dt * 0.25;
      if (boss.phase2SignaturePending) {
        boss.phase2SignatureTimer = (boss.phase2SignatureTimer || 0) + dt;
        // Si el presupuesto hostil impide materializar la firma (p. ej. arena
        // llena para summon), la IA no queda bloqueada para siempre.
        if (boss.phase2SignatureTimer >= 5) {
          boss.phase2SignaturePending = false;
          boss.aiTimer = 0;
        }
      }
    }

    // IA adaptativa: re-evalúa el ataque cada pocos segundos según el estado del jugador/arena
    boss.aiTimer = (boss.aiTimer || 0) + dt;
    if (!NV.updateBossEncounter && !boss.phase2SignaturePending && boss.aiTimer >= (boss.phase2 ? 5 : 8)) { boss.aiTimer = 0; boss.attack = NV.selectBossAttack(boss, st); if (NV.playtest && NV.playtest.enabled && NV.playtest.bossAttackSelected) NV.playtest.bossAttackSelected(boss, boss.attack); boss.atkTimer = 0; }

    if (boss.hp > 0) {
      if (NV.updateBossEncounter) NV.updateBossEncounter(boss, dt, st);
      else NV.runBossAttack(boss, dt, st);
    }

    if (boss.hp <= 0) {
      const bossName = boss.name, bossColor = boss.color;
      boss.dead = true;
      score += 500;
      // La ruta de diez jefes tiene su propio presupuesto; legacy/Infinito
      // conservan el escalado original. El cofre sigue siendo un premio aparte.
      shards += NV.bossRewardShards ? NV.bossRewardShards(wave, st.run) : 50 + wave * 5;
      st.spawnExplosion(boss.x, boss.y, 60, boss.color, 1.4);
      if (st.sfx && st.sfx.enemyDeath) st.sfx.enemyDeath('boss', { x: boss.x, worldWidth: st.W || 900 });
      // Cofre de botín: 1-3 pickups al tocarlo (callback opcional en game.js).
      if (typeof st.spawnBossChest === 'function') st.spawnBossChest(boss.x, boss.y);
      // OJO: wave NO se incrementa aquí; game.js lo hace en skipShop() para que
      // el HUD siga mostrando la oleada del jefe hasta salir de la tienda.
      st.triggerWaveVictory(true, bossName, bossColor);
      return { score, shards, wave, shake, boss: null };
    }
    return { score, shards, wave, shake, boss };
  };
})();
