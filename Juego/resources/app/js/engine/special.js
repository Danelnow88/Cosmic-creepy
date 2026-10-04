// engine/special.js — Habilidad especial de cada personaje (ctxState+callbacks).
// Retorna { specialVFX, drones, shake }; muta player/meteors/particles vía estado.
(() => {
  'use strict';
  const NV = window.NV;

  // state: { player, CHARACTERS, meteors, particles, W, H?, shake, specialVFX,
  //          cbs: { showBanner, triggerFlash, spawnExplosion, sfx } }
  NV.useSpecial = function (state) {
    const { player, CHARACTERS, meteors, particles } = state;
    const { showBanner, triggerFlash, spawnExplosion, sfx } = state.cbs;
    let { drones, shake } = state;

    const char = CHARACTERS[player.character];
    player.specialCd = char.maxCd + 0.5;
    const specialVFX = { x: player.x, y: player.y, life: 1, type: char.special, color: char.color };
    if (NV.beginSpecialVisual) NV.beginSpecialVisual(player, char.special);
    showBanner(char.skillName.toUpperCase(), char.skillColor || char.color);

    if (char.special === 'meteor') {
      // Lluvia Criocósmica: conserva trayectoria y cantidad de los meteoros.
      triggerFlash('#7cf8ff');
      shake = 0.4;
      for (let i = 0; i < 12; i++) {
        meteors.push({
          x: 30 + Math.random() * (state.W - 60),
          y: -20 - Math.random() * 120,
          vy: 320 + Math.random() * 200,
          vx: (Math.random() - 0.5) * 70,
          radius: 9 + Math.random() * 7,
          color: i % 2 === 0 ? '#7cf8ff' : '#a4eaff',
          dead: false,
        });
      }
      spawnExplosion(player.x, player.y, 30, '#7cf8ff', 0.6);
    } else if (char.special === 'phase') {
      // Ignición Astral: la misma invulnerabilidad/aura de 3s (ID phase).
      player.invuln = 3;
      player.phase = 3;
      triggerFlash('#ff9d36');
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, life: 0.7, color: i % 2 ? '#ff9d36' : '#fff2bc', specialEnergy: true });
      }
    } else if (char.special === 'bulwark') {
      // Bastión Astral: escudo + misma onda de control (stun/knockback).
      player.invuln = 3;
      player.bulwark = 3;
      shake = 0.5;
      triggerFlash('#ffcf76');
      spawnExplosion(player.x, player.y, 40, '#ffcf76', 0.4);
      spawnExplosion(player.x, player.y, 25, '#fff', 0.5);
      const applyKnockback = state.cbs.applyKnockback;
      const sayStun = state.cbs.addFloatText;
      const SHOCK_R = 120;
      for (const e of state.enemies || []) {
        if (NV.isEnemyDamageable ? !NV.isEnemyDamageable(e) : e.dead) continue;
        if (Math.hypot(e.x - player.x, e.y - player.y) < SHOCK_R) {
          e.stun = Math.max(e.stun || 0, 1.0); // control de 1s (usa el sistema de stun existente)
          if (applyKnockback) applyKnockback(e, player.x, player.y, 260);
          if (sayStun) sayStun(e.x, e.y - 20, '¡ATURDIDO!', '#ffcf76');
        }
      }
      NV.spawnShockwave(state.shockwaves || [], player.x, player.y, { maxRadius: 130, color: '#ffcf76', width: 5, style: 'bastion' });
    } else if (char.special === 'hivemind') {
      // Núcleos Vivos: mismo ID/6 orbitantes que disparan durante 5s.
      triggerFlash('#8dfaff');
      drones = [];
      for (let i = 0; i < 6; i++) {
        drones.push({
          angle: (i / 6) * Math.PI * 2,
          orbitRadius: 55,
          speed: 2.5,
          fireTimer: 0.3 + i * 0.1,
          color: '#8dfaff',
          dead: false,
        });
      }
      spawnExplosion(player.x, player.y, 20, '#8dfaff', 0.6);
    }
    sfx.special(player.character);
    return { specialVFX, drones, shake };
  };

  // ---- Ignición (NOVA): al terminar phase, golpe final = 50% del DoT acumulado ----
  // phaseAcc lo acumula el aura en game.js. Enemigos: acc*0.5 directo; jefe: acc*0.5*mult anti-boss.
  NV.detonatePhase = function (player, enemies, boss, shockwaves, cbs, balance) {
    const B = balance || (window.NV && window.NV.BALANCE);
    const MULT = B && B.PHASE_DETONATION_MULT != null ? B.PHASE_DETONATION_MULT : 0.5;
    let hits = 0;
    for (const e of enemies || []) {
      if (e.dead) continue;
      if (NV.isEnemyDamageable && !NV.isEnemyDamageable(e)) { e.phaseAcc = 0; continue; }
      const acc = e.phaseAcc || 0;
      if (acc > 0) {
        const rawDamage = acc * MULT;
        const dealt = NV.guardProtectedDamage ? NV.guardProtectedDamage(e, rawDamage) : rawDamage;
        e.hp -= dealt;
        e.hitFlash = Math.max(e.hitFlash || 0, 0.10);
        if (cbs && cbs.addFloatText) cbs.addFloatText(e.x, e.y - 24, 'IGNICIÓN', '#ff9d36');
        hits++;
        if (e.hp <= 0 && cbs && cbs.killEnemy) cbs.killEnemy(e);
      }
      e.phaseAcc = 0;
    }
    if (boss && !boss.dead && boss.phaseAcc > 0) {
      boss.hp -= boss.phaseAcc * MULT * (B && B.PHASE_AURA_BOSS_MULT || 0.3);
      if (NV.playtest && NV.playtest.enabled) NV.playtest.bossHit('special:nova', boss.phaseAcc * MULT * (B && B.PHASE_AURA_BOSS_MULT || 0.3), 'detonation');
      boss.hitFlash = Math.max(boss.hitFlash || 0, 0.10);
      if (cbs && cbs.addFloatText) cbs.addFloatText(boss.x, boss.y - 60, 'IGNICIÓN', '#ff9d36');
      hits++;
      boss.phaseAcc = 0;
    }
    // Ruptura de plasma: conserva las dos entradas/timers del shockwave existente.
    NV.spawnShockwave(shockwaves || [], player.x, player.y, { maxRadius: 110, color: '#ff9d36', width: 6, style: 'novaCollapse' });
    // Anillo blanco secundario: decorativo, degradable vía visual budget (P2).
    NV.spawnShockwave(shockwaves || [], player.x, player.y, { maxRadius: 70, color: '#fff', width: 3, secondary: true, style: 'novaCollapse' });
    if (cbs && cbs.spawnExplosion) cbs.spawnExplosion(player.x, player.y, 30, '#ff9d36', 0.8);
    if (cbs && cbs.triggerFlash) cbs.triggerFlash('#ff9d36');
    return hits;
  };
})();
