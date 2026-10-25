/* Live weather for a coastal position.
   Air conditions: OpenWeather when CL_CONFIG.openWeatherKey is set, otherwise Open-Meteo (no key needed).
   Sea conditions (wave height, period, sea level): Open-Meteo Marine. Results are cached for ten minutes. */
(function(){
"use strict";
var CFG=window.CL_CONFIG||{};
var WMO={0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Light showers',81:'Showers',82:'Violent showers',85:'Snow showers',86:'Snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',97:'Heavy thunderstorm',99:'Thunderstorm with hail'};
var TTL=10*60*1000;

function num(v){return typeof v==='number'&&isFinite(v)?v:null}
function key(lat,lng){return 'cl.wx.'+lat.toFixed(2)+','+lng.toFixed(2)+'.'+(CFG.openWeatherKey?'ow':'om')}
function getJson(url,ms){
  var ctl=typeof AbortController==='function'?new AbortController():null,t=setTimeout(function(){if(ctl)ctl.abort()},ms||9000);
  return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()},function(e){clearTimeout(t);throw e});
}
function openMeteoAir(lat,lng){
  var u='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lng+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto';
  return getJson(u).then(function(j){
    var c=j&&j.current;if(!c)throw new Error('no data');
    return {provider:'Open-Meteo',url:'https://open-meteo.com/',time:c.time||null,
      temp:num(c.temperature_2m),feels:num(c.apparent_temperature),humidity:num(c.relative_humidity_2m),pressure:num(c.pressure_msl),
      rain:num(c.precipitation),wind:num(c.wind_speed_10m),windDir:num(c.wind_direction_10m),gust:num(c.wind_gusts_10m),
      text:WMO[c.weather_code]||null};
  });
}
function openWeatherAir(lat,lng){
  var u='https://api.openweathermap.org/data/2.5/weather?lat='+lat+'&lon='+lng+'&units=metric&appid='+encodeURIComponent(CFG.openWeatherKey);
  return getJson(u).then(function(j){
    if(!j||!j.main)throw new Error('no data');
    var w=(j.weather&&j.weather[0])||{},wi=j.wind||{};
    var kmh=function(v){return num(v)===null?null:Math.round(v*3.6*10)/10};
    var d=w.description||null;
    return {provider:'OpenWeather',url:'https://openweathermap.org/',time:j.dt?new Date(j.dt*1000).toISOString():null,
      temp:num(j.main.temp),feels:num(j.main.feels_like),humidity:num(j.main.humidity),pressure:num(j.main.pressure),
      rain:num(j.rain&&(j.rain['1h']))||0,wind:kmh(wi.speed),windDir:num(wi.deg),gust:kmh(wi.gust),
      text:d?d.charAt(0).toUpperCase()+d.slice(1):null};
  });
}
function marine(lat,lng){
  var u='https://marine-api.open-meteo.com/v1/marine?latitude='+lat+'&longitude='+lng+'&current=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl&timezone=auto';
  return getJson(u).then(function(j){
    var c=j&&j.current;if(!c)return null;
    var m={wave:num(c.wave_height),waveDir:num(c.wave_direction),period:num(c.wave_period),sst:num(c.sea_surface_temperature),level:num(c.sea_level_height_msl)};
    return m.wave===null&&m.period===null&&m.sst===null&&m.level===null?null:m;
  }).catch(function(){return null});   /* marine data is a bonus: never fail the card because of it */
}

function peek(lat,lng){
  lat=Number(lat);lng=Number(lng);if(!isFinite(lat)||!isFinite(lng))return null;
  try{var c=JSON.parse(sessionStorage.getItem(key(lat,lng))||'null');if(c&&Date.now()-c.at<TTL)return c.v}catch(e){}
  return null;
}
var inflight={};
function get(lat,lng){
  lat=Number(lat);lng=Number(lng);
  if(!isFinite(lat)||!isFinite(lng))return Promise.reject(new Error('bad position'));
  var k=key(lat,lng);
  try{var c=JSON.parse(sessionStorage.getItem(k)||'null');if(c&&Date.now()-c.at<TTL)return Promise.resolve(c.v)}catch(e){}
  if(inflight[k])return inflight[k];
  var air=(CFG.openWeatherKey?openWeatherAir(lat,lng).catch(function(){return openMeteoAir(lat,lng)}):openMeteoAir(lat,lng));
  inflight[k]=Promise.all([air,marine(lat,lng)]).then(function(r){
    var v=Object.assign({},r[0],{sea:r[1]});
    try{sessionStorage.setItem(k,JSON.stringify({at:Date.now(),v:v}))}catch(e){}
    delete inflight[k];return v;
  },function(e){delete inflight[k];throw e});
  return inflight[k];
}

var DIRS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function compass(d){return d===null?'':DIRS[Math.round(((d%360)+360)%360/22.5)%16]}
function f1(v){return v===null?'–':(Math.round(v*10)/10).toString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* markup for a finished reading */
function html(w){
  var cell=function(l,v){return '<div><span>'+l+'</span><b>'+v+'</b></div>'};
  var air=[
    cell('Air',w.temp===null?'–':f1(w.temp)+' °C'+(w.feels!==null?'<small> feels '+f1(w.feels)+'</small>':'')),
    cell('Wind',w.wind===null?'–':f1(w.wind)+' km/h'+(w.windDir!==null?'<small> from '+compass(w.windDir)+'</small>':'')+(w.gust!==null?'<small> gusts '+f1(w.gust)+'</small>':'')),
    cell('Humidity',w.humidity===null?'–':Math.round(w.humidity)+' %'),
    cell('Pressure',w.pressure===null?'–':Math.round(w.pressure)+' hPa')
  ];
  var s=w.sea,sea=s?[
    cell('Waves',s.wave===null?'–':f1(s.wave)+' m'+(s.period!==null?'<small> every '+f1(s.period)+' s</small>':'')+(s.waveDir!==null?'<small> from '+compass(s.waveDir)+'</small>':'')),
    cell('Sea level',s.level===null?'–':(s.level>0?'+':'')+f1(s.level)+' m<small> vs mean</small>'),
    cell('Sea surface',s.sst===null?'–':f1(s.sst)+' °C')
  ]:[];
  return '<div class="wxhead"><b>'+esc(w.text||'Current conditions')+'</b>'+(w.rain?'<span>'+f1(w.rain)+' mm rain</span>':'')+'</div><div class="wxgrid">'+air.concat(sea).join('')+'</div>'+
    '<p class="wxsrc">'+(w.time?'Reading from '+esc(String(w.time).replace('T',' ').slice(0,16))+'. ':'')+'Weather data by <a href="'+w.url+'" target="_blank" rel="noopener noreferrer">'+esc(w.provider)+'</a>'+(s?' and <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer">Open-Meteo Marine</a> (DWD wave model)':'')+'.</p>';
}

/* fill every <div class="wx" data-lat data-lng> inside root; safe to call repeatedly */
function mount(root){
  Array.prototype.forEach.call((root||document).querySelectorAll('.wx[data-lat]'),function(el){
    var lat=el.getAttribute('data-lat'),lng=el.getAttribute('data-lng'),token=lat+','+lng;
    el.setAttribute('data-for',token);
    var hit=peek(lat,lng);
    if(hit){el.removeAttribute('aria-busy');el.innerHTML=html(hit);return}
    el.setAttribute('aria-busy','true');
    el.innerHTML='<p class="wxload">Loading live weather…</p>';
    get(lat,lng).then(function(w){
      if(el.getAttribute('data-for')!==token)return;
      el.removeAttribute('aria-busy');el.innerHTML=html(w);
    },function(){
      if(el.getAttribute('data-for')!==token)return;
      el.removeAttribute('aria-busy');
      el.innerHTML='<p class="wxload">Live weather is not available right now. Check your connection and <button class="linkbtn" data-act="wxretry">try again</button>.</p>';
    });
  });
}

window.CLWeather={get:get,peek:peek,mount:mount,html:html,compass:compass};
})();
