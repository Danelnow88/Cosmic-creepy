// ===== AUDIO SYNTHWAVE + SFX =====
// Estado mutable en NV (soundOn/audioCtx/musicState/musicTime) y getters de game.js
// (getFrame/getBoss/getState) para valores que solo lee. Se carga ANTES de game.js.
(() => {
  'use strict';
  const NV = window.NV;

    NV.soundOn = true;
  NV.audioCtx = null;
  NV.musicState = {
    step: 0,
    bar: 0,
    lastBeat: 0,
    intensity: 0,
    combo: 0,        // kills sin morir → capas musicales de intensidad (Tarea 1 - audio adaptativo)
    phase: 'normal', // 'normal' | 'boss' | 'shop' | 'menu' (manejado por game.js)
    sector: 'threshold',
  };
  NV.musicTime = 0;
  let soundSeed=0x4e56;
  function randomAudio(){if(NV.audioRandom)return NV.audioRandom();soundSeed=(Math.imul(soundSeed,1664525)+1013904223)>>>0;return soundSeed/4294967296;}
  function gate(key,secs){return !NV.allowAudioEvent||NV.allowAudioEvent(key,secs);}

  // Una sola batería trap a medio tiempo. Los valores son velocidades, no
  // pistas adicionales: el 808 sigue al kick y la caja cae en el tercer pulso.
  const COMBAT_STEP = 60 / 144 / 4;
  const CHORD_ROOTS = [65.41, 51.91, 77.78, 58.27]; // Cm - Ab - Eb - Bb
  const BASS_LINE = [65.41, 87.31, 65.41, 146.83];    // C - F - C - G (bajo)
  const LEAD_SEQ = [329.63, 440.00, 493.88, 587.33, 659.26, 587.33, 493.88, 440.00];
  const DRUM_PATTERN = [
    [1,0,0,.72, 0,0,.85,0, 0,0,1,0, 0,0,.78,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [.9,0,.54,0, .72,0,.48,0, .9,0,.55,0, .7,0,.48,0],
  ];

  // Jefes: misma gramática musical, síncopas y mayor tensión, no otra batería.
  const BOSS_CHORD_ROOTS = [49.00, 38.89, 58.27, 43.65]; // Gm - Eb - Bb - F
  const BOSS_BASS_LINE = [49.00, 61.74, 55.00, 73.42];
  const BOSS_LEAD_SEQ = [220.00, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94];
  const BOSS_DRUM_PATTERN = [
    [1,0,.55,0, 0,0,.9,0, 0,0,1,0, 0,.62,0,.8],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [1,.3,.62,0, .8,0,.55,.3, 1,0,.62,0, .8,.3,.55,0],
  ];
  // Menú y tienda tienen arreglos más relajados dentro del mismo secuenciador.
  const MENU_CHORD_ROOTS = [82.41, 98.00, 123.47, 164.81]; // E2 - G2 - B2 - E3
  const MENU_BASS_LINE = [82.41, 0, 98.00, 0];
  const MENU_LEAD_SEQ = [329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 246.94];
  const MENU_DRUM_PATTERN = [
    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  ];
  // Cuatro identidades de expedición. Todas conservan 16 pasos para cambiar de
  // sector sin cortar notas ni recrear el motor, pero difieren en armonía, ritmo,
  // timbre. El tempo común evita cambios arbitrarios al pasar de sector.
  const FOUNDRY_CHORD_ROOTS = [55.00, 43.65, 65.41, 49.00];
  const FOUNDRY_BASS_LINE = [55.00, 55.00, 82.41, 73.42];
  const FOUNDRY_LEAD_SEQ = [220.00, 261.63, 329.63, 293.66, 392.00, 329.63, 261.63, 246.94];
  const FOUNDRY_DRUM_PATTERN = [
    [1,0,0,0, 0,.7,0,.5, 0,0,.9,0, .6,0,0,.85],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [1,0,.55,.25, .8,0,.5,0, 1,0,.55,0, .8,.25,.5,0],
  ];
  const FRACTURE_CHORD_ROOTS = [69.30, 55.00, 82.41, 61.74];
  const FRACTURE_BASS_LINE = [69.30, 0, 77.78, 92.50];
  const FRACTURE_LEAD_SEQ = [277.18, 369.99, 311.13, 466.16, 415.30, 311.13, 369.99, 233.08];
  const FRACTURE_DRUM_PATTERN = [
    [1,0,0,.65, 0,0,0,.85, 0,0,1,0, 0,0,.65,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [.85,0,.45,.2, .7,0,.5,0, .9,0,.5,.2, .7,0,.5,0],
  ];
  const VOID_CHORD_ROOTS = [43.65, 34.65, 51.91, 38.89];
  const VOID_BASS_LINE = [43.65, 51.91, 43.65, 61.74];
  const VOID_LEAD_SEQ = [174.61, 207.65, 246.94, 311.13, 293.66, 246.94, 207.65, 155.56];
  const VOID_DRUM_PATTERN = [
    [1,0,.55,0, 0,0,.8,0, 0,0,0,1, 0,.6,0,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [1,0,.5,0, .75,.25,.5,0, 1,0,.5,.25, .75,0,.5,0],
  ];
  const MUSIC_LAYERS = {
    normal: { chordRoots: CHORD_ROOTS, bass: BASS_LINE, lead: LEAD_SEQ, drums: DRUM_PATTERN },
    boss: { chordRoots: BOSS_CHORD_ROOTS, bass: BOSS_BASS_LINE, lead: BOSS_LEAD_SEQ, drums: BOSS_DRUM_PATTERN },
    menu: { chordRoots: MENU_CHORD_ROOTS, bass: MENU_BASS_LINE, lead: MENU_LEAD_SEQ, drums: MENU_DRUM_PATTERN },
    // Tienda: resolución más cálida y groove ligero, distinto del menú suspendido.
    shop: { chordRoots: [65.41, 87.31, 110, 98], bass: [65.41, 0, 87.31, 98],
      lead: [261.63, 329.63, 392, 493.88], drums: [[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]] },
  };
  const SECTOR_MUSIC = Object.freeze([
    Object.freeze({ id: 'threshold', stepDur: COMBAT_STEP, leadType: 'triangle', bassType: 'triangle', accent: 0,
      chordRoots: CHORD_ROOTS, bass: BASS_LINE, lead: LEAD_SEQ, drums: DRUM_PATTERN }),
    Object.freeze({ id: 'foundry', stepDur: COMBAT_STEP, leadType: 'sawtooth', bassType: 'triangle', accent: 1760,
      chordRoots: FOUNDRY_CHORD_ROOTS, bass: FOUNDRY_BASS_LINE, lead: FOUNDRY_LEAD_SEQ, drums: FOUNDRY_DRUM_PATTERN }),
    Object.freeze({ id: 'fracture', stepDur: COMBAT_STEP, leadType: 'triangle', bassType: 'triangle', accent: 1244,
      chordRoots: FRACTURE_CHORD_ROOTS, bass: FRACTURE_BASS_LINE, lead: FRACTURE_LEAD_SEQ, drums: FRACTURE_DRUM_PATTERN }),
    Object.freeze({ id: 'void-heart', stepDur: COMBAT_STEP, leadType: 'triangle', bassType: 'triangle', accent: 932,
      chordRoots: VOID_CHORD_ROOTS, bass: VOID_BASS_LINE, lead: VOID_LEAD_SEQ, drums: VOID_DRUM_PATTERN }),
  ]);
  function musicSectorIndex(wave) {
    const safe = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1;
    return Math.min(3, Math.floor((safe - 1) / 5));
  }
  function sectorMusicForWave(wave) { return SECTOR_MUSIC[musicSectorIndex(wave)]; }
  function currentLayers(wave, phase=NV.musicState.playingPhase||NV.musicState.phase) {
    return phase==='normal'?sectorMusicForWave(wave):MUSIC_LAYERS[phase]||MUSIC_LAYERS.normal;
  }

  function initMusic() {
    if (!NV.audioCtx) NV.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // === MEZCLADOR DE CANALES (Tarea 1) ===
  // Canales con GainNode propios sobre destination: permite ducking, volúmenes
  // relativos y prioridad. Se crea de forma perezosa dentro de initAudio() para
  // no romper los tests headless (audioCtx es null hasta COMENZAR).
  //  - music:        música base / capas musicales
  //  - sfxUI:        UI, tienda, pickups, wheel, level-up
  //  - sfxPlayer:    recibir daño, heartbeat, muerte, victoria, consumibles
  //  - sfxEnemies:   muerte de enemigos, ataques de jefe
  //  - sfxAmbient:   eventos de oleada, cofres, combos, explosiones auxiliares
  //  - weapons:      salida propia del submix de armas (weaponSfx.js). Estar fuera
  //                  de sfxPlayer es lo que hace independientes weaponsVolume y
  //                  playerVolume; conserva la mezcla relativa previa (0.9).
  const CHANNELS = { music:0.6, sfxUI:0.7, sfxPlayer:0.9, sfxEnemies:0.8, sfxAmbient:0.6, weapons:0.9 };
  // Volumen de categoría (0..1) por canal: es lo que gobiernan los ajustes de audio.
  const MASTER_VOLUME = { music:1, sfxUI:1, sfxPlayer:1, sfxEnemies:1, sfxAmbient:1, weapons:1 };
  // Mapa canal del mixer -> clave persistida en NV.settings.audio. Es el contrato
  // entre el backend de ajustes y el routing real.
  const AUDIO_CHANNEL_SETTINGS = {
    music: 'musicVolume',
    weapons: 'weaponsVolume',
    sfxUI: 'uiVolume',
    sfxPlayer: 'playerVolume',
    sfxEnemies: 'enemiesVolume',
    sfxAmbient: 'ambientVolume',
  };
  // Buses que gobierna el agregado SFX heredado (sfxVolume) para que el control
  // actual de la UI siga afectando exactamente lo mismo que antes (las armas
  // viajaban dentro de sfxPlayer, por eso se incluyen).
  const LEGACY_SFX_CHANNELS = ['sfxUI', 'sfxPlayer', 'sfxEnemies', 'sfxAmbient', 'weapons'];
  let masterGain = null;
  // Salida principal (0..1). El mute es INDEPENDIENTE: la salida efectiva es
  // masterOutputVolume con sonido activo y 0 al mutear, así desmutear restaura
  // el volumen general elegido y no fuerza 1.
  let masterOutputVolume = 1;
  // Duración de los tramos de la automatización de duck.
  const DUCK_RAMP_IN = 0.01;
  const DUCK_RAMP_OUT = 0.12;

  // Ganancia base real de un canal: mezcla deliberada del mixer × volumen de la
  // categoría. La relación interna entre buses (0.6/0.7/0.9/0.8/0.6/0.9) se
  // conserva intacta; lo que cambia por categoría es solo el factor de volumen.
  function channelBaseGain(name) {
    return MASTER_VOLUME[name] * CHANNELS[name];
  }

  function settingsAudio() {
    return (NV.settings && NV.settings.audio) ? NV.settings.audio : null;
  }

  // Normaliza un volumen a [0,1] con fallback (mismo criterio que core/settings.js).
  function readVolume(value, fallback) {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    }
    return fallback;
  }

  // Crea y expone el mixer. Llamado por initAudio(); si audioCtx ya no existe
  // (modo headless/test) simplemente no hace nada → fallback a destination directo.
  // Materializa el ESTADO ACTUAL del mixer (MASTER_VOLUME + masterOutputVolume),
  // que ya viene sembrado desde las preferencias persistidas. Por eso funciona
  // igual si los settings se cargaron antes o después de inicializar Web Audio.
  function createMixer() {
    if (!NV.audioCtx) return;
    if (NV.mixer && masterGain) return;
    const ctx = NV.audioCtx;
    const mixer = {};
    masterGain = ctx.createGain();
    masterGain.gain.value = NV.soundOn ? masterOutputVolume : 0;
    const headroom=ctx.createGain();headroom.gain.value=.8;masterGain.connect(headroom);
    let output=headroom;
    if(ctx.createDynamicsCompressor){
      const c=ctx.createDynamicsCompressor();
      for(const [key,value] of Object.entries({threshold:-14,knee:9,ratio:4,attack:.003,release:.16}))c[key].value=value;
      output.connect(c);output=c;NV.audioCompressor=c;
    }
    if(ctx.createWaveShaper){
      const limiter=ctx.createWaveShaper(),curve=new Float32Array(4097);
      for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=.89*Math.tanh(x/.89);}
      limiter.curve=curve;output.connect(limiter);output=limiter;NV.audioCeiling=limiter;
    }
    output.connect(ctx.destination);
    for (const ch in CHANNELS) {
      const g = ctx.createGain();
      g.gain.value = channelBaseGain(ch);
      g.connect(masterGain);
      mixer[ch] = g;
    }
    NV.mixer = mixer;
    NV.audioMasterGain = masterGain;
  }

  // Enruta un GainNode a su canal; si no hay mixer (headless), cae a destination.
  function channelFor(name) {
    return (NV.mixer && NV.mixer[name]) || NV.audioCtx.destination;
  }

  function panForX(x, worldWidth) {
    if (typeof x !== 'number') return 0;
    const w = worldWidth || 900;
    return Math.max(-1, Math.min(1, (x / w) * 2 - 1));
  }

  function connectOutput(node, channel, opts) {
    opts = opts || {};
    const target = (channel && channelFor(channel)) || channelFor('sfxPlayer');
    if (NV.audioCtx && typeof NV.audioCtx.createStereoPanner === 'function' && (typeof opts.pan === 'number' || typeof opts.x === 'number')) {
      const pan = NV.audioCtx.createStereoPanner();
      pan.pan.setValueAtTime(typeof opts.pan === 'number' ? opts.pan : panForX(opts.x, opts.worldWidth), NV.audioCtx.currentTime);
      node.connect(pan); pan.connect(target);
    } else {
      node.connect(target);
    }
  }

  // Fija el volumen de UNA categoría (0..1) en su bus real. Si el mixer todavía no
  // existe, solo actualiza el estado interno: createMixer() lo materializará.
  function setChannelVolume(name, value) {
    if (!Object.prototype.hasOwnProperty.call(MASTER_VOLUME, name)) return;
    const level = readVolume(value, MASTER_VOLUME[name]);
    MASTER_VOLUME[name] = level;
    const g = NV.mixer && NV.mixer[name];
    if (!g) return level;
    const base = channelBaseGain(name);
    // Cancelar la automatización pendiente: si había un duck en curso, el volumen
    // de la categoría manda sobre su restauración programada.
    if (NV.audioCtx && typeof g.gain.cancelScheduledValues === 'function') {
      const now = NV.audioCtx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(base, now);
    }
    g.gain.value = base;
    return level;
  }

  // Volumen general (salida principal). Independiente del mute: aplicarlo NO altera
  // NV.soundOn y desmutear restaura este valor en lugar de forzar 1.
  function applyMasterVolume(value) {
    masterOutputVolume = readVolume(value, 1);
    if (masterGain && NV.audioCtx) {
      const gain = masterGain.gain;
      const now = NV.audioCtx.currentTime;
      const target = NV.soundOn ? masterOutputVolume : 0;
      if (typeof gain.cancelScheduledValues === 'function') gain.cancelScheduledValues(now);
      gain.setValueAtTime(target, now);
      gain.value = target;
    }
    return masterOutputVolume;
  }

  // Aplica al mixer un objeto de preferencias de audio (NV.settings.audio).
  // Idempotente y seguro antes o después de inicializar Web Audio. Si una categoría
  // no existe (settings previos o synth cargado sin settings.js), los buses de
  // efectos heredan `sfxVolume` para no alterar la mezcla anterior.
  function applyAudioSettings(audio) {
    const src = audio || settingsAudio() || {};
    const legacySfx = readVolume(src.sfxVolume, 1);
    applyMasterVolume(src.masterVolume);
    for (const ch in AUDIO_CHANNEL_SETTINGS) {
      const key = AUDIO_CHANNEL_SETTINGS[ch];
      const fallback = key === 'musicVolume' ? 1 : legacySfx;
      setChannelVolume(ch, readVolume(src[key], fallback));
    }
    return src;
  }

  // Agregado SFX heredado (sfxVolume): mantiene el comportamiento del único control
  // que la UI expone hoy. Escala todos los buses de efectos, armas incluidas.
  function applySfxVolume(value) {
    const level = readVolume(value, 1);
    for (const name of LEGACY_SFX_CHANNELS) setChannelVolume(name, level);
    return level;
  }

  function setSoundEnabled(enabled) {
    NV.soundOn = !!enabled;
    if (masterGain && NV.audioCtx) {
      const t = NV.audioCtx.currentTime;
      const target = NV.soundOn ? masterOutputVolume : 0;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(target, t + 0.025);
    }
    if (!NV.soundOn && NV.audio && typeof NV.audio.stopAllWeapons === 'function') NV.audio.stopAllWeapons();
    if (!NV.soundOn && NV.stopSectorLaserSound) NV.stopSectorLaserSound();
    if (!NV.soundOn && NV.stopAudioVoices) NV.stopAudioVoices();
    if (typeof NV.syncSoundUI === 'function') NV.syncSoundUI();
    return NV.soundOn;
  }

  // Ducking temporal: atenúa `byChannel` a `to` durante `secs` segundos de audioCtx.
  // La bajada Y la restauración se programan en la propia automatización del
  // AudioParam, así que se cumplen solas sin depender de ningún update por frame.
  // Antes la restauración vivía en restoreDucking(), invocado solo desde
  // updateMusic(): durante wave_end / player_dying / gameover ese update no corre y
  // la música quedaba atenuada mucho más de lo pedido (victoria duckea 0.8s y la
  // transición dura 2.1s+). La restauración siempre vuelve al volumen de la
  // categoría vigente, no a un valor capturado.
  function duck(byChannel, to, secs) {
    const g = NV.mixer && NV.mixer[byChannel];
    if (!g || !NV.audioCtx) return;
    const gain = g.gain;
    const now = NV.audioCtx.currentTime;
    const base = channelBaseGain(byChannel);
    const level = Math.min(base, readVolume(to, base));
    const hold = Math.max(0, Number(secs) || 0.15);
    const until = now + hold;
    if (typeof gain.cancelScheduledValues === 'function') gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.min(base,gain.value), now);
    gain.linearRampToValueAtTime(level, now + DUCK_RAMP_IN);
    gain.setValueAtTime(level, until);
    gain.linearRampToValueAtTime(base, until + DUCK_RAMP_OUT);
  }

  function initAudio() {
    initMusic();
    createMixer(); // perezoso: solo cuando realmente hay contexto
    if (NV.audioCtx.state === 'suspended' && !NV.audioCtx.startRendering) NV.audioCtx.resume().catch(() => {});
  }
  // opts?: { channel, freq } → banda y bus opcionales. Sin opts mantiene la banda
  // ambiental 200-400 Hz en `sfxAmbient` que usan todos los callers históricos
  // (armas, ataques de jefe, explosiones, combo). El rediseño del daño del piloto
  // necesita además un crack AGUDO entrando por `sfxPlayer`.
  function scheduleNoise(dur, vol, opts) {
    if(NV.soundVoice) return NV.soundVoice({noise:true,duration:dur,volume:vol,filter:opts&&opts.freq||550,channel:opts&&opts.channel||'sfxAmbient'});
    if (!NV.audioCtx || !NV.soundOn) return;
    opts = opts || {};
    const buffer = NV.audioCtx.createBuffer(1, NV.audioCtx.sampleRate * dur, NV.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (randomAudio() * 2 - 1) * 0.5;
    const src = NV.audioCtx.createBufferSource();
    const filter = NV.audioCtx.createBiquadFilter();
    const gain = NV.audioCtx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 200 + randomAudio() * 200, NV.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.04, NV.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, NV.audioCtx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(channelFor(opts.channel || 'sfxAmbient'));
    src.start(); src.stop(NV.audioCtx.currentTime + dur);
  }
  function musicVoice(spec, at) {
    if(NV.soundVoice)return NV.soundVoice({...spec,at,channel:'music'});
    // Compatibilidad de tests/headless que cargan synth sin voices.js.
    const delay=Math.max(0,at-NV.audioCtx.currentTime);
    if(spec.noise)return scheduleNoise(spec.duration,spec.volume,{channel:'music',freq:spec.filter});
    return toneAt(spec.freq,spec.duration,spec.type,spec.volume,'music',delay,{pan:spec.pan});
  }

  function scoreMusicStep(m, layers, stepDur, at) {
    const step=m.step,bar=m.bar,section=Math.floor(bar/4);
    const isMenuLike=m.playingPhase==='menu'||m.playingPhase==='shop';
    const chorus=section===1||section===3,breath=!isMenuLike&&bar===8;
    const root=layers.chordRoots[bar%4],third=bar%4===0?3:4;
    const energy=isMenuLike?.48:breath?.68:chorus?1:.88;
    m.section=['viaje','impulso','respiro','resolución'][section];
    // role sólo describe el arreglo para QA; no abre buses ni motores nuevos.
    const note=(role,spec,offset=0)=>musicVoice({...spec,role},at+offset);
    const kick=layers.drums[0][step];
    if(kick&&(!breath||step===0||step===10)){
      note('kick',{freq:155,endFreq:45,glideTime:.052,type:'sine',duration:.15,
        attack:.002,filter:750,volume:.20*kick*energy});
      let gap=1;while(gap<16&&!layers.drums[0][(step+gap)%16])gap++;
      // Bajo melódico sostenido, no un segundo bombo en otra cuadrícula.
      const duration=Math.min(isMenuLike?.65:.52,gap*stepDur-.018);
      note('808',{freq:root*1.035,endFreq:root,glideTime:.065,type:'triangle',
        duration,attack:.012,hold:duration*.36,filter:420,volume:.095*kick*energy});
    }
    if(!isMenuLike&&layers.drums[1][step]){
      note('snare',{noise:true,duration:.15,filter:2350,endFilter:1050,q:.8,volume:.12*energy});
      note('snare-body',{freq:185,endFreq:135,glideTime:.065,type:'triangle',duration:.10,
        filter:1000,volume:.045*energy});
    }
    // Roll sólo al cierre de frase: reemplaza el hat, nunca duplica caja/kick.
    const roll=!isMenuLike&&!breath&&bar%4===3&&step===15;
    if(roll){
      for(let i=0;i<3;i++)note('hat-roll',{noise:true,duration:.024,filter:6200,q:.9,
        pan:(i-1)*.12,volume:(.027-i*.006)*energy},stepDur*i/3);
    }else if(layers.drums[2][step]&&(!breath||step%4===2)){
      note('hat',{noise:true,duration:.037,filter:5800,q:.8,pan:step%4===0?.16:-.12,
        volume:.039*layers.drums[2][step]*energy},step%2?stepDur*.10:0);
    }
    if(!isMenuLike&&!breath&&step===7&&bar%2===1)
      note('rim',{freq:440,endFreq:310,type:'triangle',duration:.055,filter:1250,volume:.023*energy},stepDur*.07);

    if(step===0){
      // Pads en el mismo acorde y compás: sin drone independiente superpuesto.
      for(const [i,semitone] of [0,third,7].entries())note('pad',{
        freq:root*2*Math.pow(2,semitone/12),type:'triangle',duration:stepDur*16-.10,
        attack:.22,hold:stepDur*6,filter:1200,pan:(i-1)*.28,volume:isMenuLike?.018:.025,
        priority:-1});
    }
    const leadSteps=isMenuLike?[2,10]:section===2?[0,10]:[0,3,6,10,14];
    const n=leadSteps.indexOf(step);
    if(n>=0){
      const motif=bar%2?[7,third,12,7,5]:[0,7,10,12,7];
      const semitone=motif[n%motif.length],freq=Math.min(1100,root*4*Math.pow(2,semitone/12));
      note('lead',{freq,type:isMenuLike?'triangle':layers.leadType||'triangle',
        duration:n===leadSteps.length-1?.32:.22,attack:.012,hold:.035,
        filter:2100,pan:bar%2?.16:-.16,volume:isMenuLike?.033:chorus?.068:.055});
    }
    if(!isMenuLike&&chorus&&[2,5,11].includes(step)){
      const interval=[0,third,7][[2,5,11].indexOf(step)];
      note('arp',{freq:root*8*Math.pow(2,interval/12),type:'sine',duration:.19,
        attack:.012,filter:2300,pan:step===5?.3:-.3,volume:.023});
    }
    if(!isMenuLike&&m.combo>12&&chorus&&step===6)
      note('combo',{freq:root*6,type:'sine',duration:.16,filter:1600,volume:.016});
  }

  function updateMusic(dt) {
    if(!NV.audioCtx||!NV.soundOn||(NV.isAudioHidden&&NV.isAudioHidden()))return;
    const gameState=NV.getState?NV.getState():'playing';
    if(gameState!=='playing'&&gameState!=='menu'&&gameState!=='shop'){
      NV.musicState.wasInactive=true;return;
    }
    const m=NV.musicState,wave=NV.getWave?NV.getWave():1;
    const wantPhase=gameState === 'menu'?'menu':gameState === 'shop'?'shop':NV.getBoss&&NV.getBoss()?'boss':'normal';
    m.pendingPhase=wantPhase;m.sector=sectorMusicForWave(wave).id;
    // El estado visible se actualiza ya; instrumentación y armonía sólo al compás.
    m.phase=wantPhase;
    const elapsed=Number.isFinite(dt)?Math.min(.25,Math.max(0,dt)):0;
    NV.musicTime+=elapsed;m.combo=Math.max(0,(m.combo||0)-elapsed*1.5);
    m.intensity+=((wantPhase==='boss'?1:.35)-m.intensity)*Math.min(1,elapsed*.6);
    const now=NV.audioCtx.currentTime;
    if(!Number.isFinite(m.nextNoteAt)||m.nextNoteAt<now-.04||m.wasInactive){
      // No emitir golpes atrasados todos juntos al volver de una pausa/tab.
      if(Number.isFinite(m.nextNoteAt)){
        if(NV.stopAudioVoices)NV.stopAudioVoices('music');
        m.resyncs=(m.resyncs||0)+1;
      }
      m.nextNoteAt=now+.035;m.nextStep=0;m.wasInactive=false;
    }
    let processed=0;
    while(m.nextNoteAt<now+.12&&processed++<3){
      m.step=m.nextStep;
      if(m.step===0){
        if(m.scheduledSteps)m.bar=(m.bar+1)%16;
        m.playingPhase=wantPhase;m.playingWave=wave;
      }
      const isMenuLike=m.playingPhase==='menu'||m.playingPhase==='shop';
      const layers=currentLayers(m.playingWave,m.playingPhase);
      const stepDur=isMenuLike?(m.playingPhase==='shop'?.158:.185):m.playingPhase==='boss'?60/148/4:layers.stepDur;
      m.tempo=60/(stepDur*4);
      scoreMusicStep(m,layers,stepDur,m.nextNoteAt);
      m.scheduledSteps=(m.scheduledSteps||0)+1;m.lastBeat+=stepDur;
      m.nextStep=(m.step+1)%16;m.nextNoteAt+=stepDur;
    }
  }
  function playTone(freq, dur, type, vol, channel, opts) {
    if(NV.soundVoice) return NV.soundVoice({...opts,freq,duration:dur,type,volume:vol,channel:channel||'sfxPlayer'});
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Detune aleatorio leve (±0.8%) evita fatiga auditiva en disparos rápidos (Tarea 1).
    const detune = (randomAudio() * 2 - 1) * 0.008;
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq * (1 + detune), ctx.currentTime);
    gain.gain.setValueAtTime(vol || 0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // Variante extendida: permite pasar { channel, detune, priority } desde callers
  // que conocen el contexto del juego (arma rara, combo, daño crítico, etc.).
  // Se usa para la Tarea 4 (anti-fatiga en SMG/railgun) y combo de kills.
  function playToneEx(freq, dur, type, vol, opts) {
    opts = opts || {};
    const det = typeof opts.detune === 'number' ? opts.detune : ((randomAudio() * 2 - 1) * 0.008);
    const f = freq * (1 + det);
    return playTone(f, dur, type, vol, opts.channel, opts);
  }

  // Golpe con BARRIDO de frecuencia: mismo enrutado (connectOutput), mismo detune
  // anti-fatiga y mismo envelope de ataque instantáneo que playTone, pero el pitch
  // viaja de f1 a f2 durante `dur`. Es el gesto de "impacto" (descendente), opuesto
  // a los SFX positivos del juego, que suben (pickup/tienda/level-up/victoria).
  function playToneSweep(f1, f2, dur, type, vol, channel, opts) {
    if(NV.soundVoice) return NV.soundVoice({...opts,freq:f1,endFreq:f2,duration:dur,type,volume:vol,channel:channel||'sfxPlayer'});
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (randomAudio() * 2 - 1) * 0.008;
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f1 * (1 + detune), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * (1 + detune)), ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  // Helpers con OFFSET temporal para gestos multi-etapa (rediseño daño piloto).
  // Reusan el mismo enrutado (connectOutput → sfxPlayer + paneo opcional) y el
  // mismo envelope de ataque instantáneo + decaimiento exponencial que el resto
  // del proyecto. Los nodos opcionales (WaveShaper) usan guards defensivos como
  // en weaponSfx.js, así que en headless/tests simplemente se omiten.
  function toneAt(freq, dur, type, vol, channel, delay, opts) {
    if(NV.soundVoice) return NV.soundVoice({...opts,freq,duration:dur,type,volume:vol,channel,delay});
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (randomAudio() * 2 - 1) * 0.008;
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq * (1 + detune), t0);
    gain.gain.setValueAtTime(vol || 0.03, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let out = osc;
    if (typeof ctx.createWaveShaper === 'function' && opts && opts.drive) {
      const sh = ctx.createWaveShaper();
      const n = 256, curve = new Float32Array(n);
      const k = 2 + opts.drive * 20;
      for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = Math.tanh(x * k); }
      sh.curve = curve;
      osc.connect(sh); out = sh;
    }
    out.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  function sweepAt(f1, f2, dur, type, vol, channel, delay, opts) {
    if(NV.soundVoice) return NV.soundVoice({...opts,freq:f1,endFreq:f2,duration:dur,type,volume:vol,channel,delay});
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (randomAudio() * 2 - 1) * 0.008;
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f1 * (1 + detune), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * (1 + detune)), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  function noiseSweepAt(dur, vol, f1, f2, channel, delay) {
    if(NV.soundVoice) return NV.soundVoice({noise:true,duration:dur,volume:vol,filter:f1,endFilter:f2,channel,delay});
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const buffer = ctx.createBuffer(1, Math.max(16, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (randomAudio() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(f1, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.04, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter); filter.connect(gain); gain.connect(channelFor(channel || 'sfxPlayer'));
    src.start(t0); src.stop(t0 + dur);
  }
  const rapidFireFatigue = {};
  function rapidFireVolume(id, baseVol) {
    if (!NV.audioCtx || (id !== 'smg' && id !== 'railgun')) return baseVol;
    const now = NV.audioCtx.currentTime;
    const st = rapidFireFatigue[id] || { last: -99, heat: 0 };
    const cadence = now - st.last;
    if (cadence < (id === 'smg' ? 0.09 : 0.22)) st.heat = Math.min(1, st.heat + 0.16);
    else st.heat = Math.max(0, st.heat - cadence * 1.2);
    st.last = now;
    rapidFireFatigue[id] = st;
    return baseVol * (1 - st.heat * 0.32);
  }
  const sfx = {
    // SFX existentes: redirigidos a canales con ducking automático.
    explosion: (enemyType, opts) => { sfx.enemyDeath(enemyType || 'normal', opts); },
    enemyDeath: (enemyType, opts) => {
      const kind=enemyType||'normal';opts=opts||{};
      if(!gate('death-'+kind,kind==='boss'?.5:kind==='elite'?.09:.055))return;
      const base=kind==='boss'?58:kind==='elite'?105:170;
      if(kind==='boss')duck('music',.12,.45);
      playToneSweep(base*1.8,base,kind==='boss'?.65:.17,'triangle',kind==='boss'?.12:.06,'sfxEnemies',opts);
      scheduleNoise(kind==='boss'?.38:.075,kind==='boss'?.07:.035,{channel:'sfxEnemies',freq:kind==='normal'?950:420});
      if(kind!=='normal')toneAt(base*1.5,.28,'sine',.035,'sfxEnemies',.07,opts);
    },
    pickup: () => {
      if(!gate('pickup',.085))return;
      const freq=[392,440,523.25][Math.floor(randomAudio()*3)];
      playTone(freq,.12,'sine',.037,'sfxUI');toneAt(freq*1.5,.07,'triangle',.012,'sfxUI',.025);
    },
    consume: (type) => {
      if(!gate('consume',.08))return;
      const f={potion:330,bomb:65,freeze:587,overdrive:220,bounty:440,shield:165,magnet:294}[type]||330;
      duck('music',.42,.12);
      playToneSweep(f*.8,f,.22,type==='bomb'?'triangle':'sine',.065,'sfxPlayer');
      toneAt(f*1.5,.21,'triangle',.035,'sfxPlayer',.09);
      if(type==='bomb'||type==='freeze')noiseSweepAt(.22,.05,type==='bomb'?650:1800,350,'sfxPlayer',0);
    },
    fuse: (level) => {
      if(!gate('fuse',.2))return;
      duck('music',.28,.25);
      const f=[261.63,293.66,329.63,392][Math.min(3,Math.max(0,(level||1)-1))];
      [1,1.5,2].forEach((r,i)=>toneAt(f*r,.26,'triangle',.045,'sfxUI',i*.065,{pan:(i-1)*.2}));
    },
    shopBuy: () => { if(!gate('transaction',.07))return;playTone(330,.12,'triangle',.065,'sfxUI');toneAt(495,.17,'triangle',.04,'sfxUI',.035); },
    shopSell: () => { if(!gate('transaction',.07))return;playTone(294,.13,'triangle',.055,'sfxUI');noiseSweepAt(.06,.022,1300,650,'sfxUI',.035); },
    wheelSelect: () => {if(gate('select',.06))playTone(392,.085,'triangle',.055,'sfxUI');},
    damage: () => { duck('music', 0.2, 0.18); playTone(80, 0.15, 'square', 0.07, 'sfxPlayer'); },
    // Daño recibido por el piloto — SEGUNDO REDISEÑO: "ALARMA DE CASCO ROTO".
    // Ruptura total con el gesto anterior (crack agudo simultáneo + sweep grave
    // corto <0.2s). Ahora es un gesto SECUENCIAL de ~0.55s en 4 etapas
    // desacopladas, todo por `sfxPlayer` con duck largo de música:
    //  E1 CRUNCH (0.00s): ruido bandpass medio-bajo con barrido 900→240 Hz
    //     (0.10s) + square 140 Hz con drive leve: rotura, no brillo agudo.
    //  E2 SUB-DROP (0.02s): sine 150→38 Hz durante 0.30s: peso corporal que el
    //     diseño anterior no tenía (su sweep grave duraba 0.17s y moría solo).
    //  E3 ALARMA (0.14/0.26/0.38s): 3 pulsos square 620→470 Hz con paneo
    //     alterno L/R/centro: urgencia/peligro, capa inexistente antes.
    //  E4 COLA (0.16s): ruido bandpass 2400→500 Hz, 0.38s: resolución/chisporroteo.
    // Timbre, envelope, duración, estructura temporal, dinámica, movimiento y
    // estéreo cambian a la vez: comparación A/B obvia. El golpe letal sigue por
    // sfx.damage/deathTone; esto es solo daño no fatal (ver combat.js).
    playerHit: () => {
      if(!gate('player-hit',.22))return;
      duck('music', 0.14, 0.55);
      // E1 — crunch de rotura.
      noiseSweepAt(0.10, 0.11, 900, 240, 'sfxPlayer', 0);
      toneAt(140, 0.09, 'square', 0.075, 'sfxPlayer', 0, { drive: 0.35 });
      // E2 — caída corporal grave y larga.
      sweepAt(150, 38, 0.30, 'sine', 0.12, 'sfxPlayer', 0.02);
      // E3 — triple pulso de alarma con contraste estéreo.
      toneAt(420, 0.07, 'triangle', 0.03, 'sfxPlayer', 0.14, { pan: -0.55 });
      toneAt(365, 0.07, 'sine', 0.025, 'sfxPlayer', 0.26, { pan: 0.55 });
      toneAt(310, 0.10, 'triangle', 0.025, 'sfxPlayer', 0.38, { pan: 0 });
      sweepAt(420, 310, 0.10, 'sine', 0.018, 'sfxPlayer', 0.38);
      // E4 — cola de chisporroteo descendente.
      noiseSweepAt(0.38, 0.05, 2400, 500, 'sfxPlayer', 0.16);
    },
    special: (pilot) => {
      if(!gate('special',.15))return;
      duck('music',.24,.45);
      const id=pilot||'boti';
      if(id==='boti'){[392,587,784,587].forEach((f,i)=>toneAt(f,.30,'sine',.045,'sfxPlayer',i*.07,{pan:(i%2?.3:-.3)}));noiseSweepAt(.45,.04,1800,600,'sfxPlayer',0);}
      else if(id==='nova'){sweepAt(90,180,.38,'triangle',.10,'sfxPlayer',0);noiseSweepAt(.5,.08,500,1500,'sfxPlayer',0);toneAt(330,.35,'sine',.03,'sfxPlayer',.16);}
      else if(id==='rook'){sweepAt(150,55,.42,'sine',.13,'sfxPlayer',0);[146,220,293].forEach((f,i)=>toneAt(f,.40,'triangle',.035,'sfxPlayer',i*.06));}
      else {[330,440,495,660].forEach((f,i)=>toneAt(f,.23,'triangle',.043,'sfxPlayer',i*.08,{pan:(i-1.5)*.22}));}
    },
    playerLevelUp: () => { if(!gate('level-up',.28))return;duck('music', .3, .24);[261.63,392,523.25].forEach((f,i)=>toneAt(f,.24,'triangle',.04,'sfxUI',i*.065)); },
    wave: () => {if(gate('wave',.4)){playTone(220,.19,'triangle',.045,'sfxUI');toneAt(330,.22,'sine',.035,'sfxUI',.10);}},
    // Speaker mines: eventos discretos sobre el mixer existente. El baile no
    // genera voz continua; armado y explosión respetan mute/volumen/paneo.
    speakerMineArm: (opts) => {
      if(!gate('mine-arm',.2))return;
      opts = opts || {};
      playTone(210, 0.08, 'square', 0.025, 'sfxAmbient', opts);
      playTone(315, 0.11, 'triangle', 0.018, 'sfxAmbient', opts);
    },
    speakerMineExplosion: (opts) => {
      if(!gate('mine-explode',.09))return;
      opts = opts || {};
      duck('music', 0.18, 0.2);
      scheduleNoise(0.22, 0.07);        // punch bajo + ataque
      playTone(60, 0.3, 'sawtooth', 0.11, 'sfxAmbient', opts);   // graves fuertes
      playTone(120, 0.09, 'triangle', 0.055, 'sfxAmbient', opts); // ataque claro
      playTone(250, 0.13, 'square', 0.04, 'sfxAmbient', opts);   // tono percusivo sutil
    },
  };

  sfx.levelup = () => sfx.playerLevelUp(); // alias legacy

  // Eventos Tanda C: cada modificador de oleada tiene una firma breve e identificable.
  sfx.waveEvent = (eventKey) => {
    if (eventKey === 'mines') {
      duck('music', 0.38, 0.18);
      playTone(95, 0.18, 'sawtooth', 0.075, 'sfxAmbient');
      scheduleNoise(0.16, 0.05);
    } else if (eventKey === 'fog') {
      duck('music', 0.45, 0.12);
      playTone(260, 0.45, 'sine', 0.045, 'sfxAmbient');
      playTone(195, 0.55, 'triangle', 0.03, 'sfxAmbient');
    } else if (eventKey === 'elites') {
      duck('music', 0.32, 0.16);
      playTone(330, 0.14, 'square', 0.055, 'sfxAmbient');
      playTone(660, 0.14, 'square', 0.04, 'sfxAmbient');
    } else if (eventKey === 'payday') {
      playTone(880, 0.09, 'triangle', 0.045, 'sfxUI');
      playTone(1320, 0.1, 'square', 0.04, 'sfxUI');
      playTone(1760, 0.12, 'triangle', 0.035, 'sfxUI');
    }
  };

  // Confirmación corta al activarse una amenaza ambiental. El aviso visual llega
  // antes; este tono marca el instante exacto sin competir con armas o música.
  sfx.sectorHazard = (kind) => {
    const base = kind === 'vent' ? 150 : kind === 'rift' ? 220 : 105;
    duck('music', 0.62, 0.10);
    playTone(base, 0.16, kind === 'pulse' ? 'sine' : 'sawtooth', 0.045, 'sfxAmbient');
    playTone(base * 1.5, 0.09, 'triangle', 0.032, 'sfxAmbient');
  };

  // Una voz agregada para todo el grupo: dos osciladores, no dos por cabezal.
  // Gameplay informa la fase; audio jamás avanza el hazard ni aplica daño.
  let sectorLaserVoice = null;
  NV.stopSectorLaserSound = function () {
    if(!sectorLaserVoice)return;
    const v=sectorLaserVoice;sectorLaserVoice=null;
    if(v.voices){for(const voice of v.voices)if(voice)voice.stop();return;}
    const t=NV.audioCtx.currentTime;
    v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(v.gain.gain.value,t);
    v.gain.gain.linearRampToValueAtTime(0,t+.025);
    let remaining=v.oscillators.length;
    for(const osc of v.oscillators){osc.onended=()=>{if(osc.disconnect)osc.disconnect();if(--remaining===0&&v.gain.disconnect)v.gain.disconnect();};osc.stop(t+.03);}
  };
  NV.syncSectorLaserSound = function (hazards, env) {
    env=env||{};
    const group=(hazards||[]).filter(h=>h.laserHead&&h.state!=='dead');
    const active=group.find(h=>h.state==='active');
    const charging=group.find(h=>h.state==='telegraph'&&h.stateTime>=h.emergeTime);
    const phase=active?'active':charging?'charge':null;
    if(!phase||!NV.audioCtx||!NV.soundOn||env.paused||env.hidden||(NV.isAudioHidden&&NV.isAudioHidden())||env.state!=='playing'){NV.stopSectorLaserSound();return;}
    if(!sectorLaserVoice||sectorLaserVoice.phase!==phase){
      NV.stopSectorLaserSound();
      if(NV.soundVoice){
        const voices=[1,1.012].map(detune=>NV.soundVoice({loop:true,channel:'sfxAmbient',priority:4,
          freq:(phase==='active'?145:260)*detune,type:phase==='active'?'triangle':'sine',
          volume:phase==='active'?.028:.018,filter:1500,attack:.06}));
        if(voices.some(Boolean))sectorLaserVoice={phase,voices,oscillators:voices.filter(Boolean).map(v=>v.source)};
      }else{
      const ctx=NV.audioCtx,gain=ctx.createGain(),oscillators=[];
      gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(phase==='active'?.035:.025,ctx.currentTime+.04);
      connectOutput(gain,'sfxAmbient');
      for(const detune of [1,1.012]){const osc=ctx.createOscillator();osc.type=phase==='active'?'triangle':'sine';osc.frequency.setValueAtTime((phase==='active'?145:330)*detune,ctx.currentTime);osc.connect(gain);osc.start();oscillators.push(osc);}
      sectorLaserVoice={phase,gain,oscillators};
      }
    }
    if(sectorLaserVoice&&charging&&!active){const progress=Math.min(1,(charging.stateTime-charging.emergeTime)/(charging.telegraphTime-charging.emergeTime));
      sectorLaserVoice.oscillators.forEach((osc,i)=>osc.frequency.setValueAtTime((260+progress*380)*(i?1.012:1),NV.audioCtx.currentTime));}
  };
  NV.sectorLaserSoundPhase = () => sectorLaserVoice ? sectorLaserVoice.phase : null;
  if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{
    if(document.hidden)NV.stopSectorLaserSound();
  });

  // SFX nuevos de la Tarea 1 (esqueleto: hooks de ducking para combo/victoria).
  sfx.combo = count => {
    NV.musicState.combo=Math.min(30,Math.max(NV.musicState.combo||0,count||0));
    // Hitos: mismo registro, gana armonía y cuerpo, nunca altura/volumen infinito.
    if(count<5||count%5!==0||!gate('combo',.7))return;
    const tier=Math.min(3,Math.floor(count/15));
    toneAt(294,.17,'triangle',.032,'sfxAmbient',0);
    if(tier>0)toneAt(440,.16,'sine',.023,'sfxAmbient',.055,{pan:.25});
    if(tier>1)toneAt(587,.13,'sine',.018,'sfxAmbient',.11,{pan:-.25});
    if(tier>2)toneAt(147,.22,'sine',.034,'sfxAmbient',0);
  };
  sfx.heartbeat = intensity => {if(!gate('heartbeat',.55))return;const v=.035+Math.min(1,Math.max(0,intensity||0))*.025;toneAt(65,.13,'sine',v,'sfxPlayer',0);toneAt(58,.16,'sine',v*.7,'sfxPlayer',.18);};
  sfx.countdown = sec => {if(gate('countdown',.5))playTone(sec===1?330:220,.11,'triangle',.036,'sfxAmbient');};
  sfx.bossEnter = () => {if(!gate('boss-enter',.8))return;duck('music',.1,.6);sweepAt(110,43,.6,'triangle',.12,'sfxEnemies',0);noiseSweepAt(.6,.06,850,180,'sfxEnemies',0);toneAt(146,.5,'sine',.045,'sfxEnemies',.15);};
  sfx.victory = (wave, opts) => {
    // SFX ÚNICO DE OLEADA SUPERADA — "RESPIRO LUMINOSO" (v2 con presencia).
    // Una sola identidad para TODA victoria de oleada (normal, hito o boss):
    // se ignora wave/milestone a propósito para que cada vez que suena
    // signifique exactamente "OLEADA SUPERADA".
    //  Por qué la v1 se perdía: bus sfxUI (0.7, el más bajo de SFX) + ataque
    //  blando (triangle/sine sin transitorio) + duck leve de música + arranque
    //  en 523Hz (zona media ya saturada por música/disparos). Todo sumaba a
    //  "hay algo ahí si presto atención".
    //  Qué cambia en v2 (misma melodía, otra presencia):
    //  E0 GOLPE (0.00s): transitorio percusivo grave+brillo que MARCA el corte
    //     "SE TERMINÓ EL COMBATE" antes de que la melodía respire.
    //  E1 APERTURA (0.02-0.28s): misma quinta, más densa y con ataque (square
    //     con drive + triangle), paneo amplio: ya no compite, lidera.
    //  E2 RESPUESTA (0.16-0.52s): confirma una octava arriba, abre el estéreo.
    //  E3 ASENTAMIENTO (0.40-0.85s): tónica que aterriza + brillo que se apaga
    //     dentro del wave_end (2.10s): deja espacio para recoger y la tienda.
    //  Mezcla: bus `sfxPlayer` (0.9, el más alto de SFX) + duck PROFUNDO y
    //  corto de música (0.10/0.8s): la música se aparta, la victoria manda,
    //  y vuelve sola para el respiro/tienda. Volumen por voz comedido: golpe
    //  único, sin fanfarra larga ni estridencia que canse en la oleada 50.
    void wave; void opts;
    if(!gate('victory',.8))return;
    duck('music', 0.10, 0.8);
    // E0 — golpe de corte: peso grave + crack que anuncia el fin del combate.
    sweepAt(180, 55, 0.22, 'sine', 0.14, 'sfxPlayer', 0);
    toneAt(1560, 0.05, 'square', 0.06, 'sfxPlayer', 0, { drive: 0.4, pan: -0.5 });
    noiseSweepAt(0.14, 0.09, 2400, 500, 'sfxPlayer', 0);
    // E1 — apertura: misma quinta, con cuerpo y ataque.
    toneAt(523.25, 0.16, 'square', 0.075, 'sfxPlayer', 0.02, { drive: 0.3, pan: -0.45 });
    toneAt(523.25, 0.16, 'triangle', 0.06, 'sfxPlayer', 0.02, { pan: -0.45 });
    toneAt(784.00, 0.20, 'square', 0.075, 'sfxPlayer', 0.10, { drive: 0.3, pan: 0.45 });
    toneAt(784.00, 0.20, 'triangle', 0.06, 'sfxPlayer', 0.10, { pan: 0.45 });
    // E2 — respuesta: confirma una octava arriba, abre el estéreo.
    toneAt(1046.50, 0.22, 'triangle', 0.06, 'sfxPlayer', 0.18, { pan: -0.45 });
    toneAt(1318.51, 0.26, 'triangle', 0.055, 'sfxPlayer', 0.28, { pan: 0.45 });
    // E3 — asentamiento: tónica que aterriza + brillo que se apaga.
    toneAt(261.63, 0.34, 'sine', 0.075, 'sfxPlayer', 0.42);
    noiseSweepAt(0.30, 0.03, 3200, 900, 'sfxPlayer', 0.48);
  };
  // Firma sonora de transición de fase de jefe (Tarea 3, idea 6): golpe grave + swell
  // ascendente distinto del bossEnter, para que "entró en fase 2" se sienta único.
  sfx.bossPhaseShift = () => {
    if(!gate('boss-phase',.6))return;
    duck('music', 0.15, 0.35);
    playTone(70, 0.35, 'sawtooth', 0.13, 'sfxEnemies');
    playToneEx(220, 0.4, 'sawtooth', 0.07, { channel: 'sfxEnemies', detune: 0 });
    scheduleNoise(0.3, 0.06);
  };

  const PILOT_TRANSITION_TONES = {
    boti:  { death: [110, 87],  stable: [330, 440], deathType: 'sawtooth', stableType: 'sine' },
    nova:  { death: [220, 132], stable: [520, 660], deathType: 'sawtooth', stableType: 'sine' },
    rook:  { death: [72, 55],   stable: [146, 196], deathType: 'triangle', stableType: 'triangle' },
    swarm: { death: [330, 220], stable: [440, 880], deathType: 'square', stableType: 'sine' }
  };

  sfx.playerDeath = () => {
    if(!gate('player-death',.8))return;
    // SFX MUERTE DEL PERSONAJE — "COLAPSO + CORTE + HUNDIMIENTO".
    // Evento único de ~0.80s que cabe justo en la transición player_dying→FIN
    // (0.82s): arranca ANTES del overlay FIN y resuelve hacia él.
    //  E1 IMPACTO/COLAPSO (0.00-0.12s): crack agudo + crunch descendente +
    //     ruido de impacto: marca inequívoca "MORÍ" (nada que ver con el
    //     gesto de alarma del playerHit no letal).
    //  E2 CORTE/INTERRUPCIÓN (0.22s): silencio funcional de ~60ms + barrido
    //     descendente que "apaga" la acción (la anti-alarma: donde playerHit
    //     pondría su 2º pulso, acá hay vacío).
    //  E3 HUNDIMIENTO/RESOLUCIÓN (0.30-0.80s): pedal grave + sub que cae a
    //     30-38 Hz + cola de ruido que se apaga: conduce al FIN.
    // Todo por `sfxPlayer` con duck profundo y largo de música (0.08/0.9s):
    // la música se retira para que la muerte mande, y vuelve sola para el FIN.
    duck('music', 0.08, 0.9);
    // E1 — colapso: rotura brillante que se desploma al grave.
    toneAt(720, 0.07, 'square', 0.09, 'sfxPlayer', 0, { drive: 0.5, pan: -0.4 });
    sweepAt(320, 70, 0.32, 'sawtooth', 0.11, 'sfxPlayer', 0, { pan: 0.4 });
    noiseSweepAt(0.30, 0.10, 1600, 220, 'sfxPlayer', 0);
    // E1b — peso corporal que se viene abajo (núcleo + sub).
    sweepAt(210, 48, 0.55, 'sine', 0.13, 'sfxPlayer', 0.05);
    sweepAt(110, 30, 0.60, 'triangle', 0.10, 'sfxPlayer', 0.08, { pan: -0.25 });
    // E2 — corte: tras ~60ms de aire, barrido que interrumpe en seco.
    toneAt(1100, 0.03, 'square', 0.045, 'sfxPlayer', 0.22, { pan: 0.4 });
    sweepAt(880, 110, 0.06, 'sawtooth', 0.07, 'sfxPlayer', 0.22);
    // E3 — hundimiento: pedal grave + sub final + cola que se disuelve a FIN.
    toneAt(55, 0.34, 'sine', 0.11, 'sfxPlayer', 0.30);
    sweepAt(82, 38, 0.48, 'sine', 0.10, 'sfxPlayer', 0.32);
    noiseSweepAt(0.42, 0.045, 900, 120, 'sfxPlayer', 0.38);
  };

  sfx.deathTone = (pilotId) => {
    // Compat: la firma por piloto quedó obsoleta; el SFX de muerte es único
    // para que "morí" siempre se lea igual. Se ignora pilotId a propósito.
    void pilotId;
    sfx.playerDeath();
  };

  sfx.stabilizeTone = (pilotId, isBoss) => {
    if(!gate('stabilize',.5))return;
    const tone = PILOT_TRANSITION_TONES[pilotId] || PILOT_TRANSITION_TONES.boti;
    const gain = isBoss ? 0.045 : 0.032;
    playTone(tone.stable[0], 0.18, tone.stableType, gain, 'sfxUI');
    playTone(tone.stable[1], 0.24, 'sine', gain * 0.72, 'sfxAmbient');
  };

  function defaultWeaponSound(_weapon, opts, fus, vol) {
    playToneEx(880, 0.08, 'square', 0.03 * vol, opts);
  }

  const WEAPON_SOUND_HANDLERS = {
    pistol: (_weapon, opts, _fus, vol) => playToneEx(880, 0.08, 'square', 0.03 * vol, opts),
    rifle: (_weapon, opts, _fus, vol) => playToneEx(640, 0.07, 'square', 0.035 * vol, opts),
    smg: (_weapon, opts, _fus, vol) => playToneEx(990, 0.04, 'square', rapidFireVolume('smg', 0.028 * vol), opts),
    shotgun: (_weapon, opts, fus, vol) => { scheduleNoise(0.18, 0.07); playToneEx(170 * fus, 0.18, 'sawtooth', 0.09 * vol, opts); },
    sniper: (_weapon, opts, _fus, vol) => { playToneEx(110, 0.45, 'square', 0.11 * vol, opts); scheduleNoise(0.25, 0.05); },
    laser: (_weapon, opts, _fus, vol) => playToneEx(1250, 0.12, 'sine', 0.045 * vol, opts),
    plasma: (_weapon, opts, _fus, vol) => playToneEx(720, 0.1, 'triangle', 0.05 * vol, opts),
    flamethrower: (_weapon, opts, fus, vol) => { scheduleNoise(0.14, 0.05); playToneEx(95 * fus, 0.13, 'sawtooth', 0.08 * vol, opts); },
    bow: (_weapon, opts, _fus, vol) => playToneEx(430, 0.09, 'sine', 0.045 * vol, opts),
    railgun: (_weapon, opts, fus, vol) => { playToneEx(150 * fus, 0.5, 'sawtooth', rapidFireVolume('railgun', 0.12 * vol), opts); scheduleNoise(0.3, rapidFireVolume('railgun', 0.06)); },
  };

  // Sonido distintivo por tipo de arma
  // opts?: { crit, fusion, channel } → variación de timbre/pitch (Tarea 1).
  // playWeaponSound(weapon) sigue funcionando (backwards compatible).
  function playWeaponSound(weapon, opts) {
    if (!NV.soundOn) return;
    opts = opts || {};
    if (NV.audio && typeof NV.audio.weaponFire === 'function') {
      return NV.audio.weaponFire((weapon && weapon.id) || 'pistol', opts);
    }
    // Fallback sintetizado (sin weaponSfx.js disponible): las armas entran por su
    // propio bus para que weaponsVolume siga siendo independiente de playerVolume.
    // Un opts.channel explícito del caller se respeta tal cual.
    const fallbackOpts = opts.channel ? opts : Object.assign({}, opts, { channel: 'weapons' });
    const fus = opts.fusion > 0 ? 1 + opts.fusion * 0.05 : 1; // pitch ↑ +5% por nivel de fusión
    const vol = (opts.crit ? 1.15 : 1) * (opts.fusion ? 1 + opts.fusion * 0.03 : 1);
    const handler = WEAPON_SOUND_HANDLERS[weapon.id] || defaultWeaponSound;
    handler(weapon, fallbackOpts, fus, vol);
  }

  NV.WEAPON_SOUND_HANDLERS = WEAPON_SOUND_HANDLERS;

  // Sonidos de ataque distintos para cada jefe
  sfx.bossAttack = {};
  const bossVoices={repeater:[185,95,.12],heavy:[100,42,.34],summon:[73,146,.45],spread:[294,196,.18],beam:[180,130,.6],volley:[330,220,.15],bomb:[85,38,.45],orbs:[440,330,.24],split:[261,392,.25],rage:[146,73,.15]};
  for(const [id,[a,b,dur]] of Object.entries(bossVoices))sfx.bossAttack[id]=opts=>{
    if(!gate('boss-attack',.09))return;
    playToneSweep(a,b,dur,id==='orbs'?'sine':'triangle',.085,'sfxEnemies',opts);
    noiseSweepAt(Math.min(.22,dur),.042,id==='beam'?1200:700,300,'sfxEnemies',0);
  };
  sfx.dash=opts=>{if(!gate('dash',.12))return;noiseSweepAt(.18,.045,1500,380,'sfxPlayer',0);playToneSweep(220,85,.18,'sine',.045,'sfxPlayer',opts);};
  sfx.shield=()=>{if(gate('shield',.35)){playTone(196,.17,'sine',.035,'sfxPlayer');toneAt(294,.12,'triangle',.02,'sfxPlayer',.035);}};
  sfx.spawn=opts=>{if(gate('spawn',.3))playToneSweep(120,185,.16,'sine',.027,'sfxEnemies',opts);};
  sfx.enemyAttack=(kind,opts)=>{if(!gate('enemy-attack',.10))return;const f=kind==='tank'?85:kind==='ranged'?220:165;playToneSweep(f*1.5,f,.14,'triangle',.045,'sfxEnemies',opts);};
  sfx.impact=(kind,opts)=>{if(!gate('impact-'+(kind==='boss'?'boss':'enemy'),kind==='boss'?.14:.10))return;playToneSweep(kind==='boss'?95:180,kind==='boss'?52:110,.08,'triangle',kind==='boss'?.032:.018,'sfxEnemies',opts);};
  sfx.telegraph=opts=>{if(gate('telegraph',.18)){toneAt(174,.1,'triangle',.035,'sfxEnemies',0,opts);toneAt(233,.12,'sine',.035,'sfxEnemies',.12,opts);}};
  // Observación de transiciones reales, sin escribir estado de IA ni consumir su RNG.
  // Tanque y escupidor ya emiten desde el momento exacto de disparo: no duplicarlos.
  const observedEnemies=new WeakMap();
  const audibleStates=['swiftState','specterChargeState','goliathState','predatorState',
    'phantomState','wispPhaseState','coreZoneState','commanderState','bulwarkState',
    'swarmState','droneState','flankState'];
  NV.observeEnemyAudio=(enemies,worldWidth)=>{
    for(const e of enemies||[]){
      if(!e||e.dead)continue;
      const previous=observedEnemies.get(e)||{};
      const opts={x:e.x,worldWidth};
      for(const key of audibleStates){
        const value=e[key];
        if(value&&value!==previous[key]){
          if(/windup$/.test(value)||value==='signal'||value==='mark')sfx.telegraph(opts);
          else if(['dash','charge','execution','entry_commit','commit','pulse','press','attack'].includes(value))sfx.enemyAttack('melee',opts);
        }
        previous[key]=value;
      }
      observedEnemies.set(e,previous);
    }
  };
  sfx.chest=()=>{if(gate('chest',.4)){[294,440,587].forEach((f,i)=>toneAt(f,.24,'triangle',.04,'sfxUI',i*.075));}};
  sfx.weaponPickup=()=>{if(gate('weapon-pickup',.17)){toneAt(196,.16,'triangle',.042,'sfxUI',0);toneAt(392,.18,'sine',.035,'sfxUI',.065);}};
  sfx.ui=kind=>{
    if(!gate('ui-'+(kind==='hover'?'hover':'action'),kind==='hover'?.12:.065))return;
    const f={hover:240,select:392,confirm:330,back:220,open:294,close:196,error:130,setting:350}[kind]||330;
    const hover=kind==='hover';
    playTone(f,hover?.05:.13,hover?'sine':'triangle',hover?.014:.065,'sfxUI');
    if(!hover)noiseSweepAt(.025,.019,1800,900,'sfxUI',0);
    if(kind==='confirm'||kind==='open')toneAt(f*1.5,.15,'triangle',.038,'sfxUI',.025);
  };

  // Siembra del estado del mixer desde las preferencias persistidas. Si settings.js
  // todavía no cargó, queda en defaults y settings.js lo reaplicará en su arranque.
  applyAudioSettings(settingsAudio());

  // Exportar API pública
  NV.initAudio = initAudio;
  NV.updateMusic = updateMusic;
  NV.MUSIC_SECTOR_PROFILES = SECTOR_MUSIC;
  NV.musicProfileForWave = sectorMusicForWave;
  NV.playWeaponSound = playWeaponSound;
  NV.playToneEx = playToneEx;
  NV.playToneSweep = playToneSweep;
  NV.duck = duck;
  NV.channelFor = channelFor;
  NV.panForX = panForX;
  NV.setChannelVolume = setChannelVolume;
  NV.applyMasterVolume = applyMasterVolume;
  NV.applyAudioSettings = applyAudioSettings;
  NV.applySfxVolume = applySfxVolume;
  NV.setSoundEnabled = setSoundEnabled;
  NV.mixerChannels = CHANNELS;
  // Volumen de categoría por canal del mixer (mapa canal -> 0..1).
  NV.masterVolume = MASTER_VOLUME;
  // Contrato canal del mixer -> clave persistida en NV.settings.audio.
  NV.audioChannelSettings = AUDIO_CHANNEL_SETTINGS;
  NV.sfx = sfx;
})();
