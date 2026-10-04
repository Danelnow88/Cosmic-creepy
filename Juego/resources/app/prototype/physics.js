/* Shared collision queries. Segment results are normalized in [0, 1]. */
(function (root) {
  'use strict';
  function sphere(a, b, c, radius) {
    const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z, ox=a.x-c.x, oy=a.y-c.y, oz=a.z-c.z;
    const cc=ox*ox+oy*oy+oz*oz-radius*radius; if(cc<=0) return 0;
    const aa=dx*dx+dy*dy+dz*dz; if(aa<1e-12) return null;
    const bb=ox*dx+oy*dy+oz*dz, disc=bb*bb-aa*cc;
    if(disc<0) return null; const t=(-bb-Math.sqrt(disc))/aa;
    return t>=0 && t<=1 ? t : null;
  }
  function box(a,b,bounds,padding=0) {
    let lo=0, hi=1;
    for(const axis of ['x','y','z']) {
      const d=b[axis]-a[axis], min=bounds.min[axis]-padding, max=bounds.max[axis]+padding;
      if(Math.abs(d)<1e-10) { if(a[axis]<min || a[axis]>max) return null; continue; }
      let t0=(min-a[axis])/d, t1=(max-a[axis])/d; if(t0>t1) [t0,t1]=[t1,t0];
      lo=Math.max(lo,t0); hi=Math.min(hi,t1); if(lo>hi) return null;
    }
    return lo;
  }
  // Exact sphere/AABB sweep: padded slabs alone falsely hit rounded corners.
  function sweptBox(a,b,bounds,radius=0) {
    if(radius<=0)return box(a,b,bounds);
    const axes=['x','y','z'],cuts=[0,1];
    for(const k of axes){const d=b[k]-a[k];if(Math.abs(d)<1e-12)continue;for(const edge of [bounds.min[k],bounds.max[k]]){const t=(edge-a[k])/d;if(t>0&&t<1)cuts.push(t);}}
    cuts.sort((x,y)=>x-y);
    for(let i=0;i<cuts.length-1;i++){
      const lo=cuts[i],hi=cuts[i+1],mid=(lo+hi)/2;let A=0,B=0,C=-radius*radius;
      for(const k of axes){const d=b[k]-a[k],p=a[k]+d*mid,edge=p<bounds.min[k]?bounds.min[k]:p>bounds.max[k]?bounds.max[k]:null;if(edge===null)continue;const o=a[k]-edge;A+=d*d;B+=2*o*d;C+=o*o;}
      if(A*lo*lo+B*lo+C<=1e-9)return lo;
      if(A>1e-12){const disc=B*B-4*A*C;if(disc>=0){const t=(-B-Math.sqrt(disc))/(2*A);if(t>=lo-1e-9&&t<=hi+1e-9)return Math.max(lo,Math.min(hi,t));}}
    }return null;
  }
  function terrain(a,b,heightAt,radius=0) {
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/8));
    let prev=0;
    for(let i=0;i<=count;i++) {
      const t=i/count, x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t;
      if(a.y+(b.y-a.y)*t-radius<=heightAt(x,z)) {
        let lo=prev,hi=t;
        for(let j=0;j<10;j++){const m=(lo+hi)/2; if(a.y+(b.y-a.y)*m-radius<=heightAt(a.x+(b.x-a.x)*m,a.z+(b.z-a.z)*m))hi=m;else lo=m;}
        return hi;
      }
      prev=t;
    }
    return null;
  }
  const api={sphere,box,sweptBox,terrain}; if(typeof module==='object') module.exports=api; else root.CRPhysics=api;
})(typeof window==='object'?window:globalThis);
