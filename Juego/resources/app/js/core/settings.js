// ===== SETTINGS: estado compartido y persistencia centralizada =====
(() => {
  'use strict';
  const NV = window.NV = window.NV || {};
  const STORAGE_KEY = 'neonVoidSettings';
  const QUALITY = ['auto', 'high', 'performance'];
  const FIRE_POLICY = ['manual', 'legacy-auto'];
  // Categorías de audio con preferencia independiente. Orden = orden de las claves
  // en el JSON persistido. Cada una se aplica a un bus real del mixer (ver
  // AUDIO_CHANNEL_SETTINGS en js/audio/synth.js).
  const AUDIO_VOLUME_KEYS = ['masterVolume', 'musicVolume', 'weaponsVolume', 'uiVolume', 'playerVolume', 'enemiesVolume', 'ambientVolume'];
  // Categorías de efectos que gobierna el agregado SFX heredado (sfxVolume).
  const LEGACY_SFX_KEYS = ['weaponsVolume', 'uiVolume', 'playerVolume', 'enemiesVolume', 'ambientVolume'];
  const DEFAULTS = Object.freeze({
    audio: Object.freeze({
      masterVolume: 1,
      musicVolume: 1,
      weaponsVolume: 1,
      uiVolume: 1,
      playerVolume: 1,
      enemiesVolume: 1,
      ambientVolume: 1,
      // Agregado heredado: es el único control de audio que la UI de Ajustes
      // expone todavía. Se mantiene como espejo de compatibilidad de lectura y
      // escritura; la fuente de verdad son las categorías de arriba.
      sfxVolume: 1,
    }),
    graphics: Object.freeze({
      quality: 'high',
      particles: true,
      heavyVfx: true,
    }),
    controls: Object.freeze({
      firePolicy: 'manual',
    }),
    gameplay: Object.freeze({
      difficulty: 'normal',
      familyFriendly: true,
      reducedEffects: false,
      largeText: false,
    }),
  });
  const listeners = [];

  // Normaliza un volumen a [0,1]. Acepta números y strings numéricos; cualquier
  // otro valor (null, booleanos, textos, NaN) cae al fallback indicado.
  function clampVolume(value, fallback) {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    }
    return fallback;
  }

  // Migración de audio: los settings previos sólo tenían `sfxVolume`. Si una
  // categoría de efectos no existe, hereda ese valor (las armas sonaban dentro de
  // sfxPlayer, así que también lo heredan) y master/música quedan en su default,
  // que es el comportamiento anterior (no existían).
  function normalizeAudio(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const legacy = clampVolume(src.sfxVolume, DEFAULTS.audio.sfxVolume);
    const out = {};
    for (const key of AUDIO_VOLUME_KEYS) {
      if (LEGACY_SFX_KEYS.indexOf(key) >= 0) out[key] = clampVolume(src[key], legacy);
      else out[key] = clampVolume(src[key], DEFAULTS.audio[key]);
    }
    out.sfxVolume = legacy;
    return out;
  }

  function normalize(raw) {
    const audio = normalizeAudio(raw && raw.audio);
    const graphics = raw && raw.graphics ? raw.graphics : {};
    const controls = raw && raw.controls ? raw.controls : {};
    const gameplay = raw && raw.gameplay ? raw.gameplay : {};
    return {
      audio: audio,
      graphics: {
        quality: QUALITY.indexOf(graphics.quality) >= 0 ? graphics.quality : DEFAULTS.graphics.quality,
        particles: typeof graphics.particles === 'boolean' ? graphics.particles : DEFAULTS.graphics.particles,
        heavyVfx: typeof graphics.heavyVfx === 'boolean' ? graphics.heavyVfx : DEFAULTS.graphics.heavyVfx,
      },
      controls: {
        firePolicy: FIRE_POLICY.indexOf(controls.firePolicy) >= 0 ? controls.firePolicy : DEFAULTS.controls.firePolicy,
      },
      gameplay: {
        difficulty: ['easy', 'normal', 'hard'].indexOf(gameplay.difficulty) >= 0 ? gameplay.difficulty : DEFAULTS.gameplay.difficulty,
        familyFriendly: gameplay.familyFriendly !== false,
        reducedEffects: gameplay.reducedEffects === true,
        largeText: gameplay.largeText === true,
      },
    };
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch (_) { return normalize(null); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(NV.settings)); }
    catch (_) { /* storage puede estar bloqueado; settings siguen válidos en memoria */ }
  }
  function notify() {
    const snapshot = NV.getSettings();
    for (const fn of listeners.slice()) {
      try { fn(snapshot); } catch (_) { /* un listener no bloquea al resto */ }
    }
  }

  // Reaplica el estado de audio completo al mixer. Seguro si synth.js todavía no
  // cargó (la aplicación real llega cuando el mixer se inicializa o cambia).
  function applyAudio() {
    if (typeof NV.applyAudioSettings === 'function') NV.applyAudioSettings(NV.settings.audio);
  }

  NV.settings = load();
  function applyComfortRoot() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.setAttribute('data-large-text', NV.settings.gameplay.largeText ? 'true' : 'false');
  }
  applyComfortRoot();
  NV.settingsDefaults = DEFAULTS;
  NV.getSettings = function () { return normalize(NV.settings); };
  // Única vía de escritura de las categorías de audio: normaliza, aplica, persiste
  // y notifica. Devuelve el valor efectivo guardado (false si la clave no existe).
  NV.setAudioVolume = function (key, value) {
    if (AUDIO_VOLUME_KEYS.indexOf(key) < 0) return false;
    NV.settings.audio[key] = clampVolume(value, DEFAULTS.audio[key]);
    applyAudio(); save(); notify();
    return NV.settings.audio[key];
  };
  NV.setMasterVolume = function (value) { return NV.setAudioVolume('masterVolume', value); };
  NV.setMusicVolume = function (value) { return NV.setAudioVolume('musicVolume', value); };
  NV.setWeaponsVolume = function (value) { return NV.setAudioVolume('weaponsVolume', value); };
  NV.setUiVolume = function (value) { return NV.setAudioVolume('uiVolume', value); };
  NV.setPlayerVolume = function (value) { return NV.setAudioVolume('playerVolume', value); };
  NV.setEnemiesVolume = function (value) { return NV.setAudioVolume('enemiesVolume', value); };
  NV.setAmbientVolume = function (value) { return NV.setAudioVolume('ambientVolume', value); };
  // Agregado SFX heredado: gobierna las categorías de efectos a la vez para que el
  // control actual de la UI siga comportándose igual (incluidas las armas, que
  // antes viajaban dentro de sfxPlayer). No es una categoría nueva del mixer.
  NV.setSfxVolume = function (value) {
    const v = clampVolume(value, DEFAULTS.audio.sfxVolume);
    NV.settings.audio.sfxVolume = v;
    for (const key of LEGACY_SFX_KEYS) NV.settings.audio[key] = v;
    if (typeof NV.applySfxVolume === 'function') NV.applySfxVolume(v);
    else applyAudio();
    save(); notify(); return v;
  };
  NV.setGraphicsQuality = function (quality) {
    if (QUALITY.indexOf(quality) < 0) return false;
    NV.settings.graphics.quality = quality;
    save(); notify(); return true;
  };
  NV.setGraphicsOption = function (key, value) {
    if (key !== 'particles' && key !== 'heavyVfx') return false;
    NV.settings.graphics[key] = !!value;
    save(); notify(); return true;
  };
  NV.setFirePolicy = function (policy) {
    if (FIRE_POLICY.indexOf(policy) < 0) return false;
    NV.settings.controls.firePolicy = policy;
    save(); notify(); return true;
  };
  NV.getGraphicsPolicy = function () {
    const g = NV.settings.graphics;
    return {
      quality: g.quality,
      particles: g.particles,
      heavyVfx: g.heavyVfx,
      hydraFullBudget: !g.heavyVfx ? 0 : (g.quality === 'performance' ? 4 : (g.quality === 'auto' ? 7 : Infinity)),
    };
  };
  NV.onSettingsChange = function (fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return fn;
  };
  NV.setDifficulty = function (id) {
    // balance.js define NV.DIFFICULTY_ORDER; tolerar cualquier orden de carga de scripts.
    var order = (NV.DIFFICULTY_ORDER && NV.DIFFICULTY_ORDER.indexOf)
      ? NV.DIFFICULTY_ORDER
      : ['easy', 'normal', 'hard'];
    if (order.indexOf(id) < 0) return false;
    NV.settings.gameplay.difficulty = id;
    save(); notify(); return true;
  };
  NV.setComfortOption = function (key, value) {
    if (!['familyFriendly', 'reducedEffects', 'largeText'].includes(key)) return false;
    NV.settings.gameplay[key] = !!value; applyComfortRoot(); save(); notify(); return true;
  };
  NV.resetSettings = function () {
    NV.settings = normalize(DEFAULTS);
    applyComfortRoot();
    applyAudio();
    save(); notify();
  };

  // Aplicación inicial: cubre el caso en el que synth.js ya está cargado
  // (settings.js lo verá desde su propio arranque). Si synth.js carga después,
  // el mixer se siembra desde NV.settings al inicializarse.
  applyAudio();
})();
