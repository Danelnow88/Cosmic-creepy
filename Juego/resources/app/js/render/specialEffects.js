// Manifestaciones cósmicas: presentación separada de special/meteors/drones.
// Ningún renderer modifica entidades, hitboxes o RNG. Sólo cosmetic state avanza
// por dt de simulación (pausa lo congela); eventos nacen DESPUÉS del hecho real.
(() => {
  'use strict';
  const NV=window.NV,TAU=Math.PI*2;
  const P={meteor:['#68edff','#237dff'],phase:['#ff9d36','#ff542d'],
    bulwark:['#ffda7d','#a888e8'],hivemind:['#fff3a3','#67f5da']};
  const glowCache=new Map();
  const clamp=n=>Math.max(0,Math.min(1,n));
  function budget() {return NV.getVisualBudget?NV.getVisualBudget():{tier:'full',secondaryGlow:true,decorativeParticleScale:1};}
  function line(ctx,x,y,xx,yy,color,width,alpha) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();
  }
  function dot(ctx,x,y,r,color,alpha) {
    ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),0,TAU);ctx.fill();
  }
  function polygon(ctx,r,count,rotation) {
    ctx.beginPath();for(let i=0;i<count;i++){const a=rotation+i*TAU/count;
      if(i)ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    ctx.closePath();
  }
  function glow(ctx,color,x,y,r,alpha) {
    if(!budget().secondaryGlow||typeof document==='undefined')return;
    let sprite=glowCache.get(color);
    if(!sprite){
      sprite=document.createElement('canvas');sprite.width=sprite.height=64;
      const c=sprite.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,'#ffffff');g.addColorStop(.2,color+'b0');g.addColorStop(1,color+'00');
      c.fillStyle=g;c.fillRect(0,0,64,64);if(glowCache.size>=8)glowCache.delete(glowCache.keys().next().value);
      glowCache.set(color,sprite);
    }
    ctx.globalAlpha=alpha;ctx.drawImage(sprite,x-r,y-r,r*2,r*2);
  }

  NV.beginSpecialVisual=function(player,type){player.specialVisual={type,age:0,end:-1,events:[]};};
  NV.clearSpecialVisual=function(player){if(player)player.specialVisual=null;};
  NV.specialVisualEvent=function(player,kind,x,y,angle,target){
    const s=player&&player.specialVisual;if(!s)return;
    // Máximo4 contactos simultáneos; no filamento permanente hacia cada enemigo.
    if(kind==='contact') {
      let contacts=0;
      for(const e of s.events)if(e.kind===kind){contacts++;if(e.target===target)return;}
      if(contacts>=4)return;
    }
    if(s.events.length>=24)s.events.shift();
    s.events.push({kind,x,y,angle:angle||0,target,life:kind==='impact'?.36:.22});
  };
  NV.updateSpecialVisual=function(player,dt,meteors,drones){
    const s=player&&player.specialVisual;if(!s)return;
    s.age+=dt;
    const active=s.type==='phase'?player.phase>0:s.type==='bulwark'?player.bulwark>0:
      s.type==='meteor'?meteors.length>0:drones.length>0;
    if(!active&&s.end<0)s.end=0;
    if(s.end>=0)s.end+=dt;
    let write=0;for(const e of s.events){e.life-=dt;if(e.life>0)s.events[write++]=e;}
    s.events.length=write;
    if(s.end>.65&&!s.events.length)player.specialVisual=null;
  };

  // Player-local: silueta primaria y radio mecánico sobreviven aun en minimal.
  NV.drawSpecialPlayerLayer=function(ctx,player,char,frame,layer){
    const s=player.specialVisual;if(!s)return;
    const colors=P[s.type],age=s.age,finish=s.end<0?1:clamp(1-s.end/.65);
    const b=budget(),detail=b.tier==='full'&&b.decorativeParticleScale!==0,t=age*6,entry=clamp(age/.22);
    ctx.save();ctx.shadowBlur=0;ctx.globalAlpha=1;
    if(layer==='behind') {
      if(s.type==='phase') {
        const r=NV.BALANCE.PHASE_AURA_RADIUS;
        // El límite funcional desaparece AL terminar phase; sólo la corona
        // corporal se disipa después. No anunciar daño durante el cierre.
        if(s.end<0) {
          ctx.fillStyle='#ff8128';ctx.globalAlpha=.035;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
          ctx.strokeStyle='#ffbc63';ctx.globalAlpha=.65;ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();
        }
        for(let i=0;s.end<0&&i<(detail?12:6);i++) {
          const a=i*TAU/(detail?12:6)+t*.24;
          ctx.strokeStyle=colors[0];ctx.globalAlpha=.4*finish;ctx.lineWidth=1.4;
          ctx.beginPath();ctx.arc(0,0,r-4,a,a+.16);ctx.stroke();
        }
        // Corona abierta, nunca relleno opaco del área funcional.
        const n=detail?14:8;
        for(let i=0;i<n;i++) {
          const a=i*TAU/n,inner=char.size*.85,outer=(char.size+16+Math.sin(t*2+i*2.7)*7)*finish;
          ctx.save();ctx.rotate(a);ctx.fillStyle=i%2?colors[0]:colors[1];ctx.globalAlpha=.48*finish;
          ctx.beginPath();ctx.moveTo(inner,-4);ctx.quadraticCurveTo(outer*.8,-10,outer,Math.sin(t+i)*7);
          ctx.quadraticCurveTo(outer*.72,5,inner,4);ctx.closePath();ctx.fill();ctx.restore();
        }
        glow(ctx,colors[0],0,0,char.size*2.1,.22*finish);
      } else if(s.type==='bulwark') {
        const r=(char.size+37)*(.55+.45*entry)*finish;
        for(let i=0;i<6;i++) {
          const a=i*TAU/6+Math.PI/6;
          let impact=0;
          for(const e of s.events)if(e.kind==='reflect') {
            const direction=Math.atan2(e.y-player.y,e.x-player.x);
            const delta=Math.atan2(Math.sin(direction-a),Math.cos(direction-a));
            if(Math.abs(delta)<Math.PI/6)impact=Math.max(impact,e.life/.22);
          }
          ctx.save();ctx.rotate(a);ctx.translate(r*.85,0);
          ctx.fillStyle=impact?'#fff8d7':colors[0];ctx.globalAlpha=(.055+impact*.18)*finish;
          ctx.beginPath();ctx.moveTo(-6,-r*.31);ctx.lineTo(7,-r*.23);ctx.lineTo(7,r*.23);ctx.lineTo(-6,r*.31);ctx.closePath();ctx.fill();
          ctx.strokeStyle=colors[0];ctx.globalAlpha=.88*finish;ctx.lineWidth=2;ctx.stroke();
          line(ctx,10,-r*.19,10,r*.19,'#fff8d7',1,.85*finish);
          if(impact) {ctx.strokeStyle='#fff8d7';ctx.globalAlpha=impact*finish;ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(0,0,5+(1-impact)*13,-Math.PI/2,Math.PI/2);ctx.stroke();}
          if(detail)line(ctx,-3,-r*.23,-3,r*.23,colors[1],1,.5*finish);
          ctx.restore();
        }
        if(age<.5){ctx.strokeStyle=colors[0];ctx.lineWidth=2;ctx.globalAlpha=(1-age/.5)*.7;polygon(ctx,120*clamp(age/.4),6,Math.PI/6);ctx.stroke();}
      } else if(s.type==='meteor') {
        const n=detail?7:4;
        for(let i=0;i<n;i++) {
          const u=(age*1.5+i/n)%1,x=Math.sin(i*2.4)*char.size*(1-u),y=-char.size-u*65;
          ctx.save();ctx.translate(x,y);ctx.strokeStyle=colors[0];ctx.globalAlpha=(1-u)*.7*finish;
          polygon(ctx,2+u*2,4,-Math.PI/2);ctx.stroke();ctx.restore();
          if(age<.55)line(ctx,x,y,x,y+12,colors[1],1,.32*finish);
        }
      } else {
        // Cuerpo se divide visualmente sin modificar las órbitas/6 entidades.
        for(let i=0;i<6;i++){
          const a=i*TAU/6+age*2.5,r=55*entry*finish;
          ctx.strokeStyle=colors[1];ctx.globalAlpha=(s.end<0?.18:.55)*finish;ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(0,0,r,a-.15,a+.25);ctx.stroke();
          if(age<.3||s.end>=0)dot(ctx,Math.cos(a)*r,Math.sin(a)*r,3*finish,colors[0],finish*.8);
        }
      }
    } else {
      if(s.type==='phase') {
        // Brillo material: el cuerpo no se vuelve transparente/fantasmal.
        const core=(char.size*.62)*(1+Math.sin(t*2)*.08)*finish;
        ctx.fillStyle='#fff5ce';ctx.globalAlpha=.85*finish;
        ctx.beginPath();for(let i=0;i<18;i++){
          const a=i*TAU/18,r=core*(1+Math.sin(i*3.1+t)*.19);
          if(i)ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
        }ctx.closePath();ctx.fill();
        if(detail)for(let i=0;i<5;i++){const a=i*TAU/5+t*.4;line(ctx,Math.cos(a)*core,Math.sin(a)*core,Math.cos(a)*(core+8),Math.sin(a)*(core+8),colors[0],1,.8*finish);}
      } else if(s.type==='bulwark') {
        ctx.strokeStyle='#fff6d4';ctx.globalAlpha=.78*finish;ctx.lineWidth=2;
        polygon(ctx,char.size*.68,6,Math.PI/6);ctx.stroke();
        line(ctx,0,-char.size*.6,0,char.size*.6,colors[0],2,.75*finish);
      } else if(s.type==='meteor') {
        ctx.strokeStyle='#e6ffff';ctx.globalAlpha=.68*finish;ctx.lineWidth=1.5;
        polygon(ctx,char.size*.62*(1+.1*Math.sin(t)),4,-Math.PI/2);ctx.stroke();
      } else {
        for(let i=0;i<3;i++){const a=t*.3+i*TAU/3;
          dot(ctx,Math.cos(a)*char.size*.55,Math.sin(a)*char.size*.55,2.5,colors[1],.85*finish);}
      }
    }
    ctx.restore();
  };
  NV.applySpecialBodyTransform=function(ctx,player){
    const s=player.specialVisual;if(!s)return;
    const entry=clamp(s.age/.22),fade=s.end<0?1:clamp(1-s.end/.65);
    const pulse=Math.sin(s.age*15)*.025;
    if(s.type==='phase')ctx.scale(1+(.16*entry-.22*(1-entry)+pulse)*fade,1+(.10*entry+ pulse)*fade);
    else if(s.type==='bulwark')ctx.scale(1+(.14+pulse)*fade,1-.08*(1-entry)*fade);
    else if(s.type==='meteor')ctx.scale(1-.05*Math.sin(s.age*9)*fade,1+.09*Math.sin(s.age*9)*fade);
    else ctx.scale(1+.05*Math.sin(s.age*12)*fade,1-.05*Math.sin(s.age*12)*fade);
  };

  // World-space, eventos breves sólo donde la mecánica produjo contacto/impacto.
  NV.drawSpecialWorldEffects=function(ctx,player){
    const s=player.specialVisual;if(!s)return;const colors=P[s.type];ctx.save();ctx.shadowBlur=0;
    for(const e of s.events){
      const f=clamp(e.life/(e.kind==='impact'?.36:.22)),r=(1-f)*20+4;
      if(e.kind==='impact') {
        ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle=colors[0];ctx.lineWidth=1.5;ctx.globalAlpha=f;
        polygon(ctx,r*1.3,6,0);ctx.stroke();
        const decoration=budget();
        for(let i=0;i<(decoration.decorativeParticleScale===0?0:decoration.tier==='full'?8:4);i++) {const a=i*TAU/8;
          line(ctx,Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*(r+8),Math.sin(a)*(r+8),'#eaffff',1,f);}
        glow(ctx,colors[0],0,0,r,.22*f);ctx.restore();
      } else if(e.kind==='reflect') {
        line(ctx,e.x,e.y,e.x+Math.cos(e.angle)*22*(1-f),e.y+Math.sin(e.angle)*22*(1-f),'#fff4bd',2,f);
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.strokeStyle='#ffda7d';ctx.globalAlpha=f;ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-4,-10*f);ctx.lineTo(5,0);ctx.lineTo(-4,10*f);ctx.stroke();ctx.restore();
      } else {
        dot(ctx,e.x,e.y,3*f,'#fff0c7',f);
        for(let i=0;i<3;i++){const a=e.angle+i*2.1;line(ctx,e.x,e.y,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,colors[0],1,f);}
      }
    }
    ctx.restore();
  };

  NV.drawSpecialMeteor=function(ctx,m){
    const b=budget(),a=Math.atan2(m.vy,m.vx),r=m.radius;
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);ctx.shadowBlur=0;
    const length=b.tier==='full'?r*5:r*3;
    ctx.fillStyle='#258dff';ctx.globalAlpha=.22;ctx.beginPath();ctx.moveTo(-length,-r*.45);ctx.lineTo(0,-r*.75);ctx.lineTo(0,r*.75);ctx.lineTo(-length,r*.15);ctx.closePath();ctx.fill();
    line(ctx,-length,0,-r*.3,0,'#b0fbff',2,.6);
    ctx.fillStyle='#237dff';ctx.globalAlpha=.95;polygon(ctx,r,6,0);ctx.fill();
    ctx.strokeStyle='#73eaff';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#edffff';polygon(ctx,r*.63,4,0);ctx.fill();
    line(ctx,-r,0,r*.85,0,'#ffffff',1,.9);
    if(b.tier==='full'&&b.decorativeParticleScale!==0)for(let i=0;i<3;i++)dot(ctx,-r*(2+i),Math.sin(m.x*.07+i)*r*.4,.8,'#caffff',.6-i*.15);
    glow(ctx,'#68edff',0,0,r*1.65,.2);ctx.restore();
  };
  NV.drawSpecialOrbitant=function(ctx,d,player){
    const s=player.specialVisual,age=s?s.age:1,b=budget();
    const birth=clamp(age/.22),fade=d.life==null?1:clamp(d.life/.4);
    const r=d.orbitRadius*birth,dx=Math.cos(d.angle)*r,dy=Math.sin(d.angle)*r;
    ctx.save();ctx.translate(player.x+dx,player.y+dy);ctx.shadowBlur=0;
    if(b.tier==='full'&&b.decorativeParticleScale!==0) {
      ctx.strokeStyle='#67f5da';ctx.globalAlpha=.25*fade;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(-dx,-dy,r,d.angle-.24,d.angle);ctx.stroke();
    }
    const firing=d.visualShot>0?d.visualShot/.16:0;
    ctx.rotate(d.visualAim==null?d.angle:d.visualAim);ctx.scale(1+firing*.5,1-firing*.3);
    ctx.strokeStyle='#fff3a3';ctx.lineWidth=1.2;ctx.globalAlpha=.9*fade;
    const radius=(6+Math.sin(age*9+d.angle)*.7)*fade;
    ctx.beginPath();for(let i=0;i<12;i++){const a=i*TAU/12,rr=radius*(1+Math.sin(a*3+age*8)*.2);
      if(i)ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
    ctx.closePath();ctx.stroke();dot(ctx,0,0,3*fade,'#fffce3',fade);
    dot(ctx,Math.cos(age*7)*3,Math.sin(age*7)*3,1.2,'#67f5da',fade);
    if(firing>0)line(ctx,5,0,12,0,'#e9fff7',1,firing*fade);
    glow(ctx,'#67f5da',0,0,12,.18*fade);ctx.restore();
  };
  NV.drawSpecialProjectile=function(ctx,b){
    if(b.specialId!=='hivemind'&&!b.reflected)return false;
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.shadowBlur=0;
    line(ctx,-9,0,2,0,b.reflected?'#ffda7d':'#67f5da',2.2,.8);
    dot(ctx,2,0,2.2,'#fffeed',1);ctx.restore();return true;
  };
  // Sustituye el aro compartido de activación, no se dibuja otro encima.
  NV.drawSpecialVFX=function(ctx,vfx){
    const type=vfx.type,colors=P[type];if(!colors)return;
    const p=clamp(1-vfx.life),f=clamp(vfx.life),r=12+p*70;
    ctx.save();ctx.translate(vfx.x,vfx.y);ctx.shadowBlur=0;
    if(type==='phase') {
      for(let i=0;i<8;i++){const a=i*TAU/8+p;
        line(ctx,Math.cos(a)*r*.4,Math.sin(a)*r*.4,Math.cos(a)*r,Math.sin(a)*r,colors[0],2,f*.7);}
    } else if(type==='bulwark') {
      ctx.strokeStyle=colors[0];ctx.globalAlpha=f*.7;ctx.lineWidth=2;polygon(ctx,r,6,Math.PI/6);ctx.stroke();
    } else if(type==='meteor') {
      for(let i=0;i<5;i++)line(ctx,(i-2)*9,10-p*50,(i-2)*9,-5-p*80,colors[0],1.2,f*.65);
    } else for(let i=0;i<6;i++){const a=i*TAU/6+p*.7;
      line(ctx,Math.cos(a)*r*.3,Math.sin(a)*r*.3,Math.cos(a)*r,Math.sin(a)*r,colors[1],1,f*.4);}
    ctx.restore();
  };
  NV.drawSpecialShockwave=function(ctx,s){
    if(!s.style)return false;
    const p=clamp(1-s.life),r=s.maxRadius*(1-(1-p)*(1-p));
    ctx.save();ctx.translate(s.x,s.y);ctx.shadowBlur=0;ctx.globalAlpha=s.life;
    if(s.style==='bastion') {ctx.strokeStyle='#ffe1a0';ctx.lineWidth=2;polygon(ctx,r,6,Math.PI/6);ctx.stroke();}
    else {
      ctx.strokeStyle='#ffba62';ctx.lineWidth=2;
      ctx.beginPath();for(let i=0;i<=48;i++){const a=i*TAU/48,rr=r*(1+Math.sin(i*2.3)*.055);
        if(i)ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
      ctx.stroke();for(let i=0;i<(budget().tier==='full'?16:8);i++){const a=i*TAU/16;
        line(ctx,Math.cos(a)*r*.7,Math.sin(a)*r*.7,Math.cos(a)*(r+10),Math.sin(a)*(r+10),'#fff0c5',1,s.life*.75);}
      glow(ctx,'#ff9d36',0,0,15+30*s.life,.25*s.life);
    }
    ctx.restore();return true;
  };
  NV.specialVisualDiagnostics=()=>({eventCap:24,glowCache:glowCache.size,glowCap:8});
})();
