/* COSMIC ROLL — real 3D visual experiment.
 * Gameplay coordinates remain authoritative: x/y maps directly to 3D x/z. */
(() => {
  'use strict';
  const NV = window.NV, T = window.THREE, gameCanvas = NV.canvas;
  if (!T || !gameCanvas) return;

  const controls = document.createElement('aside');
  controls.className = 'roll-controls';
  controls.innerHTML =
    '<strong>COSMIC ROLL <small>PRUEBA 3D REAL</small></strong>' +
    '<button id="roll-toggle" type="button">Vista 3D</button>' +
    '<label>Cámara <input id="roll-camera" type="range" min="30" max="62" value="43" aria-label="Inclinación de cámara"><output id="roll-camera-value">43°</output></label>' +
    '<span id="roll-status" role="status">Terreno cósmico · esfera rodante · profundidad</span>';
  document.body.append(controls);
  const canvas = document.createElement('canvas');
  canvas.id = 'roll-canvas'; canvas.setAttribute('aria-hidden', 'true');
  gameCanvas.parentElement.insertBefore(canvas, gameCanvas);

  let renderer, scene, camera, floor, floorMaterial, grid, border, keyLight, raycaster, terrain, horizon, trailLine;
  let ready = false, active = false, contextLost = false, inWorld = false;
  let pitch = 43, frame = 0, cameraEnv = null, serial = 0, visualTime = 0;
  const models = new Map(), projectiles = new Map();
  const pointer = new T.Vector2(), hit = new T.Vector3();
  const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const cameraTarget = new T.Vector3(), desiredTarget = new T.Vector3(), playerMotion = new T.Vector3();
  const terrainMarks = [], speedStreaks = [], trailHistory = [], burstParticles = [];
  let previousPlayer = null;
  const originalScreenToGame = NV.screenToGame;
  const status = document.getElementById('roll-status');

  function material(color, glow = 0.25, roughness = 0.38) {
    return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness, metalness: 0.18 });
  }
  function aura(color, opacity = 0.22) {
    return new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  }
  function shell(geometry, color, scale = 1.08, opacity = 0.18) {
    const mesh = new T.Mesh(geometry, aura(color, opacity)); mesh.scale.setScalar(scale); return mesh;
  }
  function hash2(x, z, salt = 0) {
    const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453123;
    return value - Math.floor(value);
  }
  function rotateToward(mesh, direction) {
    if (direction.lengthSq() < 0.001) return;
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.clone().normalize());
  }
  function makeFloorTexture() {
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d'); ctx.fillStyle = '#06162b'; ctx.fillRect(0, 0, 512, 512);
    const glow = ctx.createRadialGradient(256, 256, 8, 256, 256, 340); glow.addColorStop(0, '#103b5f'); glow.addColorStop(0.55, '#092641'); glow.addColorStop(1, '#041020'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 512);
    ctx.lineWidth = 2; ctx.strokeStyle = '#1a769555';
    for (let index = 0; index < 9; index++) { const offset = (index * 57) % 512; ctx.beginPath(); ctx.moveTo(-50, offset); ctx.bezierCurveTo(135, offset - 55, 285, offset + 70, 562, offset - 36); ctx.stroke(); }
    ctx.strokeStyle = '#6648b344'; ctx.lineWidth = 1;
    for (let index = 0; index < 18; index++) { const x = (index * 83) % 512, y = (index * 157) % 512; ctx.beginPath(); ctx.arc(x, y, 12 + index % 4 * 8, 0, Math.PI * 1.45); ctx.stroke(); }
    for (let index = 0; index < 90; index++) { const x = (index * 71) % 512, y = (index * 131) % 512; ctx.fillStyle = index % 4 ? '#4ec9e744' : '#f084e744'; ctx.fillRect(x, y, 2 + index % 3, 2 + index % 3); }
    const map = new T.CanvasTexture(textureCanvas); map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.repeat.set(5, 5); return map;
  }
  function ring(color, radius, tube, tiltX, tiltZ) {
    const mesh = new T.Mesh(new T.TorusGeometry(radius, tube, 8, 38), material(color, 0.55, 0.3));
    mesh.rotation.set(tiltX || 0, 0, tiltZ || 0);
    return mesh;
  }
  function spikes(parent, color, count, radius, length, seed = 0) {
    const spikeMaterial = material(color, 0.58, 0.28), up = new T.Vector3(0, 1, 0);
    for (let index = 0; index < count; index++) {
      const golden = 2.399963229728653, y = 1 - index / Math.max(1, count - 1) * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y)), angle = index * golden + seed;
      const direction = new T.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
      const stretch = 0.75 + ((index * 17 + 7) % 5) * 0.08;
      const cone = new T.Mesh(new T.ConeGeometry(radius * 0.16, length * stretch, 8), spikeMaterial);
      cone.position.copy(direction).multiplyScalar(radius + length * stretch * 0.48);
      cone.quaternion.setFromUnitVectors(up, direction); cone.castShadow = true; parent.add(cone);
    }
  }
  function eyes(radius) {
    const face = new T.Group(), white = material('#efffff', 0.3, 0.25), pupil = material('#07121f', 0, 0.75);
    for (const side of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(radius * 0.19, 12, 9), white);
      eye.position.set(side * radius * 0.24, radius * 0.11, radius * 0.66);
      const dot = new T.Mesh(new T.SphereGeometry(radius * 0.075, 10, 8), pupil);
      dot.position.set(side * radius * 0.24, radius * 0.10, radius * 0.81);
      face.add(eye, dot);
    }
    return face;
  }
  function playerModel(player) {
    const char = NV.CHARACTERS[player.character] || NV.CHARACTERS.boti, radius = Math.max(14, Number(char.size) || 20);
    const root = new T.Group(), rolling = new T.Group();
    const bodyColor = char.bodyColor || char.color || '#8cf8ff';
    const coreGeometry = new T.SphereGeometry(radius * 0.72, 30, 22);
    const core = new T.Mesh(coreGeometry, material(bodyColor, 0.58, 0.27));
    core.castShadow = core.receiveShadow = true; rolling.add(core, shell(coreGeometry, bodyColor, 1.16, 0.18));
    const orbit = new T.Group(); rolling.add(orbit);
    if (player.character === 'boti') {
      const knot = new T.TorusKnotGeometry(radius * 0.19, Math.max(0.65, radius * 0.035), 48, 8, 2, 3);
      for (let index = 0; index < 5; index++) { const angle = index / 5 * Math.PI * 2; const lobe = new T.Mesh(knot, material(index % 2 ? '#b6ffff' : '#36cfff', 0.72, 0.24)); lobe.position.set(Math.cos(angle) * radius * 0.6, Math.sin(angle * 2) * radius * 0.18, Math.sin(angle) * radius * 0.6); lobe.rotation.set(angle, angle * 0.7, -angle); orbit.add(lobe); }
      spikes(rolling, '#57f6ff', 9, radius * 0.66, radius * 0.34, 0.2);
      rolling.add(ring('#b6ffff', radius * 0.92, Math.max(0.75, radius * 0.045), 0.62, 0.22), ring('#1bd2ff', radius * 0.79, Math.max(0.65, radius * 0.035), 1.25, -0.4));
    } else if (player.character === 'nova') {
      spikes(rolling, '#ff7b2f', 20, radius * 0.57, radius * 0.72, 0.7);
      for (let index = 0; index < 8; index++) { const angle = index / 8 * Math.PI * 2; const fin = new T.Mesh(new T.ConeGeometry(radius * 0.11, radius * (index % 2 ? 0.72 : 0.48), 5), material(index % 2 ? '#ffe070' : '#ff6a35', 0.9, 0.2)); fin.position.set(Math.cos(angle) * radius * 0.75, 0, Math.sin(angle) * radius * 0.75); fin.rotation.z = Math.PI / 2; fin.rotation.y = -angle; orbit.add(fin); }
      rolling.add(ring('#ffe070', radius * 0.62, Math.max(0.7, radius * 0.05), 0, 0));
    } else if (player.character === 'rook') {
      for (let index = 0; index < 8; index++) { const angle = index / 8 * Math.PI * 2; const long = index % 2 === 0; const plate = new T.Mesh(new T.OctahedronGeometry(radius * (long ? 0.31 : 0.2), 0), material(long ? '#dfb4ff' : '#7846de', 0.64, 0.24)); plate.position.set(Math.cos(angle) * radius * (long ? 0.72 : 0.61), Math.sin(angle * 2) * radius * 0.16, Math.sin(angle) * radius * (long ? 0.72 : 0.61)); plate.scale.set(long ? 0.72 : 1, 1.8, long ? 1.65 : 1); plate.rotation.set(angle * 0.3, -angle, angle * 0.2); orbit.add(plate); }
      spikes(rolling, '#b56dff', 8, radius * 0.67, radius * 0.62, 1.4);
      rolling.add(ring('#ffe17b', radius * 0.89, Math.max(0.9, radius * 0.05), 0.85, 0.15), ring('#ffe17b', radius * 0.63, Math.max(0.7, radius * 0.035), -0.4, 0.7));
    } else {
      for (let index = 0; index < 6; index++) { const angle = index / 6 * Math.PI * 2 + 0.2; const satellite = new T.Mesh(new T.TetrahedronGeometry(radius * (index % 2 ? 0.25 : 0.18), 0), material(index % 2 ? '#fff19b' : '#8ffff2', 0.72, 0.2)); satellite.position.set(Math.cos(angle) * radius * (0.74 + index % 2 * 0.13), Math.sin(angle * 3) * radius * 0.24, Math.sin(angle) * radius * (0.74 + index % 2 * 0.13)); satellite.rotation.set(angle, -angle, angle * 1.7); orbit.add(satellite); }
      spikes(rolling, '#fff19b', 10, radius * 0.58, radius * 0.34, 0.4);
      rolling.add(ring('#fff3a3', radius * 0.97, Math.max(0.75, radius * 0.045), 1.12, 0.4), ring('#d8ffff', radius * 0.78, Math.max(0.6, radius * 0.032), 0.35, -0.7));
    }
    const face = eyes(radius); root.add(rolling, face);
    root.userData = { rolling, orbit, face, core, radius, characterId: player.character, previousX: player.x, previousZ: player.y, color:bodyColor };
    return root;
  }
  function enemyModel(entity) {
    const radius = Math.max(12, Number(entity.radius) || 25), root = new T.Group(), rolling = new T.Group();
    const color = entity.color || '#ff4f62', identity = String(entity.enemyTypeId || entity.shape || 'enemy');
    const geometry = /tank|guard|core/.test(identity) ? new T.DodecahedronGeometry(radius * 0.72, 0)
      : /runner|archer|triangle/.test(identity) ? new T.TetrahedronGeometry(radius * 0.85, 0)
        : /spitter|hex/.test(identity) ? new T.OctahedronGeometry(radius * 0.78, 1) : new T.IcosahedronGeometry(radius * 0.75, 2);
    const core = new T.Mesh(geometry, material(color, entity.isElite ? 0.8 : 0.4));
    core.castShadow = true; rolling.add(core, shell(geometry, color, 1.16, entity.isElite ? 0.22 : 0.12));
    if (/wisp|specter|phantom/.test(identity)) {
      rolling.add(ring('#ff789d', radius * 0.84, Math.max(0.55, radius * 0.04), 0.7, 0.3), ring('#af6cff', radius * 0.57, Math.max(0.42, radius * 0.025), -0.45, 0.8));
      for (let index = 0; index < 4; index++) { const a = index * Math.PI * 0.5; const shard = new T.Mesh(new T.TetrahedronGeometry(radius * 0.18), material('#ffb0cf', 0.7, 0.2)); shard.position.set(Math.cos(a) * radius * 0.92, Math.sin(a * 2) * radius * 0.2, Math.sin(a) * radius * 0.92); rolling.add(shard); }
    } else if (/tank|guard|core|goliath/.test(identity)) {
      for (let index = 0; index < 6; index++) { const a = index / 6 * Math.PI * 2; const plate = new T.Mesh(new T.BoxGeometry(radius * 0.35, radius * 0.18, radius * 0.28), material('#ff9a61', 0.36, 0.34)); plate.position.set(Math.cos(a) * radius * 0.64, 0, Math.sin(a) * radius * 0.64); plate.rotation.y = -a; rolling.add(plate); }
      spikes(rolling, color, entity.isElite ? 12 : 7, radius * 0.63, radius * (entity.isElite ? 0.42 : 0.28), radius * 0.07);
    } else if (/runner|archer|triangle|predator/.test(identity)) {
      for (let index = 0; index < 3; index++) { const a = index / 3 * Math.PI * 2; const fin = new T.Mesh(new T.ConeGeometry(radius * 0.14, radius * 0.72, 5), material('#ffe26b', 0.7, 0.18)); fin.position.set(Math.cos(a) * radius * 0.75, 0, Math.sin(a) * radius * 0.75); fin.rotation.z = Math.PI / 2; fin.rotation.y = -a; rolling.add(fin); }
    } else spikes(rolling, color, entity.isElite ? 10 : 6, radius * 0.62, radius * (entity.isElite ? 0.42 : 0.28), radius * 0.07);
    const face = eyes(radius * 0.8); root.add(rolling, face);
    root.userData = { rolling, face, core, radius, previousX: entity.x, previousZ: entity.y }; return root;
  }
  function bossModel(entity) {
    const radius = Math.max(56, Number(entity.radius) || 72), root = new T.Group(), sun = new T.Group(), color = entity.color || '#ff6d9b';
    const coreGeometry = new T.IcosahedronGeometry(radius * 0.68, 3);
    const core = new T.Mesh(coreGeometry, material(color, 1.05, 0.2));
    const inner = new T.Mesh(new T.IcosahedronGeometry(radius * 0.48, 2), material('#fff0f5', 1.2, 0.14));
    core.castShadow = true; sun.add(core, inner, shell(coreGeometry, color, 1.2, 0.14));
    spikes(sun, color, 24, radius * 0.66, radius * 0.82, 0.4);
    const corona = new T.Group();
    for (let index = 0; index < 12; index++) { const angle = index / 12 * Math.PI * 2; const flame = new T.Mesh(new T.ConeGeometry(radius * 0.12, radius * (0.45 + index % 3 * 0.12), 6), material(index % 2 ? '#ffcf86' : '#ff7ab5', 0.95, 0.18)); flame.position.set(Math.cos(angle) * radius * 1.08, Math.sin(angle * 3) * radius * 0.15, Math.sin(angle) * radius * 1.08); flame.rotation.z = Math.PI / 2; flame.rotation.y = -angle; corona.add(flame); }
    sun.add(corona, ring('#ffb9d0', radius * 1.05, Math.max(1.4, radius * 0.032), 0.55, 0.1), ring('#ff8db6', radius * 0.83, Math.max(1, radius * 0.024), 1.25, -0.4), ring('#ffd783', radius * 1.28, Math.max(0.8, radius * 0.018), -0.25, 0.72));
    const face = eyes(radius * 0.86); root.add(sun, face);
    root.userData = { rolling: sun, corona, face, core, radius, previousX: entity.x, previousZ: entity.y }; return root;
  }
  function createModel(entity, kind) {
    const object = kind === 'player' ? playerModel(entity) : kind === 'boss' ? bossModel(entity) : enemyModel(entity);
    object.userData.kind = kind; scene.add(object); const record = { entity, kind, object, visibleAt: serial }; models.set(entity, record); return record;
  }
  function upsert(entity, kind) {
    if (!entity || entity.dead) return;
    let record = models.get(entity);
    if (!record || record.kind !== kind || (kind === 'player' && record.object.userData.characterId !== entity.character)) {
      if (record) { scene.remove(record.object); models.delete(entity); } record = createModel(entity, kind);
    }
    const data = record.object.userData, x = Number(entity.x) || 0, z = Number(entity.y) || 0;
    const dx = x - data.previousX, dz = z - data.previousZ, radius = Math.max(1, data.radius);
    data.rolling.rotation.z -= dx / radius; data.rolling.rotation.x += dz / radius;
    if (data.orbit) { data.orbit.rotation.y += 0.018; data.orbit.rotation.z = Math.sin(visualTime * 1.4) * 0.14; }
    if (kind === 'boss') { data.rolling.rotation.y += 0.015; if (data.corona) { data.corona.rotation.y -= 0.008; data.corona.rotation.z = Math.sin(visualTime * 0.8) * 0.12; } }
    const pulse = entity.atkFlash > 0 ? 1 + Math.sin((entity.atkFlash || 0) * 12) * 0.08 : 1 + Math.sin(visualTime * 2.2 + x * 0.01) * 0.018;
    data.rolling.scale.setScalar(pulse);
    record.object.position.set(x, radius * (kind === 'boss' ? 0.78 : 0.72), z);
    data.face.quaternion.copy(camera.quaternion); data.previousX = x; data.previousZ = z; record.object.visible = true; record.visibleAt = serial;
    if (kind === 'player') updateTrail(x, z, Math.hypot(dx, dz), data.color);
  }
  function bulletMesh(bullet) {
    const color = bullet.color || (bullet.enemy ? '#ff3b4f' : '#dffcff');
    const group = new T.Group(), core = new T.Mesh(new T.SphereGeometry(3.8, 12, 9), material(color, 1.1, 0.18));
    const halo = new T.Mesh(new T.SphereGeometry(6.4, 10, 8), aura(color, 0.32));
    const tail = new T.Mesh(new T.CylinderGeometry(1.4, 0.12, 16, 8), aura(color, 0.48)); tail.rotation.x = Math.PI / 2; tail.position.z = 7;
    core.castShadow = true; group.add(core, halo, tail); group.userData = { color, previousX: bullet.x, previousZ: bullet.y, tail }; scene.add(group); return group;
  }
  function syncProjectiles(bullets) {
    const alive = new Set();
    for (const bullet of Array.isArray(bullets) ? bullets : []) {
      if (!bullet || bullet.dead || !Number.isFinite(bullet.x) || !Number.isFinite(bullet.y)) continue;
      alive.add(bullet); let mesh = projectiles.get(bullet); if (!mesh) { mesh = bulletMesh(bullet); projectiles.set(bullet, mesh); }
      const size = Math.max(2, Math.min(10, Number(bullet.radius) || 3)); const dx = bullet.x - mesh.userData.previousX, dz = bullet.y - mesh.userData.previousZ;
      mesh.position.set(bullet.x, size + 2, bullet.y); mesh.scale.setScalar(size / 3.8); mesh.visible = true;
      if (Math.abs(dx) + Math.abs(dz) > 0.02) mesh.rotation.y = Math.atan2(dx, dz);
      mesh.userData.previousX = bullet.x; mesh.userData.previousZ = bullet.y;
    }
    for (const [bullet, mesh] of projectiles) if (!alive.has(bullet)) { addBurst(mesh.position, mesh.userData.color); scene.remove(mesh); projectiles.delete(bullet); }
  }
  function makeTerrain() {
    terrain = new T.Group(); scene.add(terrain);
    const shardGeometry = new T.IcosahedronGeometry(1, 1), slabGeometry = new T.BoxGeometry(1, 1, 1), ringGeometry = new T.TorusGeometry(1, 0.055, 6, 20);
    const shardMaterial = material('#168dc5', 0.5, 0.32), hotMaterial = material('#b94cba', 0.68, 0.25), ringMaterial = aura('#4ee5ff', 0.46);
    for (let index = 0; index < 76; index++) {
      const kind = index % 3; const object = kind === 0 ? new T.Mesh(shardGeometry, shardMaterial) : kind === 1 ? new T.Mesh(slabGeometry, hotMaterial) : new T.Mesh(ringGeometry, ringMaterial);
      object.userData.index = index; object.userData.kind = kind; object.castShadow = kind !== 2; object.receiveShadow = kind !== 2; terrain.add(object); terrainMarks.push(object);
    }
    const streakGeometry = new T.BufferGeometry(); streakGeometry.setAttribute('position', new T.Float32BufferAttribute(6, 3));
    for (let index = 0; index < 18; index++) { const line = new T.Line(streakGeometry.clone(), new T.LineBasicMaterial({ color:index % 2 ? '#8feeff' : '#be7cff', transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false })); line.frustumCulled = false; scene.add(line); speedStreaks.push({ line, phase:index * 0.618 }); }
    const historyGeometry = new T.BufferGeometry(); historyGeometry.setAttribute('position', new T.Float32BufferAttribute(42 * 3, 3)); historyGeometry.setDrawRange(0, 0);
    trailLine = new T.Line(historyGeometry, new T.LineBasicMaterial({ color:'#8cf8ff', transparent:true, opacity:0.64, blending:T.AdditiveBlending, depthWrite:false })); trailLine.frustumCulled = false; scene.add(trailLine);
    for (let index = 0; index < 96; index++) { const mesh = new T.Mesh(new T.TetrahedronGeometry(1.8, 0), new T.MeshBasicMaterial({ color:'#dffcff', transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false })); mesh.visible = false; scene.add(mesh); burstParticles.push({ mesh, life:0, velocity:new T.Vector3() }); }
    horizon = new T.Group(); scene.add(horizon);
    for (let index = 0; index < 16; index++) { const ringMesh = new T.Mesh(new T.TorusGeometry(90 + index % 4 * 64, 0.85, 6, 64), aura(index % 2 ? '#8b4dff' : '#257fa6', 0.13)); ringMesh.rotation.x = Math.PI / 2; ringMesh.position.y = -0.18 - index % 3 * 0.04; horizon.add(ringMesh); }
  }
  function updateTerrain(env) {
    const cell = 130, cx = Math.floor(env.centerX / cell), cz = Math.floor(env.centerY / cell);
    for (const mark of terrainMarks) {
      const index = mark.userData.index, ix = index % 11 - 5, iz = Math.floor(index / 11) - 3;
      const hx = cx + ix, hz = cz + iz, a = hash2(hx, hz, index), b = hash2(hz, hx, index + 12);
      mark.position.set((hx + 0.12 + a * 0.76) * cell, mark.userData.kind === 2 ? 0.38 : 1.8 + b * 10, (hz + 0.12 + b * 0.76) * cell);
      mark.rotation.set(a * 2.3, b * Math.PI * 2, (a - b) * 0.45);
      if (index % 3 === 0) mark.scale.set(3 + a * 10, 7 + b * 22, 3 + a * 10);
      else if (index % 3 === 1) mark.scale.set(12 + a * 24, 0.35 + b * 0.8, 4 + a * 12);
      else mark.scale.setScalar(18 + a * 26);
    }
    horizon.position.set(env.centerX * 0.16, 0, env.centerY * 0.16);
    horizon.rotation.y = visualTime * 0.015;
  }
  function updateTrail(x, z, speed, color) {
    if (speed > 0.28 && (trailHistory.length === 0 || Math.hypot(trailHistory[0].x - x, trailHistory[0].z - z) > 3.5)) trailHistory.unshift(new T.Vector3(x, 2.2, z));
    if (trailHistory.length > 42) trailHistory.pop();
    if (trailLine && trailHistory.length > 1) { const attribute = trailLine.geometry.attributes.position; for (let index = 0; index < trailHistory.length; index++) attribute.setXYZ(index, trailHistory[index].x, 2.15 + index * 0.012, trailHistory[index].z); attribute.needsUpdate = true; trailLine.geometry.setDrawRange(0, trailHistory.length); trailLine.material.color.set(color || '#8cf8ff'); trailLine.material.opacity = Math.min(0.82, 0.32 + speed * 0.18); }
  }
  function updateSpeedStreaks(player) {
    if (!player) return;
    if (!previousPlayer) { previousPlayer = { x:player.x, z:player.y }; return; }
    const vx = player.x - previousPlayer.x, vz = player.y - previousPlayer.z, speed = Math.hypot(vx, vz);
    if (speed > 0.02) playerMotion.set(vx, 0, vz).normalize();
    for (let index = 0; index < speedStreaks.length; index++) {
      const item = speedStreaks[index], line = item.line, side = ((index * 17) % 9 - 4) * 8;
      const lateral = new T.Vector3(-playerMotion.z, 0, playerMotion.x).multiplyScalar(side + Math.sin(visualTime * 2 + item.phase) * 6);
      const start = new T.Vector3(player.x, 1.2 + (index % 3) * 1.4, player.y).add(lateral).addScaledVector(playerMotion, -20 - (index % 5) * 6);
      const end = start.clone().addScaledVector(playerMotion, -Math.max(12, speed * (12 + index % 4 * 5)));
      const positions = line.geometry.attributes.position; positions.setXYZ(0, start.x, start.y, start.z); positions.setXYZ(1, end.x, end.y, end.z); positions.needsUpdate = true;
      line.material.opacity = Math.min(0.5, speed * 0.08) * (0.7 + (index % 3) * 0.12);
    }
    previousPlayer = { x:player.x, z:player.y };
  }
  function addBurst(position, color) {
    for (let index = 0; index < 10; index++) { const particle = burstParticles.find(item => item.life <= 0); if (!particle) break; const angle = index / 10 * Math.PI * 2 + visualTime; particle.life = 0.55 + (index % 3) * 0.08; particle.mesh.position.copy(position); particle.mesh.material.color.set(color); particle.mesh.material.opacity = 0.86; particle.mesh.visible = true; particle.velocity.set(Math.cos(angle) * (16 + index * 2), 8 + (index % 4) * 4, Math.sin(angle) * (16 + index * 2)); }
  }
  function updateBursts() {
    for (const particle of burstParticles) { if (particle.life <= 0) continue; particle.life -= 1 / 60; particle.mesh.position.addScaledVector(particle.velocity, 1 / 60); particle.velocity.y -= 0.4; particle.mesh.rotation.x += 0.14; particle.mesh.rotation.y += 0.09; particle.mesh.material.opacity = Math.max(0, particle.life * 1.35); if (particle.life <= 0) particle.mesh.visible = false; }
  }
  function floorFit(env) {
    const width = Math.max(800, env.cameraW * 1.65), depth = Math.max(620, env.cameraH * 1.85);
    floor.scale.set(width / 1000, depth / 1000, 1); floor.position.set(env.centerX, 0, env.centerY);
    if (floorMaterial && floorMaterial.map) { floorMaterial.map.repeat.set(Math.max(3, width / 170), Math.max(3, depth / 150)); floorMaterial.map.offset.set(env.centerX / width, -env.centerY / depth); floorMaterial.map.needsUpdate = true; }
    grid.scale.set(width / 1000, 1, depth / 1000); grid.position.set(env.centerX, 0.25, env.centerY);
    border.scale.set(width / 1000, 1, depth / 1000); border.position.set(env.centerX, 1, env.centerY);
    updateTerrain(env);
  }
  function setActive(value) {
    active = !!value && ready && !contextLost; document.documentElement.dataset.depth = active ? 'roll3d' : '2d'; canvas.style.display = active ? 'block' : 'none';
    document.getElementById('roll-toggle').textContent = active ? 'Vista 3D · comparar 2D' : 'Vista 2D · volver a 3D';
    status.textContent = contextLost ? 'WebGL no disponible · referencia 2D' : active ? 'Terreno cósmico · esfera rodante · profundidad' : 'Referencia Canvas 2D';
    if (!active) for (const record of models.values()) record.object.visible = false;
  }
  function initialize() {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1)); renderer.setClearColor(0x02030c);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.8;
    scene = new T.Scene(); scene.fog = new T.FogExp2(0x02030c, 0.00032); camera = new T.PerspectiveCamera(44, 16 / 9, 1, 6000);
    scene.add(new T.HemisphereLight(0x8caaff, 0x02020a, 2.25)); keyLight = new T.DirectionalLight(0xd0f8ff, 5.4); keyLight.position.set(-380, 700, 260); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight);
    const rim = new T.PointLight(0xff4eae, 75, 950, 2); rim.position.set(0, 180, -200); scene.add(rim);
    const cyanRim = new T.PointLight(0x2aeaff, 48, 700, 2); cyanRim.position.set(260, 90, 220); scene.add(cyanRim);
    floorMaterial = new T.MeshStandardMaterial({ color: '#11385a', emissive: '#07152a', emissiveIntensity: 0.72, roughness: 0.48, metalness: 0.58, map:makeFloorTexture() });
    floor = new T.Mesh(new T.PlaneGeometry(1000, 1000), floorMaterial); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    grid = new T.GridHelper(1000, 20, 0x217ca8, 0x0d2848); grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
    border = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1000, 18, 1000)), new T.LineBasicMaterial({ color: '#67eeff', transparent: true, opacity: 0.28 })); scene.add(border);
    makeTerrain();
    const stars = new T.BufferGeometry(), points = [];
    for (let index = 0; index < 500; index++) { const angle = index * 2.399963, radial = 700 + (index * 79 % 1600); points.push(Math.cos(angle) * radial, 260 + index % 9 * 90, Math.sin(angle) * radial); }
    stars.setAttribute('position', new T.Float32BufferAttribute(points, 3)); scene.add(new T.Points(stars, new T.PointsMaterial({ color: '#86caff', size: 2.1, transparent: true, opacity: 0.72, sizeAttenuation: true })));
    raycaster = new T.Raycaster(); ready = true; setActive(true);
  }
  try { initialize(); } catch (error) { ready = false; status.textContent = 'WebGL no disponible · referencia 2D'; document.documentElement.dataset.depth = '2d'; console.warn('COSMIC ROLL fallback:', error.message); }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; setActive(false); });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; status.textContent = 'Contexto restaurado · pulsá Vista 2D para volver'; });
  document.getElementById('roll-toggle').addEventListener('click', () => setActive(!active));
  document.getElementById('roll-camera').addEventListener('input', event => { pitch = Number(event.target.value); document.getElementById('roll-camera-value').value = pitch + '°'; });
  for (const name of ['keydown', 'keyup', 'mousedown', 'mouseup']) controls.addEventListener(name, event => event.stopPropagation());

  const originalRenderers = {};
  for (const [name, kind] of [['drawPlayer', 'player'], ['drawEnemy', 'enemy'], ['drawBoss', 'boss'], ['drawSpectralBoss2D', 'boss']]) {
    if (typeof NV[name] !== 'function') continue;
    originalRenderers[name] = NV[name];
    NV[name] = function (...args) { if (active && inWorld && args[0] === NV.ctx) { upsert(args[1], kind); return; } return originalRenderers[name](...args); };
  }
  function begin(nextEnv) { cameraEnv = nextEnv; frame = nextEnv.frame || frame; inWorld = active; serial++; if (active) for (const record of models.values()) record.object.visible = false; }
  function compose(sourceCanvas, nextEnv) {
    inWorld = false; if (!active || !ready) return false; cameraEnv = Object.assign(cameraEnv || {}, nextEnv); syncProjectiles(cameraEnv.bullets);
    const rect = sourceCanvas.getBoundingClientRect(), width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    if (canvas.dataset.size !== width + ':' + height) { canvas.dataset.size = width + ':' + height; renderer.setSize(width, height, false); }
    canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'; canvas.style.left = sourceCanvas.offsetLeft + 'px'; canvas.style.top = sourceCanvas.offsetTop + 'px'; canvas.style.transform = sourceCanvas.style.transform;
    visualTime = frame / 60; const player = cameraEnv.player;
    if (player) { const px = Number(player.x) || cameraEnv.centerX, pz = Number(player.y) || cameraEnv.centerY; const vx = previousPlayer ? px - previousPlayer.x : 0, vz = previousPlayer ? pz - previousPlayer.z : 0; desiredTarget.set(cameraEnv.centerX + vx * 5.5, 0, cameraEnv.centerY + vz * 5.5 - cameraEnv.cameraH * 0.08); if (cameraTarget.lengthSq() < 1) cameraTarget.copy(desiredTarget); cameraTarget.lerp(desiredTarget, 0.18); }
    else cameraTarget.set(cameraEnv.centerX, 0, cameraEnv.centerY - cameraEnv.cameraH * 0.08);
    camera.aspect = width / height; const radians = pitch * Math.PI / 180, distance = Math.max(cameraEnv.cameraH * 0.98, 520), target = cameraTarget;
    camera.position.set(target.x, Math.sin(radians) * distance, target.z + Math.cos(radians) * distance); camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); keyLight.position.set(target.x - 280, 680, target.z + 230); floorFit(cameraEnv); updateSpeedStreaks(player); updateBursts();
    for (const [entity, record] of models) if (serial - record.visibleAt > 80) { scene.remove(record.object); models.delete(entity); }
    renderer.render(scene, camera); const context = sourceCanvas.getContext('2d'); context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height); return true;
  }
  NV.screenToGame = function (x, y) {
    const rect = gameCanvas.getBoundingClientRect();
    if (!active || !cameraEnv || y > rect.bottom - 118 || NV.getState() === 'menu') return originalScreenToGame(x, y);
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(groundPlane, hit) ? { x: hit.x, y: hit.z } : originalScreenToGame(x, y);
  };
  NV.proto3d = Object.freeze({
    begin, compose, setActive,
    setElevation(value) { pitch = Math.max(30, Math.min(62, Number(value) || 43)); document.getElementById('roll-camera').value = pitch; document.getElementById('roll-camera-value').value = pitch + '°'; },
    projectWorld(x, z, height = 0) { const rect = gameCanvas.getBoundingClientRect(), point = new T.Vector3(x, height, z).project(camera); return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 }; },
    snapshot() { return { ready, active, contextLost, elevation: pitch, entities: models.size, projectiles: projectiles.size, triangles: renderer ? renderer.info.render.triangles : 0, drawCalls: renderer ? renderer.info.render.calls : 0, frame }; },
  });
})();
