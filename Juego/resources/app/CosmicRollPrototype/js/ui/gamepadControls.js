// Adaptador Gamepad API: traduce un mando estándar al puente NV.input compartido.
// Steam Input puede exponer el mando como layout estándar sin código específico.
(() => {
  'use strict';
  const NV = window.NV;
  if (!NV || !NV.input || typeof navigator === 'undefined') return;
  const status = document.getElementById('gamepadStatus');
  let previous = [], hadPad = false;
  function axis(value) {
    const v = Number(value) || 0, dead = 0.20;
    if (Math.abs(v) <= dead) return 0;
    return Math.sign(v) * Math.min(1, (Math.abs(v) - dead) / (1 - dead));
  }
  function pressed(button) { return !!(button && (button.pressed || button.value > 0.55)); }
  function edge(buttons, index) { return pressed(buttons[index]) && !previous[index]; }
  function release() {
    NV.input.setMoveVector(0, 0); NV.input.setFire(false); NV.input.setSlide(false); NV.input.setSpecial(false);
    previous = [];
  }
  function setStatus(pad) {
    if (!status) return;
    status.textContent = pad ? 'Mando conectado: ' + String(pad.id || 'estándar').slice(0, 80) + ' · stick izq. mover · stick der. apuntar · RT disparar · B dash · A especial.'
      : 'Mando: no detectado. Estándar: stick izq. mover · stick der. apuntar · RT disparar · B dash · A especial.';
  }
  function poll() {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find(Boolean);
    if (!pad) {
      if (hadPad) { release(); setStatus(null); }
      hadPad = false; return;
    }
    if (!hadPad) setStatus(pad);
    hadPad = true;
    const a = pad.axes || [], b = pad.buttons || [];
    NV.input.setMoveVector(axis(a[0]), axis(a[1]));
    const rx = axis(a[2]), ry = axis(a[3]);
    if (Math.hypot(rx, ry) > 0.05 && NV.input.getPlayerPosition) {
      const p = NV.input.getPlayerPosition();
      NV.input.setAimWorld(p.x + rx * 180, p.y + ry * 180);
    }
    NV.input.setFire(pressed(b[7]));
    NV.input.setSlide(pressed(b[1]));
    NV.input.setSpecial(pressed(b[0]));
    if (edge(b, 5) && NV.input.cycleWeapon) NV.input.cycleWeapon(1);
    if (edge(b, 4) && NV.input.cycleWeapon) NV.input.cycleWeapon(-1);
    if (edge(b, 3) && NV.input.cycleConsumable) NV.input.cycleConsumable(1);
    if (edge(b, 2) && NV.input.useSelected) NV.input.useSelected();
    if (edge(b, 9) && NV.input.togglePause) NV.input.togglePause();
    previous = Array.from(b, pressed);
  }
  window.addEventListener('gamepadconnected', event => setStatus(event.gamepad));
  window.addEventListener('gamepaddisconnected', () => { release(); setStatus(null); });
  // El loop principal llama poll una vez por frame. Así no existe un segundo
  // requestAnimationFrame compitiendo con el render ni con arneses headless.
  NV.gamepad = { axis, poll, supported: typeof navigator.getGamepads === 'function' };
})();
