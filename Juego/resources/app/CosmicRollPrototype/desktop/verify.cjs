'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
module.exports = async ({ win, errors, root }) => {
  const out = path.join(root, 'qa'); fs.mkdirSync(out, { recursive: true });
  const evaluate = code => win.webContents.executeJavaScript('try { ' + code + ' } catch (error) { console.error(error.stack); throw error; }', true);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const cases = [];
  const snapshot = () => evaluate('({ depth: NV.proto3d.snapshot(), run: NV.getRuntimeSnapshot(), alpha: NV.alpha.snapshot() })');
  const shot = async name => fs.writeFileSync(path.join(out, name + '.png'), (await win.webContents.capturePage()).toPNG());
  const until = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(100); }
    throw Error('Timeout: ' + expression);
  };
  await until('!!(window.NV && NV.proto3d && NV.alpha)');
  assert(await evaluate('NV.proto3d.snapshot().ready'), 'WebGL renderer ready');
  await shot('01-lobby');
  const start = async (character, cleared = 2) => {
    console.log('QA start ' + character + ' cleared=' + cleared);
    await win.loadURL('depthgame://prototype/index.html');
    await until('!!(window.NV && NV.alpha && NV.proto3d)');
    await evaluate(`(() => {
      const run = NV.expedition.create('expedition', 0); run.bossProgression = 'full-roster'; run.cleared = ${cleared};
      if (!NV.expedition.save({ version:1, character:'${character}', wave:${cleared}, run,
        player:{hp:5000,maxHp:5000,xpToNext:100}, inventory:['pistol'], currentWeapon:'pistol',
        levels:{pistol:1},kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'normal' })) throw Error('Fixture rejected');
      NV.alpha.resume();
    })()`);
    await until('NV.getState() === "playing" && NV.proto3d.snapshot().entities > 0');
    await wait(700);
  };
  for (const character of ['boti', 'nova', 'rook', 'swarm']) {
    await start(character);
    const before = await snapshot();
    await evaluate('NV.input.setMoveRight(true)'); await wait(350);
    await evaluate('NV.input.setMoveRight(false)'); await wait(160);
    const moved = await snapshot();
    fs.writeFileSync(path.join(out, 'movement-debug.json'), JSON.stringify({ before, moved }, null, 2));
    await shot('debug-playing');
    assert(moved.run.player.x > before.run.player.x + 10, character + ' moves');
    await evaluate('NV.input.setSlide(true)'); await wait(80);
    const dash = await snapshot();
    assert(dash.run.dashTrail.count > 0, character + ' dash trail');
    await evaluate('NV.input.setSlide(false); NV.input.setSpecial(true)'); await wait(120);
    await evaluate('NV.input.setSpecial(false)');
    const special = await snapshot();
    assert(special.run.special.cooldown > 0, character + ' special activates');
    await wait(1300);
    await evaluate('NV.input.togglePause()');
    const paused = await snapshot(); await wait(200);
    const held = await snapshot();
    assert.equal(held.run.frame, paused.run.frame, 'pause freezes simulation');
    assert(paused.depth.triangles > 50, '3D triangles rendered');
    await shot('02-' + character + '-3d');
    await evaluate('NV.proto3d.setActive(false)'); await wait(200);
    const compare = await snapshot();
    assert.equal(compare.depth.active, false);
    assert.equal(compare.run.player.x, held.run.player.x, 'view toggle preserves position');
    assert.equal(compare.run.player.hp, held.run.player.hp, 'view toggle preserves HP');
    await shot('03-' + character + '-2d');
    await evaluate('NV.proto3d.setActive(true); NV.proto3d.setElevation(40)'); await wait(200);
    await shot('04-' + character + '-angle40');
    await evaluate('NV.proto3d.setElevation(90)'); await wait(200);
    await shot('05-' + character + '-top');
    cases.push({ character, moved: moved.run.player.x - before.run.player.x, dash: dash.run.dashTrail, depth: paused.depth });
  }
  await start('boti', 1);
  await wait(1800);
  const boss = await snapshot();
  assert(await evaluate('!!NV.getBoss()'), 'production boss spawned');
  const bossHP = await evaluate('NV.getBoss().hp');
  await evaluate('NV.input.setMoveUp(true)'); await wait(850);
  await evaluate('NV.input.setMoveUp(false); NV.input.setFire(true)');
  for (let n = 0; n < 18; n++) {
    await evaluate('NV.input.setAimWorld(NV.getBoss().x, NV.getBoss().y)');
    await wait(90);
  }
  await evaluate('NV.input.setFire(false)');
  const damagedBossHP = await evaluate('NV.getBoss().hp');
  assert(damagedBossHP < bossHP, 'manual projectiles hit production boss in 3D');
  console.log('QA manual fire: boss HP ' + bossHP + ' -> ' + damagedBossHP);
  await shot('06-boss-3d');
  await evaluate('NV.input.togglePause()');
  const projection = await evaluate(`(() => {
    const p = NV.getRuntimeSnapshot().player;
    const x = p.x + 90, y = p.y - 70;
    const screen = NV.proto3d.projectWorld(x, y);
    const world = NV.screenToGame(screen.x, screen.y);
    return {expected:{x,y},actual:world,error:Math.hypot(world.x-x,world.y-y)};
  })()`);
  assert(projection.error < 0.01, 'cursor projection roundtrip');
  cases.push({ boss: boss.depth, projection, manualFire:{hpBefore:bossHP,hpAfter:damagedBossHP} });
  for (const size of [[915, 412], [844, 390]]) {
    win.setContentSize(...size); await wait(500);
    const result = await evaluate('({ depth:NV.proto3d.snapshot(), canvas:document.getElementById("roll-canvas").getBoundingClientRect().toJSON(), width:innerWidth,height:innerHeight })');
    assert(result.canvas.width > 0 && result.canvas.height > 0);
    await shot('07-viewport-' + size.join('x'));
    cases.push({ viewport:size, result });
  }
  assert.equal(errors.length, 0, 'no console errors');
  const report = { pass:true, date:'2026-10-03', platform:'Electron 44.5.0 / Windows', cases, errors,
    limits:'Cuerpos, jefe y proyectiles son geometría 3D real sobre plano 3D. Faltan modelos finales por enemigo, VFX 3D completos y prueba en dispositivos móviles físicos.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (fs.existsSync(path.join(out, 'failure.json'))) fs.unlinkSync(path.join(out, 'failure.json'));
  console.log('DEPTH_QA PASS: four pilots, movement/dash/special, pause, 2D/3D, boss, cursor, resize; errors=' + errors.length);
};
