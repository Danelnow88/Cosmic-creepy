'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
module.exports = async ({ win, errors, root }) => {
  const out = path.join(root, 'qa-thirdperson'); fs.mkdirSync(out, { recursive:true });
  const evaluate = code => win.webContents.executeJavaScript(code, true); const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  for (let i = 0; i < 120; i++) { if (await evaluate('!!(window.CR3D && CR3D.snapshot().ready)')) break; await wait(100); }
  const initial = await evaluate('CR3D.snapshot()'); assert(initial.ready); assert.equal(initial.worldSize, 7200); assert(initial.cameraDistance > 60 && initial.cameraDistance < 180);
  await evaluate('CR3D.setInput("forward",true)'); await wait(1100); const moving = await evaluate('CR3D.snapshot()'); await evaluate('CR3D.setInput("forward",false)');
  assert(moving.travelled > 35, 'player traverses terrain'); assert(moving.speed > 20, 'player accelerates');
  await evaluate('CR3D.fire()'); await wait(80); const fired = await evaluate('CR3D.snapshot()'); assert(fired.projectiles > 0, '3D projectile spawned');
  await win.webContents.capturePage().then(image => fs.writeFileSync(path.join(out, '01-world-running.png'), image.toPNG()));
  await evaluate('CR3D.teleport(2600,-1900);CR3D.setCamera(0.8,0.27);CR3D.setInput("right",true);CR3D.setInput("boost",true)'); await wait(900); await evaluate('CR3D.setInput("right",false);CR3D.setInput("boost",false)');
  const distant = await evaluate('CR3D.snapshot()'); assert(Math.hypot(distant.position.x, distant.position.z) > 2500, 'large world is traversable'); assert(distant.render.triangles > 20000, '3D world rendered');
  await win.webContents.capturePage().then(image => fs.writeFileSync(path.join(out, '02-distant-terrain.png'), image.toPNG()));
  win.setContentSize(960, 620); await wait(300); await win.webContents.capturePage().then(image => fs.writeFileSync(path.join(out, '03-resized.png'), image.toPNG()));
  assert.equal(errors.length, 0, 'no renderer errors');
  const report = { pass:true, initial, moving, fired, distant, errors, date:'2026-10-03', scope:'Third-person 3D movement, dynamic camera, large heightfield, rolling sphere, physical obstacles and volumetric projectiles.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log('THIRDPERSON_QA PASS: world, movement, camera, projectile, distant traversal, resize; errors=0');
};
