'use strict';
const { app, BrowserWindow, Menu, protocol, net, session, ipcMain } = require('electron');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const charactersOnly=process.argv.includes('--characters-qa');
const circuitOnly=process.argv.includes('--circuit-qa');
const singularityOnly=process.argv.includes('--singularity-qa');
const strategyOnly=process.argv.includes('--strategy-qa');
const sheltersOnly=process.argv.includes('--shelters-qa');
const umbralOnly=process.argv.includes('--umbral-qa');
const suppliesOnly=process.argv.includes('--supplies-qa');
const onlineOnly=process.argv.includes('--online-qa');
const turnsOnly=process.argv.includes('--turns-qa');
const stabilityOnly=process.argv.includes('--stability-qa');
const qa = charactersOnly||circuitOnly||singularityOnly||strategyOnly||sheltersOnly||umbralOnly||suppliesOnly||onlineOnly||turnsOnly||stabilityOnly||process.argv.includes('--thirdperson-qa');
app.setName('Cosmic Roll Humanoides');
app.setAppUserModelId('com.cosmicroll.humanoides');
app.setPath('userData', qa ? fs.mkdtempSync(path.join(os.tmpdir(), 'cosmic-roll-3d-qa-')) : path.join(app.getPath('appData'), 'CosmicRollHumanoidesLab'));
protocol.registerSchemesAsPrivileged([{ scheme: 'depthgame', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let win;const peers=new Map();function getPeer(event){let peer=peers.get(event.sender.id);if(!peer){const sender=event.sender;peer=require('./peer.cjs').create({emit:value=>{if(!sender.isDestroyed())sender.send('cr:peer',value);}});peers.set(sender.id,peer);sender.once('destroyed',()=>{peer.stop();peers.delete(sender.id);});}return peer;}
function trusted(event){return (event.sender===win?.webContents||qa&&BrowserWindow.getAllWindows().some(w=>w.webContents===event.sender))&&event.senderFrame?.url.startsWith('depthgame://prototype/');}
ipcMain.handle('cr:host',(event,options)=>{if(!trusted(event))throw Error('Forbidden');return getPeer(event).host(options);});
ipcMain.handle('cr:join',(event,options)=>{if(!trusted(event))throw Error('Forbidden');return getPeer(event).join(options);});
ipcMain.handle('cr:leave',event=>{if(trusted(event))getPeer(event).stop();});
ipcMain.on('cr:input',(event,value)=>{if(trusted(event))getPeer(event).input(value);});
ipcMain.on('cr:snapshot',(event,value)=>{if(trusted(event))getPeer(event).publish(value);});
app.on('before-quit',()=>{for(const peer of peers.values())peer.stop();});
if (!qa && !app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(async () => {
  protocol.handle('depthgame', request => {
    const url = new URL(request.url);
    if (url.hostname !== 'prototype') return new Response('Forbidden', { status: 403 });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Bad request', { status: 400 }); }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const rel = path.relative(root, file);
    if (rel.startsWith('..') || path.isAbsolute(rel) || !(rel === 'index.html' || /^(js|css|assets|vendor|prototype)[\\/]/.test(rel))) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission === 'pointerLock' && contents.getURL().startsWith('depthgame://prototype/')));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !/^(depthgame:|file:|data:|blob:)/.test(details.url) }));
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders,
    'Content-Security-Policy': ["default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'"] } }));
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ title: 'COSMIC ROLL 3D — Tercera persona', width: 1360, height: 840, minWidth: 800, minHeight: 520,
    backgroundColor: '#040712', show: !qa, autoHideMenuBar: true,
    webPreferences: { preload:path.join(__dirname,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: false, offscreen: qa, devTools: qa } });
  if (qa) win.webContents.setFrameRate(60);
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') { errors.push(event.message); if (qa) console.error('RENDERER: ' + event.message); } });
  win.webContents.on('render-process-gone', (_, details) => { console.error('Renderer stopped', details.reason); app.exit(1); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('depthgame://prototype/')) event.preventDefault(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
  });
  await win.loadURL('depthgame://prototype/prototype/thirdperson.html'+(qa?'?qa=1':''));
  if (qa) {
    if(charactersOnly){await require('./verify-characters.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(circuitOnly){await require('./verify-circuit.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(singularityOnly){await require('./verify-singularity.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(strategyOnly){await require('./verify-strategy.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(sheltersOnly){await require('./verify-shelters.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(umbralOnly){await require('./verify-umbral.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(suppliesOnly){await require('./verify-supplies.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(onlineOnly){await require('./verify-online.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(turnsOnly){await require('./verify-turns.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    if(stabilityOnly){await require('./verify-stability.cjs')({win,errors,root});app.exit(errors.length?1:0);return;}
    await require('./verify-combat.cjs')({ win, errors, root });
    await require('./verify-world.cjs')({ win, errors, root });
    await require('./verify-audio.cjs')({ win, errors, root });
    await require('./verify-mortar.cjs')({ win, errors, root });
    await require('./verify-dimensions.cjs')({ win, errors, root });
    await require('./verify-terror.cjs')({ win, errors, root });
    await require('./verify-stability.cjs')({ win, errors, root });
    await require('./verify-turns.cjs')({win,errors,root});
    await require('./verify-online.cjs')({win,errors,root});
    await require('./verify-supplies.cjs')({win,errors,root});
    await require('./verify-umbral.cjs')({win,errors,root});
    await require('./verify-shelters.cjs')({win,errors,root});
    await require('./verify-strategy.cjs')({win,errors,root});
    await require('./verify-singularity.cjs')({win,errors,root});
    await require('./verify-circuit.cjs')({win,errors,root});
    await require('./verify-characters.cjs')({win,errors,root});
    app.exit(errors.length ? 1 : 0);
  }
}).catch(error => { console.error(error.stack); if (qa) { fs.mkdirSync(path.join(root, 'qa'), { recursive:true }); fs.writeFileSync(path.join(root, 'qa/failure.json'), JSON.stringify({ error:error.stack }, null, 2)); } app.exit(1); });
app.on('window-all-closed', () => app.quit());
