// Tutorial reactivo de primera partida. No pausa, no altera gameplay y sólo
// observa intents reales del mismo puente usado por teclado, touch y mando.
(() => {
  'use strict';
  const NV = window.NV;
  if (!NV || !NV.input || typeof document === 'undefined') return;
  const KEY = 'neonVoidTutorialV1';
  const done = () => { try { return localStorage.getItem(KEY) === 'done'; } catch (_) { return false; } };
  let completed = done(), step = 0, active = false, autoTimer = 0, hudVisible = true;
  const actions = { move: false, dash: false, fire: false, special: false };
  const host = document.querySelector('.game-box');
  if (!host) return;
  const card = document.createElement('aside'); card.className = 'nv-tutorial'; card.hidden = true;
  card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  const head = document.createElement('div'); head.className = 'nv-tutorial-head';
  const title = document.createElement('span'); title.textContent = 'ENTRENAMIENTO DE VUELO';
  const progress = document.createElement('span'); progress.className = 'nv-tutorial-progress';
  const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'nv-tutorial-skip'; skip.textContent = 'OMITIR';
  const copy = document.createElement('div'); copy.className = 'nv-tutorial-step';
  head.append(title, progress, skip); card.append(head, copy); host.append(card);
  function isMobile() { return !!(NV.capabilities && NV.capabilities.isMobile); }
  function instructions() {
    return [
      isMobile() ? 'Mové el joystick para pilotear.' : 'Movete con WASD, flechas o stick izquierdo.',
      isMobile() ? 'Mantené DASH y soltalo para dosificar.' : 'Mantené Shift o B para impulsarte; soltá para frenar.',
      isMobile() || (NV.input.getEffectiveFirePolicy && NV.input.getEffectiveFirePolicy() === 'legacy-auto') ? 'Tu nave dispara sola al objetivo cercano.' : 'Apuntá y dispará con clic o gatillo derecho.',
      isMobile() ? 'Usá el botón de habilidad cuando diga LISTO.' : 'Activá tu habilidad con Espacio o A.',
    ];
  }
  function render() {
    card.hidden = !active || completed || !hudVisible;
    if (card.hidden) return;
    progress.textContent = (step + 1) + '/4'; copy.textContent = instructions()[step];
  }
  function finish() {
    completed = true; active = false; card.hidden = true;
    try { localStorage.setItem(KEY, 'done'); } catch (_) {}
  }
  function advance() {
    const keys = ['move', 'dash', 'fire', 'special'];
    while (step < keys.length && actions[keys[step]]) step++;
    if (step >= keys.length) finish(); else render();
  }
  function observe(name, action) {
    const original = NV.input[name]; if (typeof original !== 'function') return;
    NV.input[name] = function (...args) {
      const value = original.apply(this, args);
      if (active && args.some(Boolean)) { actions[action] = true; advance(); }
      return value;
    };
  }
  for (const name of ['setMoveLeft', 'setMoveRight', 'setMoveUp', 'setMoveDown', 'setMoveVector']) observe(name, 'move');
  observe('setSlide', 'dash'); observe('setFire', 'fire'); observe('setSpecial', 'special');
  skip.addEventListener('click', finish);
  document.addEventListener('nv-game-state-change', event => {
    const state = event.detail && event.detail.state;
    active = !completed && state === 'playing'; if (!active) autoTimer = 0; render();
  });
  let last = performance.now();
  function poll(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (active && step === 2 && NV.input.getEffectiveFirePolicy && NV.input.getEffectiveFirePolicy() === 'legacy-auto') {
      autoTimer += dt; if (autoTimer >= 1.4) { actions.fire = true; advance(); }
    }
  }
  NV.tutorial = { poll, reset() { completed = false; step = 0; active = NV.getState && NV.getState() === 'playing'; for (const k in actions) actions[k] = false; try { localStorage.removeItem(KEY); } catch (_) {} render(); }, isComplete: () => completed };
  NV.tutorial.setHUDVisible = visible => { hudVisible = !!visible; render(); };
})();
