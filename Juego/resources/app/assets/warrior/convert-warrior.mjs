import fs from 'node:fs';
import * as T from './tools/node_modules/three/build/three.module.js';
import {FBXLoader} from './tools/node_modules/three/examples/jsm/loaders/FBXLoader.js';
globalThis.window={URL:globalThis.URL};
T.TextureLoader.prototype.load=function(){return new T.Texture();};
const f=fs.readFileSync('Warrior-inspection-only.fbx');
const root=new FBXLoader().parse(f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength),'');
root.updateMatrixWorld(true);
const meshes=[];root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
const report={meshes:[],clips:root.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}))};
for(const m of meshes){
 const bones=m.skeleton.bones,head=bones.find(b=>/head/i.test(b.name)),neck=bones.find(b=>/neck/i.test(b.name));
 const hp=head.getWorldPosition(new T.Vector3()),box=new T.Box3().setFromObject(m);
 report.meshes.push({name:m.name,bounds:[box.min.toArray(),box.max.toArray()],head:hp.toArray(),neck:neck.getWorldPosition(new T.Vector3()).toArray(),bones:bones.map(b=>({name:b.name,position:b.getWorldPosition(new T.Vector3()).toArray()})),bindMatrix:m.bindMatrix.toArray()});
 const g=m.geometry,ids=g.attributes.skinIndex,weights=g.attributes.skinWeight,headIds=new Set();
 head.traverse(b=>{const i=bones.indexOf(b);if(i>=0)headIds.add(i);});
 // The imported sword is equipment, not the requested body or a game weapon.
 for(let i=0;i<bones.length;i++)if(/Prop/.test(bones[i].name))headIds.add(i);
 const index=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),keep=[];
 function headVertex(v){let w=0;for(let k=0;k<4;k++)if(headIds.has(ids.array[v*4+k]))w+=weights.array[v*4+k];return w>.35;}
 for(let i=0;i<index.length;i+=3)if(!index.slice(i,i+3).some(headVertex))keep.push(...index.slice(i,i+3));
 g.setIndex(keep);g.clearGroups();g.addGroup(0,keep.length,0);g.computeBoundingBox();g.computeBoundingSphere();
 report.meshes.at(-1).removedTriangles=(index.length-keep.length)/3;
 const mat=new T.MeshStandardMaterial({color:'#817b68',roughness:.96,metalness:.025});m.material=mat;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;
}
// Keep the original clips. Drop root motion tracks only at runtime, never destroy originals.
const data=root.toJSON();fs.writeFileSync('warrior-web.js','window.CRWarriorData='+JSON.stringify(data)+';\n');
fs.writeFileSync('conversion-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
