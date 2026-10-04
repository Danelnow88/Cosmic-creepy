/* Collision-safe camera boom. Immediate contraction; smooth return to distance. */
window.CRCameraRig=function({T,camera,collisions,heightAt}){
 const pivot=new T.Vector3(),goal=new T.Vector3(),candidate=new T.Vector3();let contractions=0;
 function clip(point,r){const t=collisions.hit(pivot,point,r);if(t!==null){const length=pivot.distanceTo(point);point.lerpVectors(pivot,point,Math.max(0,t-2/Math.max(1,length)));contractions++;}point.y=Math.max(point.y,heightAt(point.x,point.z)+r+1);collisions.resolve(point,r);const final=collisions.hit(pivot,point,r);if(final!==null)point.lerpVectors(pivot,point,Math.max(0,final-.015));}
 function update(origin,desired,focus,dt){pivot.copy(origin);goal.copy(desired);const radius=Math.max(7,camera.near*Math.tan(camera.fov*Math.PI/360)*Math.sqrt(1+camera.aspect*camera.aspect)+2);collisions.resolve(pivot,radius);pivot.y=Math.max(pivot.y,heightAt(pivot.x,pivot.z)+radius+1);collisions.resolve(pivot,radius);clip(goal,radius);candidate.copy(camera.position).lerp(goal,1-Math.exp(-Math.min(1,dt)*10));clip(candidate,radius);camera.position.copy(candidate);camera.lookAt(focus);return radius;}
 function snapshot(){return {contractions,clear:collisions.clear(camera.position,6),aboveTerrain:camera.position.y>=heightAt(camera.position.x,camera.position.z)+5};}
 return {update,snapshot};
};
