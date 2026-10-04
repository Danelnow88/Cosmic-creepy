/* One-pass WebGL post effect: candle vignette, chromatic split, grain, panic warp
   and screen-space gravitational lensing of the singularity. */
(() => {
  'use strict';
  window.CRTerrorVisual = function CRTerrorVisual({T,renderer,scene,camera,scale=.72}) {
    let effects=true;
    const target=new T.WebGLRenderTarget(16,16,{depthBuffer:true,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});target.texture.colorSpace=T.SRGBColorSpace;
    target.depthTexture=new T.DepthTexture(16,16,T.UnsignedIntType);
    const uniforms={tDiffuse:{value:target.texture},tDepth:{value:target.depthTexture},time:{value:0},fear:{value:0},darkness:{value:.25},flicker:{value:1},lightPower:{value:0},transitFade:{value:0},lightCenter:{value:new T.Vector2(.5,.52)},resolution:{value:new T.Vector2(1,1)},
      lensAmount:{value:0},lensCenter:{value:new T.Vector2(.5,.5)},lensRadius:{value:0},lensFrontDepth:{value:1},lensTilt:{value:.2},lensDopplerAxis:{value:new T.Vector2(1,0)},lensColor:{value:new T.Color('#ffca94')}};
    const material=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`precision highp float;uniform sampler2D tDiffuse,tDepth;uniform float time,fear,darkness,flicker,lightPower,transitFade;uniform vec2 lightCenter,resolution;
      uniform float lensAmount,lensRadius,lensFrontDepth,lensTilt;uniform vec2 lensCenter,lensDopplerAxis;uniform vec3 lensColor;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      void main(){
        float panic=smoothstep(.42,1.,fear),line=floor(vUv.y*96.);float gate=step(.965,hash(vec2(line,floor(time*9.))));
        vec2 uv=vUv;uv.x+=(hash(vec2(line,time))-.5)*.018*panic*gate;uv+=(uv-.5)*sin(time*7.+vUv.y*33.)*.0025*panic;
        // --- Gravitational lensing -------------------------------------------------
        // Point-mass thin lens inverted per pixel: beta = theta - theta_E^2/theta.
        // The background is compressed toward the Einstein ring, the photon sphere
        // stays black and the Doppler-brightened ring hugs the shadow.
        vec3 lensGlow=vec3(0.);float lensShade=1.;
        if(lensAmount>0.001&&lensRadius>0.0002){
          float aspect=resolution.x/max(1.,resolution.y);
          vec2 d=(uv-lensCenter)*vec2(aspect,1.);
          float r=length(d);
          float rs=lensRadius;
          float far=max(rs*3.6,.04);
          if(r<far){
            float visible=step(lensFrontDepth-.000006,texture2D(tDepth,vUv).r);
            vec2 dir=r>1e-5?d/r:vec2(0.);
            float bend=.28*rs*rs/max(r,rs*.6);
            float rSrc=max(r-bend,rs*.05);
            float blend=smoothstep(far*.80,far,r);
            uv=mix(uv,mix(lensCenter+dir*rSrc/vec2(aspect,1.),uv,blend),visible);
            lensShade=mix(1.,mix(mix(.0,1.,smoothstep(rs*.975,rs*1.005,r)),1.,blend),visible);
            // Squared distances instead of pow(): a negative base is undefined in GLSL
            // and costs a slow path on some drivers.
            float ringWidth=max(rs*.010,1.0/resolution.y);float ringT=(r-rs*1.015)/ringWidth;float ring=exp(-ringT*ringT);
            vec2 limb=normalize(lensDopplerAxis+vec2(1e-5));float side=dot(dir,limb);
            float beam=mix(1.15,.55,clamp(side*.5+.5,0.,1.));
            lensGlow+=lensColor*ring*beam*(.48+lensAmount*.55);
            float haloT=(r-rs*1.025)/(rs*.09);lensGlow+=lensColor*.035*exp(-haloT*haloT);
            // Two higher images of the same accretion disk, bent above/below its
            // shadow. Analytic arcs retain a fixed cost; this is an artistic lens.
            vec2 local=vec2(dot(d,limb),dot(d,vec2(-limb.y,limb.x)))/max(rs,.00001);
            float arcY=sqrt(max(0.,2.56-local.x*local.x))*.79;
            float thickness=max(.018+.018*lensTilt,1.2/(resolution.y*rs));
            float arcT=(abs(local.y)-arcY)/thickness;
            float arcs=exp(-arcT*arcT)*(1.-smoothstep(1.38,1.60,abs(local.x)))*(1.-smoothstep(.6,1.,lensTilt));
            float flow=.72+.18*sin(local.x*23.-time*5.+abs(local.y)*11.)+.10*sin(local.x*47.+time*3.);
            float approach=clamp(.85-local.x*.3,.3,1.8);
            vec3 hot=mix(lensColor,vec3(1.,.92,.73),clamp(approach*.5,0.,1.));
            lensGlow+=hot*arcs*flow*approach*(.34+lensAmount*.45);
            lensGlow*=visible*smoothstep(rs*.79,rs*.95,r);
          }
        }
        vec2 axis=normalize((uv-lightCenter)+vec2(.0001));float split=(.00045+panic*.0045)*darkness;
        vec3 color;color.r=texture2D(tDiffuse,uv+axis*split).r;color.g=texture2D(tDiffuse,uv).g;color.b=texture2D(tDiffuse,uv-axis*split).b;
        color*=lensShade;
        vec2 aspect2=vec2(resolution.x/max(1.,resolution.y),1.);float radius=length((vUv-lightCenter)*aspect2);float halo=smoothstep(.12+.11*flicker,.64+.08*flicker,radius);
        float vignette=smoothstep(.32,.94,length((vUv-.5)*vec2(aspect2.x*.72,1.)));float shade=clamp(1.-halo*darkness*.82-vignette*(.24+darkness*.46),.055,1.);
        float grain=(hash(vUv*resolution+floor(time*18.))-.5)*(.018+fear*.055);color=color*shade;
        // Preserve the pre-0.15.1 display tone: no global gamma lift.
        vec3 localGlow=lensGlow/(vec3(1.)+lensGlow*1.8);color+=min(vec3(.82,.66,.42),pow(max(localGlow,vec3(0.)),vec3(.72)));
        color.rb+=vec2(.018,-.012)*panic*gate;gl_FragColor=vec4(max(color,0.),1.);

        gl_FragColor.rgb=max(vec3(0.),gl_FragColor.rgb+vec3(grain))*(1.-transitFade);
      }`});
    const postScene=new T.Scene(),postCamera=new T.Camera(),quad=new T.Mesh(new T.PlaneGeometry(2,2),material);postScene.add(quad);
    let width=0,height=0,disposed=false,lensOn=false;
    function resize(){const dpr=Math.min(1.5,devicePixelRatio||1),w=Math.max(2,Math.floor(innerWidth*dpr*scale)),h=Math.max(2,Math.floor(innerHeight*dpr*scale));if(w===width&&h===height)return;width=w;height=h;target.setSize(w,h);uniforms.resolution.value.set(w,h);}
    function setLens(data){if(!data||!(data.amount>0.0005)){uniforms.lensAmount.value=0;lensOn=false;return;}uniforms.lensAmount.value=Math.min(1,data.amount);uniforms.lensCenter.value.set(data.center.x,data.center.y);uniforms.lensRadius.value=Math.max(0,data.radius||0);uniforms.lensFrontDepth.value=data.frontDepth??1;uniforms.lensTilt.value=data.tilt??.2;if(data.dopplerAxis)uniforms.lensDopplerAxis.value.set(data.dopplerAxis.x,data.dopplerAxis.y);lensOn=true;}
    function render(dt,data={}){if(disposed)return;resize();setLens(data.lens);uniforms.time.value+=Math.min(.05,dt||0);uniforms.fear.value=effects?(data.fear||0):0;uniforms.darkness.value=data.darkness||0;uniforms.flicker.value=data.flicker??1;uniforms.lightPower.value=data.lightPower||0;uniforms.transitFade.value=Math.max(0,Math.min(1,data.transitFade||0));if(data.lightCenter)uniforms.lightCenter.value.set(data.lightCenter.x,data.lightCenter.y);try{renderer.setRenderTarget(target);renderer.render(scene,camera);}finally{renderer.setRenderTarget(null);}renderer.render(postScene,postCamera);}
    function snapshot(){return {enabled:!disposed,width,height,scale,fear:uniforms.fear.value,darkness:uniforms.darkness.value,chromatic:true,grain:true,vignette:true,lens:lensOn,lensAmount:uniforms.lensAmount.value,lensRadius:uniforms.lensRadius.value,lensDepth:uniforms.lensFrontDepth.value,depthOcclusion:true,accretionArcs:true,colorCorrect:false,legacyDarkTone:true,transitFade:uniforms.transitFade.value,lightPower:uniforms.lightPower.value};}
    function dispose(){if(disposed)return;disposed=true;target.dispose();material.dispose();quad.geometry.dispose();}
    return {render,resize,snapshot,dispose,setLens,configure(v){if(Number.isFinite(v.scale))scale=Math.max(.5,Math.min(1,v.scale));effects=v.effects!==false;resize();}};
  };
})();
