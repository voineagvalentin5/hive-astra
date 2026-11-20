/* Hive Astra • observer location (generic by default).
   Nothing is sent anywhere: browser geolocation runs only when the visitor clicks
   "Use my location", city search uses the built-in list below, and the choice is kept
   in this browser's localStorage only. Other scripts listen for the "astra:observer" event. */
(()=>{
'use strict';
const KEY='astra-observer';
const DEF={name:'Your sky',lat:40,lon:-100,src:'default'};
// Built-in city list (approximate city-center coordinates, 1 decimal place)
const CITIES=[['New York, USA',40.7,-74.0],['Los Angeles, USA',34.1,-118.2],['Chicago, USA',41.9,-87.6],['Houston, USA',29.8,-95.4],['Phoenix, USA',33.4,-112.1],['Denver, USA',39.7,-105.0],['Seattle, USA',47.6,-122.3],['Miami, USA',25.8,-80.2],['Atlanta, USA',33.7,-84.4],['Detroit, USA',42.3,-83.0],['Minneapolis, USA',45.0,-93.3],['Boston, USA',42.4,-71.1],['Washington DC, USA',38.9,-77.0],['Anchorage, USA',61.2,-149.9],['Fairbanks, USA',64.8,-147.7],['Honolulu, USA',21.3,-157.9],['Toronto, Canada',43.7,-79.4],['Vancouver, Canada',49.3,-123.1],['Montreal, Canada',45.5,-73.6],['Calgary, Canada',51.0,-114.1],['Yellowknife, Canada',62.5,-114.4],['Mexico City, Mexico',19.4,-99.1],['São Paulo, Brazil',-23.6,-46.6],['Buenos Aires, Argentina',-34.6,-58.4],['London, UK',51.5,-0.1],['Edinburgh, UK',55.95,-3.2],['Dublin, Ireland',53.3,-6.3],['Paris, France',48.9,2.4],['Berlin, Germany',52.5,13.4],['Madrid, Spain',40.4,-3.7],['Rome, Italy',41.9,12.5],['Oslo, Norway',59.9,10.8],['Tromsø, Norway',69.6,19.0],['Stockholm, Sweden',59.3,18.1],['Helsinki, Finland',60.2,24.9],['Reykjavík, Iceland',64.1,-21.9],['Bucharest, Romania',44.4,26.1],['Chișinău, Moldova',47.0,28.9],['Kyiv, Ukraine',50.5,30.5],['Istanbul, Türkiye',41.0,29.0],['Cairo, Egypt',30.0,31.2],['Lagos, Nigeria',6.5,3.4],['Nairobi, Kenya',-1.3,36.8],['Cape Town, South Africa',-33.9,18.4],['Dubai, UAE',25.2,55.3],['Mumbai, India',19.1,72.9],['Delhi, India',28.6,77.2],['Singapore',1.35,103.8],['Beijing, China',39.9,116.4],['Shanghai, China',31.2,121.5],['Seoul, South Korea',37.6,127.0],['Tokyo, Japan',35.7,139.7],['Manila, Philippines',14.6,121.0],['Jakarta, Indonesia',-6.2,106.8],['Sydney, Australia',-33.9,151.2],['Melbourne, Australia',-37.8,145.0],['Perth, Australia',-31.95,115.9],['Hobart, Australia',-42.9,147.3],['Auckland, New Zealand',-36.8,174.8],['Dunedin, New Zealand',-45.9,170.5]];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ll=(lat,lon)=>`${Math.abs(lat).toFixed(1).replace(/\.0$/,'')}°${lat>=0?'N':'S'}, ${Math.abs(lon).toFixed(1).replace(/\.0$/,'')}°${lon>=0?'E':'W'}`;
const valid=o=>o&&Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)&&Math.abs(o.lat)<=90&&Math.abs(o.lon)<=180;
function get(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(valid(o))return {name:String(o.name||'Custom location').slice(0,60),lat:+o.lat,lon:+o.lon,src:o.src||'manual'}}catch(e){}return {...DEF}}
function caption(o){return o.src==='default'?`Default location · ${ll(o.lat,o.lon)}`:`${ll(o.lat,o.lon)}${o.src==='gps'?' · from this device':''}`}
function short(o){return o.src==='default'?`DEFAULT ${ll(o.lat,o.lon)}`:o.src==='city'?o.name.split(',')[0].toUpperCase():ll(o.lat,o.lon)}
function paint(){const o=get();const n=$('locationName'),s=$('locationSub');if(n)n.textContent=o.name;if(s)s.textContent=caption(o)+' · Change'}
function set(o){try{if(o)localStorage.setItem(KEY,JSON.stringify({name:o.name,lat:+(+o.lat).toFixed(2),lon:+(+o.lon).toFixed(2),src:o.src}));else localStorage.removeItem(KEY)}catch(e){}
  paint();window.dispatchEvent(new CustomEvent('astra:observer',{detail:get()}))}
try{localStorage.removeItem('astra-location')}catch(e){}// retire the old free-text label key
function picker(){const M=window.HiveAstraModal;if(!M)return;const o=get();
  M.open('Your sky',`<p>Hive Astra uses your location only for location-based readouts, like the aurora chance overhead. Times are shown in your browser’s time zone. Your choice stays in this browser. It is never sent to Hive Astra or anyone else.</p>
  <p><strong>Now:</strong> ${esc(o.name)} · ${caption(o)}</p>
  <div class="modal-actions" style="justify-content:flex-start"><button id="locGps">Use my location</button><button class="secondary" id="locReset">Use default (40°N)</button></div>
  <p id="locMsg" role="status" aria-live="polite" style="min-height:1em"></p>
  <label for="locCity">Search a city</label><input id="locCity" list="locCityList" placeholder="Start typing, e.g. Toronto" autocomplete="off"/><datalist id="locCityList">${CITIES.map(c=>`<option value="${esc(c[0])}"></option>`).join('')}</datalist>
  <label>Or enter coordinates (decimal degrees, south and west negative)</label><div style="display:flex;gap:8px"><input id="locLat" type="number" step="any" min="-90" max="90" placeholder="Latitude, e.g. 40" aria-label="Latitude"/><input id="locLon" type="number" step="any" min="-180" max="180" placeholder="Longitude, e.g. -100" aria-label="Longitude"/></div>
  <div class="modal-actions"><button class="secondary" id="locCancel">Cancel</button><button id="locSave">Save</button></div>`);
  const msg=t=>{$('locMsg').textContent=t};
  $('locCancel').onclick=M.close;
  $('locReset').onclick=()=>{set(null);M.close()};
  $('locGps').onclick=()=>{if(!navigator.geolocation){msg('This browser does not support location.');return}msg('Asking your browser for permission…');
    navigator.geolocation.getCurrentPosition(p=>{set({name:'My location',lat:p.coords.latitude,lon:p.coords.longitude,src:'gps'});M.close()},e=>msg(e.code===1?'Location permission was declined. You can search a city or enter coordinates instead.':'Could not get your location. Try a city or coordinates instead.'),{enableHighAccuracy:false,timeout:15000,maximumAge:600000})};
  $('locSave').onclick=()=>{const q=$('locCity').value.trim().toLowerCase();if(q){const c=CITIES.find(c=>c[0].toLowerCase()===q)||CITIES.find(c=>c[0].toLowerCase().startsWith(q))||CITIES.find(c=>c[0].toLowerCase().includes(q));if(!c){msg('That city isn’t in the list yet. Try a larger nearby city, or enter coordinates.');return}set({name:c[0],lat:c[1],lon:c[2],src:'city'});M.close();return}
    const la=$('locLat').value,lo=$('locLon').value;if(la!==''||lo!==''){const o={name:'Custom location',lat:+la,lon:+lo,src:'manual'};if(la===''||lo===''||!valid(o)){msg('Latitude must be between −90 and 90, and longitude between −180 and 180.');return}set(o);M.close();return}
    msg('Search a city, enter coordinates, or use your location.')}}
window.HiveAstraObserver={get,set,short,caption,format:ll,DEFAULT:{...DEF}};
const btn=$('locationButton');if(btn)btn.onclick=picker;
document.querySelectorAll('[data-loc-open]').forEach(b=>b.addEventListener('click',picker));
paint();
})();
