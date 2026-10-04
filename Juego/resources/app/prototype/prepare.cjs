'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = 'C:/Users/party/Desktop/JuegoDemo';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
let html = read('index.html');
html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '').replace(/\s*<script type="module">[\s\S]*?<\/script>/, '');
html = html.replace(/<title>[^<]*<\/title>/, '<title>COSMIC DEPTH — Prototipo 3D</title>');
html = html.replace('</head>', '<link rel="stylesheet" href="prototype/depth.css">\n</head>');
html = html.replace(/(\s*<script src="js\/game\.js[^>]*><\/script>)/, '\n<script src="vendor/three-0.160.0.min.js"></script>\n<script src="prototype/depth.js"></script>$1');
write('index.html', html);
let game = read('js/game.js');
const beginMarker = '  function draw() {\n    resizeCanvas();\n    followPlayerCamera();';
game = game.replaceAll('\r\n', '\n');
if (!game.includes(beginMarker)) throw Error('No se encuentra inicio de draw');
game = game.replace(beginMarker, beginMarker + '\n    if (NV.proto3d) NV.proto3d.begin({ frame, state, player });');
const composeMarker = '    // Evento NEBLINA: velo oscuro con viñeta que reduce la visibilidad periférica.';
if (!game.includes(composeMarker)) throw Error('No se encuentra división mundo/HUD');
game = game.replace(composeMarker, '    // Prototype-only bridge: world raster -> 3D, native HUD stays in screen space.\n' +
  '    if (NV.proto3d) NV.proto3d.compose(canvas, { centerX: cinematic.centerX, centerY: cinematic.centerY, cameraW, cameraH });\n' +
  '    ctx.setTransform(scaleX, 0, 0, scaleY, -vx * scaleX, -vy * scaleY);\n\n' + composeMarker);
write('js/game.js', game);
const manifest = { title: 'COSMIC DEPTH', version: '0.1.0-prototype', date: '2026-10-03', sourceSnapshot: {}, note: 'Engine/data/audio copied byte-for-byte; game.js only adds two renderer bridge points.' };
function inspect(dir) {
  for (const item of fs.readdirSync(path.join(source, dir), { withFileTypes: true })) {
    const file = path.join(dir, item.name).replaceAll('\\', '/');
    if (item.isDirectory()) inspect(file);
    else { const buffer = fs.readFileSync(path.join(source, file)); manifest.sourceSnapshot[file] = crypto.createHash('sha256').update(buffer).digest('hex'); }
  }
}
for (const dir of ['js', 'css', 'assets']) inspect(dir);
write('prototype/source-manifest.json', JSON.stringify(manifest, null, 2));
console.log('Prototype source prepared. Original engine unchanged.');
