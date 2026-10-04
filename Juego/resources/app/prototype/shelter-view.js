window.CRShelterView=function({T,scene,shelters,turns,dimension}){
 const root=new T.Group(),slots=new Map();scene.add(root);
 function slot(id){if(slots.has(id))return slots.get(id);if(slots.size>=24)return null;
   const cocoon=new T.Mesh(new T.SphereGeometry(26,16,12),new T.MeshBasicMaterial({color:'#8bdbce',transparent:true,opacity:.25,depthWrite:false,wireframe:true}));
   const stone=new T.Mesh(new T.DodecahedronGeometry(21,0),new T.MeshStandardMaterial({color:'#4a5650',roughness:1}));
   const anchor=new T.Mesh(new T.RingGeometry(76,83,40),new T.MeshBasicMaterial({color:'#85d7bf',transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));anchor.rotation.x=-Math.PI/2;
   const echo=new T.Group(),core=new T.Mesh(new T.SphereGeometry(18,12,10),new T.MeshBasicMaterial({color:'#aa88d9',transparent:true,opacity:.45,wireframe:true}));echo.add(core);const ring=new T.Mesh(new T.TorusGeometry(24,1.5,6,32),new T.MeshBasicMaterial({color:'#ac92d7'}));echo.add(ring);echo.userData={decoy:true,decoyId:id,radius:18,alive:false};for(const mesh of [cocoon,stone,anchor,echo]){root.add(mesh);mesh.visible=false;}const s={cocoon,stone,anchor,echo};slots.set(id,s);return s;
 }
 function sync(){for(const s of slots.values())for(const mesh of Object.values(s))mesh.visible=false;const snap=shelters.snapshot();for(const m of turns.members){const s=slot(m.id);if(!s)continue;const guard=shelters.guardFor(m.id);if(guard){const mesh=guard.kind==='stone'?s.stone:s.cocoon;mesh.position.fromArray(m.data.position||guard.position);mesh.visible=true;mesh.scale.set(1,guard.kind==='stone'?1:1.3,1);}const a=snap.anchors.find(a=>a.id===m.id&&a.dimension===dimension());if(a){s.anchor.position.fromArray(a.position);s.anchor.position.y-=17;s.anchor.visible=true;}const e=snap.echoes.find(e=>e.id===m.id&&e.dimension===dimension());s.echo.userData.alive=!!e;if(e){s.echo.position.fromArray(e.position);s.echo.visible=true;}}}
 function bodies(){return [...slots.values()].map(s=>s.echo).filter(e=>e.userData.alive);}
 function reset(){for(const s of slots.values()){for(const mesh of Object.values(s))mesh.visible=false;s.echo.userData.alive=false;}}
 return {sync,bodies,reset,stats(){return {slots:slots.size,max:24,decoys:bodies().length};}};
};
