// ===== ENGINE: protocolos ambientales por sector =====
// Una amenaza simple, anunciada y determinista por sector. No aparece en Umbral,
// eventos de oleada. Jefes compatibles alternan casts con grupos láser pequeños.
(() => {
  'use strict';
  const NV = window.NV = window.NV || {};

  const ENCOUNTERS = Object.freeze([
    Object.freeze({ id: 'threshold', name: 'UMBRAL', cue: 'SISTEMAS EN LÍNEA', hazard: null, color: '#63e8ff' }),
    Object.freeze({ id: 'foundry', name: 'FUNDICIÓN', cue: 'LÁSER ROJO · SALÍ A UN COSTADO', hazard: 'vent', color: '#ff9a4d' }),
    Object.freeze({ id: 'fracture', name: 'FRACTURA', cue: 'LÁSER ROJO · SUBÍ O BAJÁ', hazard: 'rift', color: '#b989ff' }),
    Object.freeze({ id: 'void-heart', name: 'CORAZÓN DEL VACÍO', cue: 'ANILLO ROJO · ALEJATE DEL BORDE', hazard: 'pulse', color: '#ff4fa8' }),
  ]);
  const TELEGRAPH = 1.15;
  const ACTIVE = 0.65;
  const RECOVERY = 0.32;
  const INITIAL_DELAY = 2.8;
  const COOLDOWN = 6.4;

  function encounterIndex(wave) {
    const safe = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1;
    return Math.min(3, Math.floor((safe - 1) / 5));
  }
  function removeSectorHazards(hazards) {
    let w = 0;
    for (let i = 0; i < (hazards || []).length; i++) {
      const h = hazards[i];
      if (h && h.type !== 'sectorHazard' && h.state !== 'dead') hazards[w++] = h;
    }
    if (hazards) hazards.length = w;
  }
  function createHazard(profile, state, ctx) {
    const W = Math.max(320, ctx.W || 900), H = Math.max(240, ctx.H || 520);
    const serial = state.serial++;
    const lane = (serial + Math.max(1, ctx.wave || 1)) % 3;
    const h = {
      type: 'sectorHazard', kind: profile.hazard, profileId: profile.id,
      label: profile.hazard === 'vent' || profile.hazard === 'rift' ? 'LÁSER' : 'PULSO',
      hint: profile.cue,
      color: profile.color, state: 'telegraph', stateTime: 0, simTime: 0,
      telegraphTime: TELEGRAPH, activeTime: ACTIVE, recoveryTime: RECOVERY,
      contactResolved: false, damage: profile.hazard === 'vent' ? 10 : profile.hazard === 'rift' ? 11 : 12,
    };
    if (profile.hazard === 'vent' || profile.hazard === 'rift') {
      Object.assign(h, NV.sectorEmitterLayout(ctx.wave, W, H)[lane]);
    } else {
      h.x = W * 0.5; h.y = H * 0.5; h.radius = Math.min(W, H) * 0.245;
      h.width = Math.min(72, Math.min(W, H) * 0.13); h.W = W; h.H = H;
    }
    return h;
  }

  NV.SECTOR_ENCOUNTERS = ENCOUNTERS;
  // Un mismo engine para normales y bosses. Sin pulso radial, minas, bomba ni
  // lluvia de élites superpuestos. Beam/summon/rage ya ocupan bastante lectura.
  NV.BOSS_SECTOR_COMPATIBILITY = Object.freeze({
    repeater: 2, heavy: 2, spread: 2, volley: 2, bomb: 2, orbs: 2, split: 2,
    beam: 0, summon: 0, rage: 0,
  });
  NV.sectorEncounterForWave = wave => ENCOUNTERS[encounterIndex(wave)];
  // Geometría compartida por soportes, aviso, disparo y colisión. Los nombres
  // internos vent/rift se conservan por compatibilidad con audio y telemetría.
  NV.sectorEmitterLayout = function (wave, W, H) {
    const kind = NV.sectorEncounterForWave(wave).hazard;
    if (kind !== 'vent' && kind !== 'rift') return [];
    return [0,1,2].map(lane => kind === 'vent'
      ? { kind, x: W * (.28 + lane * .22), width: 6, W, H }
      : { kind, y: H * (.28 + lane * .22), width: 6, W, H });
  };
  NV.sectorLaserPattern = function (serial, W, H) {
    const count = [2,4,6][serial % 3], shift = serial % 2 ? .035 : -.035;
    const vertical = [.23+shift,.71+shift];
    const horizontal = [.28+shift,.72+shift,.43+shift,.57+shift];
    const lanes = count===2 ? (serial%2 ? [0,1].map(i=>({kind:'rift',y:H*horizontal[i]})) : [0,1].map(i=>({kind:'vent',x:W*vertical[i]})))
      : [...[0,1].map(i=>({kind:'vent',x:W*vertical[i]})),...[0,1].map(i=>({kind:'rift',y:H*horizontal[i]}))];
    if(count===6) lanes.push({kind:'rift',y:H*horizontal[2]},{kind:'rift',y:H*horizontal[3]});
    return lanes.map((lane,i)=>({...lane,W,H,width:6,side:lane.kind==='vent'?'top':lane.y/H>=.62&&(serial+i)%2?'right':'left'}));
  };
  NV.createSectorEncounterState = function () {
    return { timer: INITIAL_DELAY, serial: 0, active: false, laserHitCooldown:0 };
  };
  NV.clearSectorEncounter = function (hazards, state) {
    removeSectorHazards(hazards || []);
    state = state || NV.createSectorEncounterState();
    state.timer = INITIAL_DELAY; state.serial = 0; state.active = false; state.laserHitCooldown=0;
    return state;
  };
  NV.sectorHazardContains = function (hazard, player, playerRadius) {
    if (!hazard || !player) return false;
    const pr = Math.max(0, playerRadius || 0);
    if (hazard.kind === 'vent') return (!hazard.laserHead||player.y+pr>=38) && Math.abs(player.x - hazard.x) <= hazard.width * 0.5 + pr;
    if (hazard.kind === 'rift') return (!hazard.laserHead||(hazard.side==='right'?player.x-pr<=hazard.W-38:player.x+pr>=38)) && Math.abs(player.y - hazard.y) <= hazard.width * 0.5 + pr;
    if (hazard.kind === 'pulse') {
      const d = Math.hypot(player.x - hazard.x, player.y - hazard.y);
      return Math.abs(d - hazard.radius) <= hazard.width * 0.5 + pr;
    }
    return false;
  };
  NV.updateSectorEncounter = function (dt, hazards, state, ctx) {
    hazards = hazards || [];
    state = state || NV.createSectorEncounterState();
    ctx = ctx || {};
    const profile = NV.sectorEncounterForWave(ctx.wave);
    const bossActive = !!(ctx.boss && !ctx.boss.dead);
    const bossLanes = bossActive ? NV.BOSS_SECTOR_COMPATIBILITY[ctx.boss.primaryAttack || ctx.boss.attack] || 0 : 0;
    const eligible = !!(profile.hazard && (!bossActive || bossLanes) && !ctx.waveEvent && !ctx.transitioning && !ctx.combatLabMode);
    if (bossActive !== !!state.bossMode) {
      removeSectorHazards(hazards); state.bossMode = bossActive;
      state.timer = bossActive ? 6.5 : INITIAL_DELAY; state.serial = 0; state.laserHitCooldown = 0;
    }
    state.active = eligible;
    if (!eligible) {
      removeSectorHazards(hazards);
      return { hazards, state, shake: ctx.shake || 0 };
    }

    if(profile.hazard==='vent'||profile.hazard==='rift'||bossLanes) {
      state.laserHitCooldown=Math.max(0,(state.laserHitCooldown||0)-Math.max(0,dt));
      let group=hazards.filter(h=>h.type==='sectorHazard' && h.laserHead && h.state!=='dead');
      if(group.some(h=>h.W!==(ctx.W||900)||h.H!==(ctx.H||520))){
        removeSectorHazards(hazards);state.timer=.4;state.laserHitCooldown=0;
        return {hazards,state,shake:ctx.shake||0}; // Resize cancela y vuelve a avisar.
      }
      if(!group.length) {
        state.timer-=Math.max(0,dt||0);
        if(state.timer<=0) {
          // No arrancar un ambiente sobre una mira ya anunciada. El coordinator
          // hará lo recíproco: el boss espera durante telegraph/active del láser.
          const encounter = ctx.boss && ctx.boss.encounter;
          if (bossActive && encounter && (encounter.stage !== 'recovery' || encounter.idlePressure || (ctx.boss.worldMove && ctx.boss.worldMove.target)))
            return { hazards, state, shake: ctx.shake || 0 };
          const W=ctx.W||900,H=ctx.H||520;
          const pattern = NV.sectorLaserPattern(state.serial++,W,H);
          group=(bossActive ? pattern.slice(0, bossLanes) : pattern).map(lane=>({
            ...lane,type:'sectorHazard',laserHead:true,label:'LÁSER',profileId:profile.id,color:'#ff3b4f',
            state:'telegraph',stateTime:0,simTime:0,emergeTime:.45,telegraphTime:1.65,
            activeTime:2,recoveryTime:.55,damage:16,
          }));
          hazards.push(...group);
        }
        return {hazards,state,shake:ctx.shake||0};
      }
      // Todo el grupo comparte fases; una caída de FPS no salta del aviso al daño.
      const wasActive=group.some(h=>h.state==='active');
      for(const h of group) {
        h.cameraReady = !NV.cameraHazardReady || NV.cameraHazardReady(h, dt);
        h.simTime+=dt;h.stateTime+=dt;
        if(h.state==='telegraph' && h.stateTime>=h.telegraphTime) {h.state='active';h.stateTime=0;}
        else if(h.state==='active' && h.stateTime>=h.activeTime) {h.state='recovery';h.stateTime=0;}
        else if(h.state==='recovery' && h.stateTime>=h.recoveryTime) h.state='dead';
      }
      const touching=wasActive && group.find(h=>h.cameraReady && h.state==='active' && NV.sectorHazardContains(h,ctx.player,ctx.playerRadius));
      if(touching && state.laserHitCooldown<=0) {
        state.laserHitCooldown=.65; // Un cruce no aplica seis impactos simultáneos.
        const hit=ctx.applyPlayerDamage && ctx.applyPlayerDamage(touching.damage,{
          cause:'sector-laser',hazard:touching,allowCrit:false,allowDodge:false,respectInvulnerability:true,
        });
        if(hit&&hit.killed&&ctx.onPlayerKilled)ctx.onPlayerKilled(hit);
      }
      if(group.every(h=>h.state==='dead')) {removeSectorHazards(hazards);state.timer=bossActive ? 8 : 4.2;}
      return {hazards,state,shake:ctx.shake||0};
    }

    let current = null;
    for (const h of hazards) if (h && h.type === 'sectorHazard' && h.state !== 'dead') { current = h; break; }
    if (!current) {
      state.timer -= Math.max(0, dt || 0);
      if (state.timer <= 0) {
        current = createHazard(profile, state, ctx);
        hazards.push(current);
        // El frame que crea el telegraph no consume su duración: una caída puntual
        // de FPS nunca puede saltarse el aviso y activar daño instantáneo.
        return { hazards, state, shake: ctx.shake || 0 };
      }
    }
    if (!current) return { hazards, state, shake: ctx.shake || 0 };

    current.simTime += dt; current.stateTime += dt;
    const cameraReady = !NV.cameraHazardReady || NV.cameraHazardReady(current, dt);
    if (current.state === 'telegraph' && current.stateTime >= current.telegraphTime) {
      current.state = 'active'; current.stateTime = 0;
      if (ctx.sfx && ctx.sfx.sectorHazard) ctx.sfx.sectorHazard(current.kind);
    } else if (current.state === 'active') {
      if (cameraReady && !current.contactResolved && NV.sectorHazardContains(current, ctx.player, ctx.playerRadius)) {
        current.contactResolved = true;
        const hit = ctx.applyPlayerDamage ? ctx.applyPlayerDamage(current.damage, {
          cause: 'sector-' + current.kind, hazard: current, allowCrit: false, allowDodge: false,
          respectInvulnerability: true,
        }) : null;
        if (hit && hit.applied) {
          if (ctx.triggerFlash) ctx.triggerFlash(current.color);
          if (typeof ctx.shake === 'number') ctx.shake = Math.max(ctx.shake, 0.24);
        }
        if (hit && hit.killed && ctx.onPlayerKilled) ctx.onPlayerKilled(hit);
      }
      if (current.stateTime >= current.activeTime) { current.state = 'recovery'; current.stateTime = 0; }
    } else if (current.state === 'recovery' && current.stateTime >= current.recoveryTime) {
      current.state = 'dead'; state.timer = COOLDOWN;
    }
    if (current.state === 'dead') removeSectorHazards(hazards);
    return { hazards, state, shake: ctx.shake || 0 };
  };
})();
