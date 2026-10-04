/* Content recipes: future dimensions reuse physics, resources and art budgets. */
window.CRDimensions = Object.freeze([
  Object.freeze({id:0,name:'UMBRAL I · Marisma viva',subtitle:'La señal original',zones:['MARISMA VIVA','CENIZAL','BOSQUE QUEBRADO','CORAZÓN DEL VACÍO']}),
  Object.freeze({id:1,name:'UMBRAL II · Señal sumergida',subtitle:'Una emisión que sigue viva sin espectadores',zones:['JARDÍN DE ANTENAS','HORNO DE MEMBRANAS','CORO FRACTURADO','ARCHIVO DEL VACÍO']})
]);
window.CRDimensionContent = function({T,root,heightAt,colliders,sites,neon,dimension}) {
  if(dimension!==1)return {landmarks:[],routes:[],covers:0};
  const landmarks=[],routes=sites.slice(0,3).map(s=>[{x:0,z:110},{x:s.x*.4,z:s.z*.4},{x:s.x,z:s.z}]);
  const stone=new T.MeshStandardMaterial({color:'#414753',roughness:.89,metalness:.12});
  const coverGeometry=new T.BoxGeometry(1,1,1),covers=new T.InstancedMesh(coverGeometry,stone,16),o=new T.Object3D();covers.castShadow=true;covers.receiveShadow=true;root.add(covers);
  const points=[];
  for(const [i,s] of sites.slice(0,4).entries()) {
    // Four broken receiver casings: real cover with two open approaches.
    for(let j=0;j<4;j++) {const x=s.x+(j<2?-160:160),z=s.z+(j%2?-160:160),y=heightAt(x,z),h=52+j*8;
      o.position.set(x,y+h/2-5,z);o.rotation.set(0,0,0);o.scale.set(88,h+10,34);o.updateMatrix();covers.setMatrixAt(i*4+j,o.matrix);
      colliders.push(new T.Box3(new T.Vector3(x-44,y-10,z-17),new T.Vector3(x+44,y+h,z+17)));
    }
    const g=new T.Group(),color=['#74b9ae','#b885ab','#8e89c2','#719bab'][i];g.position.set(s.x+145,heightAt(s.x+145,s.z),s.z);root.add(g);
    const frame=new T.Mesh(new T.TorusGeometry(30,3,6,32),stone);frame.position.y=90;g.add(frame);
    const screen=new T.Mesh(new T.OctahedronGeometry(18,0),neon(color,.38,.5));screen.scale.set(1,.75,.28);screen.position.y=90;g.add(screen);
    const stem=new T.Mesh(new T.CylinderGeometry(4,8,70,6),stone);stem.position.y=35;g.add(stem);
    // Only the solid support collides; luminous receiver/halo are decorative.
    colliders.push(new T.Box3(new T.Vector3(g.position.x-8,g.position.y,g.position.z-8),new T.Vector3(g.position.x+8,g.position.y+70,g.position.z+8)));
    landmarks.push(g);
    points.push({x:g.position.x,z:g.position.z,name:['Receptor ahogado','Horno de la emisión','Antena del coro','Archivo sin audiencia'][i]});
  }
  // Muted route fragments instead of a bright continuous navigation rail.
  const marker=new T.InstancedMesh(new T.OctahedronGeometry(3,0),neon('#7a9aab',.18),36);root.add(marker);
  let index=0;for(const route of routes)for(let part=0;part<2;part++)for(let k=1;k<=6;k++){const a=route[part],b=route[part+1],f=k/7,x=a.x+(b.x-a.x)*f+42,z=a.z+(b.z-a.z)*f; o.position.set(x,heightAt(x,z)+5,z);o.rotation.set(.2,index,0);o.scale.set(1,1.5,1);o.updateMatrix();marker.setMatrixAt(index++,o.matrix);}
  return {landmarks,routes,covers:16,points};
};
