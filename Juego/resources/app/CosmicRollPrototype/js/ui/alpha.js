// Interfaz de expedición. Todas las mutaciones pasan por NV.alpha; no hay un segundo motor.
(() => {
  'use strict';
  const NV = window.NV;
  if (!NV || !NV.alpha || !NV.expedition) return;
  if (NV.alpha.snapshot().combatLab) return;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls || ''; if (text) n.textContent = text; return n; };
  const button = (label, fn, cls) => { const b = el('button', cls || 'alpha-button', label); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const time = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  const errors = [];
  const comfortPanel = document.getElementById('panelGraphics');
  for (const [key, label, description] of [['reducedEffects', 'Reducir destellos y sacudidas', 'Sin flashes de pantalla ni vibración de cámara. Los avisos de ataques se conservan.'], ['largeText', 'Texto grande', 'Aumenta textos de interfaz, avisos y menús sin cambiar hitboxes.'], ['familyFriendly', 'Lenguaje suave', 'Los jefes usan frases de robots. Desactivarlo habilita los insultos originales.']]) {
    if (!comfortPanel) break;
    const row = el('label', 'settings-toggle');
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!NV.settings.gameplay[key];
    input.id = 'alpha-' + key;
    const copy = el('span'); copy.append(el('b', '', label), el('small', '', description));
    input.addEventListener('change', () => NV.setComfortOption(key, input.checked)); row.append(input, copy); comfortPanel.append(row);
  }
  window.addEventListener('error', e => { errors.push(String(e.message || 'Error').slice(0, 500)); if (errors.length > 20) errors.shift(); });
  let dialogPaused = false, previousFocus = null;
  const dialog = el('dialog', 'alpha-dialog');
  const title = el('h2', '', 'ARCHIVO DE EXPEDICIÓN'); title.id = 'alphaDialogTitle';
  dialog.setAttribute('aria-labelledby', title.id);
  const close = button('CERRAR ×', () => dialog.close());
  const body = el('div', 'alpha-dialog-body');
  dialog.append(close, title, body); document.body.append(dialog);
  dialog.addEventListener('keydown', e => e.stopPropagation());
  dialog.addEventListener('close', () => {
    if (dialogPaused && NV.alpha.snapshot().paused) NV.input.togglePause();
    dialogPaused = false; if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  });
  function open(kind) {
    previousFocus = document.activeElement;
    const s = NV.alpha.snapshot();
    dialogPaused = s.state === 'playing' && !s.paused;
    if (dialogPaused) NV.input.togglePause();
    body.replaceChildren();
    title.textContent = kind === 'help' ? 'MANUAL DEL PILOTO' : kind === 'prep' ? 'ANTES DE DESPLEGAR' : 'ARCHIVO DE EXPEDICIÓN';
    if (kind === 'prep') {
      body.append(el('p', 'alpha-lead', 'Elegí una ayuda para la próxima oleada, o seguí sin comprar nada.'),
        el('p', 'alpha-note', 'Solo podés elegir una ayuda por parada.'), prepRow, routes);
      refresh(true);
    } else if (kind === 'help') {
      const intro = el('p', 'alpha-lead', 'HISTORIA: cuatro sectores, veinte oleadas y diez jefes distintos. Alternás un asalto y un jefe. Tras el décimo termina la misión; una nueva Historia empieza de cero con tus mejoras permanentes. INFINITO no tiene final. Los guardados anteriores mantienen su ruta de cuatro jefes.');
      const controls = el('div', 'alpha-manual-grid');
      for (const [key, action] of [['WASD / flechas', 'Moverte'], ['Mouse + clic', 'Apuntar y disparar'], ['Shift', 'Dash: soltá para dosificar'], ['Espacio', 'Habilidad del piloto'], ['1–6 / rueda', 'Cambiar arma'], ['Q / E · F', 'Elegir objeto · usar'], ['Mando', 'Sticks mover/apuntar · RT disparar · B dash · A habilidad'], ['P / Start', 'Pausa'], ['Tab', 'Estadísticas']]) {
        const row = el('p'); row.append(el('kbd', '', key), el('span', '', action)); controls.append(row);
      }
      body.append(intro, controls, el('p', '', 'En AJUSTES → CONTROLES podés elegir disparo automático. En móvil se dispara automáticamente; usá los controles táctiles en horizontal.'),
        el('h3', '', 'ELEGÍ TU HERRAMIENTA'), el('p', '', 'Las armas guardadas se sincronizan al 60% del avance de tu arma de mayor nivel (hasta nivel 40). Conservás la maestría ganada con cada una. El entrenamiento recupera hasta 10 niveles del arma más atrasada, sin superar a la principal.'));
      for (const w of NV.WEAPONS) {
        const row = el('p', 'alpha-weapon-line'); row.append(el('strong', '', w.name + ' · '), el('span', '', w.pro + '. ' + w.con + '. Fusión II: ' + NV.WEAPON_EVOLUTIONS[w.id] + '.')); body.append(row);
      }
      body.append(el('h3', '', 'PREPARATE Y LEÉ LOS AVISOS'), el('p', '', 'Cada parada permite UNA preparación: curar, entrenar, aceptar un desafío o calibrar armas secundarias desde el sector 3. Contra oleadas, el desafío pide 3 bajas con cada una de 2 armas; contra jefes, ganar recibiendo como máximo 2 golpes. Los avisos fijan su zona antes de activarse.'),
        el('p', '', 'La tienda guarda tu equipo y la próxima oleada. Si cerrás en combate, Continuar vuelve al último checkpoint; morir lo elimina. Guardar y salir está disponible en la tienda. El progreso es local a este navegador y esta dirección.'),
        el('p', 'alpha-note', 'ALPHA 0.10 · No requiere cuenta, pagos ni conexión. Gráficos y música generados por código. Los récords y los hitos son locales, no logros de Steam.'));
    } else {
      const p = NV.expedition.profile();
      body.append(el('p', 'alpha-lead', p.wins + ' expediciones completadas · ' + p.runs + ' partidas terminadas'),
        el('p', '', 'Récord: ' + p.bestScore.toLocaleString('es') + ' puntos · oleada ' + p.bestWave + ' · ' + p.bosses + ' jefes · ' + p.contracts + ' contratos'));
      const milestones = [['PRIMER CONTACTO', p.kills >= 50, '50 bajas acumuladas'], ['CAZADOR', p.bosses >= 1, 'Derrotar un jefe'], ['ESPECIALISTA', p.contracts >= 3, 'Cumplir 3 contratos'], ['SELLAR EL VACÍO', p.wins >= 1, 'Completar una expedición'], ['VETERANO', p.wins >= 3, 'Completar 3 expediciones']];
      for (const [name, done, desc] of milestones) body.append(el('p', done ? 'alpha-achievement unlocked' : 'alpha-achievement', (done ? '◆ ' : '◇ ') + name + ' — ' + desc));
      body.append(el('p', 'alpha-note', 'El informe incluye versión, ajustes, estado agregado y errores de esta sesión. No incluye cuentas ni archivos de tu computadora.'), button('DESCARGAR INFORME DE PRUEBA', downloadReport));
      body.append(el('h3', '', 'RESPALDO Y TRASLADO DE PROGRESO'), el('p', 'alpha-note', 'Exportá desde tu navegador e importá en la app Windows para trasladar permanentes, récords y checkpoint. No cambia los ajustes. Importar reemplaza el progreso de este lugar; guardá primero una copia.'));
      const saveControls = el('div', 'alpha-links');
      const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
      const status = el('p', 'alpha-note'); status.setAttribute('role', 'status');
      file.addEventListener('change', async () => {
        const selected = file.files[0]; if (!selected) return;
        if (selected.size > 250000) { status.textContent = 'El archivo es demasiado grande para un guardado.'; return; }
        try {
          const data = JSON.parse(await selected.text());
          if (data.kind !== 'neon-void-progress' || data.version !== 1) throw new Error('formato');
          if (!window.confirm('¿Reemplazar permanentes, récords y checkpoint con este archivo? Exportá primero si querés conservar el progreso actual.')) return;
          if (!NV.expedition.importProgress(data)) throw new Error('importación');
          location.reload();
        } catch (_) { status.textContent = 'No se pudo importar: archivo incompatible o almacenamiento no disponible. El progreso anterior se conserva si el navegador permite escribirlo.'; }
      });
      saveControls.append(button('EXPORTAR PROGRESO', () => downloadJson(NV.expedition.exportProgress(), 'NEON_VOID_progreso.json')), button('IMPORTAR PROGRESO', () => file.click()));
      body.append(saveControls, file, status);
    }
    dialog.showModal(); close.focus();
  }
  function downloadReport() {
    downloadJson({ version: NV.alpha.version, createdAt: new Date().toISOString(), snapshot: NV.alpha.snapshot(), settings: NV.settings,
      career: NV.expedition.profile(), errors, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } }, 'NEON_VOID_informe_alpha.json');
  }
  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const launch = el('section', 'alpha-launch');
  launch.setAttribute('aria-label', 'Objetivo de partida');
  launch.append(el('span', 'alpha-kicker', 'OPERACIÓN / 0.10 ALPHA'));
  const modeRow = el('div', 'alpha-mode-row');
  const modes = ['expedition', 'endless'].map((mode, i) => {
    const b = button(i ? 'INFINITO · SIN FINAL' : 'HISTORIA · 20 OLEADAS', () => { NV.alpha.setMode(mode); refresh(true); });
    b.dataset.mode = mode; modeRow.append(b); return b;
  });
  const resume = button('CONTINUAR', () => { if (NV.alpha.resume()) refresh(true); }); resume.id = 'alphaResume';
  const links = el('div', 'alpha-links'); links.append(button('CÓMO JUGAR', () => open('help')), button('RÉCORDS / INFORME', () => open('career')));
  const caption = el('small', 'alpha-note', 'HISTORIA: 20 oleadas · 10 jefes distintos · una misión completa.');
  launch.append(modeRow, caption, resume, links);
  const hero = document.querySelector('.lobby-hero'); if (hero) hero.append(launch);
  $('lobbyPlayBtn').addEventListener('click', e => {
    if (!NV.alpha.snapshot().saveDisabled && NV.expedition.load() && !window.confirm('Iniciar una partida nueva reemplaza el checkpoint. ¿Empezar de nuevo?')) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  const prepRow = el('div', 'alpha-preps'); const preps = {};
  for (const [kind, name, desc] of [['repair', 'CURAR', 'Recuperás 40% de tu vida.'], ['training', 'ENTRENAR', 'Subís 10 niveles el arma más débil.'], ['contract', 'DESAFÍO EXTRA', 'Objetivo opcional: ganás más fragmentos.'], ['calibrate', 'CALIBRAR ARSENAL', 'Desde oleada 10: secundarias al 80% de la más fuerte.']]) {
    const b = button('', () => { NV.alpha.prepare(kind); refresh(true); }, 'alpha-prep');
    const label = el('b', '', name), text = el('small', '', desc), cost = el('span', 'alpha-price');
    b.append(label, text, cost); preps[kind] = { b, cost }; prepRow.append(b);
  }
  const routes = el('div', 'alpha-route');
  routes.append(el('span', '', 'Elegí el tipo de próxima oleada (opcional): '));
  const routeButtons = Object.entries(NV.WAVE_EVENTS).map(([id, data]) => {
    const labels = { elites: 'MÁS ÉLITES', payday: 'MÁS FRAGMENTOS', fog: 'NEBLINA', mines: 'MINAS' };
    const b = button(labels[id] || data.name, () => { NV.alpha.route(id); refresh(true); });
    b.title = data.desc; routes.append(b); return { id, b };
  });
  const shop = $('shop');
  const prepOpen = button('PREPARAR OLEADA', () => open('prep'), 'alpha-button alpha-prep-trigger');
  const shopHead = shop && shop.querySelector('.shop-terminal-head');
  if (shopHead) shopHead.insertBefore(prepOpen, shopHead.querySelector('.shard-bar'));
  const savedStatus = el('span', 'alpha-save-status'); savedStatus.setAttribute('role', 'status');
  const saveQuit = button('GUARDAR Y SALIR', () => {
    if (NV.alpha.dockAndQuit()) { savedStatus.textContent = ''; refresh(true); }
    else savedStatus.textContent = 'No se pudo guardar. Revisá el almacenamiento del juego.';
  }, 'alpha-button alpha-save-quit');
  if (shop) shop.append(saveQuit, savedStatus);
  const result = document.querySelector('.game-over-future'); if (result) { result.classList.add('alpha-result'); result.removeAttribute('aria-hidden'); }
  const strip = el('div', 'alpha-run-strip'); strip.setAttribute('aria-label', 'Objetivo de expedición');
  document.querySelector('main').append(strip);
  let lastState = '', lastDock = '';
  function refresh(force) {
    const s = NV.alpha.snapshot();
    for (const b of modes) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
    caption.textContent = s.mode === 'endless'
      ? 'INFINITO: sobreviví sin final; las oleadas y los jefes continúan.'
      : 'HISTORIA: 20 oleadas · 10 jefes distintos. Alternás asalto y jefe. Al vencer al décimo termina la misión; otra Historia empieza de cero.';
    const checkpoint = s.state === 'menu' && !s.saveDisabled ? NV.expedition.load() : null;
    resume.hidden = !checkpoint;
    if (checkpoint) resume.textContent = 'CONTINUAR · OLEADA ' + (checkpoint.wave + 1) + (checkpoint.run.mode === 'expedition' && checkpoint.run.bossProgression !== 'full-roster' ? ' · RUTA ANTERIOR' : '');
    strip.hidden = s.state !== 'playing' || s.paused || s.showHUD === false || !s.run || !s.run.contract;
    if (!strip.hidden && s.run) {
      const contract = NV.expedition.isBossWave(s.run, s.wave) ? 'GOLPES ' + s.run.waveHits + '/2' : Object.values(s.run.waveKills).filter(n => n >= 3).length + '/2 ARMAS · 3 BAJAS';
      strip.textContent = 'DESAFÍO OPCIONAL: ' + contract;
    }
    const inShop = s.state === 'shop' || s.state === 'shop_enter';
    if (inShop && s.run) {
      const sig = JSON.stringify([s.state, s.wave, s.shards, s.hp, s.run.prep, s.run.event, s.inventory]);
      if (force || sig !== lastDock) {
        const next = s.wave + 1;
        prepOpen.textContent = s.run.prep ? 'AYUDA ELEGIDA ✓' : 'PREPARAR OLEADA ' + next + ' · OPCIONAL';
        saveQuit.textContent = s.saveDisabled ? 'SALIR SIN GUARDAR' : 'GUARDAR Y SALIR';
        const lead = Math.max(...s.inventory.map(w => w.level));
        for (const [kind, entry] of Object.entries(preps)) {
          const cost = NV.expedition.prepCost(kind, s.wave);
          const calibrationFloor = Math.min(80, 1 + Math.floor((lead - 1) * 0.80));
          const noCalibration = s.wave < 10 || s.inventory.length < 2 || !s.inventory.some(w => w.level < calibrationFloor);
          entry.b.disabled = s.state !== 'shop' || !!s.run.prep || s.shards < cost || (kind === 'repair' && s.hp >= s.maxHp) || (kind === 'training' && !s.inventory.some(w => w.level < lead)) || (kind === 'calibrate' && noCalibration);
          entry.b.setAttribute('aria-pressed', String(s.run.prep === kind));
          entry.cost.textContent = kind === 'contract' ? 'GRATIS · recompensa ' + (30 + next * 2) + ' ◆' : cost + ' ◆';
        }
        routes.hidden = next % 3 !== 0 || NV.expedition.isBossWave(s.run, next);
        for (const { id, b } of routeButtons) b.setAttribute('aria-pressed', String(s.run.event === id));
        lastDock = sig;
      }
    }
    if (s.state === 'gameover' && s.run && (force || lastState !== s.state) && result) {
      const most = Object.entries(s.run.weaponKills).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])[0];
      result.replaceChildren(el('p', '', s.run.kills + ' bajas · ' + s.run.bosses + ' jefes · ' + time(s.run.seconds)),
        el('p', '', 'Contratos: ' + s.run.contracts + ' · Arma principal: ' + (most ? NV.weaponById(most[0]).name : '—')),
        button('RÉCORDS E INFORME', () => open('career')));
    }
    lastState = s.state;
  }
  // Guardar sólo datos agregados en reposo: el intervalo jamás modifica el mundo.
  setInterval(() => refresh(false), 500);
  window.addEventListener('pagehide', () => NV.alpha.save());
  refresh(true);
})();
