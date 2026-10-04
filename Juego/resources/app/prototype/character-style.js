/* Original doll/porcelain art direction. Shared baked textures, no added lights. */
window.CRCharacterStyle=function(T){
 const faces=[],teamColors=['#a88c62','#638f80','#837197','#687f99'];
 const texture=c=>{const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=2;map.userData.characterShared=true;return map;};
 function canvas(){const c=document.createElement('canvas');c.width=c.height=512;return c;}
 const cloth=canvas(),q=cloth.getContext('2d');q.fillStyle='#a9a596';q.fillRect(0,0,512,512);
 let seed=904;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 for(let i=0;i<18000;i++){const x=random()*512,y=random()*512,a=.03+random()*.10;q.fillStyle=random()>.5?'rgba(34,31,29,'+a+')':'rgba(231,220,197,'+a+')';q.fillRect(x,y,1,random()>.5?3:1);}
 q.strokeStyle='#514e42';q.lineWidth=3;for(const x of [42,267,481]){q.beginPath();q.moveTo(x,0);q.bezierCurveTo(x+18,170,x-12,300,x,512);q.stroke();for(let y=10;y<512;y+=18){q.strokeStyle='#d1c6aa';q.lineWidth=2;q.beginPath();q.moveTo(x-6,y-3);q.lineTo(x+6,y+3);q.stroke();}q.strokeStyle='#514e42';q.lineWidth=3;}
 const clothMap=texture(cloth);
 function faceMap(index){if(faces[index])return faces[index];const c=canvas(),p=c.getContext('2d'),variant=index%6;
 const porcelain=p.createRadialGradient(230,180,15,260,240,330);porcelain.addColorStop(0,'#cfc5ad');porcelain.addColorStop(.6,'#a79f8d');porcelain.addColorStop(1,'#625c57');p.fillStyle=porcelain;p.fillRect(0,0,512,512);
 // Scuffed porcelain, freckles and small cracks; fixed seed prevents frame noise.
 for(let i=0;i<2400;i++){p.fillStyle='rgba(32,30,32,'+(.018+random()*.055)+')';p.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}
 p.strokeStyle='#766f65';p.lineWidth=1.4;for(const [x,y]of [[80,52],[403,31],[443,296],[46,340]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+14,y+29);p.lineTo(x+9,y+54);p.lineTo(x+27,y+72);p.stroke();}
 // Heavy upper silhouette gives an authored brow/hair shape rather than a sticker.
 p.fillStyle=['#403a32','#292f30','#655449','#3d393b','#4b463d','#34372f'][variant];p.beginPath();p.moveTo(0,0);p.lineTo(512,0);p.lineTo(512,96);p.bezierCurveTo(370,37,286,115,235,60);p.bezierCurveTo(194,131,93,112,0,94);p.closePath();p.fill();
 for(let side=0;side<2;side++){const x=side?354:157,y=side?193+variant*2:180-variant*2,r=variant===3?52:58;
 const socket=p.createRadialGradient(x,y,15,x,y+7,r+25);socket.addColorStop(0,'#090e16');socket.addColorStop(.62,'#293136');socket.addColorStop(1,'rgba(87,69,65,0)');p.fillStyle=socket;p.beginPath();p.ellipse(x,y+8,r+25,r+32,side?.12:-.09,0,Math.PI*2);p.fill();
 p.fillStyle='#111820';p.beginPath();p.ellipse(x,y,r,r*.98,0,0,Math.PI*2);p.fill();
 p.strokeStyle='#847b6c';p.lineWidth=6;p.beginPath();p.ellipse(x,y-1,r,r*.96,0,Math.PI*.95,Math.PI*1.95);p.stroke();
 const ix=x+(side?-5:3),iy=y+4,iris=p.createRadialGradient(ix,iy,3,ix,iy,31);iris.addColorStop(0,'#10171c');iris.addColorStop(.45,variant===4?'#9ca67b':'#7c9caa');iris.addColorStop(.8,variant===4?'#59664a':'#3b596d');iris.addColorStop(1,'#0e1922');p.fillStyle=iris;p.beginPath();p.arc(ix,iy,31,0,Math.PI*2);p.fill();
 p.strokeStyle='#667d85';p.lineWidth=1;for(let a=0;a<24;a++){const angle=a*Math.PI/12;p.beginPath();p.moveTo(ix+Math.cos(angle)*17,iy+Math.sin(angle)*17);p.lineTo(ix+Math.cos(angle)*27,iy+Math.sin(angle)*27);p.stroke();}
 p.fillStyle='#05090e';p.beginPath();p.arc(ix,iy,16,0,Math.PI*2);p.fill();p.fillStyle='#b8c3b9';p.beginPath();p.arc(ix-9,iy-12,5,0,Math.PI*2);p.fill();
 p.strokeStyle='#453e38';p.lineWidth=10;p.lineCap='round';p.beginPath();p.moveTo(x-r+6,y-r-20);p.quadraticCurveTo(x-8,y-r-39-(side?8:0),x+r,y-r-12);p.stroke();
 }
 // Long nose, uneven cheeks and a restrained smile held too long.
 p.strokeStyle='#736b60';p.lineWidth=5;p.beginPath();p.moveTo(245,231);p.quadraticCurveTo(237,286,226,302);p.quadraticCurveTo(250,320,279,299);p.stroke();
 p.fillStyle='#554e47';for(const x of [234,272]){p.beginPath();p.ellipse(x,301,7,4,0,0,Math.PI*2);p.fill();}
 const top=346+(variant===2?13:0),bottom=variant===3?402:390;
 p.fillStyle='#31282a';p.beginPath();p.moveTo(123,top-23);p.quadraticCurveTo(258,top+42,393,top-29);p.quadraticCurveTo(319,bottom+14,252,bottom);p.quadraticCurveTo(181,bottom+11,123,top-23);p.fill();
 p.save();p.clip();p.fillStyle='#bcb29b';for(let i=0;i<10;i++){const x=137+i*24,y=top+2+Math.sin(i/9*Math.PI)*15;p.fillRect(x,y,17,16+i%3*3);}p.restore();
 p.strokeStyle='#695755';p.lineWidth=4;for(const side of [-1,1]){const x=256+side*131;p.beginPath();p.moveTo(x,top-22);p.quadraticCurveTo(x+side*21,top-38,x+side*18,top-58);p.stroke();}
 // Visible stitches distinguish cloth faces from the sculpted porcelain variants.
 if(variant%2===0){p.strokeStyle='#584d43';p.lineWidth=3;p.beginPath();p.moveTo(73,263);p.lineTo(98,350);p.lineTo(84,438);p.stroke();for(let y=270;y<425;y+=15){p.beginPath();p.moveTo(76,y);p.lineTo(102,y+6);p.stroke();}}
 if(variant===4){p.strokeStyle='#645c46';p.lineWidth=9;for(const x of [157,354]){p.beginPath();p.arc(x,190,68,0,Math.PI*2);p.stroke();}p.beginPath();p.moveTo(225,189);p.lineTo(286,189);p.stroke();}
 faces[index]=texture(c);return faces[index];
 }
 function body(radius,color){const mat=new T.MeshStandardMaterial({color,map:clothMap,roughness:.96,metalness:.025,emissiveMap:clothMap,emissive:'#a2a18c',emissiveIntensity:.16});const mesh=new T.Mesh(new T.SphereGeometry(radius,32,24),mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name='stitched-doll-body';return mesh;}
 function face(radius,index=0){const root=new T.Group();root.name='doll-porcelain-face';root.userData.characterStyle='doll-porcelain-v1';root.userData.variant=index%6;
 const mat=new T.MeshStandardMaterial({map:faceMap(index%6),emissiveMap:faceMap(index%6),color:'#e7ddc8',roughness:.82,metalness:.015,emissive:'#c4b79d',emissiveIntensity:.48});
 const mask=new T.Mesh(new T.SphereGeometry(radius*1.065,32,24,Math.PI*1.25,Math.PI*.5,Math.PI*.25,Math.PI*.52),mat);mask.name='unsettling-face';root.add(mask);
 return root;}
 function tint(mesh,color){mesh.material.color.set(color).lerp(new T.Color('#7d7668'),.34);mesh.material.emissive.set('#a2a18c');mesh.material.emissiveIntensity=.16;}
 function setFace(root,index){root.children[0].material.map=faceMap(index%6);root.children[0].material.emissiveMap=faceMap(index%6);root.children[0].material.needsUpdate=true;root.userData.variant=index%6;}
 return {body,face,setFace,tint,teamColors,stats:()=>({style:'doll-porcelain-v1',faceTextures:faces.filter(Boolean).length,bodyTextures:1})};
};
