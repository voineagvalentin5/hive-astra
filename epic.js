/* Hive Astra • NASA EPIC real-image sequence + re-projection onto an Earth map.
   EPIC (DSCOVR, Sun-Earth L1) photographs the sunlit disk roughly every 1-2 hours.
   Each frame's metadata gives the sub-spacecraft point (centroid lat/lon). Treating the
   view as orthographic from that point, every map pixel (lat, lon) on the visible side is
   looked up in the photo and blended over the NASA Blue Marble base map. Nothing is synthesized:
   areas EPIC did not see keep the base map. */
(()=>{
'use strict';
const MAP_W=1024,MAP_H=512,API_FRAME_LIMIT=6;
const E={status:'idle',frames:[],source:null,note:'',dateLabel:'',error:null,listeners:[]};
const emit=()=>E.listeners.forEach(f=>{try{f(E)}catch(e){}});
const pad=n=>String(n).padStart(2,'0');
function parseUTC(s){return new Date(String(s).replace(' ','T')+'Z')}
function archivePath(meta){const [y,m,d]=meta.date.slice(0,10).split('-');return `${y}/${m}/${d}`}
function gsfcJpg(meta){return `https://epic.gsfc.nasa.gov/archive/natural/${archivePath(meta)}/jpg/${meta.image}.jpg`}
function apiJpg(meta){return `https://api.nasa.gov/EPIC/archive/natural/${archivePath(meta)}/jpg/${meta.image}.jpg?api_key=DEMO_KEY`}
async function getJSON(url,ms=8000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
// Load an image whose pixels we may read (same-origin or CORS-enabled). Resolves null on failure.
async function readableImage(url,ms=15000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);const blob=await r.blob();if(!/^image\//.test(blob.type))throw Error('not image');return await createImageBitmap(blob)}catch(e){return null}finally{clearTimeout(t)}}
function displayImage(url){return new Promise(res=>{const im=new Image();im.decoding='async';im.onload=()=>res(im);im.onerror=()=>res(null);im.src=url})}
// Base map at projection resolution.
function baseMap(){const T=window.AstraGlobe?.textures?.earth;if(!T)return null;if(T.w===MAP_W)return T.d.slice();const c=document.createElement('canvas');c.width=MAP_W;c.height=MAP_H;const z=c.getContext('2d',{willReadFrequently:true});z.drawImage(T.canvas,0,0,MAP_W,MAP_H);return new Uint32Array(z.getImageData(0,0,MAP_W,MAP_H).data.buffer)}
let trig=null;function rowTrig(){if(trig)return trig;const sl=new Float32Array(MAP_H),cl=new Float32Array(MAP_H),lon=new Float32Array(MAP_W);for(let y=0;y<MAP_H;y++){const la=(90-(y+.5)/MAP_H*180)*Math.PI/180;sl[y]=Math.sin(la);cl[y]=Math.cos(la)}for(let x=0;x<MAP_W;x++)lon[x]=((x+.5)/MAP_W*360-180)*Math.PI/180;return trig={sl,cl,lon}}
// Find the Earth disk (center + radius) by thresholding a downsampled copy.
function findDisk(px,S){let minX=S,maxX=-1,minY=S,maxY=-1;const step=Math.max(1,S>>8);for(let y=0;y<S;y+=step)for(let x=0;x<S;x+=step){const c=px[y*S+x];if((c&255)+((c>>8)&255)+((c>>16)&255)>45){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}if(maxX<0)return null;return{cx:(minX+maxX+step)/2,cy:(minY+maxY+step)/2,R:(maxX-minX+maxY-minY+2*step)/4}}
function project(bitmap,meta,base){const S=Math.min(720,bitmap.width);const c=document.createElement('canvas');c.width=c.height=S;const z=c.getContext('2d',{willReadFrequently:true});z.drawImage(bitmap,0,0,S,S);const px=new Uint32Array(z.getImageData(0,0,S,S).data.buffer);const disk=findDisk(px,S);if(!disk||disk.R<S*.2)return null;
  const {sl,cl,lon}=rowTrig();const p0=meta.centroid_coordinates.lat*Math.PI/180,l0=meta.centroid_coordinates.lon*Math.PI/180,sp=Math.sin(p0),cp=Math.cos(p0);const cd=new Float32Array(MAP_W),sd=new Float32Array(MAP_W);for(let x=0;x<MAP_W;x++){cd[x]=Math.cos(lon[x]-l0);sd[x]=Math.sin(lon[x]-l0)}
  const out=base.slice();const {cx,cy,R}=disk;
  for(let y=0;y<MAP_H;y++){const s=sl[y],c0=cl[y],row=y*MAP_W;for(let x=0;x<MAP_W;x++){const cosc=sp*s+cp*c0*cd[x];if(cosc<=.2)continue;const X=c0*sd[x],Y=cp*s-sp*c0*cd[x];const ix=(cx+X*R)|0,iy=(cy-Y*R)|0;if(ix<0||iy<0||ix>=S||iy>=S)continue;const e=px[iy*S+ix];let w=(cosc-.2)/.35;if(w>1)w=1;const b=out[row+x],iw=1-w;
    out[row+x]=0xff000000|((((b>>16)&255)*iw+((e>>16)&255)*w)<<16)|((((b>>8)&255)*iw+((e>>8)&255)*w)<<8)|(((b&255)*iw+(e&255)*w)|0)}}
  return{w:MAP_W,h:MAP_H,d:out}}
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
function fmt(d){return d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}
function hm(d){return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())}
function label(frames){const a=parseUTC(frames[0].meta.date),b=parseUTC(frames[frames.length-1].meta.date);return `${fmt(a)} · ${hm(a)}–${hm(b)} UTC`}
function pick(list,n){if(list.length<=n)return list.slice();const out=[];for(let i=0;i<n;i++)out.push(list[Math.round(i*(list.length-1)/(n-1))]);return out}
async function start(opts={}){if(E.status!=='idle'&&E.status!=='unavailable')return;E.status='loading';E.error=null;emit();
  let latest=null,baked=null;
  try{latest=opts.metadata&&opts.metadata.length?opts.metadata:await getJSON('https://epic.gsfc.nasa.gov/api/natural')}catch(e){latest=null}
  try{baked=await getJSON('data/epic/manifest.json',5000)}catch(e){baked=null}
  latest=Array.isArray(latest)?latest.filter(m=>m&&m.image&&m.date&&m.centroid_coordinates).sort((a,b)=>a.date.localeCompare(b.date)):[];
  const latestDay=latest.length?latest[latest.length-1].date.slice(0,10):null;
  const bakedOk=baked&&Array.isArray(baked.frames)&&baked.frames.length;
  const base=baseMap();
  let plan=[];
  // 1) Baked same-origin copy of the latest day (pixels readable) 2) local server proxy 3) api.nasa.gov (CORS, DEMO_KEY, few frames) 4) display-only originals.
  if(bakedOk&&(!latestDay||baked.day===latestDay)){plan=baked.frames.map(f=>({meta:f.meta,url:'data/epic/'+f.file,readable:true}));E.source='NASA EPIC (cached copy in this site, refreshed daily)'}
  else if(latest.length){
    const day=latest.filter(m=>m.date.slice(0,10)===latestDay);
    if(opts.serverProxy){plan=day.map(m=>({meta:m,url:'/api/epic-frame?path='+encodeURIComponent(archivePath(m)+'/jpg/'+m.image+'.jpg'),readable:true,fallback:gsfcJpg(m)}));E.source='NASA EPIC via local gateway'}
    else{const sel=new Set(pick(day,API_FRAME_LIMIT));plan=day.map(m=>sel.has(m)?{meta:m,url:apiJpg(m),readable:true,fallback:gsfcJpg(m)}:{meta:m,url:gsfcJpg(m),readable:false});E.source='NASA EPIC (epic.gsfc.nasa.gov / api.nasa.gov)'}
  } else if(bakedOk){plan=baked.frames.map(f=>({meta:f.meta,url:'data/epic/'+f.file,readable:true}));E.source='NASA EPIC (cached copy; live index unavailable)'}
  if(!plan.length){E.status='unavailable';E.error='NASA EPIC index could not be reached.';emit();return}
  const frames=[];
  await Promise.all(plan.map(async(p,i)=>{let img=null,tex=null;
    if(p.readable){img=await readableImage(p.url);if(!img&&p.fallback){img=await displayImage(p.fallback);p.readable=false}}
    else img=await displayImage(p.url);
    if(img)frames[i]={meta:p.meta,date:parseUTC(p.meta.date),img,readable:p.readable,tex:null}}));
  E.frames=frames.filter(Boolean);
  if(!E.frames.length){E.status='unavailable';E.error='EPIC images could not be downloaded.';emit();return}
  E.dateLabel=label(E.frames);E.status='projecting';emit();
  if(base){for(const f of E.frames){if(!f.readable)continue;try{f.tex=project(f.img,f.meta,base)}catch(e){f.tex=null}await yieldUI();emit()}}
  E.projected=E.frames.filter(f=>f.tex);
  E.status='ready';
  E.note=E.projected.length?`${E.projected.length} of ${E.frames.length} frames re-projected onto the globe`:'Globe projection unavailable for these frames (image host blocks pixel access); showing original EPIC disk images only';
  emit()}
E.start=start;E.on=f=>E.listeners.push(f);E.parseUTC=parseUTC;E.hm=hm;
window.AstraEpic=E;
})();
