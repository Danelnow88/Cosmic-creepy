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
    '<span id="roll-status" role="status">Plano 3D · esfera rodante · perspectiva</span>';
  document.body.append(controls);
  const canvas = document.createElement('canvas');
  canvas.id = 'roll-canvas'; canvas.setAttribute('aria-hidden', 'true');
  gameCanvas.parentElement.insertBefore(canvas, gameCanvas);

  let renderer, scene, camera, floor, grid, border, keyLight, raycaster;
  let ready = false, active = false, contextLost = false, inWorld = false;
  let pitch = 43, frame = 0, cameraEnv = null, serial = 0;
  const models = new Map(), projectiles = new Map();
  const pointer = new T.Vector2(), hit = new T.Vector3();
  const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const originalScreenToGame = NV.screenToGame;
  const status = document.getElementById('roll-status');

  function material(color, glow = 0.25, roughness = 0.38) {
    return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness, metalness: 0.18 });
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
    const core = new T.Mesh(new T.SphereGeometry(radius * 0.72, 30, 22), material(char.bodyColor || char.color, 0.42));
    core.castShadow = core.receiveShadow = true; rolling.add(core);
    if (player.character === 'boti') {
      spikes(rolling, '#57f6ff', 12, radius * 0.63, radius * 0.48, 0.2);
      rolling.add(ring('#b6ffff', radius * 0.88, Math.max(0.75, radius * 0.045), 0.62, 0.22), ring('#1bd2ff', radius * 0.83, Math.max(0.65, radius * 0.035), 1.25, -0.4));
    } else if (player.character === 'nova') {
      spikes(rolling, '#ff7b2f', 18, radius * 0.58, radius * 0.6, 0.7); rolling.add(ring('#ffe070', radius * 0.58, Math.max(0.7, radius * 0.05), 0, 0));
    } else if (player.character === 'rook') {
      spikes(rolling, '#b56dff', 10, radius * 0.68, radius * 0.58, 1.4);
      rolling.add(ring('#ffe17b', radius * 0.86, Math.max(0.9, radius * 0.05), 0.85, 0.15), ring('#ffe17b', radius * 0.63, Math.max(0.7, radius * 0.035), -0.4, 0.7));
    } else {
      spikes(rolling, '#fff19b', 12, radius * 0.58, radius * 0.35, 0.4);
      rolling.add(ring('#fff3a3', radius * 0.95, Math.max(0.75, radius * 0.045), 1.12, 0.4), ring('#d8ffff', radius * 0.78, Math.max(0.6, radius * 0.032), 0.35, -0.7));
    }
    const face = eyes(radius); root.add(rolling, face);
    root.userData = { rolling, face, core, radius, characterId: player.character, previousX: player.x, previousZ: player.y };
    return root;
  }
  function enemyModel(entity) {
    const radius = Math.max(12, Number(entity.radius) || 25), root = new T.Group(), rolling = new T.Group();
    const color = entity.color || '#ff4f62', identity = String(entity.enemyTypeId || entity.shape || 'enemy');
    const geometry = /tank|guard|core/.test(identity) ? new T.DodecahedronGeometry(radius * 0.72, 0)
      : /runner|archer|triangle/.test(identity) ? new T.TetrahedronGeometry(radius * 0.85, 0)
        : /spitter|hex/.test(identity) ? new T.OctahedronGeometry(radius * 0.78, 1) : new T.IcosahedronGeometry(radius * 0.75, 2);
    const core = new T.Mesh(geometry, material(color, entity.isElite ? 0.7 : 0.34));
    core.castShadow = true; rolling.add(core);
    if (/wisp|specter/.test(identity)) rolling.add(ring('#ff789d', radius * 0.82, Math.max(0.55, radius * 0.04), 0.7, 0.3));
    else spikes(rolling, color, entity.isElite ? 10 : 6, radius * 0.62, radius * (entity.isElite ? 0.42 : 0.28), radius * 0.07);
    const face = eyes(radius * 0.8); root.add(rolling, face);
    root.userData = { rolling, face, core, radius, previousX: entity.x, previousZ: entity.y }; return root;
  }
  function bossModel(entity) {
    const radius = Math.max(56, Number(entity.radius) || 72), root = new T.Group(), sun = new T.Group(), color = entity.color || '#ff6d9b';
    const core = new T.Mesh(new T.IcosahedronGeometry(radius * 0.68, 3), material(color, 0.78, 0.26));
    core.castShadow = true; sun.add(core); spikes(sun, color, 18, radius * 0.64, radius * 0.72, 0.4);
    sun.add(ring('#ffb9d0', radius * 0.98, Math.max(1.4, radius * 0.032), 0.55, 0.1), ring('#ff8db6', radius * 0.83, Math.max(1, radius * 0.024), 1.25, -0.4));
    const face = eyes(radius * 0.86); root.add(sun, face);
    root.userData = { rolling: sun, face, core, radius, previousX: entity.x, previousZ: entity.y }; return root;
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
    if (kind === 'boss') data.rolling.rotation.y += 0.015;
    data.rolling.scale.setScalar(entity.atkFlash > 0 ? 1 + Math.sin((entity.atkFlash || 0) * 12) * 0.08 : 1);
    record.object.position.set(x, radius * (kind === 'boss' ? 0.78 : 0.72), z);
    data.face.quaternion.copy(camera.quaternion); data.previousX = x; data.previousZ = z; record.object.visible = true; record.visibleAt = serial;
  }
  function bulletMesh(bullet) {
    const color = bullet.color || (bullet.enemy ? '#ff3b4f' : '#dffcff');
    const mesh = new T.Mesh(new T.SphereGeometry(3.8, 12, 9), material(color, 1.1, 0.18)); mesh.castShadow = true; scene.add(mesh); return mesh;
  }
  function syncProjectiles(bullets) {
    const alive = new Set();
    for (const bullet of Array.isArray(bullets) ? bullets : []) {
      if (!bullet || bullet.dead || !Number.isFinite(bullet.x) || !Number.isFinite(bullet.y)) continue;
      alive.add(bullet); let mesh = projectiles.get(bullet); if (!mesh) { mesh = bulletMesh(bullet); projectiles.set(bullet, mesh); }
      const size = Math.max(2, Math.min(10, Number(bullet.radius) || 3)); mesh.position.set(bullet.x, size + 2, bullet.y); mesh.scale.setScalar(size / 3.8); mesh.visible = true;
    }
    for (const [bullet, mesh] of projectiles) if (!alive.has(bullet)) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); projectiles.delete(bullet); }
  }
  function floorFit(env) {
    const width = Math.max(800, env.cameraW * 1.65), depth = Math.max(620, env.cameraH * 1.85);
    floor.scale.set(width / 1000, depth / 1000, 1); floor.position.set(env.centerX, 0, env.centerY);
    grid.scale.set(width / 1000, 1, depth / 1000); grid.position.set(env.centerX, 0.25, env.centerY);
    border.scale.set(width / 1000, 1, depth / 1000); border.position.set(env.centerX, 1, env.centerY);
  }
  function setActive(value) {
    active = !!value && ready && !contextLost; document.documentElement.dataset.depth = active ? 'roll3d' : '2d'; canvas.style.display = active ? 'block' : 'none';
    document.getElementById('roll-toggle').textContent = active ? 'Vista 3D · comparar 2D' : 'Vista 2D · volver a 3D';
    status.textContent = contextLost ? 'WebGL no disponible · referencia 2D' : active ? 'Plano 3D · esfera rodante · perspectiva' : 'Referencia Canvas 2D';
    if (!active) for (const record of models.values()) record.object.visible = false;
  }
  function initialize() {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setClearColor(0x030611);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.8;
    scene = new T.Scene(); scene.fog = new T.FogExp2(0x030611, 0.00042); camera = new T.PerspectiveCamera(42, 16 / 9, 1, 6000);
    scene.add(new T.HemisphereLight(0xa9c8ff, 0x051020, 2.7)); keyLight = new T.DirectionalLight(0xc2f7ff, 4.8); keyLight.position.set(-380, 700, 260); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight);
    const rim = new T.PointLight(0xff5db1, 60, 900, 2); rim.position.set(0, 180, -200); scene.add(rim);
    floor = new T.Mesh(new T.PlaneGeometry(1000, 1000), new T.MeshStandardMaterial({ color: '#10385d', emissive: '#0a2345', emissiveIntensity: 0.74, roughness: 0.62, metalness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    grid = new T.GridHelper(1000, 20, 0x4ad5eb, 0x174a72); grid.material.transparent = true; grid.material.opacity = 0.8; scene.add(grid);
    border = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1000, 18, 1000)), new T.LineBasicMaterial({ color: '#67eeff', transparent: true, opacity: 0.38 })); scene.add(border);
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
    camera.aspect = width / height; const radians = pitch * Math.PI / 180, distance = Math.max(cameraEnv.cameraH * 0.96, 500), target = new T.Vector3(cameraEnv.centerX, 0, cameraEnv.centerY - cameraEnv.cameraH * 0.08);
    camera.position.set(target.x, Math.sin(radians) * distance, target.z + Math.cos(radians) * distance); camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); keyLight.position.set(target.x - 280, 680, target.z + 230); floorFit(cameraEnv);
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
