'use strict';const fs=require('fs'),path=require('path'),assert=require('assert');
module.exports=async({win,errors,root})=>{const out=path.join(root,'qa-humanoid-debug');fs.mkdirSync(out,{recursive:true});const cases=[],samples=[],ev=s=>win.webContents.executeJavaScript('(()=>{'+s+'})()',true),wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(n,v)=>{assert(v,n);cases.push(n);};
 try{
 await ev('CR3D.test.manual(false);CR3D.reset();');await wait(500);
 for(let i=0;i<16;i++){await wait(300);const g=await ev('return CR3D.test.humanoidGeometryAudit();');samples.push(g);check('Upright rigs / mesh floor contact '+i,g.every(a=>a.invalid===0&&a.tilt<.001&&Math.abs(a.soleClearance-.35)<.05&&a.bodyClearance>-.2));}
 check('Animation LOD skips distant pose evaluations',await ev('return CR3D.test.humanoidAudit().performance.skippedPoses>100;'));
 check('Render counters include world and shadows',await ev('return CR3D.snapshot().render.triangles>20000&&CR3D.snapshot().render.calls>10;'));

 const locomotion=await ev(`const pose=(speed,grounded=true,verticalSpeed=0)=>CR3D.test.poseAnimation(1/60,{speed,grounded,verticalSpeed});for(let i=0;i<90;i++)pose(170);let changes=0,last=pose(170).mode;for(let i=0;i<360;i++){const m=pose(170+20*Math.sin(i*.45)).mode;if(m!==last)changes++;last=m;}let falseAir=0;for(let i=0;i<360;i++){const m=pose(170,i%8!==0).mode;if(m==='jump'||m==='land')falseAir++;}const jump=pose(170,false,245).mode;for(let i=0;i<30;i++)pose(0);for(let i=0;i<8;i++)pose(0,false,-80);const fall=pose(0,false,-80).mode;return {changes,falseAir,jump,fall};`);
 check('Speed threshold does not restart gait repeatedly',locomotion.changes===0);
 check('Single-frame loss of ground does not trigger jump/land',locomotion.falseAir===0);
 check('Intentional jump animates immediately',locomotion.jump==='jump');
 check('Sustained fall still enters airborne animation',locomotion.fall==='jump');
 await ev('CR3D.reset();');
 await ev('CR3D.reset();CR3D.test.clearMortarArena();CR3D.setInput("forward",true);');await wait(350);check('Live walking uses movement animation',await ev('return ["walk","run","mv_tar21"].includes(CR3D.test.humanoidAudit().rigs[0].mode);'));fs.writeFileSync(path.join(out,'walking.png'),(await win.webContents.capturePage()).toPNG());
 await ev('CR3D.setInput("forward",false);CR3D.setInput("jump",true);');await wait(160);check('Jump lifts collider and complete body',await ev('return CR3D.snapshot().height>1&&CR3D.test.humanoidGeometryAudit()[0].bodyClearance>-.2;'));
 await wait(900);await ev('CR3D.fire();');await wait(50);check('Attack stays finite and above actor floor',await ev('return CR3D.test.humanoidGeometryAudit().every(a=>!a.invalid&&a.bodyClearance>-.2);'));
 await ev('CR3D.match.start({tactical:false});');for(let i=0;i<3;i++)await ev('CR3D.match.start({tactical:false});');check('Roster rebuild does not leak actor rigs',await ev('return CR3D.test.humanoidAudit().actors===40;'));
 const clock=await ev('CR3D.setPaused(true);return CR3D.snapshot().state.time;');await wait(350);check('Pause keeps game time fixed',await ev('return CR3D.snapshot().state.time;')===clock);
 check('No frame or renderer failures',errors.length===0&&await ev('return CR3D.snapshot().render.frameFaults===0;'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,cases,samples,errors,animation:await ev('return CR3D.test.humanoidAudit().performance;')},null,2));await ev('CR3D.reset();CR3D.test.manual(false);');console.log('HUMANOID DEBUG QA PASS: '+cases.length+' checks');
 }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:false,error:e.stack,cases,samples,errors},null,2));throw e;}
};
