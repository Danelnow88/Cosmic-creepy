// Expedición: reglas puras, checkpoints versionados y perfil local.
// No depende del DOM ni cambia combate desde un temporizador de interfaz.
(() => {
  'use strict';
  const NV = window.NV;
  const VERSION = 1;
  const SAVE_KEY = 'neonVoidExpeditionV1';
  const PROFILE_KEY = 'neonVoidCareerV1';
  const SECTORS = ['UMBRAL', 'FUNDICIÓN', 'FRACTURA', 'CORAZÓN DEL VACÍO'];
  const PLAYER_FIELDS = ['hp', 'maxHp', 'armor', 'luck', 'agility', 'level', 'xp', 'xpToNext',
    'baseMoveSpeed', 'moveSpeedPermanentMult', 'moveControlPermanentMult', 'permCrit', 'permDodge', 'permRegen', 'permGreed'];
  const number = (v, lo, hi, fallback = lo) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
  const integer = (v, lo, hi, fallback = lo) => Math.floor(number(v, lo, hi, fallback));
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }
  function write(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch (_) { return false; }
  }
  function create(mode, seed) {
    return { version: VERSION, mode: mode === 'endless' ? 'endless' : 'expedition', seed: integer(seed, 0, 1e9), bossProgression: 'full-roster',
      seconds: 0, kills: 0, hits: 0, bosses: 0, cleared: 0, completed: false, rewardClaimed: false,
      weaponKills: {}, waveKills: {}, waveHits: 0, prep: null, contract: false, contracts: 0,
      lastReward: 0, lastReport: '', event: null };
  }
  function normalizeRun(raw) {
    if (!raw || raw.version !== VERSION) return null;
    const out = create(raw.mode, raw.seed);
    // Guardados anteriores conservan su ruta y cadencia: no cambiar una partida en curso.
    out.bossProgression = raw.bossProgression === 'full-roster' ? 'full-roster' : 'legacy';
    for (const key of ['seconds', 'kills', 'hits', 'bosses', 'cleared', 'contracts']) out[key] = number(raw[key], 0, 1e8);
    for (const key of ['completed', 'rewardClaimed', 'contract']) out[key] = raw[key] === true;
    out.prep = ['repair', 'training', 'contract', 'calibrate'].includes(raw.prep) ? raw.prep : null;
    out.event = NV.WAVE_EVENTS && NV.WAVE_EVENTS[raw.event] ? raw.event : null;
    for (const w of NV.WEAPONS) out.weaponKills[w.id] = integer(raw.weaponKills && raw.weaponKills[w.id], 0, 1e7);
    return out;
  }
  function isBossWave(run, wave) {
    const full = run && run.mode === 'expedition' && run.bossProgression === 'full-roster';
    return Number.isInteger(wave) && wave > 0 && wave % (full ? 2 : 5) === 0;
  }
  // Historia nueva alterna asalto/jefe y recorre los diez en veinte oleadas.
  // Infinito, laboratorio y checkpoints anteriores conservan sus índices canónicos.
  function bossIndex(run, wave) {
    if (run && run.mode === 'expedition' && run.bossProgression === 'full-roster') return (Math.floor(wave / 2) - 1) % NV.BOSS_TYPES.length;
    if (!run || run.mode === 'endless' || wave > 20) return (Math.floor(wave / 5) - 1) % NV.BOSS_TYPES.length;
    const routes = [[0, 8, 4, 9], [3, 1, 7, 9], [0, 2, 5, 6]];
    return routes[run.seed % routes.length][Math.min(3, Math.floor(wave / 5) - 1)];
  }
  function sector(wave) { return SECTORS[Math.min(3, Math.floor((Math.max(1, wave) - 1) / 5))]; }
  function beginWave(run) { run.waveKills = {}; run.waveHits = 0; run.lastReward = 0; }
  function kill(run, source) {
    run.kills++;
    if (!source || source.kind !== 'weapon' || !NV.weaponById(source.weaponId)) return;
    const id = source.weaponId;
    run.weaponKills[id] = (run.weaponKills[id] || 0) + 1;
    run.waveKills[id] = (run.waveKills[id] || 0) + 1;
  }
  function finishWave(run, wave, isBoss) {
    if (run.cleared >= wave) return 0; // idempotencia: jamás pagar dos veces una transición.
    run.cleared = wave;
    if (isBoss) run.bosses++;
    const clean = run.waveHits === 0;
    let reward = 8 + Math.min(12, wave) + (clean ? 8 : 0);
    const fulfilled = run.contract && (isBoss ? run.waveHits <= 2 : Object.values(run.waveKills).filter(n => n >= 3).length >= 2);
    if (fulfilled) { reward += 30 + wave * 2; run.contracts++; }
    run.lastReport = (clean ? 'SIN DAÑO · +8 ◆' : 'OLEADA COMPLETADA') +
      (run.contract ? (fulfilled ? ' · CONTRATO CUMPLIDO' : ' · CONTRATO NO CUMPLIDO') : '');
    run.lastReward = reward;
    run.prep = null; run.contract = false;
    return reward;
  }
  // Maestría personal conserva sus bajas; la sincronización de arsenal NO inventa kills.
  function syncArsenal(inventory, levels, kills) {
    const lead = Math.max(1, ...Object.values(levels).filter(Number.isFinite));
    const floor = Math.min(40, 1 + Math.floor((lead - 1) * 0.60));
    for (const w of inventory) {
      levels[w.id] = Math.max(levels[w.id] || 1, floor);
      // La próxima baja debe avanzar desde el nuevo piso, no recuperar XP atrasada.
      kills[w.id] = Math.max(kills[w.id] || 0, ((levels[w.id] || 1) - 1) * (NV.BALANCE.WEAPON_KILLS_PER_LEVEL || 6));
    }
    return floor;
  }
  // Diez encuentros no deben multiplicar por 2,5 el dinero del diseño de
  // cuatro jefes. Sólo ajusta Historia nueva; Infinito y checkpoints legacy
  // conservan su recompensa. No se modifica el saldo ya ganado ni el cofre.
  NV.bossRewardShards = function (wave, run) {
    if (run && run.mode === 'expedition' && run.bossProgression === 'full-roster') return 24 + wave * 2;
    return 50 + wave * 5;
  };
  function prepCost(kind, wave) {
    if (kind === 'contract') return 0;
    if (kind === 'calibrate') return 42 + Math.floor(wave * 2);
    return (kind === 'repair' ? 16 : 22) + Math.floor(wave * 1.5);
  }
  function prepare(kind, st) {
    if (!st.run || st.run.prep || !['repair', 'training', 'contract', 'calibrate'].includes(kind)) return { ok: false };
    const cost = prepCost(kind, st.wave);
    if (st.shards < cost || (kind === 'repair' && st.player.hp >= st.player.maxHp)) return { ok: false };
    const lead = Math.max(1, ...Object.values(st.levels).filter(Number.isFinite));
    const candidates = st.inventory.filter(w => (st.levels[w.id] || 1) < lead);
    if (kind === 'training' && !candidates.length) return { ok: false };
    const calibrationFloor = Math.min(80, 1 + Math.floor((lead - 1) * 0.80));
    const calibrationTargets = st.inventory.filter(w => (st.levels[w.id] || 1) < calibrationFloor);
    if (kind === 'calibrate' && (st.wave < 10 || st.inventory.length < 2 || !calibrationTargets.length)) return { ok: false };
    if (kind === 'repair') st.player.hp = Math.min(st.player.maxHp, st.player.hp + Math.ceil(st.player.maxHp * 0.40));
    if (kind === 'training') {
      const w = candidates.sort((a, b) => (st.levels[a.id] || 1) - (st.levels[b.id] || 1))[0];
      st.levels[w.id] = Math.min(lead, (st.levels[w.id] || 1) + 10);
      st.kills[w.id] = Math.max(st.kills[w.id] || 0, (st.levels[w.id] - 1) * (NV.BALANCE.WEAPON_KILLS_PER_LEVEL || 6));
    }
    if (kind === 'calibrate') {
      for (const w of calibrationTargets) {
        st.levels[w.id] = calibrationFloor;
        st.kills[w.id] = Math.max(st.kills[w.id] || 0, (calibrationFloor - 1) * (NV.BALANCE.WEAPON_KILLS_PER_LEVEL || 6));
      }
    }
    st.run.prep = kind;
    st.run.contract = kind === 'contract';
    return { ok: true, shards: st.shards - cost };
  }
  function checkpoint(raw) {
    if (!raw || raw.version !== VERSION || !NV.CHARACTERS[raw.character]) return null;
    if (!Number.isInteger(raw.wave) || raw.wave < 1 || raw.wave > 9999) return null;
    const run = normalizeRun(raw.run);
    if (!run || run.completed) return null;
    const inventory = [...new Set(Array.isArray(raw.inventory) ? raw.inventory : [])].filter(id => NV.weaponById(id)).slice(0, 6);
    if (!inventory.length) return null;
    const player = {};
    for (const key of PLAYER_FIELDS) if (Number.isFinite(raw.player && raw.player[key])) player[key] = number(raw.player[key], 0, 1e6);
    player.maxHp = number(player.maxHp, 1, 5000, 120);
    player.hp = number(player.hp, 1, player.maxHp, player.maxHp);
    player.xpToNext = number(player.xpToNext, 1, 1e9, 100);
    const levels = {}, kills = {}, fus = {};
    for (const w of NV.WEAPONS) {
      levels[w.id] = integer(raw.levels && raw.levels[w.id], 1, 100);
      kills[w.id] = integer(raw.kills && raw.kills[w.id], 0, 1e7);
      fus[w.id] = integer(raw.fus && raw.fus[w.id], 0, 3);
    }
    const consumables = [], counts = {};
    for (const item of Array.isArray(raw.consumables) ? raw.consumables.slice(0, 60) : []) {
      const type = item && item.type;
      if (!NV.CONSUMABLES[type] || (counts[type] || 0) >= 10 || (!counts[type] && Object.keys(counts).length >= 6)) continue;
      counts[type] = (counts[type] || 0) + 1; consumables.push({ type, name: NV.CONSUMABLES[type].name });
    }
    const shopBought = {};
    for (const id of ['hp', 'speed', 'armor', 'luck']) shopBought[id] = integer(raw.shopBought && raw.shopBought[id], 0, 8);
    const upgradeSlots = (Array.isArray(raw.upgradeSlots) ? raw.upgradeSlots : []).filter(s => s && ['hp', 'speed', 'armor', 'luck'].includes(s.icon)).slice(0, 24).map(s => ({ icon: s.icon, name: { hp: '+25 HP', speed: 'Agilidad', armor: 'Armadura', luck: 'Suerte' }[s.icon] }));
    return { version: VERSION, character: raw.character, wave: raw.wave, player, run, inventory, levels, kills, fus, shopBought, upgradeSlots,
      currentWeapon: inventory.includes(raw.currentWeapon) ? raw.currentWeapon : inventory[0], consumables,
      difficulty: ['easy', 'normal', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'normal',
      score: integer(raw.score, 0, 1e9), shards: integer(raw.shards, 0, 1e7), savedAt: integer(raw.savedAt, 0, 1e15) };
  }
  function normalizeProfile(raw) {
    raw = raw || {};
    const out = { runs: 0, wins: 0, bestWave: 0, bestScore: 0, kills: 0, bosses: 0, contracts: 0, seed: 0 };
    for (const key of Object.keys(out)) out[key] = integer(raw[key], 0, 1e9);
    return out;
  }
  function profile() { return normalizeProfile(read(PROFILE_KEY)); }
  function exportProgress() {
    const raw = read('neonVoidMeta') || {};
    return { kind: 'neon-void-progress', version: VERSION,
      meta: { metaShards: integer(raw.metaShards, 0, 1e9), permUpgrades: NV.normalizePermUpgrades(raw.permUpgrades) },
      career: profile(), checkpoint: checkpoint(read(SAVE_KEY)) };
  }
  function importProgress(raw) {
    if (!raw || raw.kind !== 'neon-void-progress' || raw.version !== VERSION || !raw.meta || !raw.career) return false;
    const saved = raw.checkpoint ? checkpoint(raw.checkpoint) : null;
    if (raw.checkpoint && !saved) return false; // no descartar silenciosamente una partida incompatible.
    const data = { neonVoidMeta: { metaShards: integer(raw.meta.metaShards, 0, 1e9), permUpgrades: NV.normalizePermUpgrades(raw.meta.permUpgrades) },
      [PROFILE_KEY]: normalizeProfile(raw.career), [SAVE_KEY]: saved };
    const previous = {};
    try {
      for (const key of Object.keys(data)) previous[key] = localStorage.getItem(key);
      for (const [key, value] of Object.entries(data)) {
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (_) {
      // Una importación sin espacio no debe dejar medio perfil nuevo y medio viejo.
      for (const [key, value] of Object.entries(previous)) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {}
      }
      return false;
    }
  }
  function complete(run, wave, score, win) {
    if (run.rewardClaimed) return profile();
    run.rewardClaimed = true;
    const p = profile(); p.runs++; p.wins += win ? 1 : 0; p.seed++;
    p.bestWave = Math.max(p.bestWave, wave); p.bestScore = Math.max(p.bestScore, Math.round(score));
    p.kills += run.kills; p.bosses += run.bosses; p.contracts += run.contracts;
    write(PROFILE_KEY, p); return p;
  }
  NV.expedition = { VERSION, PLAYER_FIELDS, create, sector, isBossWave, bossIndex, beginWave, kill, finishWave, syncArsenal, prepCost, prepare,
    checkpoint, profile, complete, exportProgress, importProgress, load: () => checkpoint(read(SAVE_KEY)),
    save: raw => { const safe = checkpoint(raw); return safe ? write(SAVE_KEY, safe) : false; },
    clear: () => { try { localStorage.removeItem(SAVE_KEY); return true; } catch (_) { return false; } } };
})();
