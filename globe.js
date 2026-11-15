/* Hive Astra • textured sphere renderer (Canvas 2D, no dependencies).
   Each body is drawn by sampling an equirectangular texture map per pixel,
   with axial tilt, view elevation, spin and sunlight shading. */
(()=>{
'use strict';
const TEX_DIR='assets/textures/';
const FILES={sun:'sun.webp',mercury:'mercury.webp',venus:'venus.webp',earth:'earth.webp',moon:'moon.webp',mars:'mars.webp',jupiter:'jupiter.webp',saturn:'saturn.webp',uranus:'uranus.webp',neptune:'neptune.webp'};
const textures={};let ringCanvas=null;const listeners=[];
function loadImage(src){return new Promise((res,rej)=>{const im=new Image();im.decoding='async';im.onload=()=>res(im);im.onerror=()=>rej(Error('load '+src));im.src=src})}
function toTex(img,maxW){const w=Math.min(maxW||img.naturalWidth,img.naturalWidth),h=Math.round(w*img.naturalHeight/img.naturalWidth);const c=document.createElement('canvas');c.width=w;c.height=h;const z=c.getContext('2d',{willReadFrequently:true});z.drawImage(img,0,0,w,h);const d=z.getImageData(0,0,w,h);return{w,h,d:new Uint32Array(d.data.buffer),canvas:c}}
async function loadAll(){
  const small=Math.min(window.innerWidth,window.innerHeight)<600;
  await Promise.all(Object.entries(FILES).map(async([id,f])=>{try{const im=await loadImage(TEX_DIR+f);textures[id]=toTex(im,id==='earth'?(small?1024:2048):1024)}catch(e){/* keep procedural fallback */}}));
  try{const ring=await loadImage(TEX_DIR+'saturn-ring.webp');ringCanvas=buildRing(ring)}catch(e){}
  listeners.forEach(f=>f());
}
// Saturn ring strip -> polar ring disk. Inner/outer radius in planet radii.
const RING_IN=1.24,RING_OUT=2.27;
function buildRing(img){const s=toTex(img);const N=512,c=document.createElement('canvas');c.width=c.height=N;const z=c.getContext('2d');const out=z.createImageData(N,N);const o=new Uint32Array(out.data.buffer);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const r=Math.hypot(x+.5-N/2,y+.5-N/2)/(N/2)*RING_OUT;if(r<RING_IN||r>RING_OUT)continue;const u=Math.min(s.w-1,Math.floor((r-RING_IN)/(RING_OUT-RING_IN)*s.w));o[y*N+x]=s.d[Math.floor(s.h/2)*s.w+u]}z.putImageData(out,0,0);return c}
// Lookup tables: per (diameter, tilt, elevation) store texture v row and base longitude per pixel.
const lutCache=new Map();
function lut(D,tilt,elev){const key=D+'|'+tilt.toFixed(3)+'|'+elev.toFixed(2);let L=lutCache.get(key);if(L)return L;
  if(lutCache.size>80)lutCache.clear();
  const n=D*D,idx=new Int32Array(n),lat=new Float32Array(n),lon=new Float32Array(n),nx=new Float32Array(n),ny=new Float32Array(n),nz=new Float32Array(n),edge=new Float32Array(n);let k=0;const R=D/2;
  const ct=Math.cos(-tilt),st=Math.sin(-tilt),ce=Math.cos(-elev),se=Math.sin(-elev);
  for(let y=0;y<D;y++)for(let x=0;x<D;x++){const X=(x+.5-R)/R,Y=(R-(y+.5))/R,rr=X*X+Y*Y;if(rr>1+2/R)continue;const r2=Math.min(rr,1),Z=Math.sqrt(1-r2);
    // camera(y-up) -> body: undo tilt (roll around view axis), then undo elevation (around x)
    let x1=X*ct-Y*st,y1=X*st+Y*ct,z1=Z;let y2=y1*ce-z1*se,z2=y1*se+z1*ce;
    idx[k]=y*D+x;lat[k]=Math.asin(Math.max(-1,Math.min(1,y2)));lon[k]=Math.atan2(x1,z2);nx[k]=X;ny[k]=Y;nz[k]=Z;edge[k]=Math.max(0,Math.min(1,(1-Math.sqrt(rr))*R+.5));k++}
  L={D,k,idx:idx.subarray(0,k),lat:lat.subarray(0,k),lon:lon.subarray(0,k),nx:nx.subarray(0,k),ny:ny.subarray(0,k),nz:nz.subarray(0,k),edge:edge.subarray(0,k)};lutCache.set(key,L);return L}
const bufs=new Map();
function buffer(D){let b=bufs.get(D);if(!b){const c=document.createElement('canvas');c.width=c.height=D;const z=c.getContext('2d');const img=z.createImageData(D,D);b={c,z,img,u:new Uint32Array(img.data.buffer)};bufs.set(D,b)}return b}
/* opts: tex, texB (optional crossfade target), mix (0..1), spin (radians, longitude facing viewer),
   tilt (screen roll, radians), elev (view elevation above equator), light [x,y,z] camera space (y up) or null,
   emissive (bool, sun). Returns a canvas of size D. */
function render(D,o){D=Math.max(4,Math.round(D));const L=lut(D,o.tilt||0,o.elev||0),b=buffer(D),u=b.u;u.fill(0);
  const A=o.tex,B=o.texB&&o.mix>0.001?o.texB:null,m=B?o.mix:0,im=1-m;const TW=A.w,TH=A.h,TWB=B?B.w:0,THB=B?B.h:0;const spin=o.spin||0,TAU=Math.PI*2;
  const lx=o.light?o.light[0]:0,ly=o.light?o.light[1]:0,lz=o.light?o.light[2]:1;const amb=o.ambient??.1,wrap=!!o.wrap;
  for(let i=0;i<L.k;i++){let lo=L.lon[i]+spin;let uf=lo/TAU+.5;uf-=Math.floor(uf);const vf=.5-L.lat[i]/Math.PI;
    let c=A.d[Math.min(TH-1,(vf*TH)|0)*TW+Math.min(TW-1,(uf*TW)|0)];let r=c&255,g=(c>>8)&255,bl=(c>>16)&255;
    if(B){const c2=B.d[Math.min(THB-1,(vf*THB)|0)*TWB+Math.min(TWB-1,(uf*TWB)|0)];r=r*im+(c2&255)*m;g=g*im+((c2>>8)&255)*m;bl=bl*im+((c2>>16)&255)*m}
    let s;if(o.emissive){s=.62+.48*Math.sqrt(L.nz[i])}else{const d=L.nx[i]*lx+L.ny[i]*ly+L.nz[i]*lz;s=amb+(1-amb)*Math.max(0,Math.min(1,wrap?d*.85+.22:d*1.15+.05))}
    r=Math.min(255,r*s);g=Math.min(255,g*s);bl=Math.min(255,bl*s);
    const a=(L.edge[i]*255)|0;u[L.idx[i]]=(a<<24)|((bl|0)<<16)|((g|0)<<8)|(r|0)}
  b.z.putImageData(b.img,0,0);return b.c}
window.AstraGlobe={textures,render,loadAll,onReady:f=>listeners.push(f),ring:()=>ringCanvas,RING_IN,RING_OUT,ready:()=>Object.keys(textures).length>0};
})();
