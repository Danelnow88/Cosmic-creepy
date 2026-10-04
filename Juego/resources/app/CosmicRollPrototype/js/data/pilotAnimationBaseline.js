// Preset capturado del runtime por el usuario. Inmutable; compartido por laboratorio y renderer de producción.
(() => {
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  function freeze(x){for(const v of Object.values(x))if(v&&typeof v==='object')freeze(v);return Object.freeze(x);}
  const canonical=freeze({
    id:'CANONICAL_ANIMATION_BASELINE',name:'Base canónica — protegida',version:1,
    capture:{frame:5211.637999999551,paused:false,source:'pilotConcept.state() enviado por el usuario'},
    settings:{
      boti:{speed:1,amplitude:.25,stability:.5,micro:.2,detailSpeed:.75},
      nova:{speed:.22,amplitude:.8,stability:.55,micro:.3,detailSpeed:.85},
      rook:{speed:.14,amplitude:.9,stability:.45,micro:.25,detailSpeed:.6},
      swarm:{speed:.18,amplitude:.85,stability:.5,micro:.3,detailSpeed:.72},
    },
    environment:{
      anchor:95,fps:60,redrawFps:30,maxDeltaMs:100,
      noise:{seedBase:741,pilotSeedStep:991,frameSeedStep:8191,drawSeedStep:131,layerSeedStep:277,vertexSeedStep:37,cellStep:71,hashMix:0x45d9f3b,frequency:.65,amplitude:1.25,interpolation:'smoothstep-cubic'},
      bodyBobScale:.35,referenceRandomMode:'sample',movingRandomMode:'zero',
      composition:'base + amplitude * (1 - stability) * (moving - base) + microNoise',
    },
    rendererContract:{
      file:'js/render/player.js',sha256LF:'7291d4d8b89323af894bcb38ac94e4fb21f0e386197af1052bfe8b6afafde158',
      dataFile:'js/data/gameData.js',dataSha256LF:'4c8c3115ce14771b4f6f5827a0863d8b6287b9b536eaaf8b2e7d4b6f93ba89f8',
      labBeforeSha256LF:'072194ba13ba16a29de364e8c1edbe2a21f790a39e694310fe0a905a8227a1b9',
      bodyTimeScale:.025,
      contour:{harmonics:[4,3],temporalRates:[8,-10],jitterAmplitude:2.5},
      bob:{breathFrequency:.05,breathAmplitude:1.5,bobFrequency:.12,bobAmplitude:2},
      drips:{count:6,orbitRate:1.5,verticalRate:4,verticalAmplitude:15,radiusOffset:8,sizeBase:3,sizeRate:8,sizeAmplitude:2},
      patterns:{progressRate:.8,radiusBase:.2,radiusGrowth:.75,ellipseAspect:.45,centerAmplitude:6,centerRates:[1,1.2]},
      pilotDetails:{
        boti:{dripRadiusFactor:.9,dripSeed:1,patternRadiusFactor:.86,patternCount:5,patternSeed:1},
        nova:{dripRadiusFactor:45/46,dripSeed:2,patternRadiusFactor:42/46,patternCount:4,patternSeed:2},
        rook:{dripRadiusFactor:1,dripSeed:3,patternRadiusFactor:48/50,patternCount:6,patternSeed:3},
        swarm:{dripRadiusFactor:40/38,dripSeed:4,patternRadiusFactor:36/38,patternCount:3,patternSeed:4},
      },
      swarmRings:{rotationBase:.35,rotationRate:2,rotationAmplitude:.06,progressRate:.6,progressOffset:.5,radiusX:[65,25],radiusY:[20,8],denominator:38,lineWidth:[3,1.5]},
      layers:{
        boti:[{points:12,radiusFactor:.7,noise:3.5,speed:1.2,seed:1,origin:[0,4]},{points:16,radiusFactor:.95,noise:5,speed:1,seed:2,origin:[0,0]}],
        nova:[{points:10,radiusFactor:24/46,noiseFactor:8/46,speed:1.6,seed:3,originFactors:[-12/46,-8/46]},{points:14,radiusFactor:1,noiseFactor:12/46,speed:1.1,seed:4,origin:[0,0]}],
        rook:[{points:18,radiusFactor:1,noiseFactor:11/50,speed:.9,seed:5,origin:[0,0]}],
        swarm:[{points:12,radiusFactor:1,noiseFactor:7/38,speed:1,seed:6,origin:[0,0]}],
      },
    },
  });
  window.NV.PILOT_ANIMATION_BASELINE=canonical;
})();
