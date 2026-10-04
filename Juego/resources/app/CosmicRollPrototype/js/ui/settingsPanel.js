// ===== UI: panel compartido de settings (desktop + móvil) =====
// Pestañas: AUDIO / CONTROLES / GRÁFICOS. Los sliders de audio y el mute delegan
// en el backend persistente (settings.js / synth.js): NV.set*Volume (una categoría
// cada uno) y NV.setSoundEnabled (autoridad única de mute; synth.js sincroniza
// HUD/mobile vía NV.syncSoundUI). No se duplica lógica de volumen en el panel.
(() => {
  'use strict';
  const NV = window.NV;
  const panel = document.getElementById('settingsPanel');
  const desktopBtn = document.getElementById('settingsBtn');
  const lobbyBtn = document.getElementById('lobbySettingsBtn');
  const closeBtn = document.getElementById('settingsClose');
  const qualityInputs = [].slice.call(document.querySelectorAll('input[name="graphicsQuality"]'));
  const firePolicyInputs = [].slice.call(document.querySelectorAll('input[name="firePolicy"]'));
  const particles = document.getElementById('settingsParticles');
  const heavyVfx = document.getElementById('settingsHeavyVfx');
  const tabs = [].slice.call(document.querySelectorAll('.settings-tab'));
  const tabPanels = [].slice.call(document.querySelectorAll('.settings-tab-panel'));
  const muteBtn = document.getElementById('settingsMuteToggle');
  const volumeInputs = [].slice.call(document.querySelectorAll('.settings-volume'));
  let openState = false;
  let activeTab = 'audio'; // en memoria: NO se persiste qué pestaña estaba abierta
  let returnFocus = null;

  // Mapeo categoría -> setter persistente (settings.js). Fuente de verdad única.
  const VOLUME_SETTERS = {
    masterVolume: 'setMasterVolume',
    musicVolume: 'setMusicVolume',
    weaponsVolume: 'setWeaponsVolume',
    uiVolume: 'setUiVolume',
    playerVolume: 'setPlayerVolume',
    enemiesVolume: 'setEnemiesVolume',
    ambientVolume: 'setAmbientVolume',
  };
  function roundPct(v) { return Math.round(Number(v) * 100); }

  function syncMute() {
    const on = NV.soundOn !== false; // autoridad única: synth.js (NV.soundOn)
    if (!muteBtn) return;
    muteBtn.textContent = on ? '🔊 SONIDO' : '🔇 SILENCIO';
    muteBtn.classList.toggle('off', !on);
    muteBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    muteBtn.title = on ? 'Silenciar sonido' : 'Activar sonido';
  }

  function syncControls() {
    if (!NV.settings) return;
    const audio = NV.settings.audio || {};
    const g = NV.settings.graphics || {};
    const controls = NV.settings.controls || {};
    qualityInputs.forEach((input) => { input.checked = input.value === g.quality; });
    if (particles) particles.checked = !!g.particles;
    if (heavyVfx) heavyVfx.checked = !!g.heavyVfx;
    firePolicyInputs.forEach((input) => { input.checked = input.value === controls.firePolicy; });
    volumeInputs.forEach((input) => {
      const key = (input.getAttribute && input.getAttribute('data-setting')) || '';
      const raw = Object.prototype.hasOwnProperty.call(audio, key) ? audio[key] : 1;
      const v = roundPct(raw);
      input.value = String(v);
      const output = input.parentNode && input.parentNode.querySelector ? input.parentNode.querySelector('output') : null;
      if (output) output.textContent = v + '%';
      input.setAttribute('aria-valuenow', String(v));
    });
    syncMute();
  }

  function showTab(name) {
    const nextTab = tabs.find((tab) => tab.getAttribute && tab.getAttribute('data-tab') === name);
    if (!nextTab) return;
    activeTab = name;
    tabPanels.forEach((p) => {
      const on = p.getAttribute && p.getAttribute('data-tab') === name;
      p.hidden = !on;
      if (p.setAttribute) p.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    tabs.forEach((t) => {
      const on = t.getAttribute && t.getAttribute('data-tab') === name;
      if (t.classList) t.classList.toggle('active', on);
      if (t.setAttribute) t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (t.setAttribute) t.setAttribute('tabindex', on ? '0' : '-1');
    });
  }

  function tabMove(delta) {
    if (!tabs.length) return;
    let idx = tabs.findIndex((t) => t.classList && t.classList.contains('active'));
    if (idx < 0) idx = 0;
    idx = (idx + delta + tabs.length) % tabs.length;
    if (!tabs[idx]) return;
    showTab(tabs[idx].getAttribute('data-tab'));
    if (tabs[idx].focus) tabs[idx].focus();
  }

  function setOpen(open) {
    if (!panel) return;
    open = !!open;
    if (openState === open) return;
    openState = open;
    if(NV.sfx&&NV.sfx.ui)NV.sfx.ui(open?'open':'close');
    if (open) returnFocus = document.activeElement;
    panel.classList.toggle('hidden', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.documentElement.setAttribute('data-settings-open', open ? 'true' : 'false');
    if (NV.input && typeof NV.input.setSettingsOpen === 'function') NV.input.setSettingsOpen(open);
    if (open) {
      showTab(activeTab || 'audio');
      syncControls();
      const active = tabs.find((tab) => tab.classList && tab.classList.contains('active'));
      if (active && active.focus) active.focus();
      else if (panel.focus) panel.focus();
    } else if (returnFocus && returnFocus.focus) {
      returnFocus.focus();
      returnFocus = null;
    }
  }
  function open() { setOpen(true); }
  function close() { setOpen(false); }

  if (desktopBtn) desktopBtn.addEventListener('click', open);
  if (lobbyBtn) lobbyBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  // backdrop: cerrar solo al clickuear fuera del card (target === overlay)
  if (panel) panel.addEventListener('pointerdown', (e) => { if (e && e.target === panel) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && panel && !panel.classList.contains('hidden')) close();
  });
  qualityInputs.forEach((input) => input.addEventListener('change', () => {
    if (input.checked) NV.setGraphicsQuality(input.value);
  }));
  firePolicyInputs.forEach((input) => input.addEventListener('change', () => {
    if (input.checked) NV.setFirePolicy(input.value);
  }));
  if (particles) particles.addEventListener('change', () => NV.setGraphicsOption('particles', particles.checked));
  if (heavyVfx) heavyVfx.addEventListener('change', () => NV.setGraphicsOption('heavyVfx', heavyVfx.checked));

  // Navegación por pestañas (click + teclado).
  tabs.forEach((t) => {
    const name = t.getAttribute('data-tab');
    t.addEventListener('click', () => showTab(name));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); tabMove(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); tabMove(-1); }
    });
  });

  // Mute: reutiliza la autoridad única del mixer (synth.js). Transitorio (NO persiste).
  if (muteBtn) muteBtn.addEventListener('click', () => {
    if (typeof NV.setSoundEnabled === 'function') NV.setSoundEnabled(!NV.soundOn);
    syncMute();
  });

  // Sliders live: actualizan el porcentaje y llaman exactamente a un setter.
  volumeInputs.forEach((input) => input.addEventListener('input', () => {
    const key = input.getAttribute('data-setting');
    const setterName = VOLUME_SETTERS[key];
    const value = Number(input.value);
    const output = input.parentNode && input.parentNode.querySelector ? input.parentNode.querySelector('output') : null;
    if (output) output.textContent = Math.round(value) + '%';
    input.setAttribute('aria-valuenow', String(Math.round(value)));
    if (setterName && typeof NV[setterName] === 'function') NV[setterName](value / 100);
  }));

  var lobbyDiffButtons = Array.from(document.querySelectorAll('#lobbyDiffOptions .lobby-diff-btn'));

  // settings.js puede cargar después de balance.js o antes; resolver el orden real en runtime.
  function difficultyOrder() {
    if (NV.DIFFICULTY_ORDER && NV.DIFFICULTY_ORDER.indexOf) return NV.DIFFICULTY_ORDER;
    return ['easy', 'normal', 'hard'];
  }

  function currentLobbyDifficulty() {
    var fallback = 'normal';
    if (NV.settings && NV.settings.gameplay && NV.settings.gameplay.difficulty) {
      fallback = NV.settings.gameplay.difficulty;
    }
    if (difficultyOrder().indexOf(fallback) >= 0) return fallback;
    return 'normal';
  }

  function renderLobbyDifficultySelection() {
    var current = currentLobbyDifficulty();
    lobbyDiffButtons.forEach(function(btn) {
      var value = btn.dataset ? btn.dataset.diff : null;
      if (!value && btn.getAttribute) value = btn.getAttribute('data-diff');
      var selected = value === current;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  lobbyDiffButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var value = btn.dataset ? btn.dataset.diff : null;
      if (!value && btn.getAttribute) value = btn.getAttribute('data-diff');
      if (difficultyOrder().indexOf(value) < 0) return;
      if (typeof NV.setDifficulty === 'function') {
        NV.setDifficulty(value);
      } else if (NV.settings && NV.settings.gameplay) {
        // Fallback si settings.js aún no registró el setter: misma escritura local.
        NV.settings.gameplay.difficulty = value;
      }
      renderLobbyDifficultySelection();
    });
  });

  function syncAllSettings() {
    syncControls();
    renderLobbyDifficultySelection();
  }

  if (typeof NV.onSettingsChange === 'function') NV.onSettingsChange(syncAllSettings);
  NV.renderLobbyDifficultySelection = renderLobbyDifficultySelection;
  NV.settingsUI = { open, close, sync: syncControls, syncMute };
  showTab(activeTab);
  syncAllSettings();
})();
