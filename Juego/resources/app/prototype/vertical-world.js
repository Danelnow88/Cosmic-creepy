/* Authored test tower, low deck and covered sunken passage. Dimensions share layout. */
window.CRVerticalWorld=function({T,root,colliders,heightAt}){
 const sites={tower:{x:480,z:1150},passage:{x:900,z:620}};
 const mat=new T.MeshStandardMaterial({color:'#33443e',roughness:.88,metalness:.12}),edge=new T.MeshStandardMaterial({color:'#b6a57d',emissive:'#635834',emissiveIntensity:.2,roughness:.8});let solids=0;
 function block(x,y,z,w,h,d,material=mat){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);colliders.push(new T.Box3(new T.Vector3(x-w/2,y-h/2,z-d/2),new T.Vector3(x+w/2,y+h/2,z+d/2)));solids++;return mesh;}
 const towerBase=heightAt(480,1150);
 for(let i=0;i<15;i++)block(480,towerBase+(i+1)*8/2,940+i*14,90,(i+1)*8,14);
 block(480,towerBase+116,1195,170,8,110,edge);
 for(const x of [409,551])block(x,towerBase+57,1195,12,114,85);
 block(620,heightAt(620,1090)+14,1090,90,28,90,edge);
 const p=sites.passage,ground=heightAt(p.x,p.z),top=heightAt(p.x+240,p.z)+15;
 block(p.x,top,p.z,280,12,180,edge);
 for(const x of [p.x-145,p.x+145])block(x,(ground+top)/2,p.z,12,top-ground,180);
 for(const z of [p.z-75,p.z+75])for(const x of [p.x-112,p.x+112])block(x,(ground+top)/2,z,12,top-ground,12);
 const lamp=new T.PointLight('#a49167',95,230,2);lamp.position.set(p.x,ground+43,p.z);root.add(lamp);
 function label(text,x,y,z){const c=document.createElement('canvas');c.width=256;c.height=64;const q=c.getContext('2d');q.fillStyle='#101b18dd';q.fillRect(0,0,256,64);q.fillStyle='#c4cfb7';q.font='bold 17px Segoe UI';q.textAlign='center';q.fillText(text,128,38);const map=new T.CanvasTexture(c),s=new T.Sprite(new T.SpriteMaterial({map,depthWrite:false}));s.position.set(x,y,z);s.scale.set(90,22,1);root.add(s);}
 label('OBSERVATORIO',480,towerBase+146,1195);label('PASAJE INFERIOR',p.x,top+35,p.z-105);
 return {sites,solids,towerTop:towerBase+120,passageFloor:ground,passageRoof:top-6};
};
