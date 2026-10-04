// ===== RENDER: enemigos espectrales Canvas2D =====
(() => {
  'use strict';
  const NV = window.NV;
  const reducedMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const PROFILES = {
    drone: { body: '#b5c6ff', core: '#e8edff', glow: '#9bb0ff', spikes: 4, innerRatio: 0.62, spikeLen: 0.32, pulseRate: 0.9, pulseAmt: 0.06, particles: 3, particleSize: 0.5, eyeStyle: 'round', radiusMul: 1.0 },
    runner: { body: '#4dd6ff', core: '#d4f7ff', glow: '#7de8ff', spikes: 3, innerRatio: 0.5, spikeLen: 0.55, pulseRate: 2.4, pulseAmt: 0.04, particles: 2, particleSize: 0.35, eyeStyle: 'narrow', radiusMul: 1.05, stretch: 1.25 },
    tank: { body: '#9b8cff', core: '#e0d9ff', glow: '#b8a8ff', spikes: 6, innerRatio: 0.78, spikeLen: 0.22, pulseRate: 0.55, pulseAmt: 0.05, particles: 5, particleSize: 0.6, eyeStyle: 'deep', radiusMul: 1.1 },
    shielder: { body: '#5fffa0', core: '#caffebf', glow: '#8fffc0', spikes: 8, innerRatio: 0.7, spikeLen: 0.18, pulseRate: 1.0, pulseAmt: 0.05, particles: 4, particleSize: 0.45, eyeStyle: 'round', radiusMul: 1.05 },
    swarmlet: { body: '#22d3ee', core: '#baf7ff', glow: '#67e8f9', spikes: 4, innerRatio: 0.55, spikeLen: 0.28, pulseRate: 1.8, pulseAmt: 0.05, particles: 3, particleSize: 0.3, eyeStyle: 'single', radiusMul: 0.9 },
    spitter: { body: '#ff8c42', core: '#ffd4a8', glow: '#ffb066', spikes: 6, innerRatio: 0.6, spikeLen: 0.3, pulseRate: 1.1, pulseAmt: 0.06, particles: 4, particleSize: 0.45, eyeStyle: 'round', radiusMul: 1.0 },
    wisp: { body: '#d56fff', core: '#f0d4ff', glow: '#e0a8ff', spikes: 7, innerRatio: 0.66, spikeLen: 0.4, pulseRate: 1.6, pulseAmt: 0.1, particles: 5, particleSize: 0.4, eyeStyle: 'asymmetric', radiusMul: 0.85 },
    kamikaze: { body: '#ff5f3d', core: '#ffd4c2', glow: '#ff8a5f', spikes: 5, innerRatio: 0.5, spikeLen: 0.6, pulseRate: 3.2, pulseAmt: 0.08, particles: 6, particleSize: 0.5, eyeStyle: 'narrow', radiusMul: 1.0 },
    boss_minion: { body: '#9bb5ff', core: '#dde6ff', glow: '#b8c8ff', spikes: 4, innerRatio: 0.6, spikeLen: 0.3, pulseRate: 1.2, pulseAmt: 0.05, particles: 2, particleSize: 0.35, eyeStyle: 'round', radiusMul: 0.9 },
    specter_grunt: { body: '#d8f6ff', core: '#ffffff', glow: '#b8efff', spikes: 4, innerRatio: 0.62, spikeLen: 0.28, pulseRate: 1.1, pulseAmt: 0.06, particles: 3, particleSize: 0.4, eyeStyle: 'round', radiusMul: 1.0 },
    specter_archer: { body: '#ffb24a', core: '#ffe0a8', glow: '#ffc76a', spikes: 6, innerRatio: 0.58, spikeLen: 0.34, pulseRate: 1.3, pulseAmt: 0.06, particles: 4, particleSize: 0.45, eyeStyle: 'narrow', radiusMul: 1.0, cannonGlow: true },
    specter_guard: { body: '#67f8c8', core: '#d8fff2', glow: '#8dffe0', spikes: 6, innerRatio: 0.74, spikeLen: 0.22, pulseRate: 0.75, pulseAmt: 0.05, particles: 5, particleSize: 0.55, eyeStyle: 'deep', radiusMul: 1.1, shieldAura: true },
  };
  // Variante interna de boss_minion: no forma parte del roster ni amplía el
  // catálogo público de enemigos; solo comunica la división del MUTANTE.
  const MUTANT_CLONE_PROFILE = Object.freeze({ body: '#47e53f', core: '#e5ffd8', glow: '#75ff67', spikes: 6, innerRatio: 0.52, spikeLen: 0.48, pulseRate: 2.2, pulseAmt: 0.10, particles: 5, particleSize: 0.42, eyeStyle: 'narrow', radiusMul: 1.15 });
  // Visual aprobado en previews/enemy-visual-lab.html: seis modelos líquidos
  // hand-drawn (RB1..RB6). Cambio 100% visual; no toca datos, IA, daño, vida,
  // velocidad, hitbox ni spawn. Los espectros legacy (shape 'specter') y las
  // élites usan la misma estética geométrica del Visual Lab.
  const LAB_SPECTER_IDS = {
    specter_lite: 1,        // RB2 - Ameba Coronada (remapeado: modelo distintivo)
    specter_grunt: 1,       // RB2 - Ameba Coronada
    specter_core: 2,        // RB3 - Viscera Manto
    specter_archer: 3,      // RB4 - Halo Espectral
    specter_guard: 4,       // RB5 - Núcleo Sigilo
    specter_elite_void: 5,
    // Esbirro de jefe: entidad pequena invocada, no espectro de oleada.
    // Usa RB2 (Ameba Coronada) de forma PROVISIONAL: escala 0.75, la mas baja
    // fuera de Hydra, y silueta redondeada coherente con un summoned chaff.
    // enemyTypeId basta para resolver PROFILES.boss_minion (perfil cromatico
    // propio ya existente) y este modelo liquido; no hace falta visualId.
    // No altera MODEL_SCALE_FACTORS, los factores de hitbox globales ni
    // ningun mapeo previo. La migracion de NV.spawnMinion (engine/boss.js) es
    // la que hara visible este routing en juego; hasta entonces es inerte.
    boss_minion: 1,
    // Cualquier variante élite (base o espectral) -> Modelo 5 (Hidra).
    elite_base: 5,
    elite_velocity: 5,
    elite_bulwark: 5,
    elite_predator: 5,
    elite_phantom: 5,
    elite_titan: 5,
    elite_swift: 5,
  };
  // ---- Escalado por modelo (down-scale aprobado del roster líquido) ----
  // Cada modelo tiene su PROPIO multiplicador visual (tabla aprobada), en las
  // mismas unidades que el labScale uniforme 0.8 que sustituye. La jerarquía
  // base del roster se conserva; RB6 aplica después su ajuste corporal Hydra.
  // Radio del cuerpo principal en pantalla (intrínseco × factor):
  //   RB1 ≈24.5 · RB2 ≈30 · RB3 ≈30.4 · RB4 ≈30.4 · RB5 ≈34.4 · RB6 base ≈38.3 px
  const MODEL_SCALE_FACTORS = [0.70, 0.75, 0.80, 0.80, 0.82, 0.85];
  // Hydra Performance Fix #1: reducción corporal física/visual autoritativa.
  // Se aplica sólo a RB6/Hydra; rangos de ataque, fusión y telegraphs conservan
  // sus unidades world-space independientes.
  const HYDRA_BODY_SCALE = 0.65;
  // Down-scale de cuerpo (×0.65) de los cinco espectros líquidos de producción:
  // specter_grunt · specter_archer · specter_guard · specter_lite · specter_core.
  // Scoped POR enemyTypeId: la tabla MODEL_SCALE_FACTORS y el factor por modelo
  // quedan intactos para el resto de consumidores (tools/previews/pruebas), y
  // RB6/Hydra, élites, comunes y Swarmlet NO reciben este factor. El dibujo y
  // la hitbox física comparten el MISMO multiplicador para mantener coherencia
  // visual/física; HP, daño, velocidad, pesos y rangos semánticos no cambian.
  const SPECTRAL_BODY_SCALE = 0.65;
  const SPECTRAL_BODY_IDS = { specter_grunt: 1, specter_archer: 1, specter_guard: 1, specter_lite: 1, specter_core: 1 };
  function spectralBodyScale(typeId) {
    return Object.prototype.hasOwnProperty.call(SPECTRAL_BODY_IDS, typeId || '') ? SPECTRAL_BODY_SCALE : 1;
  }
  // Radio intrínseco del cuerpo principal de cada modelo en el lab (escala 1):
  // RB1 35 · RB2 40 · RB3 38 · RB4 38 · RB5 42 · RB6 45.
  const MODEL_INTRINSIC_RADII = [35, 40, 38, 38, 42, 45];
  // Radio visual efectivo del cuerpo principal de un modelo (con customScale).
  NV.labModelVisualRadius = function (modelIdx, customScale) {
    const i = ((modelIdx || 0) % 6 + 6) % 6;
    const bodyScale = i === 5 ? HYDRA_BODY_SCALE : 1;
    return MODEL_INTRINSIC_RADII[i] * (MODEL_SCALE_FACTORS[i] || 0.8) * bodyScale * (customScale || 1);
  };
  // Factor de hitbox por modelo: relación entre el nuevo factor visual y el
  // labScale uniforme 0.8 previo. El radio de datos se adapta con este mismo
  // ratio (engine/enemies.js al spawnear) para que la detección siga
  // coincidiendo con la silueta dibujada a su nuevo tamaño.
  // Segundo argumento opcional typeId: los cinco espectros de producción
  // reciben aquí su body scale ×0.65 (el MISMO multiplicador de su dibujo).
  // Sin typeId el valor es idéntico al de siempre (tabla por modelo intacta;
  // Hydra/RB6 sigue gobernado solo por HYDRA_BODY_SCALE).
  NV.labModelHitboxFactor = function (modelIdx, typeId) {
    const i = ((modelIdx || 0) % 6 + 6) % 6;
    const bodyScale = i === 5 ? HYDRA_BODY_SCALE : 1;
    return ((MODEL_SCALE_FACTORS[i] || 0.8) / 0.8) * bodyScale * spectralBodyScale(typeId);
  };
  // Expuestos para el engine (adaptación de hitbox al spawn) y herramientas.
  NV.LAB_SPECTER_IDS = LAB_SPECTER_IDS;
  NV.LAB_MODEL_SCALE_FACTORS = MODEL_SCALE_FACTORS;
  NV.HYDRA_BODY_SCALE = HYDRA_BODY_SCALE;
  NV.SPECTRAL_BODY_SCALE = SPECTRAL_BODY_SCALE;
  NV.spectralBodyScale = spectralBodyScale;
  // Las 6 poses del lab ya no hacen falta: el cuerpo/tamaño de RB1..RB6 lo
  // define drawLabEnemyModel() con los parámetros exactos del lab
  // (blob radius/points/noiseAmp/speedMult/seed por modelo).
  // Perfiles élite diferenciados por visualId. Mantienen la identidad cromática del
  // élite original pero con estética espectral: halos, spikes reforzados y ojos únicos.
  const ELITE_PROFILES = {
    elite_base:    { body: '#ffe24a', core: '#fffbe0', glow: '#fff08a', spikes: 6, innerRatio: 0.72, spikeLen: 0.28, pulseRate: 1.3, pulseAmt: 0.06, particles: 4, particleSize: 0.55, eyeStyle: 'deep', radiusMul: 1.15, haloColor: '#ffd700', haloWidth: 2.5, haloPulse: 0.12 },
    elite_velocity:{ body: '#4dffba', core: '#caffe8', glow: '#7dffc8', spikes: 3, innerRatio: 0.45, spikeLen: 0.7, pulseRate: 3.0, pulseAmt: 0.05, particles: 3, particleSize: 0.4, eyeStyle: 'narrow', radiusMul: 1.1, stretch: 1.4, haloColor: '#00ffaa', haloWidth: 2, haloPulse: 0.18, trailEffect: true },
    elite_bulwark: { body: '#ff9a3d', core: '#ffd9b0', glow: '#ffb866', spikes: 10, innerRatio: 0.82, spikeLen: 0.25, pulseRate: 0.6, pulseAmt: 0.04, particles: 6, particleSize: 0.65, eyeStyle: 'deep', radiusMul: 1.2, haloColor: '#ff8c00', haloWidth: 3, haloPulse: 0.08, armorRing: true },
    elite_predator:{ body: '#f055ff', core: '#f0c8ff', glow: '#e080ff', spikes: 5, innerRatio: 0.55, spikeLen: 0.5, pulseRate: 2.2, pulseAmt: 0.07, particles: 3, particleSize: 0.4, eyeStyle: 'asymmetric', radiusMul: 1.05, haloColor: '#dd00ff', haloWidth: 2, haloPulse: 0.15, feralEyes: true },
    elite_phantom: { body: '#a0f0ff', core: '#e0ffff', glow: '#c0f0ff', spikes: 6, innerRatio: 0.65, spikeLen: 0.35, pulseRate: 1.4, pulseAmt: 0.12, particles: 7, particleSize: 0.35, eyeStyle: 'single', radiusMul: 1.0, haloColor: '#80f0ff', haloWidth: 2.5, haloPulse: 0.1, ghostly: true },
    elite_titan:   { body: '#ff3570', core: '#ffa0b8', glow: '#ff6088', spikes: 8, innerRatio: 0.75, spikeLen: 0.35, pulseRate: 0.4, pulseAmt: 0.04, particles: 8, particleSize: 0.7, eyeStyle: 'deep', radiusMul: 1.25, haloColor: '#ff1493', haloWidth: 3.5, haloPulse: 0.06, massive: true },
    elite_swift:   { body: '#80ff50', core: '#d0ffb0', glow: '#a0ff70', spikes: 2, innerRatio: 0.4, spikeLen: 0.6, pulseRate: 4.0, pulseAmt: 0.04, particles: 2, particleSize: 0.3, eyeStyle: 'narrow', radiusMul: 1.0, stretch: 1.6, haloColor: '#00ff44', haloWidth: 1.5, haloPulse: 0.22, ultraTrail: true },
    elite_specter_void: { body: '#9b4dff', core: '#1a001f', glow: '#c040ff', spikes: 7, innerRatio: 0.62, spikeLen: 0.5, pulseRate: 1.6, pulseAmt: 0.1, particles: 8, particleSize: 0.45, eyeStyle: 'single', radiusMul: 1.15, haloColor: '#c040ff', haloWidth: 2.5, haloPulse: 0.14, voidCore: true, phaseEffect: true },
  };
  // Visual de raid bosses espectrales aprobado en previews/enemy-visual-lab.html.
  // Se aplica a los 8 élites base cuando SPECTRAL_ENEMY_MODE esta activo.
  // No toca datos, IA, dano, vida, velocidad ni spawn: solo silueta, coronas,
  // mantos, sigilos, halos y colas jerarquicas.
  const ELITE_BOSS_POSES = {
    elite_base:    { body:[1.10,1.02], tilt:-.09, head:1.12, mouth:1, eye:1.02, eyeStyle:6,  tailLen:1.20, tailDir:-1, tailAmp:.70, eyeAng:.04, eyeSep:25, eyeY:-34, mouthY:7,  sigil:0, aura:1.24, shoulder:1.00, waist:.84, root:.62, crown:0, mantle:0, halo:0, tailMode:0 },
    elite_velocity:{ body:[1.06,1.10], tilt:.08,  head:1.06, mouth:2, eye:.98, eyeStyle:7,  tailLen:1.28, tailDir: 1, tailAmp:.64, eyeAng:.04, eyeSep:24, eyeY:-33, mouthY:8,  sigil:1, aura:1.18, shoulder:1.18, waist:.82, root:.58, crown:1, mantle:1, halo:1, tailMode:1 },
    elite_bulwark: { body:[1.14,.98], tilt:.04,  head:1.10, mouth:0, eye:1.06, eyeStyle:8,  tailLen:1.18, tailDir: 1, tailAmp:.78, eyeAng:.03, eyeSep:26, eyeY:-35, mouthY:8,  sigil:2, aura:1.26, shoulder:1.04, waist:.76, root:.52, crown:2, mantle:2, halo:2, tailMode:2 },
    elite_predator:{ body:[1.08,1.12], tilt:-.15, head:1.08, mouth:3, eye:1.00, eyeStyle:9,  tailLen:1.24, tailDir:-1, tailAmp:.68, eyeAng:.05, eyeSep:24, eyeY:-33, mouthY:9,  sigil:3, aura:1.22, shoulder:1.20, waist:.88, root:.64, crown:3, mantle:3, halo:3, tailMode:3 },
    elite_phantom: { body:[1.02,1.08], tilt:.14,  head:1.04, mouth:1, eye:.96, eyeStyle:10, tailLen:1.30, tailDir: 1, tailAmp:.74, eyeAng:.04, eyeSep:24, eyeY:-32, mouthY:7,  sigil:4, aura:1.20, shoulder:.96, waist:.72, root:.48, crown:4, mantle:4, halo:4, tailMode:4 },
    elite_titan:   { body:[1.20,1.04], tilt:-.06, head:1.16, mouth:0, eye:1.10, eyeStyle:6,  tailLen:1.32, tailDir:-1, tailAmp:.88, eyeAng:.05, eyeSep:28, eyeY:-36, mouthY:9,  sigil:0, aura:1.34, shoulder:1.30, waist:.92, root:.68, crown:1, mantle:3, halo:4, tailMode:2 },
    elite_swift:   { body:[1.04,1.12], tilt:.10,  head:1.05, mouth:2, eye:.94, eyeStyle:7,  tailLen:1.22, tailDir: 1, tailAmp:.60, eyeAng:.03, eyeSep:23, eyeY:-32, mouthY:7,  sigil:1, aura:1.16, shoulder:1.10, waist:.78, root:.54, crown:2, mantle:1, halo:5, tailMode:1 }
  };
  // Perfiles boss espectrales. Cada jefe tiene identidad visual única: aura masiva,
  // spikes grandes, ojos imponentes y partículas orbitales abundantes.
  const BOSS_PROFILES = {
    boss_jefe:      { rig: 'repeater', body: '#ff5f9b', core: '#ffd0e0', glow: '#ff8ab8', spikes: 8, innerRatio: 0.8, spikeLen: 0.35, pulseRate: 0.8, pulseAmt: 0.06, particles: 8, particleSize: 0.7, eyeStyle: 'deep', radiusMul: 1.3, auraRadius: 2.2, auraAlpha: 0.25, ringCount: 2 },
    boss_titan:     { rig: 'heavy', body: '#ff8c00', core: '#ffd9a0', glow: '#ffb060', spikes: 10, innerRatio: 0.85, spikeLen: 0.4, pulseRate: 0.5, pulseAmt: 0.05, particles: 10, particleSize: 0.8, eyeStyle: 'deep', radiusMul: 1.35, auraRadius: 2.4, auraAlpha: 0.3, ringCount: 3 },
    boss_vacio:     { rig: 'summon', body: '#dc143c', core: '#ff8090', glow: '#ff4060', spikes: 7, innerRatio: 0.75, spikeLen: 0.5, pulseRate: 1.2, pulseAmt: 0.1, particles: 12, particleSize: 0.5, eyeStyle: 'single', radiusMul: 1.25, auraRadius: 2.5, auraAlpha: 0.35, voidEffect: true },
    boss_guardian:  { rig: 'spread', body: '#00bfff', core: '#a0e8ff', glow: '#60d0ff', spikes: 9, innerRatio: 0.82, spikeLen: 0.3, pulseRate: 1.0, pulseAmt: 0.05, particles: 9, particleSize: 0.65, eyeStyle: 'round', radiusMul: 1.3, auraRadius: 2.3, auraAlpha: 0.25, shieldRing: true },
    boss_destructor:{ rig: 'beam', body: '#ff0000', core: '#ff8080', glow: '#ff4040', spikes: 11, innerRatio: 0.78, spikeLen: 0.45, pulseRate: 1.5, pulseAmt: 0.08, particles: 11, particleSize: 0.75, eyeStyle: 'narrow', radiusMul: 1.4, auraRadius: 2.6, auraAlpha: 0.3, aggressive: true },
    boss_nemesis:   { rig: 'volley', body: '#8b00ff', core: '#d0a0ff', glow: '#b060ff', spikes: 6, innerRatio: 0.7, spikeLen: 0.55, pulseRate: 1.8, pulseAmt: 0.07, particles: 8, particleSize: 0.55, eyeStyle: 'asymmetric', radiusMul: 1.25, auraRadius: 2.2, auraAlpha: 0.28, phaseEffect: true },
    boss_coloso:    { rig: 'bomb', body: '#ff4500', core: '#ffb090', glow: '#ff7040', spikes: 12, innerRatio: 0.88, spikeLen: 0.35, pulseRate: 0.35, pulseAmt: 0.04, particles: 14, particleSize: 0.9, eyeStyle: 'deep', radiusMul: 1.5, auraRadius: 2.8, auraAlpha: 0.3, massive: true },
    boss_fantasma:  { rig: 'orbs', body: '#e0ffff', core: '#f0ffff', glow: '#c0f0ff', spikes: 6, innerRatio: 0.72, spikeLen: 0.5, pulseRate: 1.6, pulseAmt: 0.12, particles: 10, particleSize: 0.45, eyeStyle: 'single', radiusMul: 1.2, auraRadius: 2.3, auraAlpha: 0.2, ghostly: true },
    boss_mutante:   { rig: 'split', body: '#173a32', core: '#b7ff8a', glow: '#55f2a1', scar: '#ff4f82', spikes: 9, innerRatio: 0.76, spikeLen: 0.4, pulseRate: 1.3, pulseAmt: 0.07, particles: 12, particleSize: 0.7, eyeStyle: 'mutant', radiusMul: 1.16, auraRadius: 2.35, auraAlpha: 0.22, mutateEffect: true },
    boss_apocalipsis:{ rig: 'rage', body: '#ff1493', core: '#ffa0d0', glow: '#ff50a0', spikes: 14, innerRatio: 0.85, spikeLen: 0.5, pulseRate: 0.6, pulseAmt: 0.06, particles: 16, particleSize: 0.85, eyeStyle: 'deep', radiusMul: 1.5, auraRadius: 3.0, auraAlpha: 0.35, rageEffect: true },
  };
  const RESOLVED_ELITE_PROFILES = Object.create(null);
  let hydraFullRender = new WeakSet();
  let hydraMediumRender = new WeakSet();
  let hydraCandidates = [];
  let visualBudgetPrepared = false;
  let activeGraphicsPolicy = { quality: 'high', particles: true, heavyVfx: true, hydraFullBudget: Infinity };
  let activeVisualBudget = null; // P2: tier runtime (solo recorta calidad decorativa)
  // TEMPORAL: A/B de coste Hydra. No se persiste; reload siempre vuelve a full.
  // full conserva exactamente el LOD decidido por el visual budget existente.
  // cheap fuerza únicamente el body RB6 al fallback simple ya aprobado.
  let hydraDiagnosticMode = 'full';
  const HYDRA_DIAGNOSTIC_MODES = ['full', 'cheap'];
  // Los cinco modelos espectrales de producción comparten el mismo hot path
  // líquido. Conservan su geometría, partículas y tinta secundaria, pero evitan
  // Canvas blur y Math.random por vértice/ojo igual que Hydra Fix #1.
  const DETAIL_FULL = Object.freeze({ simplified: false, medium: false, particles: true, particleScale: 1, jitterScale: 0, secondaryInk: true, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const DETAIL_FULL_NO_PARTICLES = Object.freeze({ simplified: false, medium: false, particles: false, particleScale: 0, jitterScale: 0, secondaryInk: true, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const DETAIL_FULL_REDUCED_VFX = Object.freeze({ simplified: false, medium: false, particles: true, particleScale: 0.5, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const DETAIL_MEDIUM = Object.freeze({ simplified: false, medium: true, particles: true, particleScale: 0.4, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const DETAIL_MEDIUM_NO_PARTICLES = Object.freeze({ simplified: false, medium: true, particles: false, particleScale: 0, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const DETAIL_SIMPLE = Object.freeze({ simplified: true, medium: false, particles: false, particleScale: 0, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: false, deterministicEyes: true, eyeFauxGlow: false, particleFauxGlow: false });
  // FULL optimizado: la forma orgánica sigue animada por las dos ondas del blob,
  // pero elimina jitter aleatorio, Canvas blur y parsing de color por lóbulo.
  const HYDRA_DETAIL_FULL = Object.freeze({ simplified: false, medium: false, particles: true, particleScale: 0.7, jitterScale: 0, secondaryInk: true, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const HYDRA_DETAIL_FULL_NO_PARTICLES = Object.freeze({ simplified: false, medium: false, particles: false, particleScale: 0, jitterScale: 0, secondaryInk: true, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const HYDRA_DETAIL_FULL_REDUCED_VFX = Object.freeze({ simplified: false, medium: false, particles: true, particleScale: 0.4, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const HYDRA_DETAIL_MEDIUM = Object.freeze({ simplified: false, medium: true, particles: true, particleScale: 0.3, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const HYDRA_DETAIL_MEDIUM_NO_PARTICLES = Object.freeze({ simplified: false, medium: true, particles: false, particleScale: 0, jitterScale: 0, secondaryInk: false, glowBlur: 0, fauxGlow: true, deterministicEyes: true, eyeFauxGlow: true, particleFauxGlow: true });
  const BLOB_ANGLE_COUNTS = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18];
  const BLOB_ANGLES = Object.create(null);
  for (const count of BLOB_ANGLE_COUNTS) {
    const points = [];
    for (let i = 0; i <= count; i++) {
      const angle = (i / count) * Math.PI * 2;
      points.push(Object.freeze({
        sin: Math.sin(angle), cos: Math.cos(angle),
        sin4: Math.sin(angle * 4), cos4: Math.cos(angle * 4),
        sin7: Math.sin(angle * 7), cos7: Math.cos(angle * 7),
      }));
    }
    BLOB_ANGLES[count] = Object.freeze(points);
  }
  Object.freeze(BLOB_ANGLES);
  const HYDRA_LOBES = Object.freeze([
    Object.freeze({ x: -30, y: 35, radius: 15, points: 8, noise: 12, speed: 1.6, seed: 60 }),
    Object.freeze({ x: 0, y: 45, radius: 18, points: 8, noise: 14, speed: 1.8, seed: 65 }),
    Object.freeze({ x: 30, y: 35, radius: 15, points: 8, noise: 12, speed: 1.6, seed: 70 }),
    Object.freeze({ x: 0, y: -10, radius: 45, points: 14, noise: 12, speed: 1.1, seed: 75 }),
  ]);
  let visualBudgetStats = { family: 'lab_model_5_hydra', total: 0, full: 0, medium: 0, simplified: 0, budget: Infinity };
  function hash01(e, salt) {
    const v = Math.sin((e.x || 0) * 12.9898 + (e.y || 0) * 78.233 + (e.radius || 1) * 37.719 + salt * 43.1234) * 43758.5453;
    return v - Math.floor(v);
  }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(rgb, a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
  NV.drawEnemyHitFeedback = function (ctx, entity, radius) {
    if (!ctx || !entity || !(entity.hitFlash > 0)) return false;
    const strength = Math.min(1, Math.max(0, entity.hitFlash / 0.10));
    const r = Math.max(4, radius || entity.radius || 10);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35 + strength * 0.45;
    ctx.fillStyle = 'rgba(255, 42, 75, 0.24)';
    ctx.strokeStyle = '#ff2a4b';
    ctx.lineWidth = 2.5 + strength * 1.5;
    ctx.shadowColor = '#ff2a4b';
    ctx.shadowBlur = 8 + strength * 10;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return true;
  };
  // Luminancia relativa (0..1) de un hex #rgb/#rrggbb. Base del contraste
  // adaptativo de ojos/auras: acentos claros (blanco, amarillos, cianes claros)
  // necesitan esclera oscura y aura negra más fuerte para leerse sobre el fondo.
  let colorLuminanceCache = Object.create(null);
  let colorLuminanceCacheSize = 0;
  const COLOR_LUMINANCE_CACHE_LIMIT = 32;
  function luminance(hex) {
    const color = hex || '#ffffff';
    if (colorLuminanceCache[color] !== undefined) return colorLuminanceCache[color];
    const rgb = hexToRgb(color);
    const value = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    if (colorLuminanceCacheSize >= COLOR_LUMINANCE_CACHE_LIMIT) {
      colorLuminanceCache = Object.create(null);
      colorLuminanceCacheSize = 0;
    }
    colorLuminanceCache[color] = value;
    colorLuminanceCacheSize++;
    return value;
  }
  function resolveProfile(e) {
    if (e.isElite) {
      const vid = e.visualId || 'elite_base';
      const ep = ELITE_PROFILES[vid] || ELITE_PROFILES.elite_base;
      const baseId = PROFILES[e.enemyTypeId] ? e.enemyTypeId : 'drone';
      const cacheKey = baseId + '|' + vid;
      if (!RESOLVED_ELITE_PROFILES[cacheKey]) {
        RESOLVED_ELITE_PROFILES[cacheKey] = Object.assign({}, PROFILES[baseId], ep, { elite: true, eliteVisualId: vid });
      }
      return RESOLVED_ELITE_PROFILES[cacheKey];
    }
    if (e.enemyTypeId === 'boss_minion' && e.summonVariant === 'mutant') return MUTANT_CLONE_PROFILE;
    return PROFILES[e.enemyTypeId] || PROFILES.drone;
  }
  function drawBody(ctx, e, frame, profile) {
    const r = e.radius * (profile.radiusMul || 1);
    const time = frame * 0.06;
    const pulse = 1 + Math.sin(time * (profile.pulseRate || 1)) * (profile.pulseAmt || 0.05);
    const glowR = r * 1.9;
    const grd = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, glowR);
    grd.addColorStop(0, rgba(hexToRgb(profile.glow), 0.28));
    grd.addColorStop(0.5, rgba(hexToRgb(profile.glow), 0.1));
    grd.addColorStop(1, rgba(hexToRgb(profile.glow), 0));
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (profile.stretch) ctx.scale(profile.stretch, 1);
    ctx.fillStyle = rgba(hexToRgb(profile.body), 0.85);
    const spikes = profile.spikes;
    const innerR = r * (profile.innerRatio || 0.6);
    const spikeLen = r * (profile.spikeLen || 0.3);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + hash01(e, i) * 0.2;
      const isPeak = i % 2 === 0;
      const rad = isPeak ? (innerR + spikeLen) * pulse : innerR * 0.95;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    const bodyRgb = hexToRgb(profile.body);
    ctx.fillStyle = rgba(bodyRgb, 0.7);
    for (let i = 0; i < (profile.particles || 0); i++) {
      const seed = hash01(e, 100 + i);
      const orbitR = r * (1.3 + seed * 0.6);
      const a = time * (0.3 + seed * 0.5) + seed * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, (profile.particleSize || 0.4) * (0.5 + seed), 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawEyes(ctx, e, player, profile) {
    if (!player) return;
    const r = e.radius * (profile.radiusMul || 1);
    const fwd = Math.atan2(player.y - e.y, player.x - e.x);
    const eyeR = Math.max(1.4, r * 0.17);
    const sep = r * 0.32;
    const pupil = profile.elite ? '#ff2222' : '#10131c';
    if (profile.eyeStyle === 'single') {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(Math.cos(fwd) * eyeR * 0.4, Math.sin(fwd) * eyeR * 0.4, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (profile.eyeStyle === 'narrow') {
      for (const side of [-1, 1]) {
        const ex = side * sep * 0.45, ey = -r * 0.08;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, eyeR * 0.7, eyeR * 0.45, fwd, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(ex + Math.cos(fwd) * eyeR * 0.3, ey + Math.sin(fwd) * eyeR * 0.3, eyeR * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (profile.eyeStyle === 'asymmetric') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-sep * 0.3, -r * 0.05, eyeR * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sep * 0.4, -r * 0.02, eyeR * 1.0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pupil;
      ctx.beginPath(); ctx.arc(-sep * 0.3 + Math.cos(fwd) * eyeR * 0.3, -r * 0.05 + Math.sin(fwd) * eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sep * 0.4 + Math.cos(fwd) * eyeR * 0.4, -r * 0.02 + Math.sin(fwd) * eyeR * 0.4, eyeR * 0.45, 0, Math.PI * 2); ctx.fill();
    } else {
      for (const side of [-1, 1]) {
        const ex = side * sep * 0.5, ey = -r * 0.05;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(ex + Math.cos(fwd) * eyeR * 0.45, ey + Math.sin(fwd) * eyeR * 0.45, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function drawEliteEffects(ctx, e, frame, profile) {
    if (!profile.elite) return;
    const r = e.radius * (profile.radiusMul || 1);
    const time = frame * 0.06;
    // Efecto de estela (velocity, swift): partículas alargadas detrás
    if (profile.trailEffect || profile.ultraTrail) {
      const count = profile.ultraTrail ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const seed = hash01(e, 200 + i);
        const dist = r * (0.8 + i * 0.3);
        const a = time * 2 + seed * Math.PI * 2;
        const trailR = (profile.particleSize || 0.4) * (1 - i / count) * 0.6;
        ctx.globalAlpha = (1 - i / count) * 0.5;
        ctx.fillStyle = profile.glow;
        ctx.beginPath(); ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, trailR, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Anillo de armadura (bulwark): segmentos rotativos
    if (profile.armorRing) {
      ctx.strokeStyle = profile.haloColor;
      ctx.lineWidth = 2;
      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2 + time * 0.5;
        const a1 = a0 + (Math.PI / segments) * 0.7;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(0, 0, r + 12, a0, a1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Apariencia fantasmal (phantom): pulsación de opacidad extra
    if (profile.ghostly) {
      ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.3;
      ctx.fillStyle = rgba(hexToRgb(profile.body), 0.15);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Masivo (titan): aura expansiva lenta
    if (profile.massive) {
      const expand = 0.8 + Math.sin(time * 0.5) * 0.2;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = profile.glow;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.8 * expand, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Núcleo vacío (elite_specter_void): orbe oscuro central con anillo pulsante
    if (profile.voidCore) {
      const vp = 0.5 + Math.sin(time * 2.5) * 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4 * vp, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55 * vp, 0, Math.PI * 2); ctx.stroke();
    }
    // Distorsión de fase (elite_specter_void): arcos espectrales rotativos
    if (profile.phaseEffect) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = time * 2 + i * Math.PI * 0.66;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * (0.8 + i * 0.2), a, a + Math.PI); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  // Extras visuales para enemigos base espectrales (cannonGlow, shieldAura).
  function drawProfileExtras(ctx, e, frame, profile) {
    const r = e.radius * (profile.radiusMul || 1);
    const time = frame * 0.06;
    if (profile.cannonGlow) {
      const a = time * 1.5;
      const gx = Math.cos(a) * r * 0.7, gy = Math.sin(a) * r * 0.7;
      ctx.fillStyle = rgba(hexToRgb(profile.glow), 0.9);
      ctx.beginPath(); ctx.arc(gx, gy, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(hexToRgb(profile.core), 0.7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(gx, gy, r * 0.45, 0, Math.PI * 2); ctx.stroke();
    }
    if (profile.shieldAura) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 2) * 0.15;
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function isLabSpecter(e) {
    if (!e) return false;
    const id = e.enemyTypeId || e.id || e.typeId || e.visualId;
    return Object.prototype.hasOwnProperty.call(LAB_SPECTER_IDS, id);
  }
  function labPoseIndex(e) {
    const id = e.enemyTypeId || e.id || e.typeId || e.visualId;
    return LAB_SPECTER_IDS[id] || 0;
  }
  function isHydraFamily(e) {
    return !!(e && !e.dead && isLabSpecter(e) && labPoseIndex(e) === 5);
  }
  function graphicsPolicy() {
    return NV.getGraphicsPolicy ? NV.getGraphicsPolicy() : { quality: 'high', particles: true, heavyVfx: true, hydraFullBudget: Infinity };
  }
  NV.isHydraEnemyFamily = isHydraFamily;
  NV.setHydraDiagnosticMode = function (mode) {
    const next = String(mode == null ? '' : mode).trim().toLowerCase();
    if (HYDRA_DIAGNOSTIC_MODES.indexOf(next) < 0) return hydraDiagnosticMode;
    hydraDiagnosticMode = next;
    return hydraDiagnosticMode;
  };
  NV.getHydraDiagnosticMode = function () { return hydraDiagnosticMode; };
  NV.prepareEnemyVisualBudget = function (enemies, player) {
    const policy = graphicsPolicy();
    activeGraphicsPolicy = policy;
    hydraFullRender = new WeakSet();
    hydraMediumRender = new WeakSet();
    visualBudgetPrepared = true;
    hydraCandidates.length = 0;
    for (const e of enemies || []) if (isHydraFamily(e)) hydraCandidates.push(e);
    let budget = Math.max(0, policy.hydraFullBudget == null ? Infinity : policy.hydraFullBudget);
    // P2 visual budget: intersecta el presupuesto de settings con el tier runtime.
    // SOLO recorta modelos completos (decorativo); nunca toca gameplay.
    activeVisualBudget = (NV.getVisualBudget && typeof NV.getVisualBudget === 'function') ? NV.getVisualBudget() : null;
    const total = hydraCandidates.length;
    const preference = activeVisualBudget ? activeVisualBudget.preference : policy.quality;
    const tier = activeVisualBudget ? activeVisualBudget.tier : 'full';
    let fullCount = total, mediumCount = 0;
    if (!activeVisualBudget) {
      fullCount = budget === Infinity ? total : Math.min(total, budget);
    } else if (activeVisualBudget.spectralDetail <= 0) {
      fullCount = 0;
    } else if (preference === 'high' && tier === 'full') {
      fullCount = total;
    } else if (preference === 'auto' && tier === 'full') {
      fullCount = Math.min(total, 3);
      mediumCount = Math.min(Math.max(0, total - fullCount), 2);
    } else {
      fullCount = Math.min(total, Math.max(1, Math.ceil(total * 0.25)));
      mediumCount = Math.min(Math.max(0, total - fullCount), Math.max(1, Math.ceil(total * 0.25)));
    }
    if (budget !== Infinity) fullCount = Math.min(fullCount, budget);
    mediumCount = Math.min(mediumCount, Math.max(0, total - fullCount));
    if ((fullCount + mediumCount) < total && player) {
      hydraCandidates.sort((a, b) => {
        const adx = a.x - player.x, ady = a.y - player.y;
        const bdx = b.x - player.x, bdy = b.y - player.y;
        const delta = (adx * adx + ady * ady) - (bdx * bdx + bdy * bdy);
        return delta || (a.x - b.x) || (a.y - b.y);
      });
    }
    for (let i = 0; i < fullCount; i++) hydraFullRender.add(hydraCandidates[i]);
    for (let i = fullCount; i < fullCount + mediumCount; i++) hydraMediumRender.add(hydraCandidates[i]);
    visualBudgetStats = {
      family: 'lab_model_5_hydra',
      total,
      full: fullCount,
      medium: mediumCount,
      simplified: total - fullCount - mediumCount,
      budget,
    };
    return visualBudgetStats;
  };
  NV.getEnemyVisualBudgetStats = function () { return Object.assign({}, visualBudgetStats); };
  function labBlobShadow(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,0,32,' + a + ')');
    g.addColorStop(1, 'rgba(255,0,32,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function drawLabEye(ctx, cx, cy, side, rage, lookX, lookY, eyeScale, extraAngle, eyeStyle) {
    const lx = Math.max(-1.6, Math.min(1.6, lookX * 0.006));
    const ly = Math.max(-1.2, Math.min(1.2, lookY * 0.005));
    const sx = 10.5 * eyeScale;
    const sy = 18.5 * eyeScale;
    ctx.save();
    ctx.translate(cx + lx, cy + ly);
    ctx.rotate(side * (0.055 + rage * 0.028) + extraAngle * 0.18);
    labBlobShadow(ctx, 0, 0, 30 * eyeScale, 0.29);
    ctx.save();
    ctx.shadowColor = 'rgba(255,0,28,.85)';
    ctx.shadowBlur = 10 * eyeScale;
    ctx.fillStyle = '#ff1024';
    ctx.strokeStyle = '#ff1024';
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (eyeStyle % 6) {
      case 0:
        ctx.moveTo(0, -sy); ctx.lineTo(sx * .23, -sy * .30); ctx.lineTo(sx, 0); ctx.lineTo(sx * .23, sy * .30); ctx.lineTo(0, sy); ctx.lineTo(-sx * .23, sy * .30); ctx.lineTo(-sx, 0); ctx.lineTo(-sx * .23, -sy * .30); break;
      case 1:
        ctx.moveTo(0, -sy * 1.08); ctx.lineTo(sx * .32, -sy * .18); ctx.lineTo(sx * .82, sy * .02); ctx.lineTo(sx * .30, sy * .18); ctx.lineTo(0, sy * 1.02); ctx.lineTo(-sx * .18, sy * .22); ctx.lineTo(-sx * .72, 0); ctx.lineTo(-sx * .20, -sy * .22); break;
      case 2:
        ctx.moveTo(0, -sy * .92); ctx.lineTo(sx * .88, -sy * .10); ctx.lineTo(sx * .30, 0); ctx.lineTo(sx * .92, sy * .18); ctx.lineTo(0, sy * .92); ctx.lineTo(-sx * .88, sy * .15); ctx.lineTo(-sx * .30, 0); ctx.lineTo(-sx * .88, -sy * .12); break;
      case 3:
        ctx.moveTo(-sx * .10, -sy); ctx.lineTo(sx * .20, -sy * .28); ctx.lineTo(sx * 1.05, -sy * .08); ctx.lineTo(sx * .32, sy * .22); ctx.lineTo(sx * .10, sy); ctx.lineTo(-sx * .18, sy * .26); ctx.lineTo(-sx * .92, sy * .04); ctx.lineTo(-sx * .28, -sy * .20); break;
      case 4:
        ctx.moveTo(0, -sy); ctx.lineTo(sx * .22, -sy * .26); ctx.lineTo(sx * .92, -sy * .04); ctx.lineTo(sx * .38, sy * .10); ctx.lineTo(sx * .68, sy * .42); ctx.lineTo(0, sy * .98); ctx.lineTo(-sx * .18, sy * .28); ctx.lineTo(-sx * .92, 0); ctx.lineTo(-sx * .24, -sy * .22); break;
      case 5:
        ctx.moveTo(0, -sy); ctx.lineTo(sx * .72, -sy * .22); ctx.lineTo(sx * .22, 0); ctx.lineTo(sx * .78, sy * .18); ctx.lineTo(0, sy); ctx.lineTo(-sx * .78, sy * .18); ctx.lineTo(-sx * .22, 0); ctx.lineTo(-sx * .72, -sy * .22); break;
      // Elites: versiones mutadas/recargadas del mismo idioma visual.
      case 6: // Crown shard
        ctx.moveTo(0, -sy * 1.18); ctx.lineTo(sx * .18, -sy * .54); ctx.lineTo(sx * .58, -sy * .22); ctx.lineTo(sx, 0); ctx.lineTo(sx * .26, sy * .28); ctx.lineTo(0, sy * 1.02); ctx.lineTo(-sx * .26, sy * .28); ctx.lineTo(-sx, 0); ctx.lineTo(-sx * .58, -sy * .22); ctx.lineTo(-sx * .18, -sy * .54); break;
      case 7: // Twin barb lance
        ctx.moveTo(0, -sy * 1.12); ctx.lineTo(sx * .36, -sy * .38); ctx.lineTo(sx * .92, -sy * .08); ctx.lineTo(sx * .34, sy * .04); ctx.lineTo(sx * .74, sy * .30); ctx.lineTo(0, sy * .98); ctx.lineTo(-sx * .74, sy * .30); ctx.lineTo(-sx * .34, sy * .04); ctx.lineTo(-sx * .92, -sy * .08); ctx.lineTo(-sx * .36, -sy * .38); break;
      case 8: // Tyrant diamond
        ctx.moveTo(0, -sy); ctx.lineTo(sx * .50, -sy * .50); ctx.lineTo(sx * 1.06, -sy * .06); ctx.lineTo(sx * .48, 0); ctx.lineTo(sx * .96, sy * .30); ctx.lineTo(0, sy); ctx.lineTo(-sx * .96, sy * .30); ctx.lineTo(-sx * .48, 0); ctx.lineTo(-sx * 1.06, -sy * .06); ctx.lineTo(-sx * .50, -sy * .50); break;
      case 9: // Abyss fork
        ctx.moveTo(0, -sy * 1.14); ctx.lineTo(sx * .18, -sy * .52); ctx.lineTo(sx * .84, -sy * .18); ctx.lineTo(sx * .28, sy * .02); ctx.lineTo(sx * .46, sy * .40); ctx.lineTo(0, sy * .80); ctx.lineTo(-sx * .46, sy * .40); ctx.lineTo(-sx * .28, sy * .02); ctx.lineTo(-sx * .84, -sy * .18); ctx.lineTo(-sx * .18, -sy * .52); break;
      case 10: // Rift hourglass
        ctx.moveTo(0, -sy * 1.06); ctx.lineTo(sx * .84, -sy * .24); ctx.lineTo(sx * .30, -sy * .02); ctx.lineTo(sx * .62, sy * .22); ctx.lineTo(0, sy * 1.02); ctx.lineTo(-sx * .62, sy * .22); ctx.lineTo(-sx * .30, -sy * .02); ctx.lineTo(-sx * .84, -sy * .24); break;
      case 11: // Warlord star
        ctx.moveTo(0, -sy * 1.16); ctx.lineTo(sx * .30, -sy * .44); ctx.lineTo(sx * .98, -sy * .12); ctx.lineTo(sx * .40, sy * .16); ctx.lineTo(sx * .16, sy); ctx.lineTo(0, sy * .70); ctx.lineTo(-sx * .16, sy); ctx.lineTo(-sx * .40, sy * .16); ctx.lineTo(-sx * .98, -sy * .12); ctx.lineTo(-sx * .30, -sy * .44); break;
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.82)';
    ctx.beginPath();
    switch (eyeStyle % 6) {
      case 1: ctx.moveTo(0, -sy * .52); ctx.lineTo(sx * .10, 0); ctx.lineTo(0, sy * .50); ctx.lineTo(-sx * .10, 0); break;
      case 2: ctx.moveTo(0, -sy * .32); ctx.lineTo(sx * .22, 0); ctx.lineTo(0, sy * .32); ctx.lineTo(-sx * .22, 0); break;
      case 3: ctx.moveTo(-sx * .04, -sy * .38); ctx.lineTo(sx * .18, 0); ctx.lineTo(sx * .03, sy * .40); ctx.lineTo(-sx * .16, 0); break;
      case 4: ctx.moveTo(0, -sy * .42); ctx.lineTo(sx * .12, -sy * .02); ctx.lineTo(-sx * .03, sy * .43); ctx.lineTo(-sx * .14, 0); break;
      case 5: ctx.moveTo(0, -sy * .38); ctx.lineTo(sx * .20, 0); ctx.lineTo(0, sy * .38); ctx.lineTo(-sx * .20, 0); break;
      case 6: ctx.moveTo(0, -sy * .52); ctx.lineTo(sx * .10, -sy * .08); ctx.lineTo(sx * .05, sy * .42); ctx.lineTo(-sx * .05, sy * .42); ctx.lineTo(-sx * .10, -sy * .08); break;
      case 7: ctx.moveTo(0, -sy * .44); ctx.lineTo(sx * .18, -sy * .02); ctx.lineTo(0, sy * .50); ctx.lineTo(-sx * .18, -sy * .02); break;
      case 8: ctx.moveTo(0, -sy * .34); ctx.lineTo(sx * .26, 0); ctx.lineTo(0, sy * .34); ctx.lineTo(-sx * .26, 0); break;
      case 9: ctx.moveTo(0, -sy * .46); ctx.lineTo(sx * .12, .5); ctx.lineTo(0, sy * .28); ctx.lineTo(-sx * .12, .5); break;
      case 10: ctx.moveTo(0, -sy * .36); ctx.lineTo(sx * .18, -sy * .02); ctx.lineTo(0, sy * .40); ctx.lineTo(-sx * .18, -sy * .02); break;
      case 11: ctx.moveTo(0, -sy * .50); ctx.lineTo(sx * .11, -sy * .10); ctx.lineTo(sx * .03, sy * .46); ctx.lineTo(-sx * .03, sy * .46); ctx.lineTo(-sx * .11, -sy * .10); break;
      default: ctx.moveTo(0, -sy * .40); ctx.lineTo(sx * .14, 0); ctx.lineTo(0, sy * .40); ctx.lineTo(-sx * .14, 0); break;
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,135,145,.78)';
    ctx.beginPath(); ctx.arc(0, 0, 1.25 * eyeScale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawLabMouth(ctx, type, y) {
    ctx.save();
    ctx.translate(0, y);
    labBlobShadow(ctx, 0, 2, 36, 0.20);
    if (type === 2 || type === 3) {
      const w = type === 3 ? 17 : 14;
      const h = type === 3 ? 24 : 20;
      ctx.fillStyle = '#ff111c';
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.bezierCurveTo(w * .95, -h * .82, w * 1.05, h * .15, w * .20, h);
      ctx.bezierCurveTo(w * .06, h * 1.04, -w * .08, h * 1.04, -w * .24, h);
      ctx.bezierCurveTo(-w * 1.06, h * .10, -w * .94, -h * .82, 0, -h);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,0,8,.38)';
      ctx.beginPath();
      ctx.moveTo(0, -h * .56);
      ctx.bezierCurveTo(w * .42, -h * .42, w * .50, h * .04, w * .12, h * .52);
      ctx.bezierCurveTo(0, h * .60, -w * .14, h * .58, -w * .20, h * .52);
      ctx.bezierCurveTo(-w * .52, h * .04, -w * .44, -h * .42, 0, -h * .56);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#ff111c';
    ctx.beginPath();
    ctx.moveTo(-30, -8); ctx.lineTo(-22, 2); ctx.lineTo(-15, -6); ctx.lineTo(-7, 6);
    ctx.lineTo(1, -4); ctx.lineTo(9, 7); ctx.lineTo(17, -4); ctx.lineTo(24, 4);
    ctx.lineTo(31, -8); ctx.lineTo(28, 10); ctx.lineTo(20, 3); ctx.lineTo(12, 14);
    ctx.lineTo(3, 5); ctx.lineTo(-6, 15); ctx.lineTo(-14, 4); ctx.lineTo(-23, 13);
    ctx.closePath(); ctx.fill();
    if (type === 1) {
      ctx.globalAlpha = .94;
      ctx.beginPath();
      ctx.moveTo(-20, -12); ctx.lineTo(-12, -2); ctx.lineTo(-4, -13); ctx.lineTo(3, -2);
      ctx.lineTo(11, -12); ctx.lineTo(18, -2); ctx.lineTo(24, -13); ctx.lineTo(23, -1);
      ctx.lineTo(15, 6); ctx.lineTo(8, -3); ctx.lineTo(0, 7); ctx.lineTo(-8, -3);
      ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // Perf-02: smoothstep hoisted (antes se recreaba por llamada) + pool de
  // buffers reutilizables. buildLabTail corre por cola por frame por enemigo:
  // con 80 enemigos llegaba a ~miles de sub-arrays asignados por frame (presión
  // de GC / micro-hitching). El pool rota slots pre-asignados al máximo de
  // muestras; los consumidores leen solo índices [0..samples] de forma
  // síncrona (glow y contorno del MISMO frame), así que la reutilización es
  // segura. Muestras reducidas 40->24 (no élites) y 88->48 (élites): a la
  // escala de render (radius/54) la diferencia de silueta es imperceptible.
  const TAIL_MAX_SAMPLES = 48;
  const TAIL_POOL = [];
  for (let i = 0; i < 4; i++) {
    const centers = [], left = [], right = [];
    for (let j = 0; j <= TAIL_MAX_SAMPLES; j++) { centers.push([0, 0]); left.push([0, 0]); right.push([0, 0]); }
    TAIL_POOL.push({ centers, left, right, elite: false, count: 0 });
  }
  let tailPoolIdx = 0;
  function tailSmoothstep(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function buildLabTail(startX, startY, p, t, seed) {
    const slot = TAIL_POOL[tailPoolIdx++ % TAIL_POOL.length];
    const centers = slot.centers, left = slot.left, right = slot.right;
    const len = 118 * (p.tailLen || 1);
    const dir = p.tailDir || 1;
    const amp = 17 * (p.tailAmp || .5);
    const samples = p.elite ? 48 : 24;
    // count lógico: los consumidores iteran [0..count) en vez de array.length
    // (los buffers del pool NUNCA se re-dimensionan: truncar+extender crea
    // agujeros undefined y crashea el draw).
    slot.count = samples + 1;
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const motion = tailSmoothstep((u - .10) / .90);
      const baseS = dir * amp * (.33 * Math.sin(u * Math.PI * 1.18) - .23 * Math.sin(u * Math.PI * 2.05));
      const liveWave = motion * (
        Math.sin(t * 5.4 - u * 8.2 + seed) * (3.0 + 6.5 * u) +
        Math.sin(t * 8.6 - u * 13.4 + seed * 1.37) * (1.0 + 2.4 * u) +
        Math.sin(t * 12.2 - u * 18.0 + seed * .73) * (0.25 + 0.9 * u)
      );
      const c = centers[i];
      c[0] = startX + baseS + liveWave;
      c[1] = startY + len * u;
    }
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const prev = centers[i > 0 ? i - 1 : 0], next = centers[i < samples ? i + 1 : samples];
      const dx = next[0] - prev[0], dy = next[1] - prev[1];
      const mag = Math.hypot(dx, dy) || 1;
      const nx = -dy / mag, ny = dx / mag;
      const taper = tailSmoothstep(u);
      const width = 27 * (1 - taper) + .48 * taper;
      const c = centers[i], lv = left[i], rv = right[i];
      lv[0] = c[0] + nx * width; lv[1] = c[1] + ny * width;
      rv[0] = c[0] - nx * width; rv[1] = c[1] - ny * width;
    }
    slot.elite = !!p.elite;
    return slot;
  }
  // --- Estilo líquido "hand-drawn" (de enemy-visual-lab) para espectros y élites ---
  // Funciones del lab: ojos con look-at, blobs orgánicos agitados y partículas
  // flotantes. La animación de producción usa ondas deterministas para evitar
  // Math.random en el hot path sin congelar la identidad líquida.
  // El tiempo avanza time += 0.03 por frame (igual que enemy-visual-lab.html).
  function drawLabEyes(ctx, eyeX, eyeY, targetX, targetY, count = 1, eyeScale = 1, time = 0, colorGlow = '#ff2a4b', eyeDetail, accentLumOverride) {
    // Contraste adaptativo del ojo según la luminancia del acento del enemigo:
    //  - Acento MUY claro (blanco/amarillo/cian claro, lum>0.78): esclera oscura
    //    #0d0d12 + pupila clara (la esclera blanca desaparecería contra el cuerpo).
    //  - Acento medio claro (lum>0.55): esclera blanca + contorno oscuro de 2px.
    //  - Acento oscuro (rojo estándar): esclera blanca clásica.
    // La pupila SIEMPRE contrasta contra su esclera (oscura↔clara).
    const accentLum = accentLumOverride == null ? luminance(colorGlow || '#ff2a4b') : accentLumOverride;
    const darkSclera = accentLum > 0.78;
    const scleraFill = darkSclera ? '#0d0d12' : '#ffffff';
    const scleraStroke = (!darkSclera && accentLum > 0.55) ? 'rgba(6, 8, 16, 0.9)' : null;
    const pupilFill = colorGlow || '#ff2a4b';
    const simplified = eyeDetail === true || !!(eyeDetail && eyeDetail.simplified);
    const deterministic = !!(eyeDetail && eyeDetail.deterministicEyes);
    const fauxGlow = !!(eyeDetail && eyeDetail.eyeFauxGlow);

    ctx.save();
    ctx.translate(eyeX, eyeY);

    const dx = targetX - eyeX;
    const dy = targetY - eyeY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(6 * eyeScale, Math.hypot(dx, dy) * 0.05);

    const offsetX = Math.cos(angle) * dist;
    const offsetY = Math.sin(angle) * dist;
    const eyeSpacing = 16 * eyeScale;

    for (let i = 0; i < count; i++) {
      const posX = count === 1 ? 0 : (i === 0 ? -eyeSpacing / 2 : eyeSpacing / 2);
      const posY = count === 3 && i === 2 ? -eyeSpacing * 0.7 : 0;

      const jitter = simplified ? 0 : deterministic
        ? Math.sin(time * 17 + i * 2.37) * 0.72
        : (Math.random() - 0.5) * 1.5;
      const eyeRadius = Math.max(1, (8 * eyeScale) + Math.sin(time * 15 + i) * 1);

      // El renderer anterior daba a la esclera un shadowBlur=10. El halo
      // concéntrico recupera su volumen/contraste sin el coste raster del blur.
      if (fauxGlow) {
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(posX + jitter, posY + jitter, eyeRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = colorGlow;
        ctx.fill();
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.arc(posX + jitter, posY + jitter, eyeRadius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Esclera (relleno adaptativo + contorno oscuro en luminancia media).
      ctx.beginPath();
      ctx.arc(posX + jitter, posY + jitter, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = scleraFill;
      ctx.shadowColor = colorGlow;
      ctx.shadowBlur = fauxGlow || simplified ? 0 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (scleraStroke) {
        ctx.strokeStyle = scleraStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pupila líquida (siempre de alto contraste contra la esclera)
      ctx.beginPath();
      ctx.arc(posX + offsetX + jitter, posY + offsetY + jitter, Math.max(0.5, eyeRadius * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = pupilFill;
      ctx.fill();

      // Brillo de pupila (atenuado sobre esclera oscura para no quemar el ojo)
      ctx.globalAlpha = darkSclera ? 0.55 : 1;
      ctx.beginPath();
      ctx.arc(posX + offsetX - 1.5 + jitter, posY + offsetY - 1.5 + jitter, Math.max(0.2, eyeRadius * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawHandDrawnLiquidBlob(ctx, cx, cy, radius, pointsCount, noiseAmp, speedMult, seed, colorGlow = '#ff2a4b', time = 0, detail, auraLumOverride) {
    const simplified = detail === true || !!(detail && detail.simplified);
    const jitterScale = detail && typeof detail.jitterScale === 'number' ? detail.jitterScale : (simplified ? 0 : 1);
    const secondaryInk = detail && typeof detail.secondaryInk === 'boolean' ? detail.secondaryInk : !simplified;
    const glowBlur = detail && typeof detail.glowBlur === 'number' ? detail.glowBlur : (simplified ? 0 : 12);
    const fauxGlow = !!(detail && detail.fauxGlow);
    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    const angles = BLOB_ANGLES[pointsCount];
    const phase1 = time * 12 * speedMult + seed;
    const phase2 = -time * 18 * speedMult + seed * 2;
    const sinP1 = Math.sin(phase1), cosP1 = Math.cos(phase1);
    const sinP2 = Math.sin(phase2), cosP2 = Math.cos(phase2);
    for (let i = 0; i <= pointsCount; i++) {
      const point = angles[i];
      const n1 = point.sin4 * cosP1 + point.cos4 * sinP1;
      const n2 = point.cos7 * cosP2 - point.sin7 * sinP2;
      const jitter = jitterScale > 0 ? (Math.random() - 0.5) * 2 * jitterScale : 0;
      const r = radius + (n1 + n2 * 0.5) * noiseAmp + jitter;
      const x = point.cos * r;
      const y = point.sin * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.fillStyle = '#08080e';
    ctx.fill();

    // Aura oscura adaptativa bajo el trazo de color: preserva la silueta del
    // blob sobre fondos brillantes o elementos luminosos del mapa. A mayor
    // luminancia del acento, más fuerte y ancha la halo negra exterior.
    const auraLum = auraLumOverride == null ? luminance(colorGlow || '#ff2a4b') : auraLumOverride;
    if (!simplified) {
      ctx.save();
      ctx.strokeStyle = 'rgba(2, 3, 8, ' + (0.45 + Math.max(0, auraLum - 0.35) * 0.45).toFixed(2) + ')';
      ctx.lineWidth = 7 + auraLum * 3;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }

    const crispWidth = 2.5 + Math.sin(time * 20 + seed) * 1;
    if (fauxGlow) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = crispWidth + 5;
      ctx.strokeStyle = colorGlow;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = crispWidth;
    ctx.strokeStyle = colorGlow;
    ctx.shadowColor = colorGlow;
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!secondaryInk) { ctx.restore(); return; }
    // Tinta secundaria suelta
    ctx.beginPath();
    for (let i = 0; i <= pointsCount / 2; i++) {
      const angle = (i / (pointsCount / 2)) * Math.PI * 2 + time * 2;
      const r = (radius * 0.6) + Math.sin(angle * 3 + time * 15) * (noiseAmp * 0.5);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
  function drawLiquidParticles(ctx, cx, cy, count, radiusSpread, seed, colorGlow = '#ff2a4b', time = 0, fauxGlow = false) {
    ctx.save();
    ctx.fillStyle = colorGlow;
    ctx.shadowColor = colorGlow;
    ctx.shadowBlur = fauxGlow ? 0 : 8;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const pAngle = (i / count) * Math.PI * 2 + time * 3 + seed;
      const dist = radiusSpread + Math.sin(time * 10 + i + seed) * 15;
      const px = cx + Math.cos(pAngle) * dist;
      const py = cy + Math.sin(pAngle) * dist + Math.cos(time * 15 + i) * 5;
      const pSize = Math.max(1, 3 + Math.sin(time * 25 + i) * 2);
      ctx.moveTo(px + pSize, py);
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
    }
    if (fauxGlow) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 4;
      ctx.strokeStyle = colorGlow;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  function drawHydraSimplified(ctx, cx, cy, targetX, targetY, time, enemyColor, auraLum) {
    // LOD esencial: conserva la misma silueta de cuatro lóbulos líquidos que la
    // Hidra full y la misma fase de animación, pero omite jitter aleatorio,
    // partículas, aura negra ancha y shadowBlur. No crea un render pass nuevo.
    for (const lobe of HYDRA_LOBES) {
      drawHandDrawnLiquidBlob(
        ctx,
        cx + lobe.x,
        cy + lobe.y,
        lobe.radius,
        lobe.points,
        lobe.noise,
        lobe.speed,
        lobe.seed,
        enemyColor,
        time,
        true,
        auraLum
      );
    }

    // Capa interior animada barata: un único contorno orgánico sin glow ni
    // partículas. Evita que el cuerpo reducido se lea como círculos separados.
    ctx.save();
    ctx.translate(cx, cy - 10);
    ctx.beginPath();
    const innerPoints = 10;
    for (let i = 0; i <= innerPoints; i++) {
      const angle = (i / innerPoints) * Math.PI * 2;
      const wave = Math.sin(angle * 3 + time * 12) * 2.8 + Math.cos(angle * 5 - time * 9) * 1.4;
      const radius = 25 + wave;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();

    drawLabEyes(ctx, cx, cy - 12, targetX, targetY, 3, 0.82, time, enemyColor, DETAIL_SIMPLE, auraLum);
  }
  // ===== ESPECTRO LEGACY (shape 'specter') -> Modelo RB2 (Ameba Coronada) =====
  // Identidad visual distintiva y reconocible en oleadas 16/17: color carmesí/orange
  // #FF3300 y escala 0.75 (tabla de tamaños). Reemplaza al renderer Three.js legacy.
  const SPECTER_LITE_COLOR = '#FF3300';
  const SPECTER_LITE_SCALE = 0.75;
  function renderSpecterLite2D(ctx, enemy, playerPos, currentTime) {
    const targetX = (playerPos && playerPos.x) || enemy.x;
    const targetY = (playerPos && playerPos.y) || enemy.y;
    const color = enemy.color || SPECTER_LITE_COLOR;
    drawLabEnemyModel(
      ctx,
      1,            // RB2 - Ameba Coronada
      enemy.x,
      enemy.y,
      SPECTER_LITE_SCALE,
      targetX,
      targetY,
      currentTime || 0,
      color
    );
  }
  function drawLabEnemyModel(ctx, modelIndex, cx, cy, scale = 1, targetX = cx, targetY = cy, time = 0, enemyColor = '#ff2a4b', detail) {
    ctx.save();
    ctx.scale(scale, scale);
    const adjCx = cx / scale;
    const adjCy = cy / scale;
    const adjTx = targetX / scale;
    const adjTy = targetY / scale;
    const accentLum = luminance(enemyColor);
    const particleFauxGlow = !!(detail && detail.particleFauxGlow);

    switch (modelIndex % 6) {
      case 0: // RB1 - Proto-Nodo Líquido
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy, 35, 12, 8, 1.2, 10, enemyColor, time, detail, accentLum);
        if (!detail || detail.particles !== false) drawLiquidParticles(ctx, adjCx, adjCy, 4, 45, 10, enemyColor, time, particleFauxGlow);
        drawLabEyes(ctx, adjCx, adjCy, adjTx, adjTy, 1, 1, time, enemyColor, detail, accentLum);
        break;
      case 1: // RB2 - Ameba Coronada
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy - 30, 18, 8, 10, 1.8, 20, enemyColor, time, detail, accentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy + 5, 40, 14, 10, 1.0, 25, enemyColor, time, detail, accentLum);
        if (!detail || detail.particles !== false) drawLiquidParticles(ctx, adjCx, adjCy, 6, 52, 20, enemyColor, time, particleFauxGlow);
        drawLabEyes(ctx, adjCx, adjCy - 5, adjTx, adjTy, 2, 0.9, time, enemyColor, detail, accentLum);
        break;
      case 2: // RB3 - Viscera Manto
        drawHandDrawnLiquidBlob(ctx, adjCx - 25, adjCy + 15, 28, 10, 12, 1.6, 30, enemyColor, time, detail, accentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx + 25, adjCy + 15, 28, 10, 12, 1.6, 32, enemyColor, time, detail, accentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy - 5, 38, 14, 8, 1.2, 35, enemyColor, time, detail, accentLum);
        if (!detail || detail.particles !== false) drawLiquidParticles(ctx, adjCx, adjCy, 6, 58, 30, enemyColor, time, particleFauxGlow);
        drawLabEyes(ctx, adjCx, adjCy - 8, adjTx, adjTy, 1, 1.2, time, enemyColor, detail, accentLum);
        break;
      case 3: // RB4 - Halo Espectral
        ctx.save();
        ctx.beginPath();
        ctx.arc(adjCx, adjCy, 55 + Math.sin(time * 20) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = enemyColor;
        ctx.lineWidth = 2;
        if (ctx.setLineDash) ctx.setLineDash([6, 6]);
        ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.restore();
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy, 38, 16, 9, 1.3, 40, enemyColor, time, detail, accentLum);
        if (!detail || detail.particles !== false) drawLiquidParticles(ctx, adjCx, adjCy, 8, 65, 40, enemyColor, time, particleFauxGlow);
        drawLabEyes(ctx, adjCx, adjCy, adjTx, adjTy, 1, 1.1, time, enemyColor, detail, accentLum);
        break;
      case 4: // RB5 - Núcleo Sigilo
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy, 42, 14, 11, 1.2, 50, enemyColor, time, detail, accentLum);
        ctx.save();
        ctx.translate(adjCx, adjCy);
        ctx.rotate(time * 5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.restore();
        if (!detail || detail.particles !== false) drawLiquidParticles(ctx, adjCx, adjCy, 7, 55, 50, enemyColor, time, particleFauxGlow);
        drawLabEyes(ctx, adjCx, adjCy, adjTx, adjTy, 2, 0.8, time, enemyColor, detail, accentLum);
        break;
      case 5: // RB6 - Entidad Hidra
      default:
        // El acento se analiza una sola vez por Hydra/frame y se comparte entre
        // lóbulos y ojos; el cache evita repetir parsing en frames posteriores.
        const hydraAccentLum = accentLum;
        if (detail && detail.simplified) {
          drawHydraSimplified(ctx, adjCx, adjCy, adjTx, adjTy, time, enemyColor, hydraAccentLum);
          break;
        }
        drawHandDrawnLiquidBlob(ctx, adjCx - 30, adjCy + 35, 15, 8, 12, 1.6, 60, enemyColor, time, detail, hydraAccentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy + 45, 18, 8, 14, 1.8, 65, enemyColor, time, detail, hydraAccentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx + 30, adjCy + 35, 15, 8, 12, 1.6, 70, enemyColor, time, detail, hydraAccentLum);
        drawHandDrawnLiquidBlob(ctx, adjCx, adjCy - 10, 45, 18, 12, 1.1, 75, enemyColor, time, detail, hydraAccentLum);
        if (!detail || detail.particles !== false) {
          const particleScale = detail && typeof detail.particleScale === 'number' ? detail.particleScale : 1;
          drawLiquidParticles(ctx, adjCx, adjCy, Math.max(1, Math.round(10 * particleScale)), 70, 60, enemyColor, time, !!(detail && detail.particleFauxGlow));
        }
        drawLabEyes(ctx, adjCx, adjCy - 12, adjTx, adjTy, 3, 0.85, time, enemyColor, detail, hydraAccentLum);
        break;
    }
    ctx.restore();
  }
  function drawLabTailGlow(ctx, tail, t, seed) {
    // Perf-01: glow de cola en UNA sola pasada aditiva (antes: 3 trazos con
    // shadowBlur 22/12/7 = ~77% del coste raster de enemigos según
    // tools/diagnostics/enemy_anim_profiler.js). Se conserva el halo ancho
    // difuso con blur moderado; el detalle fino del contorno lo aporta el
    // cuerpo negro que se dibuja justo después encima.
    if (!tail.centers || tail.count < 2) return;
    const pts = tail.centers;
    const nPts = tail.count;
    const pulse = .78 + Math.sin(t * 3.4 + seed) * .12;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < nPts; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = 'rgba(255,24,42,' + (.15 * pulse) + ')';
    ctx.lineWidth = 14;
    ctx.shadowColor = 'rgba(255,0,26,.55)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();
  }
  function drawEliteAura(ctx, p, t, seed) {
    if (!p.elite) return;
    const amp = p.aura || 1.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    labBlobShadow(ctx, 0, -28, 64 * amp, .08);
    labBlobShadow(ctx, 0, 10, 88 * amp, .06);
    ctx.restore();
  }
  function drawEliteSigil(ctx, kind, t, seed) {
    if (kind == null || kind < 0) return;
    const pulse = .78 + Math.sin(t * 4.2 + seed) * .18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,18,36,' + (.52 * pulse) + ')';
    ctx.fillStyle = 'rgba(255,18,36,' + (.36 * pulse) + ')';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,0,24,.45)';
    ctx.shadowBlur = 10;
    switch (kind % 6) {
      case 0:
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 34);
        ctx.moveTo(-8, 22); ctx.lineTo(0, 12); ctx.lineTo(8, 22);
        ctx.moveTo(-6, 28); ctx.lineTo(0, 34); ctx.lineTo(6, 28);
        ctx.stroke(); break;
      case 1:
        for (const x of [-8, 0, 8]) {
          ctx.beginPath(); ctx.moveTo(x, 14); ctx.quadraticCurveTo(x + 2, 24, x - 1, 35); ctx.stroke();
        } break;
      case 2:
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(10, 22); ctx.lineTo(0, 35); ctx.lineTo(-10, 22); ctx.closePath(); ctx.fill();
        if (ctx.clearRect) ctx.clearRect(-1, 20, 2, 4); break;
      case 3:
        ctx.beginPath(); ctx.moveTo(-10, 18); ctx.lineTo(0, 26); ctx.lineTo(10, 18);
        ctx.moveTo(-8, 30); ctx.lineTo(0, 38); ctx.lineTo(8, 30); ctx.stroke(); break;
      case 4:
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(7, 20); ctx.lineTo(3, 20); ctx.lineTo(9, 32);
        ctx.lineTo(0, 41); ctx.lineTo(-9, 32); ctx.lineTo(-3, 20); ctx.lineTo(-7, 20);
        ctx.closePath(); ctx.fill(); break;
      case 5:
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 38);
        ctx.moveTo(-8, 20); ctx.lineTo(-2, 28); ctx.moveTo(8, 20); ctx.lineTo(2, 28);
        ctx.moveTo(0, 12); ctx.lineTo(-6, 18); ctx.moveTo(0, 12); ctx.lineTo(6, 18);
        ctx.stroke(); break;
    }
    ctx.restore();
  }
  function drawBossHalo(ctx, kind, t, seed) {
    const pulse = .78 + Math.sin(t * 4.0 + seed) * .18;
    ctx.save();
    ctx.translate(0, -28);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,22,40,' + (.42 * pulse) + ')';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,0,24,.45)';
    ctx.shadowBlur = 10;
    switch (kind % 6) {
      case 0:
        ctx.beginPath(); ctx.arc(0, 2, 39, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); break;
      case 1:
        ctx.beginPath(); ctx.arc(0, 2, 44, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 2, 34, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); break;
      case 2:
        ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(12, -18); ctx.lineTo(0, -4); ctx.lineTo(-12, -18); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(3, -18); ctx.stroke(); break;
      case 3:
        for (const x of [-18, -6, 6, 18]) {
          ctx.beginPath(); ctx.moveTo(x - 3, -22); ctx.lineTo(x + 5, -6); ctx.stroke();
        } break;
      case 4:
        ctx.beginPath(); ctx.arc(0, -18, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-18, -14, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(18, -14, 8, 0, Math.PI * 2); ctx.stroke(); break;
      case 5:
        ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(0, -42, 30, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-20, -14); ctx.lineTo(0, -28); ctx.lineTo(20, -14); ctx.stroke(); break;
    }
    ctx.restore();
  }
  function drawBossCrown(ctx, kind, p, t, seed) {
    const q = Math.sin(t * 1.1 + seed) * 1.4;
    ctx.save();
    ctx.fillStyle = '#020203';
    switch (kind % 6) {
      case 0:
        ctx.beginPath(); ctx.moveTo(-28, -54); ctx.lineTo(-18, -82 - q); ctx.lineTo(-8, -58); ctx.lineTo(0, -88 - q * 1.2);
        ctx.lineTo(10, -58); ctx.lineTo(22, -80 - q); ctx.lineTo(30, -50);
        ctx.quadraticCurveTo(0, -38, -28, -54); ctx.closePath(); ctx.fill(); break;
      case 1:
        ctx.beginPath(); ctx.moveTo(-24, -54); ctx.quadraticCurveTo(-22, -90, -4, -96 - q);
        ctx.quadraticCurveTo(11, -90, 23, -56); ctx.lineTo(10, -54);
        ctx.quadraticCurveTo(2, -72, -6, -54); ctx.closePath(); ctx.fill(); break;
      case 2:
        ctx.beginPath(); ctx.moveTo(-32, -48); ctx.lineTo(-18, -84 - q); ctx.lineTo(-5, -58);
        ctx.lineTo(6, -76 - q * .6); ctx.lineTo(20, -52);
        ctx.quadraticCurveTo(4, -42, -32, -48); ctx.closePath(); ctx.fill(); break;
      case 3:
        ctx.beginPath(); ctx.moveTo(-48, -10); ctx.lineTo(-30, -34); ctx.lineTo(-8, -26); ctx.lineTo(0, -44 - q * .5);
        ctx.lineTo(8, -26); ctx.lineTo(30, -34); ctx.lineTo(48, -10);
        ctx.lineTo(26, -6); ctx.lineTo(0, -2); ctx.lineTo(-26, -6); ctx.closePath(); ctx.fill(); break;
      case 4:
        ctx.beginPath(); ctx.moveTo(-30, -52); ctx.quadraticCurveTo(-46, -70 - q, -40, -22);
        ctx.quadraticCurveTo(-23, -30, -18, -50); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(30, -52); ctx.quadraticCurveTo(46, -70 - q, 40, -22);
        ctx.quadraticCurveTo(23, -30, 18, -50); ctx.closePath(); ctx.fill(); break;
      case 5:
        ctx.beginPath(); ctx.moveTo(-34, -42); ctx.lineTo(-22, -76 - q); ctx.lineTo(-6, -52);
        ctx.lineTo(0, -86 - q); ctx.lineTo(8, -52); ctx.lineTo(26, -76 - q); ctx.lineTo(36, -40);
        ctx.quadraticCurveTo(0, -28, -34, -42); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }
  function drawBossMantle(ctx, kind, p, t, seed) {
    const q = Math.sin(t * .9 + seed) * 2.2;
    ctx.save();
    ctx.fillStyle = '#020203';
    switch (kind % 6) {
      case 0:
        ctx.beginPath(); ctx.moveTo(-44, 10); ctx.quadraticCurveTo(-60, 28, -50, 52);
        ctx.quadraticCurveTo(-34, 44, -28, 20); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(44, 10); ctx.quadraticCurveTo(60, 28, 50, 52);
        ctx.quadraticCurveTo(34, 44, 28, 20); ctx.closePath(); ctx.fill(); break;
      case 1:
        ctx.beginPath(); ctx.moveTo(-54, 2); ctx.quadraticCurveTo(-84, 20, -78, 58 + q);
        ctx.quadraticCurveTo(-54, 52, -34, 24); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(54, 2); ctx.quadraticCurveTo(84, 20, 78, 58 - q);
        ctx.quadraticCurveTo(54, 52, 34, 24); ctx.closePath(); ctx.fill(); break;
      case 2:
        ctx.beginPath(); ctx.moveTo(-38, 20); ctx.lineTo(-60, 44); ctx.lineTo(-46, 48);
        ctx.lineTo(-63, 70 + q); ctx.lineTo(-34, 58); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(38, 20); ctx.lineTo(60, 44); ctx.lineTo(46, 48);
        ctx.lineTo(63, 70 - q); ctx.lineTo(34, 58); ctx.closePath(); ctx.fill(); break;
      case 3:
        ctx.beginPath(); ctx.moveTo(-50, 6); ctx.quadraticCurveTo(-74, 20, -66, 74);
        ctx.quadraticCurveTo(-46, 66, -30, 28); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(50, 6); ctx.quadraticCurveTo(74, 20, 66, 74);
        ctx.quadraticCurveTo(46, 66, 30, 28); ctx.closePath(); ctx.fill(); break;
      case 4:
        ctx.beginPath(); ctx.moveTo(-34, 18); ctx.quadraticCurveTo(-52, 42, -46, 84 + q);
        ctx.quadraticCurveTo(-28, 60, -24, 26); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(34, 18); ctx.quadraticCurveTo(52, 42, 46, 84 - q);
        ctx.quadraticCurveTo(28, 60, 24, 26); ctx.closePath(); ctx.fill(); break;
      case 5:
        ctx.beginPath(); ctx.moveTo(-62, 6); ctx.quadraticCurveTo(-90, 24, -78, 66);
        ctx.quadraticCurveTo(-52, 54, -40, 24); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-44, 8); ctx.quadraticCurveTo(-62, 30, -56, 52);
        ctx.quadraticCurveTo(-40, 44, -28, 22); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(62, 6); ctx.quadraticCurveTo(90, 24, 78, 66);
        ctx.quadraticCurveTo(52, 54, 40, 24); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(44, 8); ctx.quadraticCurveTo(62, 30, 56, 52);
        ctx.quadraticCurveTo(40, 44, 28, 22); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }
  function getBossTailSpecs(p) {
    switch (p.tailMode % 6) {
      case 0: return [{ x: 0, y: 74, dir: p.tailDir, len: 1.00, amp: 1.00 }];
      case 1: return [
        { x: -7, y: 72, dir: -1, len: .90, amp: .76 },
        { x: 8, y: 74, dir: 1, len: 1.04, amp: .94 }
      ];
      case 2: return [
        { x: -10, y: 72, dir: -1, len: .86, amp: .68 },
        { x: 0, y: 75, dir: p.tailDir, len: 1.04, amp: .92 },
        { x: 10, y: 72, dir: 1, len: .86, amp: .68 }
      ];
      case 3: return [
        { x: -12, y: 72, dir: -1, len: .80, amp: .60 },
        { x: -4, y: 76, dir: 1, len: 1.00, amp: .86 },
        { x: 4, y: 76, dir: -1, len: 1.00, amp: .86 },
        { x: 12, y: 72, dir: 1, len: .80, amp: .60 }
      ];
      case 4: return [
        { x: 0, y: 73, dir: p.tailDir, len: 1.10, amp: 1.00 },
        { x: -14, y: 74, dir: -1, len: .70, amp: .50 },
        { x: 14, y: 74, dir: 1, len: .70, amp: .50 }
      ];
      case 5: return [
        { x: -9, y: 72, dir: -1, len: .92, amp: .74 },
        { x: 0, y: 76, dir: p.tailDir, len: 1.06, amp: .96 },
        { x: 9, y: 72, dir: 1, len: .92, amp: .74 }
      ];
      default: return [{ x: 0, y: 74, dir: p.tailDir, len: 1.00, amp: 1.00 }];
    }
  }
  function resolveEliteBossPose(e) {
    const vid = e.visualId || (e.enemyTypeId ? 'elite_' + e.enemyTypeId.replace('specter_elite_', '').replace('specter_', '') : 'elite_base');
    return ELITE_BOSS_POSES[vid] || ELITE_BOSS_POSES.elite_base;
  }
  function drawEliteBossEnemy(ctx, e, frame, player, profile, rx, ry) {
    const p = resolveEliteBossPose(e);
    const t = (frame || 0) * 0.016;
    const seed = hash01(e, 800) * 9.7;
    const bob = Math.sin(t * 1.65 + seed) * 1.6 + Math.sin(t * 3.15 + seed * .4) * 0.35;
    const sway = Math.sin(t * .95 + seed * .7) * .028 + Math.sin(t * 2.4 + seed) * .008;
    const pulse = 1 + Math.sin(t * 2.35 + seed) * .010;
    const scale = (e.radius || 20) / 54;
    const rage = .95;
    const lookX = player ? player.x - e.x : 0;
    const lookY = player ? player.y - e.y : 0;
    // --- Pilar 3: Pulsación Hydra / Enrage basada en salud ---
    // Modelo 5 (Hydra Entity): a medida que la salud baja, la pulsación se intensifica
    // y los ojos crecen, indicando estado de "enfado".
    const isHydra = labPoseIndex(e) === 5;
    const hpPct = (e.maxHp > 0) ? Math.max(0, e.hp / e.maxHp) : 1;
    const ragePct = isHydra ? (1 - hpPct) : 0; // 0 (sano) → 1 (casi muerto)
    const hydraScale = 1 + ragePct * 0.12;           // +12% de pulsación al borde de muerte
    const hydraPulse = 1 + Math.sin(t * 5 + seed * 1.3) * (0.015 + ragePct * 0.035);
    const eyeRageScale = 1 + ragePct * 0.25;         // ojos crecen 25% en enrage
    ctx.save();
    ctx.translate(e.x + rx, e.y + ry + bob);
    drawStatusLayers(ctx, e, frame || 0, player, profile);
    ctx.rotate(p.tilt + sway);
    ctx.scale(scale * pulse * (isHydra ? hydraScale * hydraPulse : 1), scale * pulse * (isHydra ? hydraScale * hydraPulse : 1));
    drawEliteAura(ctx, p, t, seed);
    drawBossHalo(ctx, p.halo, t, seed);
    drawBossCrown(ctx, p.crown, p, t, seed);
    drawBossMantle(ctx, p.mantle, p, t, seed);
    labBlobShadow(ctx, 0, 10, 118, .09);
    const bw = p.body[0], bh = p.body[1], head = p.head;
    const specs = getBossTailSpecs(p);
    for (const spec of specs) {
      const tail = buildLabTail(spec.x, spec.y * bh, { ...p, tailDir: spec.dir, tailLen: spec.len, tailAmp: spec.amp, elite: true }, t, seed + spec.x);
      drawLabTailGlow(ctx, tail, t, seed + spec.x);
    }
    ctx.fillStyle = '#020203';
    ctx.strokeStyle = '#050507';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18 * head, -71);
    ctx.bezierCurveTo(-46 * bw, -70, -57 * bw, -49, -56 * bw, -23);
    ctx.bezierCurveTo(-55 * bw, -4, -49 * bw, 15, -43 * bw, 30);
    ctx.bezierCurveTo(-39 * bw, 43, -33 * bw, 56, -27 * bw * p.shoulder, 64 * p.waist);
    ctx.bezierCurveTo(-20 * bw * p.root, 72, -10 * bh, 74, 0, 74 * bh);
    ctx.bezierCurveTo(10 * bh, 74, 20 * bw * p.root, 72, 27 * bw * p.shoulder, 64 * p.waist);
    ctx.bezierCurveTo(33 * bw, 56, 39 * bw, 43, 43 * bw, 30);
    ctx.bezierCurveTo(49 * bw, 15, 55 * bw, -4, 56 * bw, -23);
    ctx.bezierCurveTo(57 * bw, -49, 46 * bw, -70, 18 * head, -72);
    ctx.bezierCurveTo(7, -74, -7, -74, -18 * head, -71);
    ctx.closePath();
    ctx.fill();
    drawEliteSigil(ctx, p.sigil, t, seed);
    ctx.save();
    ctx.globalAlpha = .11;
    const shade = ctx.createLinearGradient ? ctx.createLinearGradient(-36, -8, 36, 92) : '#222';
    if (shade.addColorStop) {
      shade.addColorStop(0, 'rgba(255,255,255,.22)');
      shade.addColorStop(.42, 'rgba(255,255,255,.05)');
      shade.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1.35;
    ctx.beginPath(); ctx.moveTo(-30, -18); ctx.bezierCurveTo(-26, 18, -18, 46, -8, 75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, -18); ctx.bezierCurveTo(24, 18, 18, 44, 10, 73); ctx.stroke();
            ctx.restore();
    drawLabEye(ctx, -(p.eyeSep || 24), p.eyeY || -30, -1, rage * (isHydra ? eyeRageScale : 1), lookX, lookY, p.eye, -(p.eyeAng || 0), p.eyeStyle || 0);
    drawLabEye(ctx, +(p.eyeSep || 24), p.eyeY || -30, 1, rage * (isHydra ? eyeRageScale : 1), lookX, lookY, p.eye, +(p.eyeAng || 0), p.eyeStyle || 0);
    drawLabMouth(ctx, p.mouth, p.mouthY || 6);
    NV.drawEnemyHitFeedback(ctx, e, 58);
    ctx.restore();
  }
  function drawLabSpecterEnemy(ctx, e, frame, player, profile, rx, ry) {
    const poseIdx = labPoseIndex(e);
    // Estilo líquido hand-drawn del enemy-visual-lab aplicado a los 6
    // espectrales: poseIdx 0..5 elige RB1..RB6 exactamente como en el lab
    // (time += 0.03/frame). Cada modelo usa SU factor de escala aprobado
    // (MODEL_SCALE_FACTORS) en lugar del 0.8 uniforme, más un customScale
    // opcional por entidad. El hitbox se adapta al spawn con el mismo ratio
    // (labModelHitboxFactor) para coincidir con la silueta a su nuevo tamaño.
    const modelIdx = poseIdx % MODEL_SCALE_FACTORS.length;
    const bodyScale = poseIdx === 5 ? HYDRA_BODY_SCALE : 1;
    // ×0.65 de los cinco espectros de producción (scoped por enemyTypeId):
    // el cuerpo visual y la hitbox física se encogen juntos con el MISMO
    // multiplicador; RB6/Hydra y el resto de modelos quedan intactos.
    const spectralScale = spectralBodyScale(e.enemyTypeId || e.id || e.typeId || e.visualId);
    const labScale = (MODEL_SCALE_FACTORS[modelIdx] || 0.8) * bodyScale * spectralScale * (e.customScale || 1);
    const lookX = player ? player.x - e.x : 0;
    const lookY = player ? player.y - e.y : 0;
    // Cada enemigo hereda su color de datos como acento del modelo líquido
    // (los espectros legacy lite #ff6a24 / core #ff2244, los espectrales
    // nuevos su color base). Fallback al rojo aprobado del lab.
    const enemyColor = e.color || '#ff2a4b';
    ctx.save();
    ctx.translate(e.x + rx, e.y + ry);
    if (e.visualId === 'elite_phantom') {
      if (e.phantomState === 'roam_stalk') {
        ctx.globalAlpha = 0.24;
      } else if (e.phantomState === 'materialize' && NV.ELITE_PHANTOM_POSSESSION) {
        const materialProgress = Math.max(0, Math.min(1, 1 - (e.phantomStateTimer || 0) / NV.ELITE_PHANTOM_POSSESSION.materializeTime));
        ctx.globalAlpha = 0.32 + materialProgress * 0.68;
      }
    }
    drawStatusLayers(ctx, e, frame || 0, player, profile);
    let predatorPoseScaleX = 1;
    let predatorPoseScaleY = 1;
    let predatorPoseRotation = 0;
    if (e.visualId === 'elite_predator') {
      const predatorCfg = NV.ELITE_PREDATOR_HUNTER;
      if (e.predatorState === 'execution_windup' && predatorCfg) {
        const charge = Math.max(0, Math.min(1, 1 - (e.predatorStateTimer || 0) / predatorCfg.executionWindup));
        predatorPoseScaleX = 1.02 + charge * 0.08;
        predatorPoseScaleY = 0.98 - charge * 0.10;
        predatorPoseRotation = -0.10 * charge;
      } else if (e.predatorState === 'execution' && predatorCfg) {
        const release = Math.max(0, Math.min(1, 1 - (e.predatorStateTimer || 0) / predatorCfg.executionActiveTime));
        predatorPoseScaleX = 1.10 - release * 0.04;
        predatorPoseScaleY = 0.88 + release * 0.10;
        predatorPoseRotation = -0.10 + release * 0.24;
      } else if (e.predatorState === 'recovery') {
        predatorPoseScaleX = 0.96;
        predatorPoseScaleY = 0.90;
      }
    }
    let goliathPoseScaleX = 1;
    let goliathPoseScaleY = 1;
    let goliathPoseDrop = 0;
    if (e.visualId === 'elite_titan') {
      const goliathCfg = NV.ELITE_GOLIATH_SEISMIC;
      if (e.goliathState === 'slam_windup' && goliathCfg) {
        const braceProgress = Math.max(0, Math.min(1, 1 - (e.goliathStateTimer || 0) / goliathCfg.windup));
        const brace = Math.pow(braceProgress, 1.65);
        goliathPoseScaleX = 1 + brace * 0.04;
        goliathPoseScaleY = 1 - brace * 0.08;
        goliathPoseDrop = brace * 3;
      } else if (e.goliathState === 'recovery') {
        const settle = goliathCfg ? Math.max(0, Math.min(1, (e.goliathStateTimer || 0) / goliathCfg.recovery)) : 1;
        goliathPoseScaleX = 1.03 - settle * 0.01;
        goliathPoseScaleY = 0.94 + (1 - settle) * 0.04;
        goliathPoseDrop = 2 * settle;
      }
    }
    ctx.translate(0, goliathPoseDrop);
    ctx.rotate(predatorPoseRotation);
    ctx.scale(labScale * predatorPoseScaleX * goliathPoseScaleX, labScale * predatorPoseScaleY * goliathPoseScaleY);
    // Dispatcher oficial del lab: poseIdx 0..5 elige RB1..RB6. Se dibuja en el
    // origen local (trasladado arriba); la escala del modelo ya aplicada arriba
    // fija su tamaño aprobado tras el down-scale por modelo.
    const vbAllSimple = !!(activeVisualBudget && activeVisualBudget.spectralDetail <= 0);
    const diagnosticCheap = poseIdx === 5 && hydraDiagnosticMode === 'cheap';
    const simple = diagnosticCheap || (poseIdx === 5 && visualBudgetPrepared && !hydraFullRender.has(e) && !hydraMediumRender.has(e)) || vbAllSimple;
    const medium = poseIdx === 5 && !simple && hydraMediumRender.has(e);
    const reducedVfx = !!(activeVisualBudget && (!activeVisualBudget.heavyShadow || !activeVisualBudget.secondaryGlow || activeVisualBudget.decorativeParticleScale < 1));
    const detail = simple
      ? DETAIL_SIMPLE
      : poseIdx === 5
        ? medium
          ? (activeGraphicsPolicy.particles ? HYDRA_DETAIL_MEDIUM : HYDRA_DETAIL_MEDIUM_NO_PARTICLES)
          : activeGraphicsPolicy.particles
            ? (reducedVfx ? HYDRA_DETAIL_FULL_REDUCED_VFX : HYDRA_DETAIL_FULL)
            : HYDRA_DETAIL_FULL_NO_PARTICLES
        : medium
          ? (activeGraphicsPolicy.particles ? DETAIL_MEDIUM : DETAIL_MEDIUM_NO_PARTICLES)
          : activeGraphicsPolicy.particles
            ? (reducedVfx ? DETAIL_FULL_REDUCED_VFX : DETAIL_FULL)
            : DETAIL_FULL_NO_PARTICLES;
    drawLabEnemyModel(ctx, poseIdx, 0, 0, 1, lookX, lookY, (frame || 0) * 0.03, enemyColor, detail);
    NV.drawEnemyHitFeedback(ctx, e, MODEL_INTRINSIC_RADII[modelIdx]);
    ctx.restore();
  }
  function drawEliteGoliathSeismicTelegraph(ctx, e, frame, rx, ry) {
    if (!e || e.visualId !== 'elite_titan') return;
    const cfg = NV.ELITE_GOLIATH_SEISMIC;
    if (!cfg) return;
    const state = e.goliathState;
    if (state !== 'slam_windup' && state !== 'aftershock_window') return;
    const isWindup = state === 'slam_windup';
    const radius = isWindup ? cfg.slamRadius : cfg.aftershockRadius;
    const duration = isWindup ? cfg.windup : cfg.aftershockDelay;
    const progress = Math.max(0, Math.min(1, 1 - (e.goliathStateTimer || 0) / duration));
    const convergence = isWindup ? progress * progress : progress;
    const cx = isWindup ? e.x + rx : (Number.isFinite(e.goliathImpactX) ? e.goliathImpactX : e.x);
    const cy = isWindup ? e.y + ry : (Number.isFinite(e.goliathImpactY) ? e.goliathImpactY : e.y);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff6474';
    ctx.fillStyle = '#ff6474';
    ctx.globalAlpha = isWindup ? 0.08 : 0.055;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = isWindup ? 0.62 : 0.48;
    ctx.lineWidth = isWindup ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = isWindup ? 0.72 : 0.58;
    ctx.lineWidth = isWindup ? 3 : 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - (isWindup ? 5 : 3), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = isWindup ? 0.58 : 0.38;
    const markCount = isWindup ? 12 : 8;
    for (let i = 0; i < markCount; i++) {
      const angle = i / markCount * Math.PI * 2;
      const outer = radius - (isWindup ? 9 : 7);
      const inner = outer - (isWindup ? 12 + convergence * 12 : 7 + convergence * 6);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.stroke();
    }
    if (!isWindup) {
      ctx.globalAlpha = 0.30 + progress * 0.22;
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2 + 0.24;
        const x1 = Math.cos(angle) * 12;
        const y1 = Math.sin(angle) * 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(Math.cos(angle + 0.12) * 31, Math.sin(angle + 0.12) * 31);
        ctx.lineTo(Math.cos(angle - 0.08) * 47, Math.sin(angle - 0.08) * 47);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawElitePhantomTelegraph(ctx, e, frame, player, rx, ry) {
    if (!e || e.visualId !== 'elite_phantom') return;
    const cfg = NV.ELITE_PHANTOM_POSSESSION;
    if (!cfg) return;
    const state = e.phantomState;
    if (state !== 'roam_stalk' && state !== 'materialize' && state !== 'entry_windup' && state !== 'entry_commit' && state !== 'expel') return;
    ctx.save();
    ctx.shadowBlur = 0;
    if (state === 'roam_stalk') {
      const reducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
      const unstable = reducedMotion ? 0 : Math.sin((frame || 0) * 0.17) * 2;
      ctx.translate(e.x + rx, e.y + ry);
      ctx.strokeStyle = '#b8efff';
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(unstable, 0, e.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (state === 'materialize') {
      const progress = Math.max(0, Math.min(1, 1 - (e.phantomStateTimer || 0) / cfg.materializeTime));
      ctx.translate(e.x + rx, e.y + ry);
      ctx.strokeStyle = progress < 0.55 ? '#b8efff' : '#e879f9';
      ctx.globalAlpha = 0.42 + progress * 0.48;
      ctx.lineWidth = 2 + progress * 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 16 - progress * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.28 + progress * 0.34;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 5 + progress * 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (state === 'entry_windup') {
      const progress = Math.max(0, Math.min(1, 1 - (e.phantomStateTimer || 0) / cfg.windup));
      const dx = player ? player.x - e.x : 1;
      const dy = player ? player.y - e.y : 0;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / length, ny = dy / length;
      ctx.translate(e.x + rx, e.y + ry);
      ctx.strokeStyle = '#b8efff';
      ctx.fillStyle = 'rgba(232,121,249,0.10)';
      ctx.globalAlpha = 0.46 + progress * 0.42;
      ctx.lineWidth = 2 + progress * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8 + progress * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.52;
      for (let i = -2; i <= 2; i++) {
        const side = i * 5;
        ctx.beginPath();
        ctx.moveTo(-ny * side, nx * side);
        ctx.lineTo(nx * (70 + progress * 45) - ny * side * 0.4, ny * (70 + progress * 45) + nx * side * 0.4);
        ctx.stroke();
      }
    } else if (state === 'entry_commit') {
      ctx.translate(e.x + rx, e.y + ry);
      ctx.rotate(e.phantomEntryAngle || 0);
      ctx.strokeStyle = '#d9fbff';
      ctx.globalAlpha = 0.66;
      ctx.lineWidth = Math.max(5, e.radius * 0.65);
      ctx.beginPath();
      ctx.moveTo(-e.radius * 2.8, 0);
      ctx.lineTo(e.radius * 0.8, 0);
      ctx.stroke();
    } else {
      const sx = Number.isFinite(e.phantomExpelStartX) ? e.phantomExpelStartX : e.x;
      const sy = Number.isFinite(e.phantomExpelStartY) ? e.phantomExpelStartY : e.y;
      const progress = Math.max(0, Math.min(1, 1 - (e.phantomStateTimer || 0) / cfg.expelTime));
      ctx.strokeStyle = '#b8efff';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.globalAlpha = 0.28 + progress * 0.34;
        ctx.beginPath();
        ctx.moveTo(sx, sy + i * 5);
        ctx.quadraticCurveTo((sx + e.x) * 0.5, (sy + e.y) * 0.5 - i * 8, e.x, e.y + i * 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35 + progress * 0.55;
      ctx.strokeStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 5 + progress * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawEliteGoliathImpactVfx(ctx, e) {
    if (!e || e.visualId !== 'elite_titan') return;
    const cfg = NV.ELITE_GOLIATH_SEISMIC;
    if (!cfg) return;
    const primaryActive = (e.goliathImpactVfxTimer || 0) > 0;
    const aftershockActive = (e.goliathAftershockVfxTimer || 0) > 0;
    if (!primaryActive && !aftershockActive) return;
    const radius = primaryActive ? cfg.slamRadius : cfg.aftershockRadius;
    const duration = primaryActive ? cfg.impactVfxTime : cfg.aftershockVfxTime;
    const life = Math.max(0, Math.min(1, (primaryActive ? e.goliathImpactVfxTimer : e.goliathAftershockVfxTimer) / duration));
    const cx = Number.isFinite(e.goliathImpactX) ? e.goliathImpactX : e.x;
    const cy = Number.isFinite(e.goliathImpactY) ? e.goliathImpactY : e.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff3b4f';
    ctx.fillStyle = '#ff3b4f';
    ctx.globalAlpha = (primaryActive ? 0.16 : 0.12) * life;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (primaryActive ? 0.92 : 0.78) * life;
    ctx.lineWidth = primaryActive ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1 - 0.06 * (1 - life)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = primaryActive ? 2.4 : 1.8;
    const crackCount = primaryActive ? 8 : 5;
    for (let i = 0; i < crackCount; i++) {
      const angle = i / crackCount * Math.PI * 2 + 0.17;
      const branch = angle + (i % 2 ? 0.12 : -0.10);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
      ctx.lineTo(Math.cos(branch) * radius * 0.33, Math.sin(branch) * radius * 0.33);
      ctx.lineTo(Math.cos(angle - 0.06) * radius * 0.62, Math.sin(angle - 0.06) * radius * 0.62);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = (primaryActive ? 0.95 : 0.82) * life;
    if (primaryActive) {
      ctx.beginPath();
      ctx.arc(0, 0, 9 * life + 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawElitePredatorTelegraph(ctx, e, frame, player, rx, ry) {
    if (!e || e.visualId !== 'elite_predator') return;
    const state = e.predatorState;
    if (state !== 'mark' && state !== 'execution_windup' && state !== 'execution' && state !== 'recovery' && state !== 'evade') return;
    const px = e.x + rx;
    const py = e.y + ry;
    const pulse = 0.5 + Math.sin((frame || 0) * 0.34) * 0.5;
    ctx.save();
    ctx.shadowBlur = 0;
    if (state === 'mark') {
      ctx.translate(px, py);
      ctx.strokeStyle = '#ff3b4f';
      ctx.fillStyle = '#ff3b4f';
      ctx.globalAlpha = 0.62 + pulse * 0.32;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(-2, -e.radius - 20, 4, 10);
      ctx.beginPath();
      ctx.arc(0, -e.radius - 6, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (state === 'execution_windup' || state === 'execution') {
      const cfg = NV.ELITE_PREDATOR_HUNTER;
      if (!cfg) { ctx.restore(); return; }
      const facing = Number.isFinite(e.predatorExecutionFacing) ? e.predatorExecutionFacing : 0;
      const progress = state === 'execution_windup'
        ? Math.max(0, Math.min(1, 1 - (e.predatorStateTimer || 0) / cfg.executionWindup))
        : 1;
      ctx.translate(px, py);
      ctx.strokeStyle = '#ff3b4f';
      ctx.globalAlpha = state === 'execution' ? 0.22 : 0.48 + progress * 0.42;
      ctx.lineWidth = state === 'execution' ? 1.5 : 2 + progress * 2;
      ctx.beginPath();
      ctx.arc(0, 0, cfg.executionRadius, facing - cfg.executionArc * 0.5, facing + cfg.executionArc * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (state === 'evade') {
      const sx = Number.isFinite(e.predatorEvadeStartX) ? e.predatorEvadeStartX : e.x;
      const sy = Number.isFinite(e.predatorEvadeStartY) ? e.predatorEvadeStartY : e.y;
      ctx.strokeStyle = e.color || '#f0f';
      ctx.globalAlpha = 0.24 + pulse * 0.12;
      ctx.lineWidth = Math.max(3, e.radius * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + rx, sy + ry);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = e.color || '#f0f';
      ctx.beginPath();
      ctx.arc(sx + rx, sy + ry, Math.max(4, e.radius * 0.72), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(px, py);
      ctx.strokeStyle = e.color || '#f0f';
      ctx.globalAlpha = 0.18 + pulse * 0.08;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawElitePredatorExecutionVfx(ctx, e, rx, ry) {
    if (!e || e.visualId !== 'elite_predator') return;
    const cfg = NV.ELITE_PREDATOR_HUNTER;
    if (!cfg) return;
    const state = e.predatorState;
    const facing = Number.isFinite(e.predatorExecutionFacing) ? e.predatorExecutionFacing : 0;
    let sweep = 0;
    let manifest = 0;
    if (state === 'execution_windup') {
      const windup = Math.max(0, Math.min(1, 1 - (e.predatorStateTimer || 0) / cfg.executionWindup));
      manifest = Math.max(0, Math.min(1, (windup - 0.62) / 0.38));
      if (manifest <= 0) return;
    } else if (state === 'execution') {
      sweep = Math.max(0, Math.min(1, 1 - (e.predatorStateTimer || 0) / cfg.executionActiveTime));
      manifest = 1;
    } else if (!(e.predatorExecutionImpactTimer > 0)) {
      return;
    }
    if (manifest > 0) {
      const start = facing - cfg.executionArc * 0.5;
      const bladeAngle = start + cfg.executionArc * sweep;
      const root = (e.radius || 12) + 3;
      const reach = root + (cfg.executionRadius - root) * (0.30 + manifest * 0.70);
      const trailStart = Math.max(start, bladeAngle - cfg.executionArc * (0.16 + sweep * 0.20));
      ctx.save();
      ctx.translate(e.x + rx, e.y + ry);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff3b4f';
      ctx.globalAlpha = state === 'execution' ? 0.82 : 0.35 + manifest * 0.35;
      ctx.lineWidth = state === 'execution' ? 3.2 : 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, cfg.executionRadius, trailStart, bladeAngle);
      ctx.stroke();
      ctx.globalAlpha = 0.38 + manifest * 0.54;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, cfg.executionRadius - 10, trailStart + 0.04, bladeAngle - 0.03);
      ctx.arc(0, 0, cfg.executionRadius - 18, trailStart + 0.09, bladeAngle - 0.07);
      ctx.stroke();
      ctx.rotate(bladeAngle);
      ctx.fillStyle = e.color || '#f055ff';
      ctx.strokeStyle = '#f6d7ff';
      ctx.globalAlpha = 0.92;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(root, 3.5);
      ctx.quadraticCurveTo(reach * 0.58, -13 * manifest, reach, 0);
      ctx.quadraticCurveTo(reach * 0.62, 2.5, root, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff3b4f';
      ctx.globalAlpha = state === 'execution' ? 0.95 : 0.55;
      ctx.beginPath();
      ctx.arc(root, 5, 4 + manifest * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (e.predatorExecutionImpactTimer > 0) {
      const impact = Math.max(0, Math.min(1, e.predatorExecutionImpactTimer / 0.12));
      const ix = Number.isFinite(e.predatorExecutionImpactX) ? e.predatorExecutionImpactX + rx : e.x + rx;
      const iy = Number.isFinite(e.predatorExecutionImpactY) ? e.predatorExecutionImpactY + ry : e.y + ry;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(facing);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = impact > 0.55 ? '#ffffff' : '#ff3b4f';
      ctx.globalAlpha = impact;
      ctx.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-5, i * 5 - 3);
        ctx.lineTo(11 + (1 - Math.abs(i)) * 5, i * 7 + 3);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawSpecterGruntChargeTelegraph(ctx, e, frame, player, rx, ry) {
    if (!e || e.enemyTypeId !== 'specter_grunt') return;
    const state = e.specterChargeState;
    if (state !== 'windup' && state !== 'charge' && state !== 'recovery') return;
    const px = e.x + rx;
    const py = e.y + ry;
    let dirX = e.specterChargeDirX || 0;
    let dirY = e.specterChargeDirY || 0;
    if (state === 'windup' && player) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      dirX = dx / dist;
      dirY = dy / dist;
    }
    const pulse = 0.5 + Math.sin((frame || 0) * 0.28) * 0.5;
    ctx.save();
    ctx.translate(px, py);
    ctx.shadowBlur = 0;
    // Lenguaje hostil: ROJO = peligro entrante. Warning (windup) y activo (carga)
    // comparten la familia roja del resto de amenazas; el cian solo queda en recovery.
    if (state === 'windup') {
      ctx.strokeStyle = '#ff6474';
      const progress = Math.max(0, Math.min(1, 1 - (e.specterChargeTimer || 0) / 0.45));
      ctx.globalAlpha = 0.45 + progress * 0.45;
      ctx.lineWidth = 1.5 + progress * 1.5;
      ctx.beginPath();
      ctx.moveTo(dirX * (e.radius + 4), dirY * (e.radius + 4));
      ctx.lineTo(dirX * (74 + progress * 34), dirY * (74 + progress * 34));
      ctx.stroke();
      ctx.globalAlpha = 0.5 + pulse * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 7 + progress * 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (state === 'charge') {
      ctx.strokeStyle = '#ff3b4f';
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = Math.max(4, e.radius * 0.7);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-dirX * (e.radius + 8), -dirY * (e.radius + 8));
      ctx.lineTo(-dirX * (e.radius + 34), -dirY * (e.radius + 34));
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#b8efff';
      ctx.globalAlpha = 0.22 + pulse * 0.12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawSpecterGuardProtectionTelegraph(ctx, e, frame, rx, ry) {
    if (!e || e.enemyTypeId !== 'specter_guard' || !e.guardProtectionActive || !e.guardTarget) return;
    const target = e.guardTarget;
    const source = typeof NV.getGuardProtectionSource === 'function' ? NV.getGuardProtectionSource(target) : null;
    if (source !== e || target.dead) return;
    const pulse = 0.5 + Math.sin((frame || 0) * 0.18) * 0.5;
    const sx = e.x + rx, sy = e.y + ry;
    const tx = target.x, ty = target.y;
    const tr = (target.radius || 10) + 7 + pulse * 2;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#67f8c8';
    ctx.globalAlpha = 0.5 + pulse * 0.2;
    ctx.lineWidth = 1.5;
    ctx.setLineDash && ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash && ctx.setLineDash([]);
    ctx.globalAlpha = 0.72 + pulse * 0.2;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, -0.72, 0.72);
    ctx.moveTo(tx - Math.cos(0.72) * tr, ty - Math.sin(0.72) * tr);
    ctx.arc(tx, ty, tr, Math.PI - 0.72, Math.PI + 0.72);
    ctx.stroke();
    ctx.restore();
  }
  function resolveBossProfile(boss) {
    if (!boss) return BOSS_PROFILES.boss_jefe;
    // Mapea por nombre de tipo de boss (BO_TYPE.name) o por índice
    const nameMap = { 'JEFE': 'boss_jefe', 'TITÁN': 'boss_titan', 'SEÑOR DEL VACÍO': 'boss_vacio', 'GUARDIÁN': 'boss_guardian', 'DESTRUCTOR': 'boss_destructor', 'NÉMESIS': 'boss_nemesis', 'COLOSO': 'boss_coloso', 'FANTASMA': 'boss_fantasma', 'MUTANTE': 'boss_mutante', 'APOCALIPSIS': 'boss_apocalipsis' };
    const key = nameMap[boss.name] || 'boss_jefe';
    return BOSS_PROFILES[key] || BOSS_PROFILES.boss_jefe;
  }
  function drawStatusLayers(ctx, e, frame, player, profile) {
    // #11: freeze compartido con geometría real (corrige el fillStyle huérfano).
    if (typeof NV.drawFrozenStatus === 'function') NV.drawFrozenStatus(ctx, e, frame, e.radius);
    else if (e.slowUntil > 0) {
      const t = frame * 0.06;
      const cold = 0.5 + Math.sin(t * 3.5) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.24 + cold * 0.12;
      ctx.fillStyle = 'rgba(103,232,249,1)';
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (e.armed) {
      const blink = 0.4 + Math.sin(frame * 0.36) * 0.6;
      ctx.globalAlpha = blink; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.isElite) {
      const r = e.radius * (profile.radiusMul || 1);
      const pulse = 0.6 + Math.sin(frame * (profile.haloPulse || 0.12)) * 0.3;
      ctx.globalAlpha = pulse;
      // Halo principal específico del tipo de élite
      ctx.strokeStyle = profile.haloColor || '#ffd700';
      ctx.lineWidth = profile.haloWidth || 2.5;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2); ctx.stroke();
      // Anillo exterior tenue
      ctx.globalAlpha = pulse * 0.4;
      ctx.lineWidth = (profile.haloWidth || 2.5) * 0.6;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if ((e.fusionLevel || 0) > 0) {
      const lvl = e.fusionLevel || 1;
      const pulse = 0.65 + Math.sin(frame * 0.16 + lvl) * 0.25;
      const color = e.color || '#ffe04a';
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 10 + pulse * 7, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      if (ctx.fillText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(NV.fusionMilestoneLabel ? NV.fusionMilestoneLabel(lvl) : ('FUSION ' + lvl), 0, -e.radius - 22);
      }
      ctx.restore();
    }
    if ((e.fusionInterruptFlash || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, e.fusionInterruptFlash / 0.7);
      ctx.strokeStyle = '#7cf8ff'; ctx.lineWidth = 3; ctx.shadowBlur = 0;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 13, 0.35, Math.PI * 1.55); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
    if (e.atkFlash > 0 && player) {
      const r = e.radius;
      const atk = Math.min(1, Math.max(0, e.atkFlash / 0.45));
      const fwd = Math.atan2(player.y - e.y, player.x - e.x);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ff3040'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r + 8 + (1 - atk) * 18, fwd + 1.1 + (1 - atk) * 0.45, fwd - 1.1 - (1 - atk) * 0.45, true); ctx.stroke();
    }
  }
  // C1 — lenguaje táctico de Comandante, Bulwark y Swift. Estas capas usan
  // únicamente estado del motor y nunca alteran entidad, hitbox ni timers.
  function drawEliteRoleTelegraphs(ctx, e, frame, rx, ry) {
    if (!e || !e.isElite) return;
    const cfg = NV.ENEMY_ROLE_REWORK;
    if (!cfg) return;
    ctx.save();
    ctx.translate(e.x + rx, e.y + ry);
    ctx.shadowBlur = 0;

    if (e.visualId === 'elite_base') {
      if (e.commanderState === 'rally_windup') {
        const p = Math.max(0, Math.min(1, 1 - (e.commanderTimer || 0) / cfg.commander.windup));
        ctx.globalAlpha = 0.18 + p * 0.22;
        ctx.fillStyle = '#ffe24a';
        ctx.beginPath(); ctx.arc(0, 0, cfg.commander.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.58 + p * 0.3;
        ctx.strokeStyle = '#fff08a';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(0, 0, cfg.commander.radius * (1 - p * 0.82), 0, Math.PI * 2); ctx.stroke();
      }
      if ((e.commanderPulseTimer || 0) > 0) {
        const p = 1 - Math.max(0, Math.min(1, e.commanderPulseTimer / 0.42));
        ctx.globalAlpha = 0.72 * (1 - p);
        ctx.strokeStyle = '#ffe24a';
        ctx.lineWidth = 4 - p * 2;
        ctx.beginPath(); ctx.arc(0, 0, cfg.commander.radius * p, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (e.visualId === 'elite_bulwark') {
      const ally = e.bulwarkGuardTarget;
      if (ally && !ally.dead) {
        ctx.globalAlpha = 0.46;
        ctx.strokeStyle = '#ffb866';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ally.x - e.x, ally.y - e.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.bulwarkState === 'bash_windup') {
        const p = Math.max(0, Math.min(1, 1 - (e.bulwarkTimer || 0) / cfg.bulwark.windup));
        ctx.globalAlpha = 0.12 + p * 0.18;
        ctx.fillStyle = '#ff5260';
        ctx.beginPath(); ctx.arc(0, 0, cfg.bulwark.bashRange, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.62 + p * 0.25;
        ctx.strokeStyle = '#ff786f';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, cfg.bulwark.bashRange, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
      }
    } else if (e.visualId === 'elite_swift') {
      if (e.swiftState === 'windup') {
        const p = Math.max(0, Math.min(1, 1 - (e.swiftTimer || 0) / cfg.swift.windup));
        const tx = (Number.isFinite(e.swiftTargetX) ? e.swiftTargetX : e.x) - e.x;
        const ty = (Number.isFinite(e.swiftTargetY) ? e.swiftTargetY : e.y) - e.y;
        const td = Math.max(1, Math.hypot(tx, ty));
        ctx.globalAlpha = 0.5 + p * 0.42;
        ctx.strokeStyle = '#ff5260';
        ctx.lineWidth = 2 + p * 1.5;
        ctx.setLineDash([10, 7]);
        ctx.beginPath(); ctx.moveTo(tx / td * (e.radius + 5), ty / td * (e.radius + 5)); ctx.lineTo(tx / td * 330, ty / td * 330); ctx.stroke();
        ctx.setLineDash([]);
      } else if (e.swiftState === 'dash') {
        ctx.globalAlpha = 0.74;
        ctx.strokeStyle = '#80ff50';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-e.swiftDirX * 52, -e.swiftDirY * 52); ctx.lineTo(-e.swiftDirX * 10, -e.swiftDirY * 10); ctx.stroke();
      }
    }

    if ((e.rallyTimer || 0) > 0) {
      const pulse = 0.5 + Math.sin((frame || 0) * 0.24) * 0.5;
      ctx.globalAlpha = 0.42 + pulse * 0.22;
      ctx.strokeStyle = '#ffe24a';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 7 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  NV.drawSpectralEnemy2D = function (ctx, e, frame, player, rhythm) {
    if (!e || e.dead) return false;
    if (e.visualId === 'elite_phantom' && (e.phantomState === 'possessed' || e.phantomState === 'cleanup')) return false;
    const profile = resolveProfile(e);
    ctx.save();
    let rx = 0, ry = 0;
    if (rhythm && rhythm.enabled && rhythm.state === 'listening') {
      const sig = Math.min(1, (rhythm.bass || 0) * 0.5 + (rhythm.kick || 0) * 0.7);
      const thr = 0.18 + hash01(e, 1) * 0.52;
      const level = Math.max(0, Math.min(1, (sig - thr) / (1 - thr)));
      if (level > 0.02 && ((rhythm.onset || 0) > 0.05 || (rhythm.kick || 0) > 0.05)) {
        const seed = hash01(e, 2) * 6.28318;
        const amp = Math.min(4.5, (0.9 + sig * 3.4) * level);
        rx = Math.sin((frame || 0) * 0.31 + seed) * amp;
        ry = Math.cos((frame || 0) * 0.27 + seed * 1.7) * amp * 0.62;
      }
    }
    if (isLabSpecter(e)) {
      drawElitePhantomTelegraph(ctx, e, frame, player, rx, ry);
      drawEliteGoliathSeismicTelegraph(ctx, e, frame, rx, ry);
      drawElitePredatorTelegraph(ctx, e, frame, player, rx, ry);
      drawSpecterGruntChargeTelegraph(ctx, e, frame, player, rx, ry);
      drawSpecterGuardProtectionTelegraph(ctx, e, frame, rx, ry);
      drawLabSpecterEnemy(ctx, e, frame, player, profile, rx, ry);
      drawEliteGoliathImpactVfx(ctx, e);
      drawElitePredatorExecutionVfx(ctx, e, rx, ry);
      ctx.restore();
      return true;
    }
    if (e.isElite && !isLabSpecter(e)) {
      drawEliteRoleTelegraphs(ctx, e, frame, rx, ry);
      drawEliteBossEnemy(ctx, e, frame, player, profile, rx, ry);
      ctx.restore();
      return true;
    }
    ctx.translate(e.x + rx, e.y + ry);
    // El freeze (slowUntil) vive en drawStatusLayers: cada ruta lo invoca una
    // única vez (lab y élite lo hacen dentro de su propio renderer), evitando
    // la duplicación visual que oscurecería el overlay.
    drawStatusLayers(ctx, e, frame, player, profile);
    drawEliteEffects(ctx, e, frame, profile);
    drawBody(ctx, e, frame, profile);
    drawProfileExtras(ctx, e, frame, profile);
    drawEyes(ctx, e, player, profile);
    NV.drawEnemyHitFeedback(ctx, e, e.radius * (profile.radiusMul || 1));
    ctx.restore();
    return true;
  };
  function drawBossAura(ctx, boss, frame, profile) {
    const r = boss.radius * (profile.radiusMul || 1.3);
    const time = frame * 0.06;
    const auraR = r * (profile.auraRadius || 2.2);
    const pulse = 1 + Math.sin(time * (profile.pulseRate || 0.8)) * (profile.pulseAmt || 0.06);
    const grd = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR * pulse);
    grd.addColorStop(0, rgba(hexToRgb(profile.glow), (profile.auraAlpha || 0.25)));
    grd.addColorStop(0.6, rgba(hexToRgb(profile.glow), (profile.auraAlpha || 0.25) * 0.4));
    grd.addColorStop(1, rgba(hexToRgb(profile.glow), 0));
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, auraR * pulse, 0, Math.PI * 2); ctx.fill();
    if (profile.ringCount) {
      for (let ring = 0; ring < profile.ringCount; ring++) {
        const ringR = r * (1.3 + ring * 0.4);
        const rotSpeed = (ring % 2 === 0 ? 0.3 : -0.3);
        ctx.globalAlpha = 0.3 - ring * 0.08;
        ctx.strokeStyle = profile.glow;
        ctx.lineWidth = 2 - ring * 0.5;
        ctx.beginPath(); ctx.arc(0, 0, ringR, time * rotSpeed, time * rotSpeed + Math.PI * 1.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  // Armazón de identidad: silueta secundaria ligada al ataque característico.
  // Es render puro; la fase 2 intensifica cantidad/escala sin cambiar hitboxes.
  function drawBossIdentityRig(ctx, boss, frame, profile) {
    const rig = profile.rig || 'repeater';
    const r = boss.radius * (profile.radiusMul || 1.3);
    const t = frame * 0.06;
    const phase = boss.phase2 ? 1.22 : 1;
    const pulse = 0.82 + Math.sin(t * 1.7) * 0.08;
    ctx.save();
    ctx.strokeStyle = profile.glow;
    ctx.fillStyle = rgba(hexToRgb(profile.core), boss.phase2 ? 0.48 : 0.3);
    ctx.lineWidth = boss.phase2 ? 2.6 : 1.8;
    ctx.globalAlpha = boss.phase2 ? 0.9 : 0.7;

    if (rig === 'repeater') {
      // Corona de tres emisores: la fase 2 añade un segundo banco desplazado.
      const count = boss.phase2 ? 6 : 3;
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.22;
        const x = Math.cos(a) * r * 0.92, y = Math.sin(a) * r * 0.92;
        ctx.beginPath(); ctx.arc(x, y, r * 0.10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(Math.cos(a) * r * 1.34, Math.sin(a) * r * 1.34); ctx.stroke();
      }
    } else if (rig === 'heavy') {
      // Cuatro placas de artillería con masa inequívoca.
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + t * 0.035;
        ctx.save(); ctx.rotate(a); ctx.beginPath();
        ctx.moveTo(r * 0.68, -r * 0.28); ctx.lineTo(r * 1.30 * phase, -r * 0.18);
        ctx.lineTo(r * 1.43 * phase, r * 0.18); ctx.lineTo(r * 0.68, r * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    } else if (rig === 'summon') {
      // Portales rotos orbitando el núcleo invocador.
      const count = boss.phase2 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const a = t * 0.22 + i * Math.PI * 2 / count;
        const x = Math.cos(a) * r * 1.35, y = Math.sin(a) * r * 1.05;
        ctx.beginPath(); ctx.arc(x, y, r * 0.23, a + 0.3, a + Math.PI * 1.55); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    } else if (rig === 'spread') {
      // Nodos radiales anuncian el anillo y hacen visible dónde buscar huecos.
      const count = boss.phase2 ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count + t * 0.08;
        const x = Math.cos(a) * r * 1.30, y = Math.sin(a) * r * 1.30;
        ctx.beginPath(); ctx.arc(x, y, r * 0.065 * phase, 0, Math.PI * 2); ctx.fill();
        if (i % 2 === 0) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .94, Math.sin(a) * r * .94); ctx.lineTo(x, y); ctx.stroke(); }
      }
    } else if (rig === 'beam') {
      // Dos rieles y un prisma apuntan en la dirección capturada del ataque.
      const aim = boss.encounter && Number.isFinite(boss.encounter.angle) ? boss.encounter.angle : Math.PI / 2;
      ctx.save(); ctx.rotate(aim);
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * .35, side * r * .34); ctx.lineTo(r * 1.48 * phase, side * r * .18); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(r * 1.10, 0); ctx.lineTo(r * 1.42 * phase, -r * .18); ctx.lineTo(r * 1.42 * phase, r * .18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (rig === 'volley') {
      // Alas dobles separan visualmente las ráfagas gemelas de Némesis.
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * r * .50, -r * .35); ctx.lineTo(side * r * 1.48 * phase, -r * .76);
        ctx.lineTo(side * r * 1.18 * phase, 0); ctx.lineTo(side * r * 1.42 * phase, r * .62); ctx.lineTo(side * r * .48, r * .30); ctx.stroke();
      }
    } else if (rig === 'bomb') {
      // Cápsulas pesadas suspendidas: leen como munición antes del disparo.
      const count = boss.phase2 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const a = Math.PI * (.18 + .64 * (count === 1 ? .5 : i / (count - 1)));
        const x = Math.cos(a) * r * 1.16, y = Math.sin(a) * r * 1.10;
        ctx.beginPath(); ctx.moveTo(x * .72, y * .72); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, y, r * .10, r * .17, a - Math.PI / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (rig === 'orbs') {
      // Tríada espectral; en fase 2 aparecen dos ecos adicionales.
      const count = boss.phase2 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const a = -t * .38 + i * Math.PI * 2 / count;
        const x = Math.cos(a) * r * 1.38, y = Math.sin(a) * r * .96;
        ctx.beginPath(); ctx.arc(x, y, r * (.11 + Math.sin(t * 2 + i) * .018), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * .21, a, a + Math.PI); ctx.stroke();
      }
    } else if (rig === 'split') {
      // Brotes latentes visibles antes de separarse; fase 2 los abre.
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 3 + Math.sin(t * .35 + i) * .08;
        const reach = boss.phase2 ? 1.42 : 1.12;
        const x = Math.cos(a) * r * reach, y = Math.sin(a) * r * reach;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .64, Math.sin(a) * r * .64); ctx.quadraticCurveTo(x * .82, y * 1.08, x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * (boss.phase2 ? .14 : .09), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (rig === 'rage') {
      // Corona dentada final; la segunda fase duplica las púas activas.
      const count = boss.phase2 ? 16 : 8;
      ctx.save(); ctx.rotate(t * .12);
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        ctx.save(); ctx.rotate(a); ctx.beginPath();
        ctx.moveTo(r * 1.02, -r * .07); ctx.lineTo(r * (boss.phase2 ? 1.62 : 1.38) * pulse, 0); ctx.lineTo(r * 1.02, r * .07); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawBossBody(ctx, boss, frame, profile) {
    const r = boss.radius * (profile.radiusMul || 1.3);
    const time = frame * 0.06;
    const pulse = 1 + Math.sin(time * (profile.pulseRate || 0.8)) * (profile.pulseAmt || 0.06);
    if (profile.mutateEffect) {
      // El Mutante usa una membrana orgánica propia: evita la estrella plana
      // compartida por los demás bosses y comunica núcleo + brotes de fase 2.
      const points = 16;
      const shell = ctx.createRadialGradient(-r * .18, -r * .22, r * .08, 0, 0, r * 1.2);
      shell.addColorStop(0, 'rgba(183,255,138,.82)');
      shell.addColorStop(.32, 'rgba(38,112,78,.94)');
      shell.addColorStop(1, 'rgba(8,30,29,.98)');
      ctx.save();
      ctx.rotate(Math.sin(time * .22) * .045);
      ctx.fillStyle = shell;
      ctx.strokeStyle = profile.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const a = i / points * Math.PI * 2;
        const warp = 1 + Math.sin(a * 3 + time * .55) * .12 + Math.sin(a * 5 - time * .38) * .07;
        const rr = r * warp * pulse;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * .90;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Tres cámaras biológicas anticipan los brotes que aparecen en fase 2.
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 3 + Math.sin(time * .3 + i) * .08;
        const lx = Math.cos(a) * r * .43, ly = Math.sin(a) * r * .36;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i === 1 ? 'rgba(255,79,130,.28)' : 'rgba(183,255,138,.20)';
        ctx.strokeStyle = i === 1 ? profile.scar : 'rgba(85,242,161,.62)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, r * .26, r * .15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Venas conectan la membrana al núcleo y ganan presencia en fase 2.
      ctx.strokeStyle = boss.phase2 ? 'rgba(255,79,130,.72)' : 'rgba(85,242,161,.44)';
      ctx.lineWidth = boss.phase2 ? 2.3 : 1.4;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + time * .025;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * .20, Math.sin(a) * r * .17);
        ctx.quadraticCurveTo(Math.cos(a + .28) * r * .50, Math.sin(a - .18) * r * .42,
          Math.cos(a) * r * .79, Math.sin(a) * r * .68);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = 'rgba(2,12,15,.94)';
      ctx.strokeStyle = profile.core; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * .26 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(hexToRgb(profile.body), 0.9);
    ctx.strokeStyle = rgba(hexToRgb(profile.glow), 0.95);
    ctx.lineWidth = 2.5;
    const spikes = profile.spikes;
    const innerR = r * (profile.innerRatio || 0.8);
    const spikeLen = r * (profile.spikeLen || 0.35);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + time * 0.05;
      const isPeak = i % 2 === 0;
      const rad = isPeak ? (innerR + spikeLen) * pulse : innerR * 0.95;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(hexToRgb(profile.core), 0.8);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  function drawBossParticles(ctx, boss, frame, profile) {
    const r = boss.radius * (profile.radiusMul || 1.3);
    const time = frame * 0.06;
    const bodyRgb = hexToRgb(profile.body);
    ctx.fillStyle = rgba(bodyRgb, 0.6);
    for (let i = 0; i < (profile.particles || 8); i++) {
      const seed = hash01({ x: boss.x + i * 17, y: boss.y + i * 31, radius: boss.radius }, 100 + i);
      const orbitR = r * (1.5 + seed * 0.8);
      const a = time * (0.2 + seed * 0.4) + seed * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, (profile.particleSize || 0.7) * (0.5 + seed), 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawBossEyes(ctx, boss, player, profile) {
    if (!player) return;
    const r = boss.radius * (profile.radiusMul || 1.3);
    const fwd = Math.atan2(player.y - boss.y, player.x - boss.x);
    const eyeR = Math.max(3, r * 0.12);
    const sep = r * 0.3;
    if (profile.eyeStyle === 'mutant') {
      // Tres sensores pequeños en lugar de ojos caricaturescos gigantes.
      const core = r * .26;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
        const ex = Math.cos(a) * core * .62, ey = Math.sin(a) * core * .62;
        ctx.fillStyle = '#eaffd9';
        ctx.beginPath(); ctx.ellipse(ex, ey, eyeR * .48, eyeR * .30, fwd, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = profile.scar || '#ff4f82';
        ctx.beginPath(); ctx.arc(ex + Math.cos(fwd) * eyeR * .18, ey + Math.sin(fwd) * eyeR * .18, eyeR * .17, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    ctx.fillStyle = '#fff';
    if (profile.eyeStyle === 'single') {
      ctx.beginPath(); ctx.arc(0, 0, eyeR * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2222'; ctx.beginPath(); ctx.arc(Math.cos(fwd) * eyeR * 0.5, Math.sin(fwd) * eyeR * 0.5, eyeR * 0.7, 0, Math.PI * 2); ctx.fill();
    } else if (profile.eyeStyle === 'asymmetric') {
      ctx.beginPath(); ctx.arc(-sep * 0.3, -r * 0.05, eyeR * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sep * 0.4, -r * 0.02, eyeR * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.arc(-sep * 0.3 + Math.cos(fwd) * eyeR * 0.3, -r * 0.05 + Math.sin(fwd) * eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sep * 0.4 + Math.cos(fwd) * eyeR * 0.4, -r * 0.02 + Math.sin(fwd) * eyeR * 0.4, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
    } else {
      for (const side of [-1, 1]) {
        const ex = side * sep * 0.5, ey = -r * 0.05;
        ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff2222'; ctx.beginPath(); ctx.arc(ex + Math.cos(fwd) * eyeR * 0.5, ey + Math.sin(fwd) * eyeR * 0.5, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
      }
    }
  }
  function drawBossEffects(ctx, boss, frame, profile) {
    const r = boss.radius * (profile.radiusMul || 1.3);
    const time = frame * 0.06;
    if (profile.voidEffect) {
      const voidPulse = 0.6 + Math.sin(time * 2) * 0.3;
      ctx.globalAlpha = voidPulse * 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = voidPulse * 0.5;
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6 * voidPulse, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (profile.shieldRing) {
      ctx.globalAlpha = 0.4 + Math.sin(time) * 0.2;
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 15, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (profile.phaseEffect) {
      ctx.globalAlpha = 0.3 + Math.sin(time * 3) * 0.2;
      ctx.strokeStyle = profile.glow; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = time * 2 + i * Math.PI * 0.66;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * (0.8 + i * 0.2), a, a + Math.PI); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (profile.rageEffect) {
      ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.2;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(0, 0, r * (1.2 + Math.sin(time * 4) * 0.15), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (profile.massive) {
      ctx.globalAlpha = 0.15 + Math.sin(time * 0.3) * 0.05;
      ctx.fillStyle = profile.glow;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (profile.ghostly) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.3;
      ctx.fillStyle = rgba(hexToRgb(profile.body), 0.2);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (profile.aggressive) {
      ctx.save();
      ctx.rotate(time * 0.45);
      ctx.strokeStyle = profile.glow;
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(r * 1.05, -r * 0.18);
        ctx.lineTo(r * 1.42, 0);
        ctx.lineTo(r * 1.05, r * 0.18);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (profile.mutateEffect) {
      ctx.save();
      ctx.strokeStyle = profile.glow;
      ctx.fillStyle = profile.core;
      ctx.globalAlpha = 0.48;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = time * (0.35 + i * 0.07) + i * Math.PI * 2 / 3;
        const bx = Math.cos(a) * r * 1.18;
        const by = Math.sin(a) * r * 0.82;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); ctx.quadraticCurveTo(bx * 0.72, by * 1.15, bx, by); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, r * 0.10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBossAttackTelegraph(ctx, boss, frame, player, profile) {
    if (!player) return;
    const timer = Number(boss.atkTimer) || 0;
    const r = boss.radius * (profile.radiusMul || 1.3);
    let start = Infinity, color = profile.glow;
    if (boss.attack === 'beam') { start = 3.05; color = '#ff5f9b'; }
    else if (boss.attack === 'bomb') { start = 1.22; color = '#ff9a3d'; }
    else if (boss.attack === 'heavy') { start = 1.02; color = '#ffd166'; }
    if (timer < start) return;
    const duration = boss.attack === 'beam' ? 0.55 : (boss.attack === 'bomb' ? 0.38 : 0.33);
    const progress = Math.max(0, Math.min(1, (timer - start) / duration));
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    const distance = Math.hypot(player.x - boss.x, player.y - boss.y);
    ctx.save();
    ctx.rotate(aim);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.28 + progress * 0.58;
    ctx.lineWidth = 1.5 + progress * 2.5;
    ctx.setLineDash && ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(r * 0.65, 0); ctx.lineTo(Math.max(r, distance), 0); ctx.stroke();
    ctx.setLineDash && ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + progress * 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r + 8 + (1 - progress) * 18, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  NV.drawSpectralBoss2D = function (ctx, boss, frame, player, rhythm) {
    if (!boss || boss.dead) return false;
    const profile = resolveBossProfile(boss);
    ctx.save();
    ctx.translate(boss.x, boss.y);
    drawBossAura(ctx, boss, frame, profile);
    drawBossEffects(ctx, boss, frame, profile);
    drawBossIdentityRig(ctx, boss, frame, profile);
    drawBossAttackTelegraph(ctx, boss, frame, player, profile);
    if (boss.phase2) {
      ctx.strokeStyle = profile.mutateEffect ? 'rgba(85,242,161,.9)' : 'rgba(255, 95, 155, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius * (profile.radiusMul || 1.3) + 12 + Math.sin(frame * 0.1) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawBossBody(ctx, boss, frame, profile);
    NV.drawEnemyHitFeedback(ctx, boss, boss.radius * (profile.radiusMul || 1.3));
    drawBossParticles(ctx, boss, frame, profile);
    drawBossEyes(ctx, boss, player, profile);
    ctx.restore();
    return true;
  };
  NV.SPECTRAL_ENEMY_PROFILES = PROFILES;
  NV.SPECTRAL_ELITE_PROFILES = ELITE_PROFILES;
  NV.SPECTRAL_BOSS_PROFILES = BOSS_PROFILES;
})();
