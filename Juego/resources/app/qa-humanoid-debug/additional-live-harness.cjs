const {app,BrowserWindow,protocol,net,session}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const baseline=process.argv.includes('--baseline'),root=baseline?'C:/Users/party/Desktop/COSMIC ROLL 3D/resources/app':'C:/Users/party/Desktop/COSMIC ROLL 3D - Humanoides/Juego/resources/app',out=path.join(__dirname,baseline?'qa-baseline-live':'qa-humanoid-live');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'cr-humanoid-')));protocol.registerSchemesAsPrivileged([{scheme:'depthgame',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 protocol.handle('depthgame',req=>net.fetch(pathToFileURL(path.join(root,decodeURIComponent(new URL(req.url).pathname))).href));
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:! /^(depthgame:|file:|data:|blob:)/.test(d.url)}));
 const win=new BrowserWindow({show:false,width:1360,height:840,webPreferences:{offscreen:true,contextIsolation:true,sandbox:true,preload:path.join(root,'desktop/preload.cjs'),backgroundThrottling:false}}),errors=[],cases=[];
 win.webContents.setFrameRate(60);win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const ev=s=>win.webContents.executeJavaScript('(()=>{'+s+'})()',true),wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(n,v)=>{assert(v,n);cases.push(n);};
 try{
 await win.loadURL('depthgame://prototype/prototype/thirdperson.html?qa=1');await wait(1500);
 await ev('CR3D.reset();CR3D.teleport(0,0);');
 const samples=await ev('return new Promise(resolve=>{let last=performance.now(),samples=[];function frame(t){samples.push(t-last);last=t;if(samples.length<121)requestAnimationFrame(frame);else resolve(samples.slice(1));}requestAnimationFrame(frame);});');
 const sorted=samples.sort((a,b)=>a-b),perf={medianMs:sorted[60],p95Ms:sorted[114],meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,snapshot:await ev('return CR3D.snapshot();')};
 fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(perf,null,2));
 if(!baseline){
 check('Renderer reports world geometry rather than only fullscreen quad',perf.snapshot.render.triangles>20000&&perf.snapshot.render.calls>10);
 const geomSamples=[];
 for(let i=0;i<16;i++){await wait(400);const g=await ev('return CR3D.test.humanoidGeometryAudit();');geomSamples.push(g);check('Upright bodies and mesh sole contact sample '+i,g.every(a=>a.invalid===0&&a.tilt<.001&&Math.abs(a.soleClearance-.35)<.05&&a.bodyClearance>-.2));}
 fs.writeFileSync(path.join(out,'geometry-samples.json'),JSON.stringify(geomSamples,null,2));
 check('Distant animation LOD actually skips work',(await ev('return CR3D.test.humanoidAudit();')).performance.skippedPoses>100);
 const a=await ev('return CR3D.test.humanoidAudit();');check('All 36 initial actors have individual skeletons',a.actors===36&&a.rigs.every(r=>r.bones===28&&r.finite));check('All original eight clips are included offline',a.clips.length===8);check('Face generator and physics not replaced',a.facesRedrawn===false&&a.collidersChanged===false);
 await ev('CR3D.test.clearMortarArena();CR3D.test.characterEncounter();CR3D.teleport(0,0);CR3D.setCamera(Math.PI,.1);CR3D.useEnergy();');await wait(500);fs.writeFileSync(path.join(out,'01-front.png'),(await win.webContents.capturePage()).toPNG());
 await ev('CR3D.setCamera(0,.1);CR3D.setInput("forward",true);');await wait(450);check('Locomotion selects native movement clip',(await ev('return CR3D.test.humanoidAudit().rigs[0].mode;'))==='mv_tar21');fs.writeFileSync(path.join(out,'02-walk.png'),(await win.webContents.capturePage()).toPNG());
 await ev('CR3D.setInput("forward",false);CR3D.setInput("jump",true);');await wait(160);check('Jump preserves physical height',await ev('return CR3D.snapshot().height>1;'));fs.writeFileSync(path.join(out,'03-jump.png'),(await win.webContents.capturePage()).toPNG());await wait(700);
 await ev('CR3D.setInput("forward",true);CR3D.setInput("dash",true);');await wait(80);fs.writeFileSync(path.join(out,'04-dash.png'),(await win.webContents.capturePage()).toPNG());await ev('CR3D.setInput("forward",false);');await wait(500);
 await ev('CR3D.fire();');await wait(50);check('Attack selects attack clip',await ev('return CR3D.test.humanoidAudit().rigs[0].mode==="atk01";'));fs.writeFileSync(path.join(out,'05-attack.png'),(await win.webContents.capturePage()).toPNG());
 await ev('CR3D.test.hitPlayer(5);');await wait(40);check('Damage selects hurt clip',await ev('return CR3D.test.humanoidAudit().rigs[0].mode==="hurt";'));fs.writeFileSync(path.join(out,'06-hurt.png'),(await win.webContents.capturePage()).toPNG());
 await ev('CR3D.reset();CR3D.match.start({tactical:false});');check('Local teams gain bodies',await ev('return CR3D.test.humanoidAudit().actors===40;'));for(let i=0;i<3;i++)await ev('CR3D.match.start({tactical:false});');check('Roster rebuild releases old skeletons',await ev('return CR3D.test.humanoidAudit().actors===40;'));
 await ev('CR3D.reset();CR3D.teleport(0,0);CR3D.test.clearMortarArena();');await wait(1600);await ev('CR3D.test.hitPlayer(200);');check('Death follows existing game state',await ev('return CR3D.snapshot().state.dead;'));
 check('No frame faults or renderer errors',errors.length===0&&await ev('return CR3D.snapshot().render.frameFaults===0;'));
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,cases,errors,perf:{medianMs:perf.medianMs,p95Ms:perf.p95Ms}},null,2));console.log('LIVE QA PASS '+cases.length);app.exit(0);
 }catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:false,error:error.stack,cases,errors},null,2));console.error(error.stack);app.exit(1);}
});
