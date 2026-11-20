/* Hive Astra • Hive Academy field guides: six in-page interactive lessons.
   Self-contained (no libraries, no network). Constants: AU = 149,597,870.7 km (IAU 2012),
   c = 299,792.458 km/s, mean Earth–Moon distance (1 LD) = 384,400 km.
   Every simplified model is labeled as a simplification in the lesson text. */
(()=>{
'use strict';
const AU=149597870.7, C=299792.458, LD=384400, DAY=86400, YR=365.25*DAY;
const KMS_PER_AUYR=AU/YR;            // 1 AU/yr ≈ 4.7405 km/s
const GM=4*Math.PI*Math.PI;          // Sun's GM in AU^3/yr^2 (Kepler units)
const lowMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const nf=(n,d=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const sig=(n,s=3)=>{if(!isFinite(n))return '—';if(n===0)return '0';const d=Math.max(0,s-1-Math.floor(Math.log10(Math.abs(n))));return nf(n,Math.min(d,6))};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dur(sec){sec=Math.abs(sec);if(sec<1)return nf(sec*1000,0)+' ms';if(sec<60)return sig(sec,3)+' s';if(sec<3600)return Math.floor(sec/60)+' min '+Math.round(sec%60)+' s';if(sec<86400)return Math.floor(sec/3600)+' h '+Math.round(sec%3600/60)+' min';return sig(sec/86400,3)+' days'}
function len(km){if(km<0.001)return sig(km*1e6,3)+' mm';if(km<0.01)return sig(km*1e5,3)+' cm';if(km<1)return sig(km*1000,3)+' m';return sig(km,3)+' km'}
function fitCanvas(cv,aspect,maxH){const w=cv.clientWidth||cv.parentNode.clientWidth||600;let h=Math.round(w*aspect);if(maxH)h=Math.min(h,maxH);const dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.height=h+'px';const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h}}
function loop(fn){let id=0,last=performance.now(),alive=true;const f=t=>{if(!alive)return;const dt=Math.min(.05,(t-last)/1000);last=t;fn(dt,t);id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return ()=>{alive=false;cancelAnimationFrame(id)}}
const simp=t=>`<span class="simp">SIMPLIFICATION</span>${t}`;

// 01 Orbit simulator (two-body, Sun fixed, 2D). opt.wedges -> Kepler's second law.
function orbitSim(el,opt={}){
  el.innerHTML=`<div class="lw"><canvas role="img" aria-label="Orbit simulation: a body circling the Sun"></canvas>
  <div class="row"><label>Starting distance from the Sun <output data-o="r"></output><input data-i="r" type="range" min="0.3" max="5" step="0.01" value="1"></label>
  <label>Sideways (tangential) speed <output data-o="v"></output><input data-i="v" type="range" min="5" max="60" step="0.1" value="29.8"></label></div>
  <div class="row chips" role="group" aria-label="Presets">
   <button class="chip" data-p="1,29.78">Earth-like (1 AU, 29.8 km/s)</button><button class="chip" data-p="1.524,24.13">Mars-like (1.52 AU, 24.1 km/s)</button>
   <button class="chip" data-p="1,20">Too slow (1 AU, 20 km/s)</button><button class="chip" data-p="1,38">Comet-like (1 AU, 38 km/s)</button><button class="chip" data-p="1,43">Escape (1 AU, 43 km/s)</button>
   <button class="chip" data-a="pause" aria-pressed="false">Pause</button></div>
  <div class="readout" aria-live="polite"></div>
  <p class="cap">${opt.wedges?'Each shaded wedge is the area swept in the same span of time (1/12 of the orbit). Kepler’s second law says they match, whether the body is close and fast or far and slow.':'Dashed ring: Earth’s orbit (1 AU). Gold path: where this body will go. Circular speed at 1 AU is about 29.8 km/s; escape speed there is about 42.1 km/s.'}</p></div>`;
  const cv=$('canvas',el),ri=$('[data-i=r]',el),vi=$('[data-i=v]',el),ro=$('.readout',el);
  let C2,s,orb,paused=lowMotion,elapsed=0,wedge=null,wedges=[],nextMark=0;
  const pauseBtn=$('[data-a=pause]',el);pauseBtn.setAttribute('aria-pressed',paused);pauseBtn.textContent=paused?'Play':'Pause';
  function elements(x,y,vx,vy){const r=Math.hypot(x,y),v2=vx*vx+vy*vy,E=v2/2-GM/r,h=x*vy-y*vx,e=Math.sqrt(Math.max(0,1+2*E*h*h/(GM*GM))),p=h*h/GM;const bound=E<0;const a=bound?-GM/(2*E):Infinity;return {r,E,h,e,p,bound,a,T:bound?Math.pow(a,1.5):Infinity,peri:p/(1+e),apo:bound?a*(1+e):Infinity}}
  function reset(){const r=+ri.value,v=+vi.value;$('[data-o=r]',el).textContent=nf(r,2)+' AU';$('[data-o=v]',el).textContent=nf(v,1)+' km/s';
    s={x:r,y:0,vx:0,vy:v/KMS_PER_AUYR};orb=elements(s.x,s.y,s.vx,s.vy);orb.w=(v/KMS_PER_AUYR)>=Math.sqrt(GM/r)?0:Math.PI;elapsed=0;wedges=[];wedge=[[s.x,s.y]];nextMark=orb.T/12;
    const other=orb.bound?(orb.w===0?orb.apo:orb.peri):r*3;const b=orb.bound?orb.a*Math.sqrt(1-orb.e*orb.e):r*2.2;
    let xmin=-Math.min(other,14),xmax=r,ymax=Math.min(b,14);if(!orb.bound){xmin=-r*2.2;xmax=r*2.2;ymax=r*2.2}
    xmin=Math.min(xmin,-1.05);xmax=Math.max(xmax,1.05);ymax=Math.max(ymax,1.05);orb.view={cx:(xmin+xmax)/2,half:Math.max((xmax-xmin)/2*1.12,ymax*1.12)};
    C2=fitCanvas(cv,.62,440);draw();info()}
  function step(dtYears){let t=0,guard=0;while(t<dtYears&&guard++<6000){const r=Math.hypot(s.x,s.y);const dt=Math.min(dtYears-t,0.0008*Math.pow(r,1.5)+1e-6);
      let ax=-GM*s.x/(r*r*r),ay=-GM*s.y/(r*r*r);s.vx+=ax*dt/2;s.vy+=ay*dt/2;s.x+=s.vx*dt;s.y+=s.vy*dt;const r2=Math.hypot(s.x,s.y);ax=-GM*s.x/(r2*r2*r2);ay=-GM*s.y/(r2*r2*r2);s.vx+=ax*dt/2;s.vy+=ay*dt/2;t+=dt;elapsed+=dt;
      if(opt.wedges&&orb.bound){wedge.push([s.x,s.y]);if(elapsed>=nextMark){wedges.push({pts:wedge,area:polyArea(wedge)});if(wedges.length>12)wedges.shift();wedge=[[s.x,s.y]];nextMark+=orb.T/12}}}}
  function polyArea(p){let A=0;for(let i=1;i<p.length;i++)A+=p[i-1][0]*p[i][1]-p[i][0]*p[i-1][1];return Math.abs(A)/2}
  function draw(){const {ctx,w,h}=C2,k=Math.min(w,h)/2/orb.view.half,X=x=>w/2+(x-orb.view.cx)*k,Y=y=>h/2-y*k;ctx.clearRect(0,0,w,h);
    ctx.setLineDash([4,5]);ctx.strokeStyle='rgba(128,183,230,.45)';ctx.beginPath();ctx.arc(X(0),Y(0),k,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(128,183,230,.7)';ctx.font='11px Inter,sans-serif';ctx.fillText('Earth’s orbit (1 AU)',X(0)+k*.72,Y(0)-k*.72);
    if(opt.wedges)wedges.forEach((wd,i)=>{ctx.beginPath();ctx.moveTo(X(0),Y(0));wd.pts.forEach(p=>ctx.lineTo(X(p[0]),Y(p[1])));ctx.closePath();ctx.fillStyle=i%2?'rgba(241,186,97,.30)':'rgba(128,183,230,.28)';ctx.fill()});
    ctx.strokeStyle='rgba(241,186,97,.75)';ctx.lineWidth=1.4;ctx.beginPath();let first=true;for(let th=0;th<=Math.PI*2+0.001;th+=Math.PI/360){const den=1+orb.e*Math.cos(th-orb.w);if(den<0.04){first=true;continue}const rr=orb.p/den;if(rr>60){first=true;continue}const px=X(rr*Math.cos(th)),py=Y(rr*Math.sin(th));first?ctx.moveTo(px,py):ctx.lineTo(px,py);first=false}ctx.stroke();ctx.lineWidth=1;
    const g=ctx.createRadialGradient(X(0),Y(0),0,X(0),Y(0),16);g.addColorStop(0,'#fff3c4');g.addColorStop(.35,'#ffc45e');g.addColorStop(1,'rgba(255,196,94,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(X(0),Y(0),16,0,7);ctx.fill();
    ctx.fillStyle='#9fd3ff';ctx.beginPath();ctx.arc(X(s.x),Y(s.y),5,0,7);ctx.fill();
    const vs=Math.hypot(s.vx,s.vy);ctx.strokeStyle='#e9edf2';ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.lineTo(X(s.x)+s.vx/vs*22,Y(s.y)-s.vy/vs*22);ctx.stroke()}
  function info(){const r=Math.hypot(s.x,s.y),v=Math.hypot(s.vx,s.vy)*KMS_PER_AUYR;let html=`<div>DISTANCE NOW<b>${nf(r,2)} AU</b></div><div>SPEED NOW<b>${nf(v,1)} km/s</b></div>`;
    if(orb.bound)html+=`<div>ORBIT SHAPE (e)<b>${nf(orb.e,3)}</b></div><div>CLOSEST / FARTHEST<b>${nf(orb.peri,2)} / ${nf(orb.apo,2)} AU</b></div><div>PERIOD (KEPLER III)<b>${orb.T<2?nf(orb.T*365.25,0)+' days':nf(orb.T,2)+' yr'}</b></div>`;
    else html+=`<div>ORBIT<b>Unbound: escapes</b></div><div>ESCAPE SPEED HERE<b>${nf(Math.sqrt(2*GM/+ri.value)*KMS_PER_AUYR,1)} km/s</b></div>`;
    html+=`<div>TIME ELAPSED<b>${nf(elapsed*365.25,0)} days</b></div>`;
    if(opt.wedges&&orb.bound){const n=wedges.length;html+=`<div>EXPECTED AREA EACH (πab/12)<b>${sig(Math.PI*orb.a*orb.a*Math.sqrt(1-orb.e*orb.e)/12,3)} AU²</b></div><div>LAST TWO WEDGES<b>${n>1?sig(wedges[n-2].area,3)+' · '+sig(wedges[n-1].area,3):'…'}</b></div>`}
    ro.innerHTML=html}
  ri.oninput=vi.oninput=reset;
  $$('[data-p]',el).forEach(b=>b.onclick=()=>{const [r,v]=b.dataset.p.split(',');ri.value=r;vi.value=v;reset()});
  pauseBtn.onclick=()=>{paused=!paused;pauseBtn.setAttribute('aria-pressed',paused);pauseBtn.textContent=paused?'Play':'Pause'};
  reset();let acc=0;const stop=loop(dt=>{if(paused)return;const yps=orb.bound?Math.min(orb.T,200)/9:Math.pow(+ri.value,1.5)/3;step(dt*yps);if(!orb.bound&&Math.hypot(s.x,s.y)>orb.view.half*3)reset();draw();acc+=dt;if(acc>.2){acc=0;info()}});
  const onR=()=>reset();window.addEventListener('resize',onR);return ()=>{stop();window.removeEventListener('resize',onR)}}

// 01 Kepler's third law table + calculator
function keplerThird(el){const P=[['Mercury',0.387,87.97],['Venus',0.723,224.70],['Earth',1.000,365.26],['Mars',1.524,686.98],['Jupiter',5.203,4332.6],['Saturn',9.537,10759],['Uranus',19.19,30689],['Neptune',30.07,60190]];
  el.innerHTML=`<div class="lw"><div class="scroll-x"><table><thead><tr><th>Planet</th><th>a (AU)</th><th>Measured period</th><th>a<sup>1.5</sup> (years)</th></tr></thead><tbody>${P.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td>${nf(p[2]/365.25,3)} yr</td><td>${nf(Math.pow(p[1],1.5),3)}</td></tr>`).join('')}</tbody></table></div>
  <p class="cap">Measured periods: NASA planetary fact sheets (sidereal orbit periods). The last column is pure arithmetic: T = a<sup>1.5</sup>.</p>
  <div class="row"><label>Try any average distance a <output data-o="a"></output><input type="range" min="0.1" max="100" step="0.1" value="2.8"></label><div><div class="big" data-o="t"></div><div class="cap">orbital period around the Sun</div></div></div></div>`;
  const i=$('input',el);const u=()=>{const a=+i.value,T=Math.pow(a,1.5);$('[data-o=a]',el).textContent=nf(a,1)+' AU';$('[data-o=t]',el).textContent=T<2?nf(T*365.25,0)+' days':nf(T,1)+' years'};i.oninput=u;u()}

// 02 Sun -> wind -> magnetosphere -> aurora step-through, plus travel-time slider
function swJourney(el){const S=[
  ['Sun','Flares are bursts of light (including X-rays) and travel at the speed of light, so they reach Earth in about <strong>8.3 minutes</strong>. Coronal mass ejections (CMEs) are billion-ton clouds of magnetized plasma, and they travel far slower.'],
  ['Solar wind','The Sun always blows a stream of charged particles, the solar wind, typically around <strong>300 to 800 km/s</strong>. A CME plowing through it carries its own magnetic field. Monitors at the Sun–Earth L1 point, about 1.5 million km upstream, give roughly 15 to 60 minutes of warning.'],
  ['Magnetosphere','Earth’s magnetic field deflects most of the wind. When the incoming magnetic field points <strong>southward</strong> (negative Bz), it links up with Earth’s field and lets energy pour into the magnetosphere. That is what drives a geomagnetic storm.'],
  ['Aurora','Energized particles rain down along field lines into the upper atmosphere, about 100 to 300 km up, around rings centered on the magnetic poles. Oxygen glows green and red, and nitrogen adds blue and purple. Stronger storms push the ring toward the equator.']];
  el.innerHTML=`<div class="lw"><div class="scroll-x"><svg class="wide" viewBox="0 0 800 210" role="img" aria-label="Diagram from the Sun to Earth's aurora"><defs><radialGradient id="swsun"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffc45e"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient></defs>
   <g data-s="0"><circle cx="70" cy="105" r="62" fill="url(#swsun)"/><text x="70" y="196" fill="#ffd27e" font-size="13" text-anchor="middle">Sun</text></g>
   <g data-s="1"><g class="pts"></g><text x="330" y="196" fill="#9fc7e8" font-size="13" text-anchor="middle">Solar wind / CME</text></g>
   <g data-s="2"><path d="M560 30 Q470 105 560 180" fill="none" stroke="#80b7e6" stroke-width="2" stroke-dasharray="5 4"/><path d="M600 60 Q545 105 600 150 M620 75 Q590 105 620 135" fill="none" stroke="#80b7e6" stroke-width="1.5" opacity=".7"/><path d="M640 95 Q700 70 780 85 M640 115 Q700 140 780 125" fill="none" stroke="#80b7e6" stroke-width="1.5" opacity=".6"/><text x="560" y="196" fill="#9fc7e8" font-size="13" text-anchor="middle">Magnetosphere</text></g>
   <g data-s="3"><circle cx="640" cy="105" r="22" fill="#2d6fb0"/><path d="M626 88 Q640 80 654 88" stroke="#5dff9e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M626 122 Q640 130 654 122" stroke="#5dff9e" stroke-width="5" fill="none" stroke-linecap="round"/><text x="700" y="40" fill="#7dffb0" font-size="13">Aurora</text></g></svg></div>
   <div class="stepper" role="group" aria-label="Journey stage">${S.map((x,i)=>`<button data-k="${i}" aria-pressed="${i===0}">${i+1}. ${x[0]}</button>`).join('')}</div>
   <div class="stage-text" aria-live="polite"></div>
   <div class="row"><label>How fast is the plasma cloud? <output data-o="v"></output><input type="range" min="250" max="3000" step="10" value="450"></label><div><div class="big" data-o="t"></div><div class="cap">to cross 1 AU (Sun to Earth). Light does it in 8.3 min.</div></div></div>
   <p class="cap">${simp('Distance taken as 1 AU at constant speed. Real CMEs speed up or slow down as they interact with the solar wind. The fastest on record arrived in under a day.')}</p></div>`;
  const g=$('.pts',el);for(let i=0;i<26;i++){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r',2.2);c.setAttribute('fill','#ffd27e');g.appendChild(c)}
  const dots=[...g.children].map((c,i)=>({c,x:140+((i*53)%330),y:60+((i*37)%90)}));
  const set=k=>{$$('.stepper button',el).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.k===k));$$('g[data-s]',el).forEach(gg=>gg.style.opacity=+gg.dataset.s<=k?1:.18);$('.stage-text',el).innerHTML=`<strong>${S[k][0]}.</strong> ${S[k][1]}`};
  $$('.stepper button',el).forEach(b=>b.onclick=()=>set(+b.dataset.k));set(0);
  const i=$('input',el);const u=()=>{const v=+i.value;$('[data-o=v]',el).textContent=nf(v)+' km/s';$('[data-o=t]',el).textContent=dur(AU/v)};i.oninput=u;u();
  const place=()=>dots.forEach(d=>{d.c.setAttribute('cx',d.x.toFixed(1));d.c.setAttribute('cy',d.y)});place();
  if(lowMotion)return null;return loop(dt=>{const v=+i.value;dots.forEach(d=>{d.x+=dt*(25+v/25);if(d.x>480){d.x=140}});place()})}

// 02 Kp -> auroral oval (NOAA G-scale anchors for Kp 6-9)
function kpOval(el){
  const kpLat=kp=>kp>=6?[55,50,45,40][Math.min(3,Math.round(kp)-6)]:67-1.4*kp;
  const txt=kp=>kp>=9?['G5 (Extreme)','NOAA: aurora has been seen as low as Florida and southern Texas (typically 40° geomagnetic latitude).']:kp>=8?['G4 (Severe)','NOAA: aurora has been seen as low as Alabama and northern California (typically 45° geomagnetic latitude).']:kp>=7?['G3 (Strong)','NOAA: aurora has been seen as low as Illinois and Oregon (typically 50° geomagnetic latitude).']:kp>=6?['G2 (Moderate)','NOAA: aurora has been seen as low as New York and Idaho (typically 55° geomagnetic latitude).']:kp>=5?['G1 (Minor)','NOAA: aurora is commonly visible at high latitudes (northern Michigan and Maine). NOAA gives no single latitude for G1, so the ring here is Hive Astra’s estimate.']:['Below storm level','Aurora is mostly confined to high latitudes (Alaska, northern Canada, Scandinavia). The ring position here is Hive Astra’s estimate, not a NOAA value.'];
  el.innerHTML=`<div class="lw"><div style="display:grid;grid-template-columns:minmax(0,320px) 1fr;gap:16px;align-items:center" class="kpgrid"><svg viewBox="-160 -160 320 320" role="img" aria-label="Auroral oval around the geomagnetic north pole"></svg>
   <div><label>Planetary K-index (Kp) <output data-o="kp"></output><input type="range" min="0" max="9" step="1" value="3"></label><div class="big" data-o="g" style="margin-top:10px"></div><p class="stage-text" data-o="t" aria-live="polite"></p></div></div>
   <p class="cap">${simp('The view looks down on the geomagnetic north pole, with rings every 10° of geomagnetic latitude. The real oval is lopsided, reaching farther toward the equator on the night side, and it shifts minute by minute. For tonight’s real oval, use NOAA’s 30-minute aurora forecast.')} Storm levels for Kp 5 to 9 and the latitudes for Kp 6 to 9 come from the NOAA Space Weather Scales.</p></div>`;
  const svg=$('svg',el),inp=$('input',el),R=lat=>(90-lat)*2.9;
  let base='';[80,70,60,50,40].forEach(l=>{base+=`<circle r="${R(l)}" fill="none" stroke="rgba(204,216,230,.16)" stroke-dasharray="3 4"/><text x="3" y="${-R(l)+11}" fill="#6f7d8b" font-size="9">${l}°</text>`});
  const u=()=>{const kp=+inp.value,b=kpLat(kp),inner=Math.min(b+9,82);const t=txt(kp);
    svg.innerHTML=`${base}<circle r="${(R(b)+R(inner))/2}" fill="none" stroke="#4dff95" stroke-opacity=".32" stroke-width="${R(b)-R(inner)}"/><circle r="${R(b)}" fill="none" stroke="#c8ffdc" stroke-width="1.2"/><circle r="3" fill="#e9edf2"/><text x="6" y="-4" fill="#c5ced8" font-size="9">geomagnetic N pole</text><text x="${-R(b)*.7}" y="${R(b)*.7+14}" fill="#c8ffdc" font-size="10">edge ≈ ${Math.round(b)}°</text>`;
    $('[data-o=kp]',el).textContent='Kp '+kp;$('[data-o=g]',el).textContent=t[0];$('[data-o=t]',el).textContent=t[1]};
  inp.oninput=u;u();const mq=matchMedia('(max-width:730px)');const lay=()=>{$('.kpgrid',el).style.gridTemplateColumns=mq.matches?'1fr':'minmax(0,320px) 1fr'};lay();mq.addEventListener?.('change',lay);return ()=>mq.removeEventListener?.('change',lay)}

// 03 Distances: typical diagram vs true scale (mean radii, semi-major axes: NASA fact sheets)
const PL=[['Mercury',0.387,2439.7,'#b4aaa0'],['Venus',0.723,6051.8,'#e9bf81'],['Earth',1.000,6371.0,'#74b9e7'],['Mars',1.524,3389.5,'#d87e57'],['Jupiter',5.203,69911,'#dfb391'],['Saturn',9.537,58232,'#dec894'],['Uranus',19.19,25362,'#9cd5d8'],['Neptune',30.07,24622,'#487ace']];
function scaleDistances(el){
  el.innerHTML=`<div class="lw"><div class="chips" role="group" aria-label="View"><button class="chip" data-m="ex" aria-pressed="true">Typical diagram (exaggerated)</button><button class="chip" data-m="true" aria-pressed="false">True distances (to Neptune)</button><button class="chip" data-m="inner" aria-pressed="false">True distances (inner planets)</button></div>
  <div class="scroll-x" style="margin-top:12px"><svg class="wide" viewBox="0 0 1000 170" role="img" aria-label="Planets placed along a line from the Sun"></svg></div><p class="cap" data-o="c" aria-live="polite"></p></div>`;
  const svg=$('svg',el);const W=1000,x0=26,span=W-x0-30;
  svg.innerHTML=`<circle cx="0" cy="85" r="60" fill="#ffc45e"/><line x1="${x0}" y1="85" x2="${W-10}" y2="85" stroke="rgba(204,216,230,.14)"/>`+PL.map((p,i)=>`<g data-pl="${i}" style="transition:transform .9s cubic-bezier(.4,.1,.2,1)"><circle r="6" fill="${p[3]}"/><text y="${i%2?34:-24}" fill="#b8c3ce" font-size="12" text-anchor="middle">${p[0]}</text></g>`).join('')+`<text x="${W-14}" y="160" fill="#6f7d8b" font-size="11" text-anchor="end" data-o="s"></text>`;
  const set=m=>{$$('[data-m]',el).forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));const maxA=m==='inner'?1.6:30.07;
    PL.forEach((p,i)=>{const g=$(`[data-pl="${i}"]`,svg),c=$('circle',g);let x,r;if(m==='ex'){x=x0+70+i*((span-70)/7);r=[5,8,8.5,6.5,22,19,13,13][i]}else{x=x0+p[1]/maxA*span;r=3}
      const off=m==='inner'&&i>3;g.style.transform=`translate(${off?W+60:x}px,85px)`;c.setAttribute('r',r)});
    const pxPerKm=span/(maxA*AU);$('[data-o=s]',svg).textContent=m==='ex'?'not to scale':`1 AU = ${nf(span/maxA,0)} px`;
    $('[data-o=c]',el).innerHTML=m==='ex'?'Most diagrams, including Hive Astra’s 3D view, space the planets evenly and blow up their sizes so you can see them all at once.':`At this scale the dots are <strong>enlarged</strong>. True to scale, Earth would be ${sig(12742*pxPerKm,2)} px across and Jupiter ${sig(139822*pxPerKm,2)} px, far too small for any screen to draw.${m==='true'?' Note how the four inner planets crowd together next to the Sun.':' Mercury to Mars fit inside the first 1.6 AU. The outer planets are off the right edge.'}`};
  $$('[data-m]',el).forEach(b=>b.onclick=()=>set(b.dataset.m));set('ex')}

// 03 Sizes true to scale
function scaleSizes(el){const k=150/139822;// px per km (Jupiter = 150 px)
  let x=40;const items=PL.map(p=>{const d=p[2]*2*k;const cx=x+Math.max(d,6)/2+18;x=cx+Math.max(d,6)/2+18;return {p,d,cx}});
  const W=x+80;
  el.innerHTML=`<div class="lw"><div class="scroll-x"><svg viewBox="0 0 ${W} 230" style="min-width:${Math.round(W*0.8)}px" role="img" aria-label="Sun edge and planets drawn with true relative sizes"><circle cx="${60-695700*k}" cy="115" r="${695700*k}" fill="#ffc45e"/><text x="14" y="222" fill="#16110a" font-size="12" font-weight="700">Sun</text>
  ${items.map((it,i)=>`<g transform="translate(${60+it.cx},115)"><circle r="${Math.max(it.d/2,.6)}" fill="${it.p[3]}"/>${it.p[0]==='Saturn'?`<ellipse rx="${it.d*1.1}" ry="${it.d*.22}" fill="none" stroke="#dec894" stroke-opacity=".6"/>`:''}<text y="${i%2?95:-90}" fill="#b8c3ce" font-size="11" text-anchor="middle">${it.p[0]}</text><text y="${i%2?109:-77}" fill="#6f7d8b" font-size="9.5" text-anchor="middle">${nf(it.p[2]*2,0)} km</text></g>`).join('')}</svg></div>
  <p class="cap">Diameters are true to one another (mean radii from NASA fact sheets). The Sun, 1,391,400 km across, is 109 times Earth’s width, so only its edge fits.</p></div>`}

// 03 Pocket model calculator
function pocketModel(el){
  el.innerHTML=`<div class="lw"><div class="row"><label>If Earth were the size of… <select><option value="0.2">a peppercorn (2 mm)</option><option value="1.5" selected>a marble (1.5 cm)</option><option value="6.7">a tennis ball (6.7 cm)</option><option value="22">a soccer ball (22 cm)</option></select></label><label>…or type a diameter in cm <input type="number" min="0.05" max="1000" step="0.1" value="1.5"></label></div><div class="readout" aria-live="polite"></div>
  <p class="cap">Real values used: Earth diameter 12,742 km. Moon 3,474.8 km at 384,400 km. Sun 1,391,400 km at 1 AU. Jupiter 139,822 km at 5.20 AU. Neptune at 30.07 AU. Proxima Centauri at 4.246 light-years (NASA).</p></div>`;
  const sel=$('select',el),num=$('input',el),ro=$('.readout',el);
  const u=cm=>{const s=cm/1e5/12742;
    const L=[['MOON SIZE',3474.8],['MOON DISTANCE',LD],['SUN SIZE',1391400],['SUN DISTANCE',AU],['JUPITER SIZE',139822],['JUPITER DISTANCE',5.203*AU],['NEPTUNE DISTANCE',30.07*AU],['NEAREST STAR',4.246*9.4607e12]];
    ro.innerHTML=L.map(l=>`<div>${l[0]}<b>${len(l[1]*s)}</b></div>`).join('')};
  sel.onchange=()=>{num.value=sel.value;u(+sel.value)};num.oninput=()=>{const v=+num.value;if(v>0)u(v)};u(1.5)}

// 03 Light as a ruler
function lightRuler(el){el.innerHTML=`<div class="lw"><div class="scroll-x"><table><thead><tr><th>From the Sun to…</th><th>Average distance</th><th>Sunlight travel time</th></tr></thead><tbody>${PL.map(p=>`<tr${p[0]==='Earth'?' class="hl"':''}><td>${p[0]}</td><td>${p[1]} AU · ${sig(p[1]*AU/1e6,3)} million km</td><td>${dur(p[1]*AU/C)}</td></tr>`).join('')}<tr><td>Proxima Centauri</td><td>about 268,000 AU</td><td>4.25 years</td></tr></tbody></table></div><p class="cap">Light time = distance ÷ c, with c = 299,792.458 km/s and 1 AU = 149,597,870.7 km. Planet distances are averages (semi-major axes), and the real values vary along each orbit.</p></div>`}

// 04 Sort-the-examples
function sortQuiz(el){const K={m:'Measurement',f:'Forecast',c:'Calculated (model or ephemeris)',i:'Image'};
  const Q=[['Solar wind speed of 450 km/s recorded by the DSCOVR spacecraft at the Sun–Earth L1 point','m','An instrument sampled the wind directly. It has a time stamp, and it happened already.'],
  ['NOAA’s 3-day forecast predicting Kp 5 tomorrow night','f','It is a prediction about conditions that haven’t happened yet, made by forecasters using models and current data.'],
  ['Where Mars will appear in the sky next Tuesday, from JPL Horizons','c','An ephemeris is calculated from a precise orbit model fit to many past observations. It is very accurate, but it is still a calculation, not a sighting.'],
  ['A DSCOVR/EPIC color picture of Earth’s sunlit side','i','Images are made from measured light, but they are processed (color channels combined, calibrated) and show a moment that has already passed.'],
  ['GOES satellite X-ray flux reaching M1 level during a solar flare','m','A detector on GOES measured the X-rays. Flare classes (C, M, X) come straight from this reading.'],
  ['NOAA’s 30-minute aurora forecast map (OVATION model)','f','A model turns the current solar wind measurements into a short-term prediction of where aurora is likely.'],
  ['Planet positions in Hive Astra’s 3D orrery','c','Hive Astra draws planets on simplified circular orbits. That is a calculation, and a rougher one than a JPL ephemeris.'],
  ['A Mars rover raw image posted on NASA’s raw-images page','i','A camera captured it. It was relayed to Earth and posted later, and “raw” means it has not been calibrated or color-corrected yet.'],
  ['The date and time of the next full Moon','c','It is calculated from the Moon’s well-known orbit, the same way an ephemeris is.']];
  el.innerHTML=`<div class="lw"><p class="cap" style="margin-top:0">Sort each item: is it a <strong>measurement</strong>, a <strong>forecast</strong>, a <strong>calculation</strong>, or an <strong>image</strong>?</p>${Q.map((q,n)=>`<div class="sort-item" data-n="${n}"><div class="si-q">${n+1}. ${q[0]}</div><div class="chips" role="group" aria-label="Category for item ${n+1}">${Object.keys(K).map(k=>`<button class="chip" data-k="${k}">${K[k]}</button>`).join('')}</div><div class="si-why" aria-live="polite"></div></div>`).join('')}<div class="sort-score" aria-live="polite"></div><button class="ld-btn secondary" data-a="reset" style="margin-top:8px">Reset</button></div>`;
  let score={};const upd=()=>{const n=Object.keys(score).length,r=Object.values(score).filter(Boolean).length;$('.sort-score',el).textContent=n?`${r} of ${n} right on the first try${n===Q.length?' · all sorted!':''}`:''};
  $$('.sort-item',el).forEach(it=>{const n=+it.dataset.n;$$('.chip',it).forEach(b=>b.onclick=()=>{const ok=b.dataset.k===Q[n][1];if(!(n in score))score[n]=ok;$$('.chip',it).forEach(x=>x.classList.remove('wrong'));b.classList.add(ok?'right':'wrong');if(ok)$$('.chip',it).forEach(x=>{x.setAttribute('aria-pressed',x===b);x.disabled=x!==b});
    $('.si-why',it).textContent=ok?'✓ '+Q[n][2]:'Not quite. Try again.';upd()})});
  $('[data-a=reset]',el).onclick=()=>{score={};$$('.chip',el).forEach(x=>{x.classList.remove('right','wrong');x.removeAttribute('aria-pressed');x.disabled=false});$$('.si-why',el).forEach(x=>x.textContent='');upd()}}

// 05 Distance comparer in lunar distances (log scale)
function neoDistance(el){const M=[['Earth’s surface',6371],['Apophis 2029',38000],['GEO satellites',42164],['The Moon (1 LD)',LD],['Sun–Earth L1',1.5e6],['0.05 AU',0.05*AU]];
  el.innerHTML=`<div class="lw"><div class="row"><label>Close-approach distance <input type="number" min="0" step="any" value="7.4"></label><label>Unit <select><option value="ld" selected>lunar distances (LD)</option><option value="km">kilometers</option><option value="au">AU</option></select></label></div>
  <div class="chips" role="group" aria-label="Examples" style="margin-top:10px"><button class="chip" data-v="0.0989,ld">Apophis 2029 (≈0.1 LD)</button><button class="chip" data-v="1,ld">1 LD</button><button class="chip" data-v="19.46,ld">0.05 AU</button><button class="chip" data-v="42164,km">GEO ring</button></div>
  <div class="scroll-x" style="margin-top:12px"><svg class="wide" viewBox="0 0 1000 150" role="img" aria-label="Logarithmic distance scale from Earth's center"></svg></div><div class="readout" aria-live="polite"></div>
  <p class="cap">Close-approach distances (like those in NASA/JPL CNEOS tables) are measured from Earth’s <strong>center</strong>, not its surface. The scale is logarithmic: each tick is 10 times farther than the last. Apophis: NASA says it will pass within about 32,000 km of Earth’s surface on April 13, 2029, which is about 38,000 km from the center. 0.05 AU is the distance used to define potentially hazardous asteroids.</p></div>`;
  const svg=$('svg',el),inp=$('input',el),sel=$('select',el),ro=$('.readout',el);const lo=Math.log10(3000),hi=Math.log10(2e7),X=km=>40+(Math.log10(Math.max(km,3000))-lo)/(hi-lo)*920;
  let base=`<line x1="40" y1="75" x2="960" y2="75" stroke="rgba(204,216,230,.25)"/>`;[1e4,1e5,1e6,1e7].forEach(t=>base+=`<line x1="${X(t)}" x2="${X(t)}" y1="70" y2="80" stroke="#6f7d8b"/><text x="${X(t)}" y="96" fill="#6f7d8b" font-size="10" text-anchor="middle">${t>=1e6?t/1e6+' million':nf(t)} km</text>`);
  M.forEach((m,i)=>base+=`<line x1="${X(m[1])}" x2="${X(m[1])}" y1="${i%2?75:52}" y2="${i%2?112:75}" stroke="#80b7e6" stroke-opacity=".6"/><text x="${X(m[1])}" y="${i%2?126:46}" fill="#9fc7e8" font-size="10.5" text-anchor="${i===0?'start':i===M.length-1?'end':'middle'}">${m[0]}</text>`);
  const u=()=>{const v=+inp.value,unit=sel.value;if(!(v>=0))return;const km=unit==='km'?v:unit==='au'?v*AU:v*LD;
    svg.innerHTML=base+`<circle cx="${X(km)}" cy="75" r="7" fill="#f1ba61" stroke="#16110a"/><text x="${Math.min(930,Math.max(70,X(km)))}" y="18" fill="#ffe4aa" font-size="12" text-anchor="middle">your object${km<6371?' (inside Earth!)':''}</text>`;
    ro.innerHTML=`<div>KILOMETERS<b>${nf(km,0)}</b></div><div>LUNAR DISTANCES<b>${sig(km/LD,3)} LD</b></div><div>ASTRONOMICAL UNITS<b>${sig(km/AU,3)} AU</b></div><div>ABOVE EARTH’S SURFACE<b>${km>6371?nf(km-6371,0)+' km':'impact'}</b></div><div>LIGHT TRAVEL TIME<b>${dur(km/C)}</b></div>`};
  inp.oninput=sel.onchange=u;$$('[data-v]',el).forEach(b=>b.onclick=()=>{const [v,un]=b.dataset.v.split(',');inp.value=v;sel.value=un;u()});u()}

// 05 Orbital uncertainty region (illustrative Gaussian, not a real orbit solution)
function neoUncertainty(el){
  el.innerHTML=`<div class="lw"><canvas role="img" aria-label="Uncertainty region of a predicted asteroid position near Earth"></canvas>
  <div class="row"><label>Observation arc (how long it has been tracked) <output data-o="arc"></output><input data-i="arc" type="range" min="0" max="3" step="0.01" value="0.6"></label>
  <label>Best-estimate miss distance <output data-o="d"></output><input data-i="d" type="range" min="0" max="8" step="0.1" value="2.5"></label></div>
  <div class="readout" aria-live="polite"></div>
  <p class="cap">${simp('This is a made-up asteroid with a textbook bell-curve uncertainty that shrinks as the observation arc grows. Real assessments, like NASA/JPL’s Sentry system, fit thousands of observations and propagate them with full physics. The pattern is real, though: odds often rise at first, then drop to zero once Earth falls outside the shrinking region.')}</p></div>`;
  const cv=$('canvas',el),ai=$('[data-i=arc]',el),di=$('[data-i=d]',el),ro=$('.readout',el);
  function prob(sa,sc,d){let P=0;const N=60,h=2/N;for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=-1+(i+.5)*h,y=-1+(j+.5)*h;if(x*x+y*y>1)continue;P+=Math.exp(-.5*(x*x/(sa*sa)+(y-d)*(y-d)/(sc*sc)))}return P*h*h/(2*Math.PI*sa*sc)}
  function u(){const arc=Math.pow(10,+ai.value)*3,d=+di.value;
    const sa=900/arc,sc=sa/6;const P=Math.min(1,prob(sa,sc,d));
    $('[data-o=arc]',el).textContent=arc<60?nf(arc,0)+' days':arc<730?nf(arc/30.44,1)+' months':nf(arc/365.25,1)+' years';$('[data-o=d]',el).textContent=nf(d,1)+' Earth radii from center';
    const {ctx,w,h}=fitCanvas(cv,.5,360);const half=Math.max(Math.min(Math.max(3.4*sa,10),400),2*Math.abs(d)+4),k=w/2/half,X=x=>w/2+x*k,Y=y=>h/2-y*k;ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(204,216,230,.14)';ctx.beginPath();ctx.moveTo(0,Y(d));ctx.lineTo(w,Y(d));ctx.stroke();
    [[3,'rgba(241,186,97,.16)'],[1,'rgba(241,186,97,.38)']].forEach(([n,c])=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(X(0),Y(d),Math.max(n*sa*k,1),Math.max(n*sc*k,1),0,0,7);ctx.fill()});
    ctx.fillStyle='#74b9e7';ctx.beginPath();ctx.arc(X(0),Y(0),Math.max(k,2.5),0,7);ctx.fill();ctx.fillStyle='#ffe4aa';ctx.beginPath();ctx.arc(X(0),Y(d),2.5,0,7);ctx.fill();
    ctx.fillStyle='#9fb0bf';ctx.font='11px Inter,sans-serif';ctx.fillText('Earth',X(0)+Math.max(k,3)+4,Y(0)+14);ctx.fillText('best estimate · 1σ and 3σ regions',X(0)+6,Y(d)-8);ctx.fillText(`view: ${nf(half*2,0)} Earth radii wide`,8,h-8);
    const inside=Math.abs(d)<3*sc+1;
    ro.innerHTML=`<div>UNCERTAINTY (1σ, ALONG TRACK)<b>${sig(sa,2)} Earth radii</b></div><div>EARTH INSIDE 3σ REGION?<b>${inside?'Yes':'No'}</b></div><div>ILLUSTRATIVE IMPACT ODDS<b>${P<1e-9?'≈ 0':P<1e-4?'1 in '+nf(1/P,0):sig(P*100,2)+'%'}</b></div>`}
  ai.oninput=di.oninput=u;u();const onR=()=>u();window.addEventListener('resize',onR);return ()=>window.removeEventListener('resize',onR)}

// 06 Light-time calculator
function lightTime(el){const P=[['The Moon',LD],['Mars, near a close approach (~0.4 AU)',0.4*AU],['Mars, far side of the Sun (~2.5 AU)',2.5*AU],['Jupiter (~5 AU)',5*AU],['Saturn (~9.5 AU)',9.5*AU],['Voyager 1 (~170 AU, approx.)',170*AU]];
  el.innerHTML=`<div class="lw"><div class="chips" role="group" aria-label="Destinations">${P.map((p,i)=>`<button class="chip" data-p="${i}" aria-pressed="${i===1}">${p[0]}</button>`).join('')}</div>
  <div class="row"><label>Or enter a distance <input type="number" min="0" step="any" value="0.4"></label><label>Unit <select><option value="au" selected>AU</option><option value="km">million km</option><option value="ld">lunar distances</option></select></label></div>
  <div class="readout" aria-live="polite"></div><p class="cap">Light time = distance ÷ c (299,792.458 km/s). Radio signals travel at the speed of light. Distances between planets change constantly, so the presets are round numbers. Real mission timing also adds onboard processing and ground handling.</p></div>`;
  const inp=$('input',el),sel=$('select',el),ro=$('.readout',el);
  const u=()=>{const v=+inp.value,unit=sel.value;if(!(v>=0))return;const km=unit==='au'?v*AU:unit==='ld'?v*LD:v*1e6;const t=km/C;const arr=new Date(Date.now()+t*1000);
    ro.innerHTML=`<div>ONE-WAY SIGNAL<b>${dur(t)}</b></div><div>ROUND TRIP (COMMAND → REPLY)<b>${dur(2*t)}</b></div><div>SEND A COMMAND NOW, IT ARRIVES AT<b>${arr.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}${t>43200?' ('+arr.toLocaleDateString([], {month:'short',day:'numeric'})+')':''}</b></div><div>DISTANCE<b>${sig(km/1e6,3)} million km</b></div>`};
  inp.oninput=sel.onchange=()=>{$$('[data-p]',el).forEach(b=>b.setAttribute('aria-pressed',false));u()};
  $$('[data-p]',el).forEach(b=>b.onclick=()=>{const km=P[+b.dataset.p][1];if(km<1e7){sel.value='ld';inp.value=sig(km/LD,3)}else{sel.value='au';inp.value=+(km/AU).toFixed(3)}$$('[data-p]',el).forEach(x=>x.setAttribute('aria-pressed',x===b));u()});u()}

// 06 Deep Space Network coverage (top view, simplified)
function dsnSim(el){const S=[['Goldstone, California',-116.89,'#f1ba61'],['Madrid, Spain',-4.25,'#80b7e6'],['Canberra, Australia',148.98,'#bc92ea']];
  el.innerHTML=`<div class="lw"><canvas role="img" aria-label="Earth seen from above the North Pole with the three Deep Space Network complexes"></canvas>
  <div class="row"><label>Earth’s rotation <output data-o="h"></output><input type="range" min="0" max="24" step="0.1" value="6"></label><button class="chip" data-a="play" aria-pressed="false">Play</button></div>
  <div class="readout" aria-live="polite"></div>
  <p class="cap">${simp('The view looks down on the North Pole, with the spacecraft far off to the right. A complex counts as “in view” when the spacecraft is more than about 10° above its horizon. The model ignores station latitude and the spacecraft’s north–south position.')}</p></div>`;
  const cv=$('canvas',el),inp=$('input',el),ro=$('.readout',el),pb=$('[data-a=play]',el);let playing=false,C2=fitCanvas(cv,.55,340);
  const draw=()=>{const {ctx,w,h}=C2,cx=w*.38,cy=h/2,R=Math.min(h*.33,w*.2),hr=+inp.value,rot=hr*15;ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(204,216,230,.2)';ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(w-20,cy);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#e9edf2';ctx.beginPath();ctx.moveTo(w-14,cy);ctx.lineTo(w-28,cy-7);ctx.lineTo(w-28,cy+7);ctx.fill();ctx.fillStyle='#9fb0bf';ctx.font='11px Inter,sans-serif';ctx.textAlign='right';ctx.fillText('to spacecraft',w-14,cy-14);ctx.textAlign='left';
    const g=ctx.createRadialGradient(cx-R*.3,cy-R*.3,R*.1,cx,cy,R);g.addColorStop(0,'#3b86c9');g.addColorStop(1,'#163a63');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill();ctx.fillStyle='#e9edf2';ctx.beginPath();ctx.arc(cx,cy,2.5,0,7);ctx.fill();
    const vis=[];S.forEach(s=>{const a=(s[1]+rot)*Math.PI/180;const ang=((s[1]+rot)%360+540)%360-180;const inView=Math.abs(ang)<80;vis.push(inView);const x=cx+Math.cos(a)*R,y=cy-Math.sin(a)*R;
      if(inView){ctx.strokeStyle=s[2];ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(w-30,cy);ctx.stroke();ctx.globalAlpha=1}
      ctx.fillStyle=s[2];ctx.beginPath();ctx.arc(x,y,inView?6:4,0,7);ctx.fill();ctx.fillStyle=inView?'#e9edf2':'#6f7d8b';const lx=cx+Math.cos(a)*(R+14),ly=cy-Math.sin(a)*(R+14);ctx.textAlign=Math.cos(a)<-.2?'right':'left';ctx.fillText(s[0].split(',')[0],lx,ly+4);ctx.textAlign='left'});
    $('[data-o=h]',el).textContent=nf(hr,1)+' h';ro.innerHTML=S.map((s,i)=>`<div>${s[0].toUpperCase()}<b style="color:${vis[i]?'#7fd0a3':'#6f7d8b'}">${vis[i]?'Tracking':'Below horizon'}</b></div>`).join('')};
  inp.oninput=draw;pb.onclick=()=>{playing=!playing;pb.setAttribute('aria-pressed',playing);pb.textContent=playing?'Pause':'Play'};draw();
  const stop=loop(dt=>{if(!playing)return;inp.value=((+inp.value+dt*1.6)%24).toFixed(2);draw()});const onR=()=>{C2=fitCanvas(cv,.55,340);draw()};window.addEventListener('resize',onR);return ()=>{stop();window.removeEventListener('resize',onR)}}

// 06 Image pipeline step-through
function pipeline(el){const S=[['Capture','A rover or orbiter camera takes the picture, and it is stored onboard as data.'],['Wait for a pass','Spacecraft can only send data when an antenna has a line of sight. Mars rovers usually hand data to an orbiter overhead (such as Mars Reconnaissance Orbiter), which relays it to Earth later.'],['Cross space','The radio signal travels at the speed of light. From Mars, that takes about 3 to 22 minutes, depending on where the planets are.'],['Deep Space Network','Giant dishes at Goldstone, Madrid or Canberra catch the faint signal. Antenna time is shared among dozens of missions, so data waits its turn.'],['Process','Engineers decode the data. Raw images are often posted on public raw-image pages within hours to days. Calibrated, color-processed science images can take weeks or longer.'],['Release','Press and science releases come later still. A picture shared “today” may have been taken days, months or even years earlier.']];
  el.innerHTML=`<div class="lw"><div class="stepper" role="group" aria-label="Pipeline stage">${S.map((s,i)=>`<button data-k="${i}" aria-pressed="${i===0}">${i+1}. ${s[0]}</button>`).join('')}</div><div class="stage-text" aria-live="polite"></div><p class="cap">Timings vary by mission and by day, so these are typical ranges, not guarantees.</p></div>`;
  const set=k=>{$$('.stepper button',el).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.k===k));$('.stage-text',el).innerHTML=`<strong>${S[k][0]}.</strong> ${S[k][1]}`};$$('.stepper button',el).forEach(b=>b.onclick=()=>set(+b.dataset.k));set(0)}

/* ---------------- lessons ---------------- */
const LESSONS=[
{id:'orbital-mechanics',n:'01',icon:'◎',title:'Orbital mechanics',blurb:'Why planets follow paths around the Sun, and what a simplified model can—and cannot—tell us.',mins:6,
 steps:[
 {h:'Falling around the Sun',html:`<p>A planet is always falling toward the Sun. Gravity pulls it inward every moment. But it is also moving sideways so fast that it keeps <strong>missing</strong>. Falling plus missing makes a closed path, an orbit.</p><p>Newton showed that one rule, gravity weakening with the square of distance, explains every planetary orbit. Kepler had already found three patterns in the data. Here you can test all three.</p><p class="note">Earth moves along its orbit at about 29.8 km/s. That is roughly 107,000 km/h.</p>`},
 {h:'Try it: set the speed',html:`<p>Drag the sliders. Exactly the right sideways speed gives a circle. Slower, and the orbit becomes an <strong>ellipse</strong> that dips closer to the Sun. Faster, and it stretches outward. Go fast enough (escape speed) and it never comes back.</p><div data-w="orbit"></div><p>That is <strong>Kepler’s first law</strong>: orbits are ellipses with the Sun at one focus, not at the center.</p>`},
 {h:'Equal areas in equal times',html:`<p><strong>Kepler’s second law:</strong> a line from the Sun to the planet sweeps out equal areas in equal times. Near the Sun the planet speeds up, far away it slows down, and the wedges still match. Pick the comet-like preset to see it best.</p><div data-w="orbitWedges"></div>`},
 {h:'Bigger orbits, longer years',html:`<p><strong>Kepler’s third law:</strong> the square of a planet’s period, in years, equals the cube of its average distance, in AU. So T = a<sup>1.5</sup>. Compare the measured periods with the formula.</p><div data-w="kepler3"></div>`},
 {h:'What the model can’t tell you',html:`<p>The simulator is a <strong>two-body model</strong>: the Sun and one small body, in a flat plane. That is a great first approximation, and it leaves out real effects:</p><ul><li>${simp('')}Planets tug on each other, so real orbits slowly wobble and precess.</li><li>${simp('')}The Sun isn’t perfectly fixed. Sun and planets both circle a shared center of mass, which is pulled mostly by Jupiter.</li><li>${simp('')}Mercury’s orbit shifts by an extra 43 arcseconds per century, which only Einstein’s general relativity explains.</li><li>${simp('')}Hive Astra’s 3D view uses circular orbits for display. For precise positions, astronomers use ephemerides such as NASA/JPL Horizons.</li></ul><p>Good models tell you what they ignore. That is how you know when to trust them.</p>`}],
 quiz:[['A planet in an elliptical orbit moves fastest when it is…',['Farthest from the Sun','Closest to the Sun','It always moves at the same speed'],1,'Equal areas in equal times means it must move fastest near the Sun (perihelion).'],
  ['An asteroid orbits at an average of 4 AU. About how long is its year?',['4 years','8 years','16 years'],1,'T = a^1.5 = 4^1.5 = 8 years.'],
  ['Which of these does a simple two-body model leave out?',['Gravity from the Sun','The pull of other planets','The body’s sideways speed'],1,'Two-body models ignore every other mass, so the slow tugs from other planets are missing.']],
 deeper:[['Orbits and Kepler’s Laws','https://science.nasa.gov/solar-system/orbits-and-keplers-laws/','NASA Science'],['Basics of Space Flight, Ch. 3: Gravity & Mechanics','https://science.nasa.gov/learn/basics-of-space-flight/chapter3-1/','NASA Science / JPL'],['Basics of Space Flight, Ch. 5: Planetary Orbits','https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/','NASA Science / JPL'],['Approximate Positions of the Planets','https://ssd.jpl.nasa.gov/planets/approx_pos.html','NASA/JPL Solar System Dynamics']]},

{id:'space-weather',n:'02',icon:'☼',title:'Space weather',blurb:'How solar flares and solar wind relate to auroras and geomagnetic storms.',mins:6,
 steps:[
 {h:'Two kinds of solar outbursts',html:`<p><strong>Solar flares</strong> are sudden flashes of light and X-rays from tangled magnetic fields near sunspots. They reach Earth in about 8.3 minutes and can disrupt high-frequency radio on the sunlit side. NOAA rates these as R-scale radio blackouts.</p><p><strong>Coronal mass ejections (CMEs)</strong> hurl clouds of magnetized plasma into space. A CME aimed at Earth can trigger a <strong>geomagnetic storm</strong>, rated on NOAA’s G-scale, a day or more later.</p><p class="note">Flares and CMEs often happen together, but not always. A big flare doesn’t guarantee aurora.</p>`},
 {h:'The journey, step by step',html:`<p>Click through each stage, then change the speed of the plasma cloud to see how long it takes to arrive.</p><div data-w="swJourney"></div>`},
 {h:'Why some storms fizzle',html:`<p>Earth’s magnetic field points north at the dayside boundary. When the magnetic field carried by the solar wind points <strong>south</strong> (forecasters call this negative Bz), the two fields connect and energy floods in. If it points north, even a fast CME may deliver only a modest storm.</p><p>That is why forecasters watch real-time solar wind data from spacecraft at L1. Hive Astra’s <strong>Live Signals</strong> tab shows NOAA’s solar wind and Kp feeds.</p>`},
 {h:'Kp and the aurora oval',html:`<p>The <strong>Kp index</strong> (0 to 9) sums up global geomagnetic disturbance over each 3-hour period. Higher Kp pushes the aurora ring toward the equator. Slide it and watch the ring grow.</p><div data-w="kpOval"></div>`}],
 quiz:[['A strong flare erupts. When does its light reach Earth?',['About 8 minutes later','About 2 days later','Instantly'],0,'Light crosses 1 AU in about 499 seconds, or 8.3 minutes.'],
  ['A CME is traveling at 1,000 km/s. Roughly when does it arrive?',['In about 8 minutes','In about 1.7 days','In about 2 weeks'],1,'149.6 million km ÷ 1,000 km/s ≈ 150,000 s ≈ 42 hours, or about 1.7 days.'],
  ['Which solar wind condition most helps a geomagnetic storm grow?',['A northward magnetic field (positive Bz)','A southward magnetic field (negative Bz)','A very slow wind'],1,'A southward field links up with Earth’s field and lets energy into the magnetosphere.']],
 deeper:[['Aurora: 30-minute forecast','https://www.swpc.noaa.gov/products/aurora-30-minute-forecast','NOAA Space Weather Prediction Center'],['Planetary K-index','https://www.swpc.noaa.gov/products/planetary-k-index','NOAA SWPC'],['NOAA Space Weather Scales (G, S and R)','https://www.swpc.noaa.gov/noaa-scales-explanation','NOAA SWPC'],['Coronal mass ejections','https://www.swpc.noaa.gov/phenomena/coronal-mass-ejections','NOAA SWPC'],['Space weather','https://science.nasa.gov/heliophysics/focus-areas/space-weather/','NASA Heliophysics']]},

{id:'science-of-scale',n:'03',icon:'◍',title:'The science of scale',blurb:'Why planetary sizes and distances in interactive visualizations are usually exaggerated.',mins:5,
 steps:[
 {h:'Why diagrams have to cheat',html:`<p>Space is mostly empty. If a diagram showed the true distances, the planets would be too small to see, and if it showed the planets big enough to see, they wouldn’t fit. So almost every solar system picture, including Hive Astra’s 3D view, <strong>exaggerates</strong>. Toggle between the views.</p><div data-w="scaleDist"></div>`},
 {h:'Sizes, true to scale',html:`<p>Here the sizes are honest, though the spacing is not. Jupiter could hold about 1,300 Earths by volume, and the Sun about 1.3 million.</p><div data-w="scaleSize"></div>`},
 {h:'Build a pocket solar system',html:`<p>Shrink everything by the same factor. Pick a size for Earth and see where everything else would have to go.</p><div data-w="pocket"></div><p class="note">With a marble Earth, the Sun is a ball about as tall as an adult, almost two football fields away. The nearest star would be about 47,000 km away, farther than once around the real Earth.</p>`},
 {h:'Light as a ruler',html:`<p>Astronomers often measure distance in light travel time. Sunlight takes 8.3 minutes to reach Earth and over 4 hours to reach Neptune.</p><div data-w="lightRuler"></div>`}],
 quiz:[['Why do most solar system diagrams exaggerate planet sizes?',['Planets are actually that big','At true distances, the planets would be far too small to see','To match photos from telescopes'],1,'True-scale distances make the planets sub-pixel dots on any screen.'],
  ['About how many Earths fit across the Sun’s diameter?',['About 11','About 109','About 1,000'],1,'1,391,400 km ÷ 12,742 km ≈ 109.'],
  ['How long does sunlight take to reach Earth?',['8.3 seconds','8.3 minutes','8.3 hours'],1,'1 AU ÷ c ≈ 499 seconds.']],
 deeper:[['Planetary Fact Sheet (ratio to Earth)','https://nssdc.gsfc.nasa.gov/planetary/factsheet/planet_table_ratio.html','NASA Goddard / NSSDCA'],['Planetary Fact Sheet (metric)','https://nssdc.gsfc.nasa.gov/planetary/factsheet/','NASA Goddard / NSSDCA'],['Solar System Facts','https://science.nasa.gov/solar-system/solar-system-facts/','NASA Science'],['Planets overview','https://science.nasa.gov/solar-system/planets/','NASA Science']]},

{id:'reading-observations',n:'04',icon:'◫',title:'Reading live observations',blurb:'How to distinguish a measurement from a forecast, a calculated ephemeris or an image.',mins:5,
 steps:[
 {h:'Four kinds of information',html:`<ul><li><strong>Measurement:</strong> an instrument recorded a value at a specific time, like solar wind speed at L1 or X-ray flux from GOES. It already happened.</li><li><strong>Forecast:</strong> a prediction about the future, from models plus current data, like NOAA’s 3-day Kp forecast. It comes with uncertainty.</li><li><strong>Calculated (ephemeris or model):</strong> a position or time computed from known physics and fitted orbits, like where Mars will be next week. These can be extremely precise, but they are still computed rather than seen.</li><li><strong>Image:</strong> measured light turned into a picture. It is usually processed, often false-color or composite, and always from the past, even if only by seconds.</li></ul>`},
 {h:'Sort the examples',html:`<div data-w="sortQuiz"></div>`},
 {h:'Reading Hive Astra honestly',html:`<p>Hive Astra mixes all four, so here is how to tell them apart:</p><ul><li>The <strong>3D orrery</strong> is a <em>simplified calculation</em>: circular orbits for illustration, not JPL ephemerides.</li><li>The <strong>Live Signals</strong> tab shows NOAA and NASA <em>measurements</em> and <em>forecasts</em>, each with its own time stamp. Check whether a panel says observed or predicted.</li><li><strong>EPIC Earth images</strong> are real photos from DSCOVR, taken hours to days before you see them.</li></ul>`},
 {h:'A 4-question habit',html:`<p>Before you trust a space number, ask:</p><ol><li><strong>Who</strong> produced it? (NOAA, NASA, a model, a person)</li><li><strong>When</strong> was it valid? (time stamp and time zone, often UTC)</li><li><strong>How</strong> was it made? (sensor, model or calculation)</li><li><strong>How sure</strong> is it? (error bars, forecast probability)</li></ol><p class="note">Most NOAA and NASA data is time-stamped in UTC. Hive Astra converts those times to your browser’s time zone, so check which zone a number is in before comparing sources.</p>`}],
 quiz:[['“Kp is expected to reach 6 tonight” is a…',['Measurement','Forecast','Image'],1,'“Expected” means a prediction about the future.'],
  ['A JPL Horizons table showing where Jupiter will be next month is…',['A calculated ephemeris','A live measurement','A forecast with large uncertainty'],0,'Ephemerides are computed from precise orbit solutions.'],
  ['An image released today was most likely captured…',['At exactly the moment you view it','At some earlier time, so check the capture date','Tomorrow'],1,'Light travel, downlink and processing all mean images are from the past.']],
 deeper:[['JPL Horizons ephemeris system','https://ssd.jpl.nasa.gov/horizons/','NASA/JPL Solar System Dynamics'],['NOAA 3-Day Forecast','https://www.swpc.noaa.gov/products/3-day-forecast','NOAA SWPC'],['Planetary K-index (observed)','https://www.swpc.noaa.gov/products/planetary-k-index','NOAA SWPC'],['About the EPIC imagery','https://epic.gsfc.nasa.gov/about','NASA Goddard / DSCOVR EPIC']]},

{id:'near-earth-objects',n:'05',icon:'✧',title:'Near-Earth objects',blurb:'What asteroid close-approach distance means and how orbital uncertainty is assessed.',mins:6,
 steps:[
 {h:'What counts as “near”?',html:`<p>A <strong>near-Earth object</strong> (NEO) is an asteroid or comet whose orbit brings it within 1.3 AU of the Sun at its closest. That is a statement about its orbit, not a sign of danger.</p><p>A <strong>potentially hazardous asteroid</strong> is one whose orbit comes within 0.05 AU of Earth’s orbit (about 7.5 million km, or 19.5 lunar distances) <em>and</em> that is roughly 140 m or larger. Being on the list means “worth watching,” not “on a collision course.”</p>`},
 {h:'Lunar distances',html:`<p>News reports often give close approaches in <strong>lunar distances</strong> (LD). One LD is the average Earth–Moon distance, 384,400 km. Enter a distance, or pick an example.</p><div data-w="neoDist"></div>`},
 {h:'Uncertainty, and why odds change',html:`<p>A newly found asteroid has only a few nights of observations, so its future position is uncertain: a long, thin region along its path. More observations shrink that region. Lengthen the observation arc and watch.</p><div data-w="neoUnc"></div>`},
 {h:'Reading an impact headline',html:`<p>When impact odds for a new asteroid <strong>rise</strong>, it usually means the uncertainty region is shrinking while Earth is still inside it. Once more observations shrink it further, Earth typically falls outside and the odds drop to zero. Apophis followed this path: after more observations, NASA ruled out any impact for at least the next century.</p><p>NASA/JPL’s Sentry system monitors these odds continuously. In 2022, NASA’s DART mission showed that hitting an asteroid can change its orbit.</p>`}],
 quiz:[['An asteroid passes at 2 LD. How far is that?',['About 768,800 km','About 2 million km','About 2 AU'],0,'2 × 384,400 km = 768,800 km.'],
  ['CNEOS close-approach distances are measured from…',['Earth’s surface','Earth’s center','The Moon'],1,'Close-approach distances are center to center.'],
  ['A new asteroid’s impact odds rise after more observations. The most likely reason is…',['It changed course toward Earth','The uncertainty region shrank while Earth was still inside it','Its size was remeasured'],1,'This is the usual pattern, and more data usually rules impact out.']],
 deeper:[['NEO close approaches (live table)','https://cneos.jpl.nasa.gov/ca/','NASA/JPL CNEOS'],['NEO Basics','https://cneos.jpl.nasa.gov/about/basics.html','NASA/JPL CNEOS'],['NEO groups and definitions','https://cneos.jpl.nasa.gov/about/neo_groups.html','NASA/JPL CNEOS'],['Sentry: Earth impact monitoring','https://cneos.jpl.nasa.gov/sentry/','NASA/JPL CNEOS'],['Planetary Defense','https://science.nasa.gov/planetary-defense/','NASA Science']]},

{id:'planetary-exploration',n:'06',icon:'◈',title:'Planetary exploration',blurb:'How mission imagery reaches Earth and why new releases are not necessarily real time.',mins:6,
 steps:[
 {h:'Nothing out there is live',html:`<p>Radio travels at the speed of light, which is fast but not instant. Pick a destination to see how old a signal is by the time it reaches us.</p><div data-w="lightTime"></div><p>That is why no one drives a Mars rover with a joystick. Teams send a plan for the day, and the rover carries it out on its own.</p>`},
 {h:'The Deep Space Network',html:`<p>NASA’s <strong>Deep Space Network</strong> has three antenna complexes spaced roughly a third of the way around the world: Goldstone (California), Madrid (Spain) and Canberra (Australia). As Earth turns, at least one can always see a distant spacecraft. Rotate Earth or press Play.</p><div data-w="dsn"></div>`},
 {h:'From camera to your screen',html:`<p>Follow one picture from capture to public release.</p><div data-w="pipeline"></div>`},
 {h:'“New” is not “now”',html:`<p>Every space image has at least two dates: when it was <strong>taken</strong> and when it was <strong>released</strong>. Raw rover images can appear within hours to days. Polished telescope images may be released weeks, months or years after the observation.</p><p class="note">Habit: look for the capture date (often in UTC, or in “sols” for Mars missions) before calling something live.</p>`}],
 quiz:[['Mars is 2.5 AU from Earth. About how long does a one-way signal take?',['About 21 minutes','About 2.5 seconds','About 2.5 hours'],0,'2.5 × 499 s ≈ 1,247 s ≈ 21 minutes.'],
  ['Why does the DSN have three complexes spread around the globe?',['To triple the signal speed','So at least one can see a spacecraft as Earth rotates','One for each planet'],1,'With complexes about 120° apart in longitude, a spacecraft is always above someone’s horizon.'],
  ['A NASA image posted today shows a Martian sunset. The sunset happened…',['Right now','Before it was posted, so check the capture date or sol','After it was posted'],1,'Light-time, relay passes and processing mean images always show the past.']],
 deeper:[['Deep Space Network','https://www.nasa.gov/communicating-with-missions/dsn/','NASA SCaN'],['DSN Now: live antenna activity','https://eyes.nasa.gov/apps/dsn-now/','NASA/JPL'],['Basics of Space Flight, Ch. 18: Deep Space Network','https://science.nasa.gov/learn/basics-of-space-flight/chapter18-1/','NASA Science / JPL'],['Basics of Space Flight, Ch. 10: Telecommunications','https://science.nasa.gov/learn/basics-of-space-flight/chapter10-1/','NASA Science / JPL'],['Perseverance raw images','https://mars.nasa.gov/mars2020/multimedia/raw-images/','NASA/JPL']]}
];
const WIDGETS={orbit:el=>orbitSim(el),orbitWedges:el=>orbitSim(el,{wedges:true}),kepler3:keplerThird,swJourney,kpOval,scaleDist:scaleDistances,scaleSize:scaleSizes,pocket:pocketModel,lightRuler,sortQuiz,neoDist:neoDistance,neoUnc:neoUncertainty,lightTime,dsn:dsnSim,pipeline};

/* ---------------- shell: cards, dialog, routing ---------------- */
const DONE_KEY='hiveAstraLessonsDone';
const getDone=()=>{try{return JSON.parse(localStorage.getItem(DONE_KEY)||'[]')}catch(e){return []}};
const markDone=id=>{try{const d=new Set(getDone());if(d.has(id))return;d.add(id);localStorage.setItem(DONE_KEY,JSON.stringify([...d]))}catch(e){}renderCards()};
function renderCards(){const grid=document.getElementById('lessonGrid');if(!grid)return;const done=getDone();
  grid.innerHTML=LESSONS.map(l=>`<button type="button" class="lesson-card" data-lesson="${l.id}" aria-haspopup="dialog"><span class="card-icon" aria-hidden="true">${l.icon}</span><span class="card-overline">FIELD GUIDE / ${l.n}</span><h3>${esc(l.title)}</h3><p>${esc(l.blurb)}</p><span class="lc-meta"><span>${l.steps.length} STEPS · INTERACTIVE · ~${l.mins} MIN${done.includes(l.id)?' · <span class="lc-done">✓ DONE</span>':''}</span><span class="lc-open">OPEN LESSON →</span></span></button>`).join('');
  $$('.lesson-card',grid).forEach(b=>b.onclick=()=>open(b.dataset.lesson,b))}
const dlg=document.createElement('dialog');dlg.className='lesson-dialog';dlg.setAttribute('aria-labelledby','lessonTitle');
dlg.innerHTML=`<div class="ld-head"><div><div class="ld-over"></div><h2 id="lessonTitle" tabindex="-1"></h2></div><button type="button" class="ld-close" aria-label="Close lesson">×</button></div><nav class="ld-steps" aria-label="Lesson steps"></nav><div class="ld-body"></div><div class="ld-foot"><span class="ld-count"></span><button type="button" class="ld-btn secondary" data-a="prev">← Back</button><button type="button" class="ld-btn" data-a="next">Next →</button></div>`;
document.body.appendChild(dlg);
let cur=null,stepIdx=0,cleanup=null,opener=null,answered={};
const pages=l=>[...l.steps.map(s=>s.h),'Check yourself'];
function renderStep(i,focus=true){if(cleanup){try{cleanup()}catch(e){}cleanup=null}const l=cur,P=pages(l);stepIdx=Math.max(0,Math.min(P.length-1,i));
  $$('.ld-steps button',dlg).forEach((b,k)=>{if(k===stepIdx){b.setAttribute('aria-current','step');b.classList.add('seen');b.scrollIntoView({block:'nearest',inline:'nearest'})}else b.removeAttribute('aria-current')});
  const body=$('.ld-body',dlg);
  if(stepIdx<l.steps.length){const s=l.steps[stepIdx];body.innerHTML=`<h3 tabindex="-1">${s.h}</h3>${s.html}`;const cs=[];$$('[data-w]',body).forEach(w=>{const c=WIDGETS[w.dataset.w](w);if(typeof c==='function')cs.push(c)});cleanup=()=>cs.forEach(f=>f())}
  else{answered={};body.innerHTML=`<h3 tabindex="-1">Check yourself</h3>${l.quiz.map((q,n)=>`<div class="quiz-q"><fieldset><legend>${n+1}. ${q[0]}</legend><div class="opts">${q[1].map((o,k)=>`<button type="button" data-q="${n}" data-k="${k}">${o}</button>`).join('')}</div><div class="fb" aria-live="polite"></div></fieldset></div>`).join('')}<div class="sort-score" aria-live="polite"></div><h3 style="margin-top:22px">Go deeper</h3><ul class="deeper">${l.deeper.map(d=>`<li><a href="${d[1]}" target="_blank" rel="noopener noreferrer">${d[0]} ↗</a><small>${d[2]}</small></li>`).join('')}</ul>`;
    $$('.opts button',body).forEach(b=>b.onclick=()=>{const n=+b.dataset.q,k=+b.dataset.k,q=l.quiz[n],ok=k===q[2],box=b.closest('.quiz-q');$$('button',box).forEach(x=>x.classList.remove('wrong'));b.classList.add(ok?'right':'wrong');if(!(n in answered))answered[n]=ok;$('.fb',box).textContent=ok?'✓ Correct. '+q[3]:'Not quite, try another.';
      if(ok)$$('button',box).forEach(x=>x.disabled=x!==b);const r=Object.values(answered).filter(Boolean).length;const all=$$('.quiz-q',body).every(qq=>$('.right',qq));$('.sort-score',body).textContent=all?`Lesson complete · ${r} of ${l.quiz.length} right on the first try`:'';if(all)markDone(l.id)})}
  $('.ld-count',dlg).textContent=`STEP ${stepIdx+1} OF ${P.length}`;$('[data-a=prev]',dlg).disabled=stepIdx===0;$('[data-a=next]',dlg).textContent=stepIdx===P.length-1?'Finish ✓':'Next →';
  body.scrollTop=0;if(focus)$('h3',body).focus({preventScroll:true})}
function open(id,from){const l=LESSONS.find(x=>x.id===id);if(!l)return;cur=l;opener=from||document.querySelector(`.lesson-card[data-lesson="${id}"]`);
  $('.ld-over',dlg).textContent=`FIELD GUIDE / ${l.n} · HIVE ACADEMY · HIVE ASTRA`;$('#lessonTitle',dlg).textContent=l.title;
  $('.ld-steps',dlg).innerHTML=pages(l).map((p,k)=>`<button type="button" data-k="${k}">${k+1}. ${p}</button>`).join('');$$('.ld-steps button',dlg).forEach(b=>b.onclick=()=>renderStep(+b.dataset.k));
  if(!dlg.open)dlg.showModal();renderStep(0,false);$('#lessonTitle',dlg).focus();if(location.hash!=='#learn/'+id)history.replaceState(null,'','#learn/'+id)}
function close(){if(dlg.open)dlg.close()}
dlg.addEventListener('close',()=>{if(cleanup){try{cleanup()}catch(e){}cleanup=null}const id=cur&&cur.id;cur=null;if(/^#learn\//.test(location.hash))history.replaceState(null,'','#learn');const back=(opener&&document.contains(opener))?opener:document.querySelector(`.lesson-card[data-lesson="${id}"]`)||document.querySelector('.lesson-card');back&&back.focus()});
dlg.addEventListener('click',e=>{if(e.target===dlg)close()});
$('.ld-close',dlg).onclick=close;
$('[data-a=prev]',dlg).onclick=()=>renderStep(stepIdx-1);
$('[data-a=next]',dlg).onclick=()=>{if(stepIdx===pages(cur).length-1)close();else renderStep(stepIdx+1)};
function route(){const m=location.hash.match(/^#learn\/([\w-]+)/);if(!m){if(dlg.open&&location.hash!=='#learn')close();return}
  const tab=document.querySelector('.tab[data-tab="learn"]');if(tab&&!tab.classList.contains('active'))tab.click();
  if(!cur||cur.id!==m[1]){const l=LESSONS.find(x=>x.id===m[1]);if(l)open(l.id,document.querySelector(`.lesson-card[data-lesson="${l.id}"]`))}}
window.addEventListener('hashchange',route);
renderCards();setTimeout(route,30);
window.HiveAstraLessons={open,close,list:LESSONS.map(l=>l.id)};
})();
