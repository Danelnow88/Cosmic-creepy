// Ataque coordinado de la primera zona. Un enemigo fija el punto de impacto,
// muestra un aviso y deja tiempo para esquivarlo. No mide pasos ni daña fuera
// del círculo visible; el dash y la invulnerabilidad siguen funcionando.
(() => {
  'use strict';
  const NV = window.NV;
  const PROFILES = Object.freeze({
    easy: Object.freeze({ first: 1.9, interval: 2.15, warning: 1.10, radius: 49, damage: 28 }),
    normal: Object.freeze({ first: 1.8, interval: 2.0, warning: 0.95, radius: 53, damage: 34 }),
    hard: Object.freeze({ first: 1.7, interval: 1.85, warning: 0.85, radius: 56, damage: 40 }),
  });
  NV.WAVE_PRESSURE_PROFILES = PROFILES;
  NV.createWavePressure = function () { return { timer: null, mark: null }; };
  NV.updateWavePressure = function (dt, st) {
    const state = st.state;
    if (!state || !st.player || st.wave >= 5 || st.boss || !st.active || st.player.hp <= 0) return;
    const difficulty = NV.difficultyGet(st.difficulty).id;
    const profile = PROFILES[difficulty];
    if (state.timer == null) state.timer = profile.first;
    if (state.mark) {
      state.mark.t = Math.max(0, state.mark.t - dt);
      if (state.mark.t > 0) return;
      const mark = state.mark;
      state.mark = null;
      state.timer = profile.interval;
      if (Math.hypot(st.player.x - mark.x, st.player.y - mark.y) > mark.radius + (st.player.radius || 9)) return;
      if (st.applyPlayerDamage) {
        const hit = st.applyPlayerDamage(profile.damage, {
          cause: 'wave-targeted-pulse', enemy: mark.source,
          allowCrit: false, allowDodge: false,
        });
        if (hit && hit.killed && st.onPlayerKilled) st.onPlayerKilled(hit);
      }
      return;
    }
    const source = st.enemies.find(enemy => enemy && !enemy.dead && !enemy.arrival && !enemy.waveCleanup && !enemy.killResolved);
    if (!source) { state.timer = profile.first; return; }
    state.timer -= dt;
    if (state.timer > 0) return;
    state.mark = { source, sx: source.x, sy: source.y,
      x: st.player.x, y: st.player.y, radius: profile.radius,
      t: profile.warning, duration: profile.warning };
  };
  NV.drawWavePressure = function (ctx, state) {
    const mark = state && state.mark;
    if (!mark) return;
    const progress = Math.max(0, Math.min(1, 1 - mark.t / mark.duration));
    ctx.save();
    ctx.strokeStyle = NV.HOSTILE_SIGNALS ? NV.HOSTILE_SIGNALS.warning : '#ff6474';
    ctx.fillStyle = 'rgba(255,58,78,0.17)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(mark.sx, mark.sy); ctx.lineTo(mark.x, mark.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(mark.x, mark.y, mark.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(mark.x, mark.y, mark.radius * (1 - progress * 0.8), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffdce2';
    ctx.font = '800 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('¡SALÍ!', mark.x, mark.y - mark.radius - 8);
    ctx.restore();
  };
})();
