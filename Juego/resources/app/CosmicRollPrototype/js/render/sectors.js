// Escenarios cósmicos en coordenadas de MUNDO. Decoración sin simulación:
// no lee entidades, cambia métricas, usa Math.random ni decide progresión.
// Dos superficies del sector ACTUAL; gradients/polvo se hornean sólo al cambiar
// sector o dimensiones. La cámara/zoom existentes transforman el drawImage.
(() => {
  'use strict';
  const NV = window.NV;
  const TAU = Math.PI * 2;

  const PROFILES = Object.freeze([
    Object.freeze({ id: 'threshold', name: 'UMBRAL', background: '#020714', accent: '#63e8ff', secondary: '#8095ff', motif: 'nebula-and-moon' }),
    Object.freeze({ id: 'foundry', name: 'FUNDICIÓN', background: '#08070b', accent: '#ff9a4d', secondary: '#ff405d', motif: 'stellar-forge-and-debris' }),
    Object.freeze({ id: 'fracture', name: 'FRACTURA', background: '#07051a', accent: '#b989ff', secondary: '#4ce7ff', motif: 'rift-and-shattered-mass' }),
    Object.freeze({ id: 'void-heart', name: 'CORAZÓN DEL VACÍO', background: '#08030f', accent: '#ff4fa8', secondary: '#9d63ff', motif: 'singularity-and-accretion' }),
  ]);

  function sectorIndex(wave) {
    const safe = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1;
    return Math.min(3, Math.floor((safe - 1) / 5));
  }
  function hash(i, salt) {
    const value = Math.sin(i * 91.733 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }
  let cached = null, builds = 0, draws = 0;

  // Nubes elípticas orgánicas: sus centros/radios nunca dependen de viewX/Y.
  function cloud(ctx, x, y, rx, ry, rotation, rgb, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(.42, 'rgba(' + rgb + ',' + (alpha * .47) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  }
  function moon(ctx, x, y, radius, rgb, salt) {
    cloud(ctx, x, y, radius * 1.12, radius * 1.12, 0, rgb, .13);
    const g = ctx.createRadialGradient(x - radius * .45, y - radius * .4, 0, x, y, radius);
    g.addColorStop(0, 'rgba(' + rgb + ',.28)');
    g.addColorStop(.55, '#0b1422'); g.addColorStop(1, '#030710');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.clip();
    for (let i = 0; i < 18; i++) {
      const a = hash(i, salt) * TAU, d = Math.sqrt(hash(i, salt + 1)) * radius;
      const crater = radius * (.035 + hash(i, salt + 2) * .08);
      cloud(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d,
        crater, crater * .85, a, '1,4,10', .5);
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(' + rgb + ',.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, radius, 3.35, 5.35); ctx.stroke(); ctx.restore();
  }
  function fragment(ctx, x, y, radius, salt, rgb) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(hash(salt, 24) * TAU);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, r = radius * (.48 + hash(i, salt + 2) * .52);
      const px = Math.cos(a) * r, py = Math.sin(a) * r * .55;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = '#080c17'; ctx.fill();
    ctx.strokeStyle = 'rgba(' + rgb + ',.19)'; ctx.lineWidth = .8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-radius * .25, -radius * .18);
    ctx.lineTo(radius * .13, radius * .05); ctx.lineTo(radius * .34, -radius * .1);
    ctx.strokeStyle = 'rgba(' + rgb + ',.1)'; ctx.stroke(); ctx.restore();
  }
  function threshold(ctx, W, H) {
    // Puerta natural al espacio: río de gas frío, luna y bolsas de vacío.
    cloud(ctx, W * .57, H * .31, W * .52, H * .33, -.34, '30,74,139', .7);
    for (let i = 0; i < 24; i++) {
      const p = hash(i, 1), x = W * (.06 + p * .9);
      const y = H * (.67 - p * .48 + (hash(i, 2) - .5) * .16);
      cloud(ctx, x, y, W * (.055 + hash(i, 3) * .11), H * (.035 + hash(i, 4) * .085),
        -.35, i % 3 ? '39,113,135' : '64,64,139', .22 + hash(i, 5) * .22);
    }
    moon(ctx, W * .16, H * .8, H * .17, '70,106,157', 22);
    cloud(ctx, W * .78, H * .75, W * .2, H * .16, .24, '46,44,108', .38);
    cloud(ctx, W * .43, H * .4, W * .14, H * .1, -.4, '1,3,12', .67);
  }
  function foundry(ctx, W, H) {
    // Forja ESTELAR, no nave industrial: gigante eclipsado y remolino de polvo.
    cloud(ctx, W * .54, H * .57, W * .48, H * .37, -.27, '126,66,34', .55);
    for (let i = 0; i < 27; i++) {
      const p = hash(i, 41), a = p * 4.7;
      const x = W * (.54 + Math.cos(a) * (.16 + p * .21));
      const y = H * (.49 + Math.sin(a) * .32);
      cloud(ctx, x, y, W * (.06 + hash(i, 42) * .09), H * (.035 + hash(i, 43) * .1),
        a - .9, i % 3 ? '137,80,36' : '80,51,98', .2 + hash(i, 44) * .2);
    }
    moon(ctx, W * .8, H * .24, H * .235, '160,100,53', 45);
    cloud(ctx, W * .19, H * .32, W * .16, H * .12, .3, '22,52,72', .37);
    // Tres grandes restos asimétricos sirven de hitos incluso en calidad mínima.
    fragment(ctx, W * .27, H * .61, H * .07, 61, '112,88,59');
    fragment(ctx, W * .53, H * .84, H * .055, 68, '112,88,59');
    fragment(ctx, W * .63, H * .36, H * .038, 74, '112,88,59');
  }
  function fracture(ctx, W, H) {
    cloud(ctx, W * .43, H * .53, W * .4, H * .32, .5, '64,43,127', .62);
    // Fisura quebrada y ancha en profundidad, no banda de daño ni línea regular.
    for (let i = 0; i < 23; i++) {
      const p = hash(i, 81), x = W * (.2 + p * .61);
      const y = H * (.04 + p * .87 + Math.sin(p * 11) * .1);
      cloud(ctx, x, y, W * (.05 + hash(i, 82) * .07), H * (.06 + hash(i, 83) * .14),
        -.6, i % 3 ? '78,64,161' : '39,93,118', .22 + hash(i, 84) * .3);
    }
    ctx.save(); ctx.beginPath(); ctx.moveTo(W * .28, -H * .08);
    const edge = [[.3,.08],[.23,.21],[.39,.31],[.35,.43],[.48,.55],
      [.42,.69],[.64,.79],[.61,.91],[.73,1.08]];
    for (const p of edge) ctx.lineTo(W * p[0], H * p[1]);
    // Retorno de grosor desigual: una rotura natural, no una carretera/rejilla.
    for (let i = edge.length - 1; i >= 0; i--) {
      ctx.lineTo(W * (edge[i][0] + .013 + hash(i, 89) * .019), H * edge[i][1]);
    }
    ctx.lineTo(W * .3, -H * .08); ctx.closePath();
    ctx.fillStyle = 'rgba(2,3,12,.83)'; ctx.fill();
    ctx.lineWidth = .7; ctx.strokeStyle = 'rgba(91,88,153,.17)'; ctx.stroke(); ctx.restore();
    fragment(ctx, W * .19, H * .52, H * .13, 91, '99,91,151');
    fragment(ctx, W * .74, H * .65, H * .16, 97, '63,115,136');
    fragment(ctx, W * .57, H * .18, H * .08, 98, '99,91,151');
    cloud(ctx, W * .82, H * .15, W * .15, H * .13, .3, '31,37,82', .48);
  }
  function voidHeart(ctx, W, H) {
    const x = W * .38, y = H * .4, r = H * .135;
    // Singularidad apagada: lente de acreción oblicua, nunca anillos de aviso.
    cloud(ctx, x, y, W * .32, H * .31, -.23, '64,37,114', .7);
    for (let i = 0; i < 25; i++) {
      const a = hash(i, 111) * TAU, d = .15 + hash(i, 112) * .16;
      cloud(ctx, x + Math.cos(a) * W * d, y + Math.sin(a) * H * d,
        W * (.055 + hash(i, 113) * .1), H * .035, a - .3, '93,49,120', .24);
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.23);
    const g = ctx.createRadialGradient(0, 0, r * .45, 0, 0, r * 2.25);
    g.addColorStop(0, 'rgba(25,12,48,0)'); g.addColorStop(.47, 'rgba(122,83,154,.27)');
    g.addColorStop(.57, 'rgba(112,71,147,.36)'); g.addColorStop(1, 'rgba(36,15,63,0)');
    ctx.scale(1.75, .43); ctx.fillStyle = g; ctx.fillRect(-r * 2.25, -r * 2.25, r * 4.5, r * 4.5);
    ctx.restore();
    ctx.fillStyle = '#02030a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    cloud(ctx, W * .79, H * .78, W * .24, H * .16, -.5, '40,35,91', .5);
    fragment(ctx, W * .71, H * .53, H * .045, 132, '84,65,106');
    fragment(ctx, W * .14, H * .81, H * .06, 137, '84,65,106');
  }
  const PAINTERS = [threshold, foundry, fracture, voidHeart];

  // Perímetro común, material por sector. El corte interior EXACTO es x=0/W,
  // y=0/H. Toda irregularidad se extiende HACIA FUERA: nunca sugiere terreno
  // transitable donde física no lo permite, ni invade el último tramo jugable.
  const EDGE_MATERIALS = [
    { exterior: '#010309', rim: '#101a26', seam: '#587784', dust: '#526d85' },
    { exterior: '#040307', rim: '#1c1719', seam: '#8b7556', dust: '#856b4d' },
    { exterior: '#020209', rim: '#171429', seam: '#776890', dust: '#6b618c' },
    { exterior: '#020108', rim: '#181025', seam: '#796080', dust: '#6b5477' },
  ];
  let perimeterCache = null, perimeterBuilds = 0;
  function trace(target, points) {
    target.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) target.lineTo(points[i][0], points[i][1]);
    target.closePath();
  }
  function preparePerimeter(W, H, index, padding) {
    if (perimeterCache && perimeterCache.W === W && perimeterCache.H === H
      && perimeterCache.index === index && perimeterCache.padding === padding) return perimeterCache;
    const outer = [], inner = [[0, 0], [W, 0], [W, H], [0, H]], dust = [], filaments = [];
    // Membrana de refracción: labio oscuro ondulado + filamentos separados de
    // materia ionizada. No dientes aleatorios, muro industrial ni marco neón.
    const pointOnSide = (side, along, depth) => side === 0 ? [along, -depth]
      : side === 1 ? [W + depth, along] : side === 2 ? [W - along, H + depth] : [-depth, H - along];
    const depthAt = (along, side) => 7 + Math.sin(along / 69 + side * 2.1) * 2.4
      + Math.sin(along / 29 + side * .7) * 1.2;
    for (let side = 0; side < 4; side++) {
      const length = side % 2 ? H : W;
      for (let along = 0; along < length; along += 28) outer.push(pointOnSide(side, along, depthAt(along, side)));
      // Dos puntos por esquina producen un cierre continuo, sin grietas de crop.
      outer.push(pointOnSide(side, length, depthAt(length, side)));
      for (let start = 18, i = 0; start < length - 16; i++) {
        const end = Math.min(length - 16, start + 52 + hash(i, side + 390) * 84);
        const points = [];
        for (let n = 0; n <= 10; n++) {
          const t = n / 10, along = start + (end - start) * t;
          const depth = depthAt(along, side) + 3 + Math.sin(t * Math.PI) * (4 + hash(i, side + 394) * 4);
          points.push(pointOnSide(side, along, depth));
        }
        let path = null;
        if (typeof Path2D === 'function') {
          path = new Path2D(); path.moveTo(...points[0]);
          for (let n = 1; n < points.length; n++) path.lineTo(...points[n]);
        }
        filaments.push({ points, path }); start = end + 18 + hash(i, side + 398) * 32;
      }
      for (let i = 0; i < 14; i++) {
        const t = hash(i, side + 406) * length, d = padding * (.72 + hash(i, side + 411) * .21);
        dust.push(side === 0 ? [t, -d] : side === 1 ? [W + d, t]
          : side === 2 ? [t, H + d] : [-d, t]);
      }
    }
    let ring = null, seam = null;
    if (typeof Path2D === 'function') {
      ring = new Path2D(); trace(ring, outer); trace(ring, inner);
      seam = new Path2D(); trace(seam, inner);
    }
    perimeterCache = { W, H, index, padding, outer, inner, dust, ring, seam, filaments };
    perimeterBuilds++; return perimeterCache;
  }
  NV.drawSectorPerimeter = function (ctx, W, H, wave, options) {
    if (!ctx || !Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) return null;
    const padding = NV.viewport ? NV.viewport.cameraExteriorPadding : 0;
    if (!(padding > 0)) return null;
    const index = sectorIndex(wave), p = preparePerimeter(W, H, index, padding);
    const material = EDGE_MATERIALS[index];
    ctx.save();
    // Exterior sólo fuera de bounds. Sobrescribe fog/starfield de pantalla, no
    // entidades: este renderer se ejecuta antes de proyectiles/enemigos/hazards.
    ctx.fillStyle = material.exterior;
    ctx.fillRect(-padding, -padding, W + padding * 2, padding);
    ctx.fillRect(-padding, H, W + padding * 2, padding);
    ctx.fillRect(-padding, 0, padding, H); ctx.fillRect(W, 0, padding, H);
    ctx.fillStyle = material.rim;
    if (p.ring) ctx.fill(p.ring, 'evenodd');
    else { ctx.beginPath(); trace(ctx, p.outer); trace(ctx, p.inner); ctx.fill('evenodd'); }
    // Junta nítida apagada en el límite AUTORITATIVO, sin glow ni blanco/rojo.
    ctx.strokeStyle = material.seam; ctx.globalAlpha *= .68; ctx.lineWidth = 1.25;
    if (p.seam) ctx.stroke(p.seam);
    else { ctx.beginPath(); trace(ctx, p.inner); ctx.stroke(); }
    const tier = tierOf(options);
    if (tier !== 'minimal') {
      ctx.globalAlpha *= .54; ctx.lineWidth = .8;
      for (const filament of p.filaments) {
        if (filament.path) ctx.stroke(filament.path);
        else {
          ctx.beginPath(); ctx.moveTo(...filament.points[0]);
          for (let i = 1; i < filament.points.length; i++) ctx.lineTo(...filament.points[i]);
          ctx.stroke();
        }
      }
    }
    if (tier === 'full') {
      ctx.globalAlpha *= .35; ctx.fillStyle = material.dust;
      for (const point of p.dust) ctx.fillRect(point[0], point[1], 1, 1);
    }
    ctx.restore(); return PROFILES[index];
  };

  function starDust(ctx, W, H, salt, detail) {
    // Hash par semilla: irregular, estable y sin consumir RNG de gameplay.
    const count = detail ? 310 : 140;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const x = hash(i, salt) * W, y = hash(i, salt + 1) * H;
      ctx.fillStyle = i % 4 ? '#647c9c' : '#9a8da7';
      ctx.globalAlpha = (detail ? .08 : .12) + hash(i, salt + 2) * .25;
      const size = .45 + hash(i, salt + 3) * (detail ? 1.15 : .7);
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }
  function paintCore(ctx, W, H, index) {
    const g = ctx.createLinearGradient(0, 0, W * .73, H);
    g.addColorStop(0, PROFILES[index].background); g.addColorStop(1, '#01030b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    PAINTERS[index](ctx, W, H); starDust(ctx, W, H, 160 + index * 11, false);
  }
  function paintDetail(ctx, W, H, index) {
    starDust(ctx, W, H, 212 + index * 19, true);
    // Polvo cerca de las formaciones, no un ruido global ni puntos equidistantes.
    ctx.save(); ctx.fillStyle = index === 1 ? '#b48a52' : '#687aab';
    for (let i = 0; i < 650; i++) {
      const p = hash(i, 244 + index), x = W * (.06 + p * .9);
      const lane = index === 1 ? .56 + Math.sin(p * 5) * .2 : index === 2 ? .12 + p * .7 : .67 - p * .43;
      const y = H * (lane + (hash(i, 255 + index) - .5) * .16);
      ctx.globalAlpha = .025 + hash(i, 261) * .065;
      ctx.fillRect(x, y, 1 + hash(i, 262) * 1.5, .7);
    }
    ctx.restore();
    if (index === 1 || index === 2) for (let i = 0; i < 13; i++) {
      fragment(ctx, W * hash(i, 290 + index), H * hash(i, 291 + index),
        H * (.006 + hash(i, 292) * .021), 301 + i, index === 1 ? '91,76,57' : '76,81,121');
    }
  }
  function surface(width, height) {
    let canvas = null;
    if (typeof OffscreenCanvas === 'function') canvas = new OffscreenCanvas(width, height);
    else if (typeof document !== 'undefined' && document.createElement) {
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    }
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    return ctx ? { canvas, ctx } : null;
  }
  function prepare(W, H, index) {
    if (cached && cached.W === W && cached.H === H && cached.index === index) return cached;
    // Memoria acotada: no acumular texturas por run, sector, tier, DPR o cámara.
    cached = null;
    const scale = Math.min(1, 1536 / W, 1024 / H);
    const width = Math.max(1, Math.ceil(W * scale)), height = Math.max(1, Math.ceil(H * scale));
    const core = surface(width, height), detail = surface(width, height);
    if (!core || !detail) return null; // harnesses sin Canvas: mismo arte por vía directa.
    core.ctx.scale(width / W, height / H); detail.ctx.scale(width / W, height / H);
    paintCore(core.ctx, W, H, index); paintDetail(detail.ctx, W, H, index);
    cached = { W, H, index, core: core.canvas, detail: detail.canvas, width, height };
    builds++; return cached;
  }
  function tierOf(options) {
    const value = options && (options.tier || options.detail);
    return value === 'minimal' ? 'minimal' : value === 'reduced' || value === 'performance' || value === 'medium' ? 'reduced' : 'full';
  }

  NV.SECTOR_VISUALS = PROFILES;
  NV.sectorVisualForWave = wave => PROFILES[sectorIndex(wave)];
  NV.drawSectorBackdrop = function (ctx, W, H, frame, wave, options) {
    if (!ctx || !Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) return null;
    const index = sectorIndex(wave), tier = tierOf(options), texture = prepare(W, H, index);
    ctx.save();
    if (texture) ctx.drawImage(texture.core, 0, 0, W, H);
    else paintCore(ctx, W, H, index);
    if (tier !== 'minimal') {
      ctx.globalAlpha *= tier === 'reduced' ? .35 : 1;
      if (texture) ctx.drawImage(texture.detail, 0, 0, W, H);
      else paintDetail(ctx, W, H, index);
    }
    ctx.restore(); draws++;
    return PROFILES[index];
  };
  // Sólo diagnóstico de decoración; nunca escribe worldMetrics ni entidades.
  NV.getSectorBackdropStats = () => ({ builds, draws, surfaces: cached ? 2 : 0,
    perimeterBuilds, perimeterVertices: perimeterCache ? perimeterCache.outer.length : 0,
    sector: cached ? PROFILES[cached.index].id : null,
    textureWidth: cached ? cached.width : 0, textureHeight: cached ? cached.height : 0,
    estimatedBytes: cached ? cached.width * cached.height * 8 : 0 });
})();
