/* Hive Astra v3 · Live Signals + Missions. Every number comes from a live public feed fetched at page load,
   or is shown as unavailable ("—"). Mission facts are static and sourced from NASA pages (checked Nov 19, 2026). */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SW='https://services.swpc.noaa.gov';
const FEEDS={
  wind:SW+'/json/rtsw/rtsw_wind_1m.json',
  mag:SW+'/json/rtsw/rtsw_mag_1m.json',
  kp3:SW+'/products/noaa-planetary-k-index.json',
  kp1m:SW+'/json/planetary_k_index_1m.json',
  kpf:SW+'/products/noaa-planetary-k-index-forecast.json',
  xr:SW+'/json/goes/primary/xrays-1-day.json',
  flares:SW+'/json/goes/primary/xray-flares-7-day.json',
  prot:SW+'/json/goes/primary/integral-protons-1-day.json',
  aur:SW+'/json/ovation_aurora_latest.json',
  alerts:SW+'/products/alerts.json',
  scales:SW+'/products/noaa-scales.json'
};
// Observer comes from location.js (generic default; visitor can opt in to their own). Times use the browser's own time zone.
const place=()=>window.HiveAstraObserver?window.HiveAstraObserver.get():{name:'Your sky',lat:40,lon:-100,src:'default'};
const TZ=undefined;
// SWPC tags without a zone are UTC
const T=s=>{if(!s)return null;s=String(s).trim().replace(' ','T');if(!/Z$|[+-]\d\d:?\d\d$/.test(s))s+='Z';const d=new Date(s);return isNaN(d)?null:d};
const fmtET=(d,o={})=>d?d.toLocaleString('en-US',{timeZone:TZ,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...o})+'':'—';
const fmtTimeET=d=>d?d.toLocaleTimeString('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'—';
const num=(v,dp=0)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}):'—';
async function getJSON(url,ms=20000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
const status={};const stamps=[];
function xclass(f){if(!Number.isFinite(f)||f<=0)return null;const L=[['X',1e-4],['M',1e-5],['C',1e-6],['B',1e-7],['A',1e-8]];for(const[l,b]of L)if(f>=b)return l+(f/b).toFixed(1);return'<A1.0'}
const kpWord=k=>!Number.isFinite(k)?'':k>=9?'Extreme storm (G5)':k>=8?'Severe storm (G4)':k>=7?'Strong storm (G3)':k>=6?'Moderate storm (G2)':k>=5?'Minor storm (G1)':k>=4?'Active':'Quiet';
function setUnavailable(cardId,msg){const c=$(cardId);if(!c)return;c.querySelector('.stat-val b').textContent='—';c.querySelector('.stat-note').innerHTML='<span class="lvl">Feed unavailable.</span> '+esc(msg||'');}
function downsample(a,n){if(a.length<=n)return a;const s=a.length/n,o=[];for(let i=0;i<n;i++)o.push(a[Math.floor(i*s)]);o.push(a[a.length-1]);return o}
// SVG sparkline; pts [{t:Date,v:number}], log option, threshold
function spark(svg,pts,{log=false,thresh=null,min=null,max=null}={}){
  if(!svg)return;pts=pts.filter(p=>p.t&&Number.isFinite(p.v)&&(!log||p.v>0));if(pts.length<2){svg.innerHTML='';return}
  const f=v=>log?Math.log10(v):v;const vs=pts.map(p=>f(p.v));let lo=min??Math.min(...vs),hi=max??Math.max(...vs);if(thresh!=null){lo=Math.min(lo,f(thresh));hi=Math.max(hi,f(thresh))}if(hi-lo<1e-9){hi+=.5;lo-=.5}
  const pad=(hi-lo)*.12;lo-=pad;hi+=pad;const t0=+pts[0].t,t1=+pts[pts.length-1].t;
  const X=t=>((+t-t0)/(t1-t0||1))*200,Y=v=>48-((f(v)-lo)/(hi-lo))*46-1;
  const d=pts.map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+','+Y(p.v).toFixed(1)).join('');
  const id='sg'+Math.random().toString(36).slice(2,7);
  svg.innerHTML=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0a526" stop-opacity=".35"/><stop offset="1" stop-color="#e0a526" stop-opacity="0"/></linearGradient></defs>`+
   (thresh!=null?`<line x1="0" x2="200" y1="${Y(thresh)}" y2="${Y(thresh)}" stroke="#ff8c5a" stroke-dasharray="3 3" stroke-width=".8" vector-effect="non-scaling-stroke"/>`:'')+
   `<path d="${d}L200,48L0,48Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="#ffd36b" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
}
function sparkBars(svg,pts){if(!svg)return;pts=pts.filter(p=>Number.isFinite(p.v));if(!pts.length){svg.innerHTML='';return}const w=200/pts.length;
  svg.innerHTML=`<line x1="0" x2="200" y1="${48-5/9*46}" y2="${48-5/9*46}" stroke="#ff8c5a" stroke-dasharray="3 3" stroke-width=".8" vector-effect="non-scaling-stroke"/>`+pts.map((p,i)=>{const h=Math.max(1.5,p.v/9*46);const c=p.v>=5?'#ff8c5a':p.v>=4?'#ffb347':'#e0a526';return`<rect x="${(i*w+w*.15).toFixed(2)}" y="${(48-h).toFixed(2)}" width="${(w*.7).toFixed(2)}" height="${h.toFixed(2)}" fill="${c}" opacity=".9"/>`}).join('')}
const F={};
async function load(key){try{F[key]=await getJSON(FEEDS[key]);status[key]={ok:true}}catch(e){F[key]=null;status[key]={ok:false,err:String(e.message||e)}}}

/* ---------- renderers ---------- */
function rWind(){const d=F.wind;if(!Array.isArray(d)){setUnavailable('statWind','NOAA RTSW wind did not respond.');$('heroWind').textContent='—';$('heroWindSub').textContent='Feed unavailable';return}
  const pts=d.filter(r=>r.active!==false&&Number.isFinite(r.proton_speed)).map(r=>({t:T(r.time_tag),v:r.proton_speed,n:r.proton_density,src:r.source})).sort((a,b)=>a.t-b.t);
  if(!pts.length){setUnavailable('statWind','No valid samples in the last 24 h.');return}
  const last=pts[pts.length-1];stamps.push(last.t);const c=$('statWind');
  c.querySelector('.stat-val b').textContent=num(last.v);
  const lvl=last.v>=700?'Very fast':last.v>=500?'Fast':last.v>=350?'Typical':'Slow';
  c.querySelector('.stat-note').innerHTML=`<span class="lvl">${lvl}</span> · density ${num(last.n,1)} p/cm³ · ${fmtTimeET(last.t)}`;
  spark(c.querySelector('.spark'),downsample(pts,240));
  $('heroWind').textContent=num(last.v)+' km/s';$('heroWindSub').textContent=`${num(last.n,1)} p/cm³ · ${fmtTimeET(last.t)}`;
  // particle speed in the illustration follows the live speed
  const g=document.querySelector('.hero-stream .particles');if(g&&!g.childElementCount){const dur=Math.max(2.5,Math.min(9,3200/last.v));let h='';for(let i=0;i<34;i++){const y=150+(Math.random()-.5)*110*Math.random()*1.6;h+=`<circle cx="0" cy="${y.toFixed(1)}" r="${(Math.random()*1.6+.6).toFixed(2)}" style="animation-duration:${(dur*(.8+Math.random()*.5)).toFixed(2)}s;animation-delay:-${(Math.random()*dur).toFixed(2)}s;opacity:${(.35+Math.random()*.6).toFixed(2)}"/>`}g.innerHTML=h}
}
function rMag(){const d=F.mag;if(!Array.isArray(d)){$('heroImf').textContent='—';$('heroImfSub').textContent='Feed unavailable';return}
  const r=d.filter(x=>x.active!==false&&Number.isFinite(x.bt)&&Number.isFinite(x.bz_gsm)).sort((a,b)=>T(b.time_tag)-T(a.time_tag))[0];
  if(!r){$('heroImf').textContent='—';return}const t=T(r.time_tag);stamps.push(t);
  $('heroImf').textContent=`${num(r.bt,1)} / ${r.bz_gsm>0?'+':''}${num(r.bz_gsm,1)}`;$('heroImfSub').textContent=`Bt / Bz (GSM), nT${r.bz_gsm<-5?' · southward Bz favors aurora':''} · ${fmtTimeET(t)}`;
}
function rKp(){const c=$('statKp');const one=Array.isArray(F.kp1m)?F.kp1m.filter(x=>Number.isFinite(x.estimated_kp)).sort((a,b)=>T(a.time_tag)-T(b.time_tag)):[];
  const three=Array.isArray(F.kp3)?F.kp3.map(x=>({t:T(x.time_tag),v:Number(x.Kp??x.kp)})).filter(p=>p.t&&Number.isFinite(p.v)):[];
  if(!one.length&&!three.length){setUnavailable('statKp','NOAA Kp feeds did not respond.');$('heroKp').textContent='—';$('heroKpSub').textContent='Feed unavailable';return}
  if(one.length){const l=one[one.length-1],t=T(l.time_tag);stamps.push(t);c.querySelector('.stat-val b').textContent=num(l.estimated_kp,2);$('heroKp').textContent=num(l.estimated_kp,2);$('heroKpSub').textContent=`${kpWord(l.estimated_kp)} · est. ${fmtTimeET(t)}`;
    const o=three[three.length-1];c.querySelector('.stat-note').innerHTML=`<span class="lvl">${kpWord(l.estimated_kp)}</span> · 1-min estimate${o?` · 3-h Kp ${num(o.v,2)} (${fmtTimeET(o.t)} start)`:''}`}
  else{const o=three[three.length-1];stamps.push(o.t);c.querySelector('.stat-val b').textContent=num(o.v,2);c.querySelector('.stat-note').innerHTML=`<span class="lvl">${kpWord(o.v)}</span> · 3-hour Kp, ${fmtET(o.t)}`;$('heroKp').textContent=num(o.v,2)}
  sparkBars(c.querySelector('.spark'),three.slice(-56));
}
function rProton(){const d=F.prot;const c=$('statProton');if(!Array.isArray(d)){setUnavailable('statProton','GOES proton feed did not respond.');return}
  const pts=d.filter(r=>r.energy==='>=10 MeV'&&Number.isFinite(r.flux)).map(r=>({t:T(r.time_tag),v:r.flux})).sort((a,b)=>a.t-b.t);
  if(!pts.length){setUnavailable('statProton','No ≥10 MeV samples.');return}const l=pts[pts.length-1];stamps.push(l.t);
  c.querySelector('.stat-val b').textContent=l.v<10?num(l.v,2):num(l.v,0);
  const s=l.v>=1e5?'S5':l.v>=1e4?'S4':l.v>=1e3?'S3':l.v>=100?'S2':l.v>=10?'S1':null;
  c.querySelector('.stat-note').innerHTML=s?`<span class="lvl">Radiation storm ${s}</span> · ${fmtTimeET(l.t)}`:`<span class="lvl">Below S1</span> (10 pfu) · ${fmtTimeET(l.t)}`;
  spark(c.querySelector('.spark'),downsample(pts,240),{log:true,thresh:10});
}
function rXray(){const d=F.xr;const c=$('statXray');if(!Array.isArray(d)){setUnavailable('statXray','GOES X-ray feed did not respond.');$('xrayEmpty').textContent='GOES X-ray feed unavailable.';$('xrayStamp').textContent='Feed unavailable';return}
  const L=d.filter(r=>r.energy==='0.1-0.8nm'&&Number.isFinite(r.flux)&&r.flux>0).map(r=>({t:T(r.time_tag),v:r.flux})).sort((a,b)=>a.t-b.t);
  const S=d.filter(r=>r.energy==='0.05-0.4nm'&&Number.isFinite(r.flux)&&r.flux>0).map(r=>({t:T(r.time_tag),v:r.flux})).sort((a,b)=>a.t-b.t);
  if(!L.length){setUnavailable('statXray','No 0.1–0.8 nm samples.');return}
  const l=L[L.length-1];stamps.push(l.t);const pk=L.reduce((a,b)=>b.v>a.v?b:a);
  c.querySelector('.stat-val b').textContent=xclass(l.v);c.querySelector('.stat-val small').textContent='now';
  c.querySelector('.stat-note').innerHTML=`<span class="lvl">24 h peak ${xclass(pk.v)}</span> · ${fmtET(pk.t)}`;
  spark(c.querySelector('.spark'),downsample(L,240),{log:true});
  xrayChart(L,S);$('xrayStamp').textContent=`GOES-${d[0]?.satellite??''} · latest ${fmtET(l.t)}`;
}
function xrayChart(L,S){const svg=$('xrayChart');const W=Math.max(300,Math.round(svg.clientWidth||760)),H=Math.max(180,Math.round(svg.clientHeight||300));svg.setAttribute('viewBox',`0 0 ${W} ${H}`);const ml=46,mr=30,mt=12,mb=28;const lo=-9,hi=-3;
  const t0=+L[0].t,t1=+L[L.length-1].t;const X=t=>ml+((+t-t0)/(t1-t0||1))*(W-ml-mr);const Y=v=>mt+(1-(Math.log10(v)-lo)/(hi-lo))*(H-mt-mb);
  let g='';for(let e=lo;e<=hi;e++){const y=Y(10**e);g+=`<line class="grid" x1="${ml}" x2="${W-mr}" y1="${y}" y2="${y}"/><text class="ax" x="${ml-6}" y="${y+4}" text-anchor="end">1e${e}</text>`}
  [['A',-8],['B',-7],['C',-6],['M',-5],['X',-4]].forEach(([b,e])=>{const y=(Y(10**e)+Y(10**(e+1)))/2;g+=`<text class="band-lbl" x="${W-mr+10}" y="${y+4}">${b}</text>`});
  g+=`<rect x="${ml}" y="${Y(1e-4)}" width="${W-ml-mr}" height="${Y(1e-5)-Y(1e-4)}" fill="rgba(255,140,90,.05)"/><rect x="${ml}" y="${mt}" width="${W-ml-mr}" height="${Y(1e-4)-mt}" fill="rgba(255,90,90,.07)"/>`;
  // time ticks every 6 h
  const step=6*3600e3;for(let t=Math.ceil(t0/step)*step;t<=t1;t+=step){const x=X(t);g+=`<line class="grid" x1="${x}" x2="${x}" y1="${mt}" y2="${H-mb}"/><text class="ax" x="${x}" y="${H-8}" text-anchor="middle">${new Date(t).toLocaleTimeString('en-US',{timeZone:TZ,hour:'numeric'})}</text>`}
  const path=a=>downsample(a,700).map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+','+Y(p.v).toFixed(1)).join('');
  if(S.length)g+=`<path d="${path(S)}" fill="none" stroke="#7aa6d8" stroke-width="1.3" vector-effect="non-scaling-stroke" opacity=".85"/>`;
  g+=`<path d="${path(L)}L${X(L[L.length-1].t)},${H-mb}L${ml},${H-mb}Z" fill="rgba(224,165,38,.12)"/><path d="${path(L)}" fill="none" stroke="#ffd36b" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`;
  // GOES flare peaks (C-class and up) inside the window
  const lab=[];if(Array.isArray(F.flares)){dedupeFlares(F.flares).filter(f=>f.max&&+f.max>=t0&&+f.max<=t1&&/^[CMX]/.test(f.cls)).sort((a,b)=>b.peak-a.peak).forEach(f=>{const x=X(f.max),y=Y(f.peak);g+=`<circle cx="${x}" cy="${y}" r="3.5" fill="#ff8c5a" stroke="#141414"/>`;if(!lab.some(q=>Math.abs(q-x)<34)){lab.push(x);g+=`<text x="${x}" y="${y-9}" text-anchor="middle" font-size="11" font-weight="700" fill="#ffd36b">${esc(f.cls)}</text>`}})}
  svg.innerHTML=g;$('xrayEmpty').classList.add('gone');
}
function dedupeFlares(a){const m=new Map();a.forEach(r=>{const k=r.begin_time;if(!k)return;const v={begin:T(r.begin_time),max:T(r.max_time),end:T(r.end_time),cls:r.max_class,peak:r.max_xrlong};const p=m.get(k);if(!p||(v.peak||0)>(p.peak||0)||(v.end&&!p.end))m.set(k,v)});return[...m.values()].filter(f=>f.cls)}
function rActivity(){const items=[];const okA=Array.isArray(F.alerts),okF=Array.isArray(F.flares);
  if(okF)dedupeFlares(F.flares).filter(f=>/^[CMX]/.test(f.cls)).forEach(f=>items.push({t:f.max||f.begin,badge:f.cls,cls:'',title:`Solar flare peaked at ${f.cls}`,sub:`Began ${fmtTimeET(f.begin)}${f.end?` · ended ${fmtTimeET(f.end)}`:' · in progress'} · GOES`}));
  if(okA){const wk=Date.now()-7*864e5;F.alerts.forEach(a=>{const t=T(a.issue_datetime);if(!t||+t<wk)return;const lines=String(a.message||'').split(/\r?\n/).map(s=>s.trim());
    const hl=lines.find(s=>/^(ALERT|WARNING|WATCH|SUMMARY|EXTENDED WARNING|CONTINUED ALERT|CANCEL WATCH|CANCEL WARNING)\b.*:/.test(s))||lines.find(s=>s&&!/^(Space Weather Message Code|Serial Number|Issue Time)/.test(s))||a.product_id;
    const type=/^(EXTENDED )?WARNING|CANCEL WARNING/.test(hl)?['WARN','warn']:/WATCH/.test(hl)?['WTCH','watch']:/SUMMARY/.test(hl)?['SUM','sum']:/ALERT/.test(hl)?['ALRT','alert']:['MSG','sum'];
    const sc=lines.find(s=>/^NOAA Scale:/.test(s));items.push({t,badge:type[0],cls:type[1],title:hl.replace(/^[A-Z ]+:\s*/,m=>m.charAt(0)+m.slice(1).toLowerCase()),sub:`${sc?sc.replace('NOAA Scale:','NOAA scale').split(' - ')[0]+' · ':''}Issued ${fmtET(t)} · NOAA SWPC`})})}
  items.sort((a,b)=>b.t-a.t);const ul=$('activityList');
  if(!okA&&!okF){ul.innerHTML='<li class="muted">NOAA alerts and the GOES flare list are unavailable right now.</li>';$('activityStamp').textContent='Feeds unavailable';return}
  ul.innerHTML=items.length?items.slice(0,16).map(i=>`<li><span class="act-badge ${i.cls}">${esc(i.badge)}</span><span class="act-title">${esc(i.title)}</span><span class="act-time">${esc(i.sub)}</span></li>`).join(''):'<li class="muted">No C-class or larger flares and no NOAA alerts in the last 7 days.</li>';
  $('activityStamp').textContent=`${items.length} events · ${okA?'':'alerts feed unavailable · '}${okF?'':'flare list unavailable · '}newest ${items[0]?fmtET(items[0].t):'—'}`;
}
function rAurora(){const d=F.aur;if(!d||!Array.isArray(d.coordinates)){['auroraHere','auroraPeak','auroraMax'].forEach(i=>$(i).textContent='—');$('auroraStamp').textContent='OVATION feed unavailable';return}
  const P=place(),south=P.lat<0,lon=Math.round((P.lon+360)%360)%360,lat=Math.round(P.lat);let here=null,peak={v:-1,lat:null},mx={v:-1};
  for(const[x,y,v]of d.coordinates){if(south?y>=0:y<=0)continue;if(v>mx.v)mx={v,lon:x,lat:y};if(x===lon){if(y===lat)here=v;if(v>peak.v)peak={v,lat:y}}}
  $('auroraPlace').textContent=window.HiveAstraObserver?window.HiveAstraObserver.short(P):'YOUR SKY';$('auroraHere').textContent=here==null?'—':here+'%';
  $('auroraPeak').textContent=peak.lat==null?'—':`${peak.v}% at ${Math.abs(peak.lat)}°${south?'S':'N'}`;
  const img=$('auroraImg');if(img){const hemi=south?'south':'north';if(!img.src.includes('/ovation/'+hemi+'/')){img.src=`https://services.swpc.noaa.gov/images/animations/ovation/${hemi}/latest.jpg`;img.alt=`NOAA OVATION aurora forecast map, ${hemi}ern hemisphere`}}const hm=$('auroraHemi');if(hm)hm.textContent=south?'SOUTHERN':'NORTHERN';$('auroraMax').textContent=mx.v<0?'—':mx.v+'%';
  const ot=T(d['Observation Time']),ft=T(d['Forecast Time']);if(ot)stamps.push(ot);
  $('auroraNote').textContent=`OVATION model. Probability of visible aurora directly overhead, forecast for ${fmtTimeET(ft)}.`;
  $('auroraStamp').textContent=`Model run ${fmtET(ot)}`;
}
function rKpForecast(){const d=F.kpf;if(!Array.isArray(d)){$('kpEmpty').textContent='NOAA Kp forecast unavailable.';$('kpStamp').textContent='Feed unavailable';return}
  const rows=d.map(r=>({t:T(r.time_tag),v:Number(r.kp),o:r.observed,s:r.noaa_scale})).filter(r=>r.t&&Number.isFinite(r.v));
  const now=Date.now();const win=rows.filter(r=>+r.t>=now-2*864e5);if(!win.length){$('kpEmpty').textContent='No forecast rows.';return}
  const svg=$('kpChart'),W=Math.max(280,Math.round(svg.clientWidth||520)),H=Math.max(160,Math.round(svg.clientHeight||220)),ml=26,mr=8,mt=10,mb=26;const bw=(W-ml-mr)/win.length;const Y=v=>mt+(1-v/9)*(H-mt-mb);let g='';
  for(let k=0;k<=9;k+=3){g+=`<line class="grid" x1="${ml}" x2="${W-mr}" y1="${Y(k)}" y2="${Y(k)}"/><text class="ax" x="${ml-6}" y="${Y(k)+4}" text-anchor="end">${k}</text>`}
  g+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(5)}" y2="${Y(5)}" stroke="#ff8c5a" stroke-dasharray="4 4"/><text x="${W-mr}" y="${Y(5)-4}" text-anchor="end" font-size="10" fill="#ff8c5a">G1</text>`;
  let lastDay='';win.forEach((r,i)=>{const x=ml+i*bw;const h=Math.max(1.5,Y(0)-Y(r.v));const pred=r.o==='predicted',est=r.o==='estimated';const col=r.v>=5?'#ff8c5a':'#e0a526';
    g+=pred?`<rect x="${x+bw*.14}" y="${Y(r.v)}" width="${bw*.72}" height="${h}" fill="rgba(224,165,38,.12)" stroke="${col}" stroke-dasharray="3 2"/>`:`<rect x="${x+bw*.14}" y="${Y(r.v)}" width="${bw*.72}" height="${h}" fill="${col}" opacity="${est?.55:.95}"/>`;
    const day=r.t.toLocaleDateString('en-US',{timeZone:TZ,weekday:'short',day:'numeric'});if(day!==lastDay){lastDay=day;g+=`<line class="grid" x1="${x}" x2="${x}" y1="${mt}" y2="${H-mb}"/><text class="ax" x="${x+3}" y="${H-8}">${day}</text>`}});
  const nx=win.findIndex(r=>+r.t>now);if(nx>0){const x=ml+nx*bw;g+=`<line x1="${x}" x2="${x}" y1="${mt}" y2="${H-mb}" stroke="#ffd36b" stroke-width="1.2"/><text x="${x+4}" y="${mt+10}" font-size="10" fill="#ffd36b">now</text>`}
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=g;$('kpEmpty').classList.add('gone');
  const lastObs=[...rows].reverse().find(r=>r.o==='observed');$('kpStamp').textContent=`Last observed ${lastObs?fmtET(lastObs.t):'—'} · times in your time zone`;
}
function rScales(){const d=F.scales;const chips=document.querySelectorAll('.scale-chip');if(!d||!d['0']){chips.forEach(c=>{c.querySelector('span').textContent='—'});$('scaleProbs').innerHTML='<div class="prob">NOAA scales feed unavailable.</div>';return}
  const cur=d['0'],past=d['-1'];chips.forEach(c=>{const k=c.dataset.scale;const s=cur[k]?.Scale;c.querySelector('span').textContent=s==null?'—':k+s;c.querySelector('small').textContent=(({R:'Radio',S:'Radiation',G:'Geomag'})[k])+(cur[k]?.Text?` · ${cur[k].Text}`:'');c.className='scale-chip'+(s&&s!=='0'?' lvl'+s:'');const ps=past?.[k]?.Scale;c.title=`NOAA ${k}-scale now: ${k}${s??'?'}${ps!=null?` · past 24 h max: ${k}${ps}${past[k].Text?` (${past[k].Text})`:''}`:''}`});
  const t=T(`${cur.DateStamp}T${cur.TimeStamp}`);if(t)stamps.push(t);
  $('scaleProbs').innerHTML=['1','2','3'].map(k=>{const x=d[k];if(!x)return'';const day=new Date(x.DateStamp+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});const p=v=>v==null?'—':v+'%';return`<div class="prob"><b>${day}</b>R1–2 ${p(x.R?.MinorProb)} · R3+ ${p(x.R?.MajorProb)}<br/>S1+ ${p(x.S?.Prob)} · G${x.G?.Scale??'—'}</div>`}).join('');
}
async function rEarth(){const set=(src,tag)=>{if($('heroEarth'))$('heroEarth').src=src;const im=$('omEarth');if(im)im.setAttribute('href',src);if($('heroEarthTag'))$('heroEarthTag').textContent=tag;const ed=$('earthDate');if(ed){const m=tag.match(/\d{4}-\d\d-\d\d/);ed.textContent=m?` taken ${m[0]} UTC`:' (static texture, not live)'}};
  try{const m=await getJSON('data/epic/manifest.json',8000);const f=m.frames[Math.floor(m.frames.length/2)];set('data/epic/'+f.file,`EARTH · NASA EPIC · ${f.meta.date.slice(0,10)} UTC`);return}catch(e){}
  try{const a=await getJSON('https://epic.gsfc.nasa.gov/api/natural',10000);const f=a[Math.floor(a.length/2)];const[dd]=f.date.split(' ');const[y,mo,da]=dd.split('-');set(`https://epic.gsfc.nasa.gov/archive/natural/${y}/${mo}/${da}/jpg/${f.image}.jpg`,`EARTH · NASA EPIC · ${dd} UTC`)}catch(e){set('assets/textures/earth.webp','EARTH · BLUE MARBLE TEXTURE (NOT LIVE)')}
}
function setStamp(){const ok=Object.values(status).filter(s=>s.ok).length,n=Object.keys(status).length;const newest=stamps.filter(Boolean).sort((a,b)=>b-a)[0];
  const fail=Object.entries(status).filter(([,s])=>!s.ok).map(([k])=>k);
  $('sigUpdated').textContent=newest?`Updated ${fmtET(newest)} · ${ok}/${n} NOAA feeds live${fail.length?` · unavailable: ${fail.join(', ')}`:''}`:`${ok}/${n} NOAA feeds responding`;
  $('sigPulse').className='pulse '+(ok===n?'ok':ok?'':'bad');document.documentElement.dataset.sigFeeds=ok+'/'+n;}
let loadingSignals=false;
async function loadSignals(){if(loadingSignals)return;loadingSignals=true;stamps.length=0;
  $('sigUpdated').textContent='Fetching NOAA SWPC feeds…';
  await Promise.all(Object.keys(FEEDS).map(load));
  [rWind,rMag,rKp,rProton,rXray,rActivity,rAurora,rKpForecast,rScales].forEach(fn=>{try{fn()}catch(e){console.error(fn.name,e)}});
  setStamp();loadingSignals=false;document.documentElement.dataset.signalsReady='1';
}
$('heroSun')?.addEventListener('error',e=>{e.target.closest('.hero-sun').querySelector('.hero-tag').textContent='SDO IMAGE UNAVAILABLE';e.target.style.opacity=.15});
$('sigRefresh')?.addEventListener('click',()=>{loadSignals();const s=$('heroSun');if(s)s.src=s.src.split('?')[0]+'?t='+Date.now();const a=$('auroraImg');if(a)a.src=a.src.split('?')[0]+'?t='+Date.now()});

/* ---------- Missions (static facts from NASA pages, checked 2026-11-19) ---------- */
const MISSIONS=[
 {id:'artemis2',name:'Artemis II',agency:'NASA · CSA',kind:'Crewed lunar flyby',st:'done',stl:'Completed',dest:'Around the Moon and back',img:'assets/missions/artemis2.webp',cap:'SLS and Orion launch. Photo: NASA/Bill Ingalls (from NASA\'s Artemis II page)',
  blurb:'The first crewed Artemis flight sent four astronauts around the Moon aboard Orion. It was humanity\'s first crewed lunar flyby in more than 50 years.',
  facts:[['Launch','Apr 1, 2026 · KSC'],['Splashdown','Apr 10, 2026 · off San Diego'],['Duration','9 d 1 h 32 min'],['Crew','Wiseman, Glover, Koch, Hansen (CSA)']],
  ms:[['Apr 1, 2026','SLS launches Orion with four astronauts from Kennedy Space Center'],['Apr 10, 2026','Orion splashes down off the coast of San Diego'],['Oct 2026','NASA analysis confirms Orion\'s heat shield performed as expected'],['2027 (planned)','Artemis III: crewed test of rendezvous and docking with lander test articles in Earth orbit',1],['2028 (target)','Artemis IV: first Artemis crewed lunar landing',1]],
  data:'none',src:[['NASA Artemis II','https://www.nasa.gov/mission/artemis-ii/'],['Heat shield analysis','https://www.nasa.gov/missions/artemis/artemis-2/rigorous-analysis-confirms-nasas-artemis-ii-heat-shield-performance/'],['Artemis plans (Nov 2026)','https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/']],gallery:'https://www.nasa.gov/mission/artemis-ii/'},
 {id:'parker',name:'Parker Solar Probe',agency:'NASA · JHU/APL',kind:'Solar orbiter',st:'active',stl:'Operating',dest:'Inside the solar corona',img:'assets/missions/parker.webp',cap:'Parker Solar Probe during preparation. Photo: NASA',
  blurb:'Parker Solar Probe flies through the Sun\'s outer atmosphere, the corona, to trace how energy and heat move through it and what accelerates the solar wind.',
  facts:[['Launch','Aug 12, 2018 · Delta IV Heavy'],['Closest approach','≈6.2 million km from the Sun'],['Top speed','≈700,000 km/h'],['Heat shield','11.43 cm carbon composite']],
  ms:[['Aug 12, 2018','Launch from Cape Canaveral on a Delta IV Heavy'],['Dec 14, 2021','NASA announces Parker has flown through the corona, the first spacecraft to "touch the Sun"'],['2026','NASA reports Parker\'s 27th swing around the Sun']],
  data:'wind',src:[['NASA Parker Solar Probe','https://science.nasa.gov/mission/parker-solar-probe/'],['JHU/APL mission site','https://parkersolarprobe.jhuapl.edu/']],gallery:'https://science.nasa.gov/mission/parker-solar-probe/'},
 {id:'imap',name:'IMAP',agency:'NASA · Princeton',kind:'Heliosphere mapper',st:'active',stl:'Operating',dest:'Sun–Earth L1',img:'assets/missions/imap.webp',cap:'IMAP. Artist\'s concept: NASA',
  blurb:'The Interstellar Mapping and Acceleration Probe maps the boundary of the heliosphere, the Sun\'s protective bubble, and gives near-real-time solar wind warnings from L1.',
  facts:[['Launch','Sept 24, 2025 · Falcon 9'],['Location','Sun–Earth L1 (≈1.5 million km)'],['Instruments','10'],['Mass','900 kg']],
  ms:[['Sept 24, 2025','Launch from Kennedy Space Center LC-39A'],['At L1','Maps the heliosphere boundary using energetic neutral atoms'],['I-ALiRT','Streams a subset of data for real-time space weather use']],
  data:'wind',src:[['NASA IMAP','https://science.nasa.gov/mission/imap/']],gallery:'https://science.nasa.gov/mission/imap/'},
 {id:'sdo',name:'Solar Dynamics Observatory',short:'SDO',agency:'NASA',kind:'Solar observatory',st:'active',stl:'Operating',dest:'Geosynchronous orbit',img:'assets/missions/sdo.webp',cap:'SDO. Artist\'s concept: NASA',
  blurb:'SDO watches the Sun around the clock, tracking its interior, atmosphere, magnetic field and energy output to show how solar activity drives space weather.',
  facts:[['Launch','Feb 11, 2010'],['Orbit','Inclined geosynchronous (28.5°)'],['Imagers','AIA, HMI'],['Live on this page','Latest solar images']],
  ms:[['Feb 11, 2010','Launch'],['Ongoing','Nearly continuous Sun observations, streamed to a dedicated ground station']],
  data:'sdo',src:[['NASA SDO','https://science.nasa.gov/mission/sdo/'],['SDO mission','https://sdo.gsfc.nasa.gov/mission/'],['SDO data','https://sdo.gsfc.nasa.gov/data/']],gallery:'https://sdo.gsfc.nasa.gov/data/'},
 {id:'webb',name:'James Webb Space Telescope',short:'Webb',agency:'NASA · ESA · CSA',kind:'Infrared observatory',st:'active',stl:'Operating',dest:'Sun–Earth L2',img:'assets/missions/webb.webp',cap:'Webb. Artist\'s concept: NASA',
  blurb:'Webb is the largest and most powerful space telescope ever launched. It studies everything from the first galaxies to planets in our own solar system.',
  facts:[['Launch','Dec 25, 2021'],['Arrived at L2','Jan 24, 2022'],['Distance','≈1.5 million km from Earth'],['Sunshield','5 layers']],
  ms:[['Dec 25, 2021','Launch'],['Jan 24, 2022','Arrives at the second Lagrange point (L2)'],['July 2022','First science images released'],['Nov 18, 2026','NASA feature: Webb data help clinch a first-of-its-kind stellar merger']],
  data:'none',src:[['NASA Webb','https://science.nasa.gov/mission/webb/']],gallery:'https://science.nasa.gov/mission/webb/'},
 {id:'clipper',name:'Europa Clipper',agency:'NASA · JPL',kind:'Jupiter orbiter',st:'cruise',stl:'En route',dest:'Jupiter\'s moon Europa',img:'assets/missions/clipper.webp',cap:'Europa Clipper launches on Falcon Heavy, Oct 14, 2024. Photo: NASA',
  blurb:'Europa Clipper will find out whether there are places below Europa\'s icy surface, above a global saltwater ocean, that could support life.',
  facts:[['Launch','Oct 14, 2024 · Falcon Heavy'],['Earth flyby','Dec 3, 2026'],['Jupiter arrival','April 2030'],['Europa flybys','49 planned']],
  ms:[['Oct 14, 2024','Launch from Kennedy Space Center'],['2025','Mars gravity-assist flyby'],['Dec 3, 2026','Earth gravity-assist flyby',1],['Apr 2030','Arrival at Jupiter',1]],
  data:'countdown',cd:['2026-12-03','Earth gravity-assist flyby'],src:[['NASA Europa Clipper','https://science.nasa.gov/mission/europa-clipper/']],gallery:'https://science.nasa.gov/mission/europa-clipper/'},
 {id:'psyche',name:'Psyche',agency:'NASA · JPL',kind:'Asteroid orbiter',st:'cruise',stl:'En route',dest:'Metal-rich asteroid Psyche',img:'assets/missions/psyche.webp',cap:'Psyche launches on Falcon Heavy, Oct 13, 2023. Photo: NASA',
  blurb:'Psyche is headed to a metal-rich asteroid that may be part of the core of an early planetary building block. It also carries a deep-space laser communications experiment.',
  facts:[['Launch','Oct 13, 2023 · Falcon Heavy'],['Arrival','By Aug 2029'],['Prime mission','About 2 years in orbit'],['Tech demo','DSOC laser comms']],
  ms:[['Oct 13, 2023','Launch from Kennedy Space Center LC-39A'],['En route','Mars gravity-assist flyby completed (NASA has released the flyby data)'],['Aug 2029','Prime mission begins at asteroid Psyche',1]],
  data:'none',src:[['NASA Psyche','https://science.nasa.gov/mission/psyche/']],gallery:'https://science.nasa.gov/mission/psyche/'},
 {id:'perseverance',name:'Perseverance',agency:'NASA · JPL',kind:'Mars rover',st:'active',stl:'Operating',dest:'Jezero Crater, Mars',img:'assets/missions/perseverance.webp',cap:'Perseverance selfie near "Cheyava Falls," July 2024. Image: NASA/JPL-Caltech (via NASA Perseverance page)',
  blurb:'Perseverance is looking for signs of ancient microbial life in Jezero Crater and collecting rock cores that a future mission could bring back to Earth.',
  facts:[['Launch','July 30, 2020'],['Landing','Feb 18, 2021 · Jezero'],['Distance record','45.22 km (Oct 11, 2026)'],['Live on this page','Latest raw images']],
  ms:[['July 30, 2020','Launch'],['Feb 18, 2021','Lands in Jezero Crater'],['Sept 2025','Nature publishes "Cheyava Falls" potential-biosignature findings'],['Oct 11, 2026','Sets the off-world driving record at 45.22 km']],
  data:'mars',src:[['NASA Perseverance','https://science.nasa.gov/mission/mars-2020-perseverance/'],['Raw images','https://mars.nasa.gov/mars2020/multimedia/raw-images/']],gallery:'https://mars.nasa.gov/mars2020/multimedia/raw-images/'}
];
let sel='artemis2',tab='overview',filt='all';
const badge=m=>`<span class="status ${m.st}">${esc(m.stl)}</span>`;
function rList(){$('missionList').innerHTML=MISSIONS.filter(m=>filt==='all'||m.st===filt).map(m=>`<li><button role="option" aria-selected="${m.id===sel}" data-id="${m.id}"><img class="ml-thumb" src="${m.img}" alt="" loading="lazy"/><span><span class="ml-name">${esc(m.short||m.name)}</span><br/><span class="ml-sub">${esc(m.kind)} · ${esc(m.dest)}</span></span>${badge(m)}</button></li>`).join('');
  $('missionList').querySelectorAll('button').forEach(b=>b.onclick=()=>{sel=b.dataset.id;tab='overview';rList();rDetail()});
  document.querySelectorAll('.om-pt').forEach(p=>p.classList.toggle('sel',p.dataset.m===sel))}
function liveTile(lbl,val,sub){return`<div class="md-fact"><small>${esc(lbl)}</small><b>${val}</b><div class="ml-sub">${sub}</div></div>`}
function windTiles(){const d=Array.isArray(F.wind)?F.wind.filter(r=>r.active!==false&&Number.isFinite(r.proton_speed)).sort((a,b)=>T(b.time_tag)-T(a.time_tag))[0]:null;const m=Array.isArray(F.mag)?F.mag.filter(r=>r.active!==false&&Number.isFinite(r.bt)).sort((a,b)=>T(b.time_tag)-T(a.time_tag))[0]:null;
  if(!d&&!m)return`<p>${F.wind===undefined?'Loading NOAA real-time solar wind…':'NOAA real-time solar wind is unavailable right now.'}</p>`;
  return`<div class="data-live">${liveTile('Solar wind speed · L1',d?num(d.proton_speed)+' km/s':'—',d?fmtET(T(d.time_tag)):'unavailable')}${liveTile('Proton density · L1',d?num(d.proton_density,1)+' p/cm³':'—',d?'NOAA RTSW':'unavailable')}${liveTile('IMF Bt / Bz',m?`${num(m.bt,1)} / ${num(m.bz_gsm,1)} nT`:'—',m?fmtET(T(m.time_tag)):'unavailable')}</div><p class="tiny">Live: NOAA SWPC Real-Time Solar Wind, measured at L1. NOAA lists the data source as "${esc(d?.source||m?.source||'—')}". These are NOAA's operational numbers, not mission-team science data.</p>`}
async function marsImgs(el){el.innerHTML='<p>Loading the latest Perseverance raw images…</p>';try{const j=await getJSON('https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=40&order=sol%20desc',15000);
  const pics=(j.images||[]).filter(i=>!/SKYCAM|MEDA/i.test(i.camera?.instrument||'')).slice(0,6);if(!pics.length)throw new Error('none');
  el.innerHTML=`<div class="md-gallery">${pics.map(i=>`<figure><a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer"><img src="${esc(i.image_files.small||i.image_files.medium)}" alt="${esc(i.title)}" loading="lazy"/></a><figcaption>Sol ${i.sol} · ${esc((i.camera?.instrument||'').replace(/_/g,' '))} · ${fmtET(T(i.date_taken_utc))}<br/>${esc(i.credit)}</figcaption></figure>`).join('')}</div><p class="tiny">Live: the newest raw images NASA has published from Perseverance. Raw images are unprocessed.</p>`}catch(e){el.innerHTML='<p>The Perseverance raw-image feed is unavailable right now. <a href="https://mars.nasa.gov/mars2020/multimedia/raw-images/" target="_blank" rel="noopener noreferrer">Browse raw images at NASA ↗</a></p>'}}
function sdoImgs(){return`<div class="md-gallery">${[['0171','AIA 171 Å'],['0193','AIA 193 Å'],['0304','AIA 304 Å'],['0131','AIA 131 Å'],['HMIIC','HMI continuum'],['HMIB','HMI magnetogram']].map(([k,l])=>`<figure><img src="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_${k}.jpg" alt="SDO ${l}" loading="lazy"/><figcaption>${l} · latest</figcaption></figure>`).join('')}</div><p class="tiny">Live: NASA/SDO latest images. The capture time is printed on each image.</p>`}
function rDetail(){const m=MISSIONS.find(x=>x.id===sel);const el=$('missionDetail');
  el.innerHTML=`<div class="md-top"><figure class="md-img"><img src="${m.img}" alt="${esc(m.name)}"/><figcaption>${esc(m.cap)}</figcaption></figure><div class="md-title"><div class="eyebrow gold">${esc(m.agency)} · ${esc(m.kind.toUpperCase())}</div><h3>${esc(m.name)}</h3>${badge(m)}<p style="margin-top:10px">${esc(m.blurb)}</p><div class="md-facts">${m.facts.map(([k,v])=>`<div class="md-fact"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div></div></div>
  <div class="md-tabs" role="tablist">${['overview','images','milestones','data'].map(t=>`<button role="tab" aria-selected="${t===tab}" data-t="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div class="md-pane" id="mdPane"></div>
  <div class="md-sources">Sources: ${m.src.map(([l,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(l)} ↗</a>`).join('')}</div>`;
  el.querySelectorAll('.md-tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;rDetail()});
  const p=$('mdPane');
  if(tab==='overview')p.innerHTML=`<ul><li><b>Destination:</b> ${esc(m.dest)}</li><li><b>Status:</b> ${esc(m.stl)}${m.id==='artemis2'?' (crewed flight flown April 1–10, 2026)':''}</li><li><b>Partners:</b> ${esc(m.agency)}</li><li><b>Live on Hive Astra:</b> ${({wind:'NOAA real-time solar wind at L1 (Data tab)',sdo:'Latest SDO solar images (Images and Data tabs)',mars:'Newest Perseverance raw images (Images and Data tabs)',countdown:'Countdown to the next NASA-scheduled milestone (Data tab)',none:'Nothing live. Static facts with NASA sources.'})[m.data]}</li></ul>`;
  else if(tab==='milestones')p.innerHTML=`<ul class="timeline">${m.ms.map(([d,t,f])=>`<li class="${f?'future':''}"><b>${esc(d)}</b>${esc(t)}</li>`).join('')}</ul>`;
  else if(tab==='images'){if(m.data==='mars')marsImgs(p);else if(m.data==='sdo')p.innerHTML=sdoImgs();else p.innerHTML=`<div class="md-gallery"><figure><img src="${m.img}" alt="${esc(m.name)}"/><figcaption>${esc(m.cap)}</figcaption></figure></div><p class="tiny"><a href="${m.gallery}" target="_blank" rel="noopener noreferrer">More official images at NASA ↗</a></p>`}
  else{if(m.data==='wind')p.innerHTML=windTiles();else if(m.data==='sdo')p.innerHTML=`${sdoImgs()}`;else if(m.data==='mars')marsImgs(p);
    else if(m.data==='countdown'){const days=Math.ceil((Date.parse(m.cd[0]+'T12:00:00Z')-Date.now())/864e5);p.innerHTML=`<div class="data-live">${liveTile(m.cd[1],days>0?days+' days':days===0?'Today':'Passed',`Date per NASA: ${new Date(m.cd[0]+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}`)}</div><p class="tiny">The countdown is calculated from NASA's published date. It is not spacecraft telemetry. To see where Clipper is now, use <a href="https://eyes.nasa.gov/apps/solar-system/" target="_blank" rel="noopener noreferrer">NASA's Eyes on the Solar System ↗</a>.</p>`}
    else p.innerHTML=`<p>No public live data feed is connected for ${esc(m.short||m.name)}${m.st==='done'?' because the mission is complete':''}. Hive Astra doesn't make up telemetry. See the official sources below.</p>`}
}
function rFeatured(){$('featuredRow').innerHTML=['artemis2','clipper','webb','perseverance'].map(id=>{const m=MISSIONS.find(x=>x.id===id);return`<button class="f-card" data-id="${id}"><img src="${m.img}" alt="" loading="lazy"/><div><b>${esc(m.name)}</b><small>${esc(m.dest)}</small><br/>${badge(m)}</div></button>`}).join('');
  $('featuredRow').querySelectorAll('.f-card').forEach(b=>b.onclick=()=>{sel=b.dataset.id;tab='overview';filt='all';document.querySelectorAll('.m-filters .chip').forEach(c=>c.classList.toggle('active',c.dataset.f==='all'));rList();rDetail();$('missionDetail').scrollIntoView({behavior:'smooth',block:'start'})})}
document.querySelectorAll('.m-filters .chip').forEach(c=>c.onclick=()=>{filt=c.dataset.f;document.querySelectorAll('.m-filters .chip').forEach(x=>x.classList.toggle('active',x===c));rList()});
document.querySelectorAll('.om-pt').forEach(p=>p.addEventListener('click',()=>{const id=p.dataset.m;if(id==='iss')return;sel=id;tab='overview';rList();rDetail()}));
async function rISS(){try{const d=await getJSON('https://api.wheretheiss.at/v1/satellites/25544',10000);const t=new Date(d.timestamp*1000);
  const la=d.latitude,lo=d.longitude;$('issPos').textContent=`${Math.abs(la).toFixed(1)}°${la>=0?'N':'S'}, ${Math.abs(lo).toFixed(1)}°${lo>=0?'E':'W'}`;
  $('issAlt').textContent=`altitude ${num(d.altitude)} km · ${num(d.velocity)} km/h · ${d.visibility||''}`;$('issUpdated').textContent=`ISS position updated ${fmtET(t,{second:'2-digit'})} · wheretheiss.at`;$('issPulse').className='pulse ok';document.documentElement.dataset.issReady='1'}
  catch(e){$('issPos').textContent='—';$('issAlt').textContent='ISS position feed unavailable';$('issUpdated').textContent='ISS position feed unavailable';$('issPulse').className='pulse bad'}}
// init
rList();rDetail();rFeatured();rEarth();loadSignals().then(()=>{if(['parker','imap'].includes(sel)&&tab==='data')rDetail()});rISS();setInterval(rISS,15000);setInterval(()=>{if(!document.hidden)loadSignals()},5*60e3);
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{try{if(F.xr)rXray();if(F.kpf)rKpForecast()}catch(e){}},250)});
// re-render charts when the Live signals tab becomes visible (hidden panels have no size)
document.querySelector('.tab[data-tab="signals"]')?.addEventListener('click',()=>setTimeout(()=>{try{if(F.xr)rXray();if(F.kpf)rKpForecast()}catch(e){}},30));
// mobile orbit map framing
const om=$('orbitMap');const mq=matchMedia('(max-width:730px)');const frame=()=>om&&om.setAttribute('viewBox',mq.matches?'190 60 990 400':'0 0 1200 520');mq.addEventListener?.('change',frame);frame();
// recompute location-dependent readouts when the visitor changes their sky
window.addEventListener('astra:observer',()=>{try{rAurora()}catch(e){}});
// deep links: #signals / #missions / #learn open those tabs (#learn/<lesson> is handled by lessons.js)
const openHash=()=>{const h=location.hash.replace('#','');const b=document.querySelector(`.tab[data-tab="${h}"]`);if(b)b.click()};window.addEventListener('hashchange',openHash);setTimeout(openHash,0);
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.tab,H=['signals','missions','learn'];if(t==='learn'&&location.hash.startsWith('#learn/'))return;if(H.includes(t)&&location.hash!=='#'+t)history.replaceState(null,'','#'+t);else if(!H.includes(t)&&location.hash)history.replaceState(null,'',location.pathname)}));
})();
