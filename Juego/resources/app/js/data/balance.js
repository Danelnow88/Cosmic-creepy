// ===== DATOS: constantes de balanc / tuning =====
// Pura configuración (sin lógica). Se carga ANTES de game.js; game.js lee cada
// constante por alias local (p. ej. const FIRE_FPS = NV.BALANCE.FIRE_FPS;).
(() => {
  'use strict';
  const NV = window.NV;

  const FIRE_FPS = 60;
  const MIN_FIRE_INTERVAL = 4 / FIRE_FPS; // ~0.0667s -> máx ~15 disparos/s (piso anti-congestión)

  NV.BALANCE = {
    // Tope de buffers de entidad
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
    // Curva de amenaza: densidad blanda + reposición + composición.
    // MAX_HOSTILES/MAX_HEAVY_HOSTILES siguen siendo el TECHO DURO de emergencia;
    // el refill ordinario ahora se detiene antes (objetivo blando) para que el
    // late game opere visiblemente por debajo del cap en vez de saturarlo.
    LATE_BATCH_CAP: 5,            // lote normal máx en oleadas tardías (antes 8)
    LATE_REFILL_FLOOR: 0.35,      // piso de reposición tardía (antes 0.25s)
    SOFT_DENSITY_EARLY_BASE: 18,  // w1 normal
    SOFT_DENSITY_EARLY_END: 5,
    SOFT_DENSITY_EARLY_RATE: 0.5, // w5 = 20
    SOFT_DENSITY_MID_END: 15,
    SOFT_DENSITY_MID_RATE: 0.4,   // w10 = 22, w15 = 24
    SOFT_DENSITY_LATE_END: 25,
    SOFT_DENSITY_LATE_RATE: 0.2,  // w20 = 25, w25 = 26
    SOFT_DENSITY_CAP: 26,         // objetivo ordinario máximo en normal
    SOFT_DENSITY_DIFF_SCALE: 14,  // spawnMult -> easy -2 / hard +2
    SOFT_DENSITY_MIN: 16,         // piso absoluto con dificultad
    SOFT_DENSITY_MAX: 28,         // difícil tampoco opera pegado al cap duro 30
    SOFT_HEAVY_TARGET: 4,         // los élites dejan de rellenar al llegar (de 7)
    TACTICAL_BOOST_START: 14,     // oleada desde la que sube el peso táctico
    TACTICAL_BOOST_MAX: 2.0,      // multiplicador máximo del peso táctico
    TACTICAL_BOOST_RATE: 0.05,    // por oleada
    MAX_SPEAKER_MINES: 6,
    SPEAKER_MINE_INITIAL_COUNT: 5,
    SPEAKER_MINE_DETONATE_TIME: 0.12,
    SPEAKER_MINE_VISUAL_RADIUS: 16,
    SPEAKER_MINE_TRIGGER_RADIUS: 14,
    SPEAKER_MINE_DAMAGE_BASE: 38,
    SPEAKER_MINE_DAMAGE_PER_WAVE: 0.5,
    SPEAKER_MINE_DAMAGE_CAP: 52,
    SPEAKER_MINE_PLAYER_MIN_DIST: 175,
    SPEAKER_MINE_SEPARATION: 105,
    SPEAKER_MINE_ARENA_MARGIN: 42,
    SPEAKER_MINE_PLACEMENT_ATTEMPTS: 24,
    SPEAKER_MINE_INITIAL_CADENCE: 0.28,
    SPEAKER_MINE_REFILL_CADENCE: 2.4,
    SPEAKER_MINE_TELEGRAPH_DURATION: 0.9,
    SPEAKER_MINE_REFILL_CADENCE_P3_1: 2.6,
    SPEAKER_MINE_REFILL_CADENCE_WAVE_THRESHOLD: 8,
    SPEAKER_MINE_TACTICAL_CHANCE: 0.7,
    SPEAKER_MINE_PLAYER_PREDICTION: 0.65,
    MINEFIELD_SPEED_NORMAL: 1.22,
    MINEFIELD_SPEED_FAST: 1.12,
    MINEFIELD_SPEED_ELITE: 1.10,
    MINEFIELD_SPEED_CAP: 260,
    MAX_ENEMIES: 30, MAX_BULLETS: 200, MAX_PARTICLES: 200,
    MAGNET_CAP: 50,
    WAVE_END_SHARD_CAP: 15,
    VOID_BOMB_ELITE_DAMAGE_MULT: 0.50,
    VOID_BOMB_BOSS_DAMAGE_MULT: 0.08,
    SHOTGUN_PELLET_COUNT: 12,
    SHOTGUN_SPREAD: 0.90,
    SHOTGUN_COMPACT_SPREAD: 0.018,
    SHOTGUN_BLOOM_START: 65,
    SHOTGUN_UNIQUE_TARGET_CAP: 5,
    // Contra un jefe grande la geometria puede absorber los 12 perdigones. Ocho
    // conservan el burst cercano sin convertir cada descarga en 12 impactos gratis.
    SHOTGUN_BOSS_PELLET_CAP: 8,
    SNIPER_ELITE_DAMAGE_MULT: 1.5,
    FLAME_TICK_RATE: 6,
    FLAME_BURN_DPS: 2,
    FLAME_BURN_DURATION: 0.6,
    // Movimiento controlado: las tasas se derivan de la velocidad efectiva para que
    // permanentes/temporales no alarguen la parada ni creen inercia descontrolada.
    MOVE_ACCEL_TIME: 0.13,
    MOVE_DECEL_TIME: 0.10,
    MOVE_TURN_TIME: 0.085,
    MOVE_REVERSE_TIME: 0.11,
    // Dash stamina: dos usos desde lleno, dash breve y recuperación por tiempo de simulación.
    DASH_STAMINA_MAX: 100,
    DASH_STAMINA_COST: 50,
    DASH_DURATION: 0.15,
    DASH_SPEED: 560,
    DASH_RECHARGE_DELAY: 0.90,
    DASH_REGEN_PER_SECOND: 100 / 2.9,
    // Presupuesto separado de balas por bando
    MAX_PLAYER_BULLETS: 150, MAX_ENEMY_BULLETS: 120,
    // Nuevas permanentes (por nivel): chance de crítico propio / esquiva / HP/s regen / % extra de drop
    PERM_MOVE_SPEED_PER_LEVEL: 0.02,
    PERM_MOVE_CONTROL_PER_LEVEL: 0.025,
    MAX_AGILITY: 2,
    AGILITY_PER_UPGRADE: 0.2,
    // Progresión permanente
    MAX_PERM_LEVEL: 10,
    // Nuevas permanentes (por nivel): chance de crítico propio / esquiva / HP/s regen / % extra de drop
    CRIT_PERM_CHANCE: 0.005,
    DODGE_PERM_CHANCE: 0.004,
    REGEN_PERM_HPSEC: 0.2,
    GREED_PERM_DROP: 0.03,
    // Fusión de armas repetidas: duplicar una arma que ya tenés sube su fusión
    // (+ daño) en vez de sumar un slot. Techo bajo para no desbalancear la curva.
    MAX_WEAPON_FUSION: 3,          // fusiones máximas por arma
    WEAPON_FUSION_DMG: 0.20,       // +20% de daño por nivel de fusión
    WEAPON_FUSE_PRICE: 15,         // precio de fusionar comprando duplicado en tienda
    // Venta de armas (shards in-run, siempre < compra 25 para no farmear economías).
    WEAPON_SELL_PRICES: { common: 6, uncommon: 9, rare: 12, epic: 16, legendary: 20 },
    // Cadencia de armas (fireRate se interpreta como frames a ~60fps)
    FIRE_FPS, MIN_FIRE_INTERVAL,
    WAVE_CADENCE_SCALE: 0.01,          // -1% de intervalo por oleada (máx -45% de factor)
    WEAPON_LEVEL_CADENCE_SCALE: 0.004, // -0.4% de intervalo por nivel de arma (máx -40%)
    // Misc
    SHIELD_COOLDOWN: 0.9,              // recarga del escudo del shielder (s): vulnerable entre bloqueos
    METEOR_BOSS_DMG_MULT: 0.3,         // Lluvia Estelar: daño de meteoro reducido contra jefes (anti one-shot)
    DRONE_BOSS_DMG_MULT: 0.35,         // Enjambre: presión sostenida útil sin borrar fases de jefe
    PHASE_AURA_DPS: 40,                // Fase Fantasma (NOVA): daño por segundo del aura espectral
    PHASE_AURA_RADIUS: 70,             // radio de la zona de daño del aura
    PHASE_AURA_BOSS_MULT: 0.3,         // multiplicador del aura contra el jefe (coherente con meteoro)
    PHASE_DETONATION_MULT: 0.5,        // Detonación Espectral: % del DoT acumulado que pega el estallido final
    MAX_AGILITY: 2,                    // tope de la mejora de Agilidad (x2 = +100% aceleración/freno)
    AGILITY_PER_UPGRADE: 0.2,          // +0.2 por compra (5 compras llegan al tope)
    WEAPON_KILLS_PER_LEVEL: 6,         // ~6 puntos de progreso por nivel
    WEAPON_PROGRESS_SCALE: 0.06,       // +6% de progreso por derribo, por oleada
    WEAPON_PROGRESS_CAP: 3,            // máx ~3 puntos de progreso por derribo
    WEAPON_MAX_LEVEL: 100,             // tope duro de nivel de arma (pico de poder)

    // ===== F4: stun/disrupción del jugador (sistema central, anti-stunlock) =====
    // Duración por defecto cuando la fuente no define la suya (familias boss
    // comunes y proyectiles sin metadato propio). Las duraciones por fuente
    // viven junto al stunChance de cada enemigo/familia de ataque.
    PLAYER_STUN_DEFAULT_DURATION: 0.5,
    // Anti-stunlock: tras un stun exitoso, NINGÚN intento adicional (de
    // cualquier fuente) puede aplicar/extender/resetear stun durante este
    // lockout global. El daño normal de esos ataques SIEMPRE aplica.
    PLAYER_STUN_REAPPLY_LOCKOUT: 1.5,
    // Ventana mínima de recuperación tras stuns cuya duración supera el suelo
    // global. Evita reaplicaciones antes de que el jugador recupere control.
    PLAYER_STUN_POST_RECOVERY_GRACE: 0.35,

    // Duración de oleada normal por tramos. Bosses conservan su final por muerte.
    WAVE_TIME_EARLY_BASE: 15,
    WAVE_TIME_EARLY_END: 5,
    WAVE_TIME_EARLY_RATE: 0.75,
    WAVE_TIME_MID_END: 15,
    WAVE_TIME_MID_RATE: 0.8,
    WAVE_TIME_LATE_RATE: 0.6,
    WAVE_TIME_CAP: 35,
    WAVE_EVENT_DURATION_MULT: 1.15,
    WAVE_EVENT_TIME_CAP: 40.25,
    // Compensa sólo la mitad de la extensión: queda actividad adicional moderada.
    WAVE_EVENT_SPAWN_COMPENSATION: 0.5,
  };
  // Duración base creciente por tramos. Única fuente de verdad para nextWave y HUD.
  NV.baseWaveDuration = function (wave) {
    const B = NV.BALANCE;
    const w = Math.max(1, wave || 1);
    if (w <= B.WAVE_TIME_EARLY_END) {
      return B.WAVE_TIME_EARLY_BASE + (w - 1) * B.WAVE_TIME_EARLY_RATE;
    }
    const earlyEnd = B.WAVE_TIME_EARLY_BASE + (B.WAVE_TIME_EARLY_END - 1) * B.WAVE_TIME_EARLY_RATE;
    if (w <= B.WAVE_TIME_MID_END) {
      return earlyEnd + (w - B.WAVE_TIME_EARLY_END) * B.WAVE_TIME_MID_RATE;
    }
    const midEnd = earlyEnd + (B.WAVE_TIME_MID_END - B.WAVE_TIME_EARLY_END) * B.WAVE_TIME_MID_RATE;
    return Math.min(B.WAVE_TIME_CAP, midEnd + (w - B.WAVE_TIME_MID_END) * B.WAVE_TIME_LATE_RATE);
  };

  NV.waveDuration = function (wave, waveEvent) {
    const B = NV.BALANCE;
    const base = NV.baseWaveDuration(wave);
    return waveEvent ? Math.min(B.WAVE_EVENT_TIME_CAP, base * B.WAVE_EVENT_DURATION_MULT) : base;
  };

  // Asalto finito: la barra representa enemigos realmente despejados, no pasos
  // recorridos. La duración sigue siendo el tiempo mínimo de supervivencia.
  // El presupuesto tiene techo para que las runs largas no crezcan sin límite.
  NV.waveClearObjective = function (wave, difficultyId) {
    const w = Math.max(1, Math.floor(wave || 1));
    const id = NV.difficultyGet(difficultyId).id;
    const offset = id === 'easy' ? -4 : id === 'hard' ? 4 : 0;
    return {
      total: Math.min(60, 22 + Math.floor((w - 1) * 1.5) + offset),
    };
  };
  NV.waveClearReady = function (remaining, spawned, alive, objective) {
    return !!objective && remaining <= 0 && spawned >= objective.total && alive === 0;
  };

  // Compensación parcial: el evento dura 15% más, pero sólo ralentiza 7.5% el refill.
  NV.waveSpawnFactor = function (wave, waveEvent) {
    if (!waveEvent) return 1;
    const B = NV.BALANCE;
    const durationRatio = NV.waveDuration(wave, waveEvent) / NV.baseWaveDuration(wave);
    return 1 + (durationRatio - 1) * B.WAVE_EVENT_SPAWN_COMPENSATION;
  };

  // ===== B1: escalado de HP enemigo =====
  // Curva ORIGINAL: 1 + 0.30*wave (lineal) — crecía más rápido que el poder del
  // jugador y generaba la espiral descendente que mataba la partida antes de la 30.
  // F1: idéntica hasta la oleada 10 (onboarding intacto); pendiente 0.28 a partir
  // de ahí (continua en w=10: 4.0 = 1 + 0.30*10). Esta intervención no modifica
  // la curva: w30=9.6, w50=15.2; siempre bajo el lineal original.
  // Pura y testeable; spawnEnemy (enemies.js) es su único consumidor.
  NV.enemyHpScale = function (wave) {
    const w = Math.max(1, wave || 1);
    if (w <= 10) return 1 + 0.30 * w;
    return 4 + (w - 10) * 0.28;
  };

  // Densidad blanda creciente y acotada. Normal progresa 18 -> 20 -> 24 -> 26;
  // dificultad aplica aproximadamente +/-2 y MAX_HOSTILES=30 queda como techo duro.
  NV.arenaDensityCompensation = function (metrics) {
    if (!metrics) return 0;
    const area = (metrics.arenaW || 900) * (metrics.arenaH || 520);
    const reference = (metrics.refW || 900) * (metrics.refH || 520);
    // Área desktop 2.25×: +4, no 2.25× enemigos. También acotado en móvil.
    return Math.max(0, Math.min(4, Math.round((Math.sqrt(area / reference) - 1) * 8)));
  };
  NV.softHostileTarget = function (wave, diffId, metrics) {
    const B = NV.BALANCE;
    const w = Math.max(1, wave || 1);
    let base;
    if (w <= B.SOFT_DENSITY_EARLY_END) {
      base = B.SOFT_DENSITY_EARLY_BASE + (w - 1) * B.SOFT_DENSITY_EARLY_RATE;
    } else {
      const earlyEnd = B.SOFT_DENSITY_EARLY_BASE + (B.SOFT_DENSITY_EARLY_END - 1) * B.SOFT_DENSITY_EARLY_RATE;
      if (w <= B.SOFT_DENSITY_MID_END) {
        base = earlyEnd + (w - B.SOFT_DENSITY_EARLY_END) * B.SOFT_DENSITY_MID_RATE;
      } else {
        const midEnd = earlyEnd + (B.SOFT_DENSITY_MID_END - B.SOFT_DENSITY_EARLY_END) * B.SOFT_DENSITY_MID_RATE;
        base = midEnd + (w - B.SOFT_DENSITY_MID_END) * B.SOFT_DENSITY_LATE_RATE;
      }
    }
    base = Math.min(B.SOFT_DENSITY_CAP, Math.round(base));
    const spawnMult = NV.difficultySafeMult('spawn', diffId) || 1;
    const diffAdj = Math.round((spawnMult - 1) * B.SOFT_DENSITY_DIFF_SCALE);
    return Math.max(B.SOFT_DENSITY_MIN, Math.min(B.SOFT_DENSITY_MAX, base + diffAdj + NV.arenaDensityCompensation(metrics)));
  };
  // Incluye al jefe: 4/6/8 acompañantes iniciales, +1 en w20 y +2 en w40.
  // Summons pueden ocupar estos lugares: no existe otro presupuesto paralelo.
  NV.bossSupportTarget = function (wave, diffId) {
    const base = diffId === 'easy' ? 5 : diffId === 'hard' ? 9 : 7;
    return base + Math.min(2, Math.floor(Math.max(0, wave || 1) / 20));
  };
  NV.spawnRefillInterval = function (wave, event, bossActive, diffId, metrics) {
    if (bossActive) return diffId === 'easy' ? 3 : diffId === 'hard' ? 2 : 2.5;
    const factor = 1 - NV.arenaDensityCompensation(metrics) * .035;
    return Math.max(NV.BALANCE.LATE_REFILL_FLOOR, (1.3 - wave * .035) * NV.waveSpawnFactor(wave, event) * factor);
  };
  // Lote de refill normal: early idéntico al actual (2 en w1, 3 en w2, 4 en w4,
  // 5 en w6) con techo 5 en oleadas tardías (antes 8). Consumidor: game.js.
  NV.spawnBatchForWave = function (wave) {
    const w = Math.max(1, wave || 1);
    return 2 + Math.min(3, Math.floor(w / 2));
  };
  // C2 — Director por composiciones. Dos de cada tres refills siguen usando la
  // selección ponderada histórica; el tercero despliega una escuadra con función
  // reconocible. Así aparecen combinaciones intencionales sin convertir cada
  // oleada en una secuencia rígida ni aumentar la cantidad de hostiles.
  NV.WAVE_COMPOSITION_CARDS = Object.freeze({
    early: Object.freeze([
      Object.freeze(['drone', 'drone', 'runner', 'drone', 'runner']),
      Object.freeze(['drone', 'specter_archer', 'specter_grunt', 'runner', 'drone']),
    ]),
    mid: Object.freeze([
      Object.freeze(['tank', 'specter_guard', 'specter_archer', 'runner', 'drone']),
      Object.freeze(['shielder', 'specter_archer', 'tank', 'drone', 'runner']),
    ]),
    pressure: Object.freeze([
      Object.freeze(['kamikaze', 'specter_guard', 'specter_archer', 'runner', 'tank']),
      Object.freeze(['spitter', 'swarmlet', 'swarmlet', 'runner', 'shielder']),
    ]),
    late: Object.freeze([
      Object.freeze(['wisp', 'runner', 'spitter', 'shielder', 'tank']),
      Object.freeze(['specter_archer', 'specter_guard', 'drone', 'runner', 'spitter']),
    ]),
    endgame: Object.freeze([
      Object.freeze(['specter_guard', 'specter_archer', 'specter_core', 'drone', 'runner']),
      Object.freeze(['kamikaze', 'tank', 'spitter', 'wisp', 'shielder']),
    ]),
  });
  NV.waveCompositionStage = function (wave) {
    const w = Math.max(1, wave || 1);
    if (w <= 4) return 'early';
    if (w <= 9) return 'mid';
    if (w <= 14) return 'pressure';
    if (w <= 19) return 'late';
    return 'endgame';
  };
  NV.planWaveSpawnBatch = function (wave, count, cycle, enemyTypes, difficultyId) {
    const size = Math.max(0, Math.floor(count || 0));
    // La dificultad también altera composición, no sólo estadísticas.
    const diff = NV.difficultyGet ? NV.difficultyGet(difficultyId) : { id: 'normal' };
    const tacticalPeriod = diff.id === 'easy' ? 4 : diff.id === 'hard' ? 2 : 3;
    const safeCycle = Math.max(0, Math.floor(cycle || 0));
    if (!size || safeCycle % tacticalPeriod !== tacticalPeriod - 1) return [];
    const stage = NV.waveCompositionStage(wave);
    const cards = NV.WAVE_COMPOSITION_CARDS[stage] || [];
    if (!cards.length) return [];
    const cardIndex = Math.floor(safeCycle / tacticalPeriod) % cards.length;
    const definitions = Array.isArray(enemyTypes) ? enemyTypes : [];
    const available = new Set(definitions
      .filter((entry) => entry && (entry.minWave || 1) <= Math.max(1, wave || 1))
      .map((entry) => entry.id));
    const card = cards[cardIndex];
    const plan = [];
    for (let i = 0; i < card.length && plan.length < size; i++) {
      if (available.has(card[i])) plan.push(card[i]);
    }
    return plan;
  };
  // Composición: los roles tácticos EXISTENTES ganan peso gradual a partir de
  // TACTICAL_BOOST_START (techo 2.0 → ningún tipo individual domina). Consumidor:
  // spawnEnemy (enemies.js). Solo pondera selección; no toca stats ni minWave.
  NV.TACTICAL_ENEMY_IDS = { spitter: 1, shielder: 1, wisp: 1, specter_archer: 1, specter_guard: 1, specter_core: 1 };
  NV.tacticalWeightBoost = function (wave) {
    const B = NV.BALANCE;
    const w = Math.max(1, wave || 1);
    return 1 + Math.min(B.TACTICAL_BOOST_MAX - 1, Math.max(0, w - B.TACTICAL_BOOST_START) * B.TACTICAL_BOOST_RATE);
  };
  // Durabilidad/ofensiva por rol (F1: roles, no esponja global). Solo multiplican
  // en spawn; básicos/chaff quedan en 1.0 (siguen frágiles). Consumidor: enemies.js.
  NV.ROLE_HP_MULT = { tank: 1.35, specter_guard: 1.30, specter_core: 1.20, shielder: 1.20, spitter: 1.15, specter_archer: 1.10 };
  NV.ROLE_DMG_MULT = { spitter: 1.15, specter_archer: 1.15, specter_core: 1.10, specter_guard: 1.10 };
  NV.roleHpMult = function (id) { return NV.ROLE_HP_MULT[id] || 1; };
  NV.roleDmgMult = function (id) { return NV.ROLE_DMG_MULT[id] || 1; };

  // ===== B2: piso de poder del jugador =====
  // El daño del arma escala +5% por oleada completada (automático, sin comprar),
  // para que el poder nunca quede estático contra el HP creciente (B1).
  // wave=1 -> x1.00 (partida igual a siempre). Pura y testeable;
  // shoot (weapons.js) es su único consumidor.
  NV.waveWeaponMult = function (wave) {
    const w = Math.max(1, wave || 1);
    return 1 + (w - 1) * 0.05;
  };

  // ===== Multiplicador de daño base por nivel de arma =====
  // Escala proporcionalmente el daño propio del arma sin multiplicar los bonos
  // permanentes planos. El tope duro WEAPON_MAX_LEVEL=100 marca x1.98.
  // Consumidores: engine/weapons.js (daño de bala) y render/hud.js (stats TAB).
  NV.weaponLevelDamageMultiplier = function (level) {
    const L = Math.max(1, level || 1);
    if (L <= 25) return 1 + 0.02 * (L - 1);
    if (L <= 50) return 1.48 + 0.01 * (L - 25);
    return 1.73 + 0.005 * (L - 50);
  };

  // ---- Números de daño con código de color por intensidad (sin "CRITICAL!") ----
  // Normal → blanco · Golpe sustancial → cian · Crítico → rojo intenso + fuente mayor.
  // Definido aquí (data/) para que engine/bullets.js y engine/enemies.js puedan
  // usarlo incluso en sandboxes mínimos que cargan balance.js sin fx.js.
  NV.DAMAGE_FLOAT_COLORS = { normal: '#FFFFFF', heavy: '#00E5FF', crit: '#FF2A4B' };
  NV.damageFloatStyle = function (dealt, crit) {
    if (crit) return { color: NV.DAMAGE_FLOAT_COLORS.crit, size: 17 };
    if ((dealt || 0) >= 20) return { color: NV.DAMAGE_FLOAT_COLORS.heavy, size: 15 };
    return { color: NV.DAMAGE_FLOAT_COLORS.normal, size: 13 };
  };

  // F10: difficulty modes
  NV.DIFFICULTY = {
    easy:   { id: "easy",   label: "Facil",   hpMult: 0.80, dmgMult: 0.75, spawnMult: 0.85 },
    normal: { id: "normal", label: "Normal",   hpMult: 1.00, dmgMult: 1.00, spawnMult: 1.00 },
    hard:   { id: "hard",   label: "Dificil", hpMult: 1.20, dmgMult: 1.25, spawnMult: 1.15 },
  };
  NV.DIFFICULTY_ORDER = ["easy", "normal", "hard"];
  NV.difficultyGet = function (id) { return NV.DIFFICULTY[id] || NV.DIFFICULTY.normal; };
  NV.difficultyHpMult = function (id) { return NV.difficultyGet(id).hpMult; };
  NV.difficultyDmgMult = function (id) { return NV.difficultyGet(id).dmgMult; };
  // La primera compra conserva el precio conocido; las siguientes absorben el
  // excedente tardío y obligan a priorizar una build en vez de comprar todo.
  NV.runUpgradePrice = function (kind, level) {
    const table = { hp: [15, 4], speed: [15, 4], armor: [20, 5], luck: [20, 5] };
    const row = table[kind] || [20, 5];
    return row[0] + Math.max(0, Math.floor(level || 0)) * row[1];
  };
  NV.weaponFusionShopPrice = function (currentFusion) {
    return NV.BALANCE.WEAPON_FUSE_PRICE + Math.max(0, Math.floor(currentFusion || 0)) * 8;
  };
  NV.HIT_SLOW = {
    NORMAL: { multiplier: 0.85, activeDuration: 0.15, immunity: 0.20 },
    ELITE:  { multiplier: 0.90, activeDuration: 0.12, immunity: 0.23 },
    BOSS:   { multiplier: 0.95, activeDuration: 0.08, immunity: 0.27 },
  };
  NV.hitSlowFor = function (category) { return NV.HIT_SLOW[category] || NV.HIT_SLOW.NORMAL; };
  NV.difficultySafeMult = function (kind, diffId) {
    if (!NV.DIFFICULTY) return 1;
    var d = NV.difficultyGet(diffId || (NV.settings && NV.settings.gameplay && NV.settings.gameplay.difficulty));
    if (!d) return 1;
    return kind === "hp" ? d.hpMult : kind === "dmg" ? d.dmgMult : kind === "spawn" ? (d.spawnMult||1) : 1;
  };
  // ===== F3: Hook/Pull (specter_archer only, wave >= 15) =====
  // Constantes de balance para el sistema de gancho. Autoridad única: NV.BALANCE.
  // (Asignadas al objeto antes del Object.freeze de abajo: quedan congeladas igual.)
  NV.BALANCE.HOOK_UNLOCK_WAVE = 15;
  NV.BALANCE.HOOK_WINDUP_TIME = 0.55;
  NV.BALANCE.HOOK_PROJECTILE_SPEED = 560;
  NV.BALANCE.HOOK_PROJECTILE_MAX_RANGE = 430;
  NV.BALANCE.HOOK_PULL_DURATION = 0.50;
  NV.BALANCE.HOOK_PULL_EXTERNAL_SPEED = 255;
  NV.BALANCE.HOOK_TETHER_MAX_RANGE = 470;
  NV.BALANCE.HOOK_GLOBAL_LOCKOUT_POST_RELEASE = 0.85;
  NV.BALANCE.HOOK_DIRECT_DAMAGE = 0;
  // F3 visibilidad: el specter_archer es la ÚNICA fuente del Hook y su peso base
  // (0.12 en gameData) lo dejaba ~8x más raro que los demás roles tácticos (1.0),
  // así que un jugador podía pasar minutos sin ver un intento. Este multiplicador
  // solo afecta al PESO EFECTIVO de selección (composición), nunca a stats, minWave
  // ni al número total de hostiles (soft target/MAX_HOSTILES intactos).
  NV.BALANCE.HOOK_SOURCE_PRESENCE_FROM_WAVE = 15; // misma oleada que el desbloqueo
  NV.BALANCE.HOOK_SOURCE_PRESENCE_MULT = 2.5;     // peso efectivo 0.12 -> 0.30
  Object.freeze(NV.BALANCE);
  // Cooldown enemigo-local por dificultad. F3: specter_archer solo.
  // Llamar con NV.runDifficulty en runtime. Ajuste de frecuencia (verificación de
  // runtime): con un único archer vivo, el ciclo real medido era ~6.4s (cooldown 5
  // + lockout 0.75 + deferral del ciclo de disparo normal). Bajado a 3.0s en normal
  // para que el intento entre en la ventana objetivo de 2-5s sin volverse continuo:
  // el lockout global de 0.75s sigue siendo el suelo real cuando hay >1 archer.
  NV.hookCooldownForDifficulty = function (diffId) {
    const d = NV.difficultyGet(diffId != null ? diffId : (NV.runDifficulty != null ? NV.runDifficulty : 'normal'));
    if (d.id === 'easy') return 4.0;
    if (d.id === 'hard') return 2.25;
    return 3.0; // normal + fallback
  };
  // Multiplicador de peso efectivo del specter_archer (composición, no stats).
  // 1.0 antes de la oleada de desbloqueo; HOOK_SOURCE_PRESENCE_MULT a partir de ella.
  // Consumidor único: spawnEnemy (engine/enemies.js). Peso base de datos intacto.
  NV.hookSourcePresenceMult = function (wave) {
    const B = NV.BALANCE;
    const w = Math.max(1, wave || 1);
    return w >= B.HOOK_SOURCE_PRESENCE_FROM_WAVE ? B.HOOK_SOURCE_PRESENCE_MULT : 1;
  };
  // Factory del hookSystem (game-owned). F3: un juego, un hookSystem.
  // Fases: idle -> windup -> projectile -> tether -> idle (+ lockout).
  NV.createHookSystem = function () {
    return {
      phase: 'idle',          // idle | windup | projectile | tether
      windupTimer: 0,         // cuenta atrás HOOK_WINDUP_TIME
      tetherTimer: 0,         // cuenta atrás HOOK_PULL_DURATION
      lockoutTimer: 0,        // cuenta atrás HOOK_GLOBAL_LOCKOUT_POST_RELEASE
      projectile: null,       // { x, y, vx, vy, dist } — separado de bullets[]
      tether: null,           // { srcX, srcY } — posición fuente del enemigo al formar el tether
      srcEnemy: null,         // referencia al specter_archer fuente (enemy-local cooldown)
    };
  };
  // Limpieza TOTAL sin cooldown ni lockout: wave_end/shop_enter/gameover/restart/run nueva.
  // Mid-run (miss/expire/dash/death/break) usa NV.resetHookState de engine/enemies.js
  // (aplica cooldown del source + lockout global). NV.resetHookState vive en engine;
  // aquí solo se define el fallback para sandboxes que cargan balance.js sin engine.
  NV.resetHookSystem = NV.resetHookSystem || function (hs) {
    if (!hs) return hs;
    const src = hs.srcEnemy;
    if (src) { src.hookOwner = false; src.hookWindup = false; }
    hs.phase = 'idle';
    hs.windupTimer = 0;
    hs.tetherTimer = 0;
    hs.lockoutTimer = 0;
    hs.projectile = null;
    hs.tether = null;
    hs.srcEnemy = null;
    return hs;
  };
})();
