'use strict';
const { app, BrowserWindow, Menu, protocol, net, session } = require('electron');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const qa = process.argv.includes('--depth-qa');
app.setName('Cosmic Roll Prototype');
app.setAppUserModelId('com.cosmicroll.prototype');
app.setPath('userData', qa ? fs.mkdtempSync(path.join(os.tmpdir(), 'cosmic-roll-qa-')) : path.join(app.getPath('appData'), 'CosmicRollPrototype'));
protocol.registerSchemesAsPrivileged([{ scheme: 'depthgame', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let win;
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
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !/^(depthgame:|file:|data:|blob:)/.test(details.url) }));
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders,
    'Content-Security-Policy': ["default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'"] } }));
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ title: 'COSMIC ROLL — Prototipo 3D real', width: 1360, height: 840, minWidth: 800, minHeight: 520,
    backgroundColor: '#040712', show: !qa, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: !qa, offscreen: qa, devTools: qa } });
  if (qa) win.webContents.setFrameRate(60);
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') { errors.push(event.message); if (qa) console.error('RENDERER: ' + event.message); } });
  win.webContents.on('render-process-gone', (_, details) => { console.error('Renderer stopped', details.reason); app.exit(1); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('depthgame://prototype/')) event.preventDefault(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
  });
  await win.loadURL('depthgame://prototype/index.html');
  if (qa) {
    await require('./verify.cjs')({ win, errors, root });
    app.exit(errors.length ? 1 : 0);
  }
}).catch(error => { console.error(error.stack); if (qa) { fs.mkdirSync(path.join(root, 'qa'), { recursive:true }); fs.writeFileSync(path.join(root, 'qa/failure.json'), JSON.stringify({ error:error.stack }, null, 2)); } app.exit(1); });
app.on('window-all-closed', () => app.quit());
