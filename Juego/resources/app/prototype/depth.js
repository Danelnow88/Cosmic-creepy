/* COSMIC DEPTH — independent renderer experiment. No simulation mutations.
 * Original Canvas art supplies animated surfaces. Sampled silhouettes supply
 * shallow 3D volumes. This is a first fidelity study, not final 3D modelling. */
(() => {
  'use strict';
  const NV = window.NV, T = window.THREE;
  const main = NV.canvas;
  const controls = document.createElement('aside');
  controls.className = 'depth-controls';
  controls.innerHTML = '<strong>COSMIC DEPTH <small>PROTOTIPO 01</small></strong>' +
    '<button id="depth-toggle" type="button">Vista 3D</button>' +
    '<label>Ángulo <input id="depth-angle" type="range" min="38" max="90" value="58" aria-label="Elevación de cámara"><output id="depth-angle-value">58°</output></label>' +
    '<label>Volumen <input id="depth-volume" type="range" min="0" max="32" value="18" aria-label="Espesor visual"><output id="depth-volume-value">18</output></label>' +
    '<span id="depth-status" role="status">Preparando 3D…</span>';
  document.body.append(controls);
  const glCanvas = document.createElement('canvas');
  glCanvas.id = 'depth-canvas';
  glCanvas.setAttribute('aria-hidden', 'true');
  main.parentElement.insertBefore(glCanvas, main);
  let renderer, active = true, ready = false, capturing = false, inWorld = false;
  let elevation = 58, thickness = 18, env = null, serial = 0;
  const records = new Map(), originals = {};
  const floorCanvas = document.createElement('canvas');
  const floorContext = floorCanvas.getContext('2d');
  const status = document.getElementById('depth-status');
  let scene, camera, floorTexture, floor, raycaster, plane;
  const seen = new Set();
  const hit = new T.Vector3(), pointer = new T.Vector2();
  const originalScreenToGame = NV.screenToGame;
  let contextLost = false;

  function setActive(value) {
    active = !!value && ready && !contextLost;
    document.documentElement.dataset.depth = active ? '3d' : '2d';
    document.getElementById('depth-toggle').textContent = active ? 'Vista 3D · comparar 2D' : 'Vista 2D · volver a 3D';
    glCanvas.style.display = active ? 'block' : 'none';
    status.textContent = contextLost ? 'WebGL perdió el contexto · vista 2D' : active ? 'Mismo motor · cuerpos con volumen' : 'Referencia 2D original';
    if (!active) for (const r of records.values()) r.group.visible = false;
  }
  function texture(canvas) {
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.generateMipmaps = false;
    map.minFilter = T.LinearFilter;
    map.magFilter = T.LinearFilter;
    return map;
  }
  function initialize() {
    renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false });
    renderer.setClearColor(0x040712);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-450, 450, 260, -260, 1, 8000);
    floorTexture = texture(floorCanvas);
    floor = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: floorTexture, side: T.DoubleSide, depthWrite: true }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new T.AmbientLight(0x849fff, 1.2));
    const light = new T.DirectionalLight(0xbefcff, 2.4);
    light.position.set(-300, 700, 400);
    scene.add(light);
    raycaster = new T.Raycaster();
    plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    ready = true;
    setActive(true);
  }
  try { initialize(); }
  catch (error) {
    ready = false;
    active = false;
    status.textContent = 'WebGL no disponible · vista 2D';
    document.documentElement.dataset.depth = '2d';
    glCanvas.style.display = 'none';
    console.warn('COSMIC DEPTH: WebGL fallback', error.message);
  }
  glCanvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; setActive(false);
  });
  glCanvas.addEventListener('webglcontextrestored', () => {
    contextLost = false; status.textContent = 'Contexto restaurado · pulsá Vista 2D para volver';
  });
  document.getElementById('depth-toggle').addEventListener('click', () => setActive(!active));
  document.getElementById('depth-angle').addEventListener('input', event => {
    elevation = Number(event.target.value);
    document.getElementById('depth-angle-value').value = elevation + '°';
  });
  document.getElementById('depth-volume').addEventListener('input', event => {
    thickness = Number(event.target.value);
    document.getElementById('depth-volume-value').value = String(thickness);
  });
  for (const type of ['keydown', 'keyup']) controls.addEventListener(type, event => event.stopPropagation());

  function recordFor(entity, kind) {
    let record = records.get(entity);
    if (record) return record;
    const radius = kind === 'player' ? NV.CHARACTERS[entity.character].size : entity.radius || 35;
    const worldSize = Math.max(180, Math.min(560, radius * 5.8));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = kind === 'boss' ? 512 : 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const map = texture(canvas);
    const top = new T.Mesh(new T.PlaneGeometry(worldSize, worldSize),
      new T.MeshBasicMaterial({ map, transparent: true, side: T.DoubleSide, depthWrite: false }));
    top.rotation.x = -Math.PI / 2;
    top.renderOrder = kind === 'player' ? 30 : 20;
    const bodyMaterial = new T.MeshStandardMaterial({ color: entity.color || '#ff3b4f', emissive: entity.color || '#ff3b4f', emissiveIntensity: 0.18, roughness: 0.55, transparent: true, opacity: 0.42 });
    const body = new T.Mesh(new T.BufferGeometry(), bodyMaterial);
    body.userData.entity = entity;
    const group = new T.Group();
    group.add(body, top);
    scene.add(group);
    record = { entity, kind, canvas, ctx, map, worldSize, group, top, body, radius, shapeSerial: -100, lastSeen: serial };
    records.set(entity, record);
    return record;
  }

  // A bounded radial silhouette approximation. Texture retains the exact art;
  // side surfaces are explicitly experimental for concave/crossing contours.
  function refreshVolume(r) {
    const size = r.canvas.width, pixels = r.ctx.getImageData(0, 0, size, size).data;
    const half = size / 2, scale = r.worldSize / size;
    const shape = new T.Shape(), points = [];
    const maxRadius = Math.min(half - 2, r.radius * 1.95 / scale);
    for (let i = 0; i < 64; i++) {
      const angle = i / 64 * Math.PI * 2;
      let farthest = r.radius * 0.3 / scale;
      for (let dist = 2; dist < maxRadius; dist += 1.5) {
        const x = Math.round(half + Math.cos(angle) * dist), y = Math.round(half + Math.sin(angle) * dist);
        const alpha = pixels[(y * size + x) * 4 + 3];
        if (alpha > 115) farthest = dist;
      }
      const x = Math.cos(angle) * farthest * scale, y = -Math.sin(angle) * farthest * scale;
      points.push({ x, y });
      if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    r.body.geometry.dispose();
    r.body.geometry = geometry;
    r.shapeSerial = serial;
  }

  function capture(name, args) {
    const entity = args[1], kind = name === 'drawPlayer' ? 'player' : name.includes('Boss') ? 'boss' : 'enemy';
    if (!entity) return;
    const r = recordFor(entity, kind), c = r.ctx, pxScale = r.canvas.width / r.worldSize;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, r.canvas.width, r.canvas.height);
    c.save();
    c.setTransform(pxScale, 0, 0, pxScale, r.canvas.width / 2 - entity.x * pxScale, r.canvas.height / 2 - entity.y * pxScale);
    // Respect arrival/cleanup alpha applied by the coordinator before this call.
    c.globalAlpha = Math.max(0, Math.min(1, args[0].globalAlpha));
    capturing = true;
    try { originals[name](c, ...args.slice(1)); }
    finally { capturing = false; c.restore(); }
    r.map.needsUpdate = true;
    if (serial - r.shapeSerial >= 6) refreshVolume(r);
    const bob = Math.sin((env.frame || 0) * 0.035 + entity.x * 0.01) * 2;
    const height = kind === 'boss' ? 10 : 8;
    r.group.position.set(entity.x, height + bob, entity.y);
    r.body.scale.y = thickness * (kind === 'boss' ? 1.5 : 1);
    r.top.position.y = thickness * (kind === 'boss' ? 1.5 : 1) + 0.2;
    r.body.visible = thickness > 0;
    r.group.visible = true;
    r.lastSeen = serial;
    seen.add(entity);
  }
  for (const name of ['drawPlayer', 'drawEnemy', 'drawBoss', 'drawSpectralBoss2D']) {
    if (typeof NV[name] !== 'function') continue;
    originals[name] = NV[name];
    NV[name] = function (...args) {
      if (active && inWorld && !capturing && args[0] === NV.ctx) return capture(name, args);
      return originals[name](...args);
    };
  }

  function begin(nextEnv) {
    env = nextEnv;
    inWorld = active;
    serial++;
    seen.clear();
    if (active) for (const r of records.values()) r.group.visible = false;
  }
  function compose(canvas, nextEnv) {
    inWorld = false;
    if (!active) return false;
    Object.assign(env, nextEnv);
    if (floorCanvas.width !== canvas.width || floorCanvas.height !== canvas.height) {
      floorCanvas.width = canvas.width;
      floorCanvas.height = canvas.height;
    }
    floorContext.setTransform(1, 0, 0, 1, 0, 0);
    floorContext.clearRect(0, 0, floorCanvas.width, floorCanvas.height);
    floorContext.drawImage(canvas, 0, 0);
    floorTexture.needsUpdate = true;
    floor.scale.set(env.cameraW, env.cameraH, 1);
    floor.position.set(env.centerX, 0, env.centerY);
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width), height = Math.round(rect.height);
    if (glCanvas.dataset.size !== width + ':' + height) {
      glCanvas.dataset.size = width + ':' + height;
      renderer.setSize(width, height, false);
    }
    glCanvas.style.width = rect.width + 'px';
    glCanvas.style.height = rect.height + 'px';
    glCanvas.style.left = canvas.offsetLeft + 'px';
    glCanvas.style.top = canvas.offsetTop + 'px';
    glCanvas.style.transform = canvas.style.transform;
    const radians = elevation / 180 * Math.PI;
    camera.left = -env.cameraW / 2;
    camera.right = env.cameraW / 2;
    camera.top = env.cameraH / 2;
    camera.bottom = -env.cameraH / 2;
    camera.position.set(env.centerX, Math.sin(radians) * 2000, env.centerY + Math.cos(radians) * 2000);
    camera.up.set(0, 1, 0);
    camera.lookAt(env.centerX, 0, env.centerY);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const [entity, r] of records) {
      if (serial - r.lastSeen > 90) {
        scene.remove(r.group);
        r.map.dispose(); r.top.geometry.dispose(); r.top.material.dispose();
        r.body.geometry.dispose(); r.body.material.dispose();
        records.delete(entity);
      }
    }
    renderer.render(scene, camera);
    canvas.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return true;
  }
  NV.screenToGame = function (x, y) {
    const rect = main.getBoundingClientRect();
    // The original dock remains a flat screen UI, with original hit testing.
    if (!active || !env || y > rect.bottom - 118 || NV.getState() === 'menu') return originalScreenToGame(x, y);
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const bodies = Array.from(records.values()).filter(r => r.group.visible && r.kind !== 'player' && r.body.visible).map(r => r.body);
    const target = raycaster.intersectObjects(bodies, false)[0];
    if (target) return { x: target.point.x, y: target.point.z };
    if (raycaster.ray.intersectPlane(plane, hit)) return { x: hit.x, y: hit.z };
    return originalScreenToGame(x, y);
  };
  NV.proto3d = Object.freeze({
    begin, compose, setActive,
    setElevation(value) { elevation = Math.max(38, Math.min(90, Number(value) || 58)); document.getElementById('depth-angle').value = elevation; document.getElementById('depth-angle-value').value = elevation + '°'; },
    projectWorld(x, y, height = 0) { const rect = main.getBoundingClientRect(), p = new T.Vector3(x, height, y).project(camera); return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 }; },
    snapshot() { return { ready, active, contextLost, elevation, thickness, entities: seen.size, cachedEntities: records.size, triangles: renderer ? renderer.info.render.triangles : 0, drawCalls: renderer ? renderer.info.render.calls : 0, frame: env && env.frame }; },
  });
})();
