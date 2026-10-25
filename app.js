(function(){
"use strict";
var PAGE=document.body.getAttribute('data-page')||'auth';
var PAGES={auth:'index.html',dashboard:'dashboard.html',reports:'reports.html',detail:'report-details.html',report:'submit.html',profile:'profile.html',admin:'admin.html'};
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

/* ---------- reference data ---------- */
var TYPES={
  erosion:{n:'Shoreline erosion',m:'Shoreline retreat',u:'m',c:'--t-erosion',max:1000},
  flood:{n:'Flooding incident',m:'Flood depth',u:'cm',c:'--t-flood',max:500},
  change:{n:'Shoreline change',m:'Shoreline shift',u:'m',c:'--t-change',max:1000},
  sealevel:{n:'Sea level or tide anomaly',m:'Water above predicted tide',u:'cm',c:'--t-sealevel',max:300}
};
var SEV=['Not rated','Minor','Moderate','Serious','Severe'];
var CONDS=['Stable','Accreting','Eroding','Protected by seawall','Defence breached'];
var SITE_CONDS=['Not assessed'].concat(CONDS);
var BOUNDS={lat0:6.4,lat1:25.0,lng0:67.5,lng1:94.8};
var MAP={s:32,W:873.6,H:595.2};
function px(lng,lat){return [(lng-BOUNDS.lng0)*MAP.s,(BOUNDS.lat1-lat)*MAP.s]}
/* the nine coastal states and four coastal union territories, in order around the coast from the north-west */
var STATES=['Gujarat','Daman and Diu','Maharashtra','Goa','Karnataka','Kerala','Tamil Nadu','Puducherry','Andhra Pradesh','Odisha','West Bengal','Lakshadweep','Andaman and Nicobar Islands'];
/* map zoom areas: key, label, [west, south, east, north] in degrees, states shown */
var REGIONS=[
  ['all','Whole Indian coast',null,[]],
  ['gj','Gujarat, Daman and Diu',[68.0,20.0,73.4,23.9],['Gujarat','Daman and Diu']],
  ['mh','Maharashtra and Goa',[72.2,14.8,74.6,20.4],['Maharashtra','Goa']],
  ['ka','Karnataka and Kerala',[73.7,8.2,77.4,15.0],['Karnataka','Kerala']],
  ['tn','Tamil Nadu and Puducherry',[76.8,7.9,80.9,13.7],['Tamil Nadu','Puducherry']],
  ['ap','Andhra Pradesh',[79.6,13.4,85.0,19.4],['Andhra Pradesh']],
  ['od','Odisha',[84.0,18.9,87.6,21.7],['Odisha']],
  ['wb','West Bengal',[86.4,21.2,89.2,22.3],['West Bengal']],
  ['ln','Lakshadweep',[71.6,8.0,74.2,12.6],['Lakshadweep']],
  ['an','Andaman and Nicobar Islands',[92.0,6.5,94.2,13.9],['Andaman and Nicobar Islands']]
];
/* schematic mainland coast from Pakistan to Myanmar, west to east. The first and last points sit on the map edges. */
var COAST=[[67.5,24.05],[68.1,23.8],[68.5,23.72],[68.75,23.25],[69.2,22.85],[69.72,22.78],[70.2,22.98],[70.55,22.95],[70.1,22.55],[69.5,22.4],[69.07,22.45],[68.97,22.22],[69.35,21.8],[69.65,21.62],[70.3,20.95],[70.95,20.72],[71.5,20.95],[72.0,21.3],[72.15,21.75],[72.45,22.2],[72.6,21.8],[72.62,21.3],[72.7,21.05],[72.8,20.45],[72.75,19.9],[72.85,19.2],[72.82,18.9],[72.95,18.6],[73.2,17.5],[73.3,16.95],[73.5,16.0],[73.75,15.5],[74.1,14.8],[74.45,14.2],[74.7,13.3],[74.85,12.8],[75.0,12.4],[75.4,11.85],[75.8,11.2],[76.2,10.2],[76.3,9.5],[76.55,8.95],[76.95,8.45],[77.4,8.1],[77.55,8.08],[78.1,8.7],[78.6,9.0],[79.1,9.25],[79.4,9.3],[79.85,10.3],[79.85,10.75],[79.85,11.9],[80.3,13.0],[80.3,13.6],[80.1,14.4],[80.1,15.5],[80.6,15.8],[81.15,16.2],[82.0,16.6],[82.3,17.0],[83.3,17.7],[84.1,18.3],[84.9,19.25],[85.5,19.75],[85.85,19.8],[86.7,20.3],[86.95,20.8],[87.0,21.5],[87.55,21.62],[88.05,21.65],[88.6,21.65],[89.0,21.7],[89.6,21.9],[90.4,22.1],[91.3,22.4],[91.9,22.3],[92.1,21.3],[92.7,20.2],[93.6,19.3],[94.4,18.3],[94.8,17.2]];
/* island chains drawn as thick rounded lines: Andaman and Nicobar, then Lakshadweep dots */
var ISLES=[[[92.95,13.45],[92.85,12.7],[92.9,12.0],[92.75,11.6],[92.7,11.1]],[[92.55,10.8],[92.58,10.55]],[[92.78,9.2],[92.79,9.12]],[[93.5,8.05],[93.6,8.25]],[[93.75,7.25],[93.9,6.85]]];
var DOTS=[[72.18,10.86],[72.64,10.57],[72.73,11.12],[73.05,8.28],[72.3,10.1]];
/* name, lng, lat, dx, dy, anchor: e = text ends at the point, s = text starts at it, m = centred */
var PLACES=[['Mumbai',72.82,18.95,-8,-4,'e'],['Kochi',76.27,9.97,-8,4,'e'],['Chennai',80.28,13.08,8,4,'s'],['Visakhapatnam',83.3,17.7,8,4,'s'],['Kanyakumari',77.55,8.08,0,15,'m']];
var EV_LIMIT=180000;

/* ---------- pure helpers (validation, status, geometry) ---------- */
function validPhone(s){if(s==='')return true;var d=s.replace(/\D/g,'');return /^\+?[\d\s-]{7,18}$/.test(s)&&d.length>=7&&d.length<=15}
function validEmail(s){return s===''||/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s)&&s.length<=120}
function kmBetween(a,b,c,d){var R=6371,t=Math.PI/180,dl=(c-a)*t,dn=(d-b)*t,x=Math.pow(Math.sin(dl/2),2)+Math.cos(a*t)*Math.cos(c*t)*Math.pow(Math.sin(dn/2),2);return 2*R*Math.asin(Math.sqrt(x))}
function localDate(off){var d=new Date(Date.now()-new Date().getTimezoneOffset()*60000-(off||0)*864e5);return d.toISOString().slice(0,10)}
function validateProfile(v){
  var e={};
  if(v.name.length<2||v.name.length>60)e.name='Enter a public name of 2 to 60 characters.';
  if(!validEmail(v.email))e.email='Enter a valid email address, or leave it blank.';
  if(!validPhone(v.phone))e.phone='Enter a phone number with 7 to 15 digits, or leave it blank.';
  if(v.email===''&&v.phone==='')e.email='Give an email or a phone number so the team can reach you about a report.';
  if(v.loc.length<2||v.loc.length>80)e.loc='Enter where you live, for example a village, district and state.';
  if(v.ok===false)e.ok='Please agree before you register.';
  return e;
}
function validateSite(v){
  var e={};
  if(v.name.length<2||v.name.length>60)e.name='Enter a site name of 2 to 60 characters.';
  if(STATES.indexOf(v.st)<0)e.st='Choose the state or union territory.';
  if(isNaN(v.lat)||v.lat<BOUNDS.lat0||v.lat>BOUNDS.lat1)e.lat='Latitude must be between '+BOUNDS.lat0+' and '+BOUNDS.lat1+'.';
  if(isNaN(v.lng)||v.lng<BOUNDS.lng0||v.lng>BOUNDS.lng1)e.lng='Longitude must be between '+BOUNDS.lng0+' and '+BOUNDS.lng1+'.';
  if(v.note.length<5||v.note.length>300)e.note='Add a note of 5 to 300 characters.';
  return e;
}
function validateReport(v,c){
  var e={};
  if(!TYPES[v.type])e.type='Choose what happened.';
  if(!(v.sev>=1&&v.sev<=4))e.sev='Choose how serious it is.';
  if(!v.date)e.date='Choose the date you saw the change.';
  else if(v.date>c.today)e.date='The date cannot be in the future.';
  else if(v.date<c.minDate)e.date='Reports must be about changes from the last five years.';
  if(v.measure!==''&&v.measure!=null){var m=Number(v.measure);if(isNaN(m)||m<0)e.measure='Enter a number of zero or more.';else if(TYPES[v.type]&&m>TYPES[v.type].max)e.measure='That looks too large. The limit is '+TYPES[v.type].max+' '+TYPES[v.type].u+'. Check the unit.'}
  if(!v.siteId)e.site='Choose a coastal location.';
  else if(v.siteId==='other'){var p=(v.place||'').trim();if(p.length<2||p.length>80)e.place='Enter a place name of 2 to 80 characters.';if(STATES.indexOf(v.state)<0)e.state='Choose the state or union territory.'}
  var la=parseFloat(v.lat),ln=parseFloat(v.lng);
  if(isNaN(la)||isNaN(ln))e.pos='Set the position by clicking the map or entering coordinates.';
  else if(la<BOUNDS.lat0||la>BOUNDS.lat1||ln<BOUNDS.lng0||ln>BOUNDS.lng1)e.pos='Coastlines covers the Indian coast, from '+BOUNDS.lng0+'°E to '+BOUNDS.lng1+'°E and '+BOUNDS.lat0+'°N to '+BOUNDS.lat1+'°N. Move the pin inside that area.';
  else if(c.site&&kmBetween(la,ln,c.site.lat,c.site.lng)>30)e.pos='That position is more than 30 km from '+c.site.n+'. Pick "Somewhere else" or move the pin.';
  var d=(v.desc||'').trim();
  if(d.length<10)e.desc='Describe what you saw in at least 10 characters.';
  else if(d.length>1000)e.desc='Keep the description under 1000 characters.';
  if(!c.evCount)e.ev='Add at least one photo or short video as evidence.';
  if(!v.ok)e.ok='Please confirm the evidence and sharing statement.';
  if(!e.date&&!e.site&&(c.existing||[]).some(function(x){return x.authorId===c.uid&&x.type===v.type&&x.date===v.date&&(x.siteId===v.siteId&&v.siteId!=='other'||v.siteId==='other'&&x.place===(v.place||'').trim())}))e.date='You already reported this type of change at this place on this date.';
  if(c.pending>=5)e.form='You have 5 reports waiting for review. Wait for the team to review some before sending more.';
  return e;
}
function statusFor(id,pubIds,revs){if(pubIds[id])return 'verified';var r=revs[id];return r&&r.status==='rejected'?'rejected':'pending'}
function newId(){return 'R-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase()}

/* ---------- state ---------- */
var S={ready:false,painted:false,db:null,uid:null,admin:false,canWrite:true,member:null,loadErr:'',
  sites:[],pubs:[],mine:[],ownRevs:{},members:[],inbox:[],inboxRevs:{},inboxState:'idle',
  view:PAGE,back:'reports',detailId:null,sel:null,siteSel:null,showSites:true,mapTypes:{erosion:1,flood:1,change:1,sealevel:1},
  f:{type:'all',sev:'all',state:'all',site:'all',src:'all',q:'',sort:'new',n:15},
  form:{type:'erosion',sev:2,date:'',measure:'',siteId:'',place:'',state:'',lat:'',lng:'',cond:'',desc:'',ok:false,ev:[],errs:{}},
  sform:{name:'',st:'',lat:'',lng:'',cond:'Stable',sev:'0',note:''},
  authTab:'in',pendingSite:null,region:'all',pickRegion:'all',sitesAll:false,
  confirm:null,photosAll:false,busy:false,theme:'auto',csvKind:'reports',dirty:false,unsubs:[],got:{},need:[]};

function fmtDate(s){var d=new Date(s+'T00:00:00');return isNaN(d)?s:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
function fmtSize(n){return (n/1048576).toFixed(1)+' MB'}
function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true},3600)}
function siteById(id){return S.sites.filter(function(s){return s.id===id})[0]||null}
function pubIds(){var m={};S.pubs.forEach(function(r){m[r.id]=1});return m}
function revsAll(){return Object.assign({},S.ownRevs,S.inboxRevs)}
function statusOf(r){return statusFor(r.id,pubIds(),revsAll())}
function findReport(id){var m={};[S.inbox,S.mine,S.pubs].forEach(function(l){l.forEach(function(r){m[r.id]=r})});return m[id]||null}
function byDate(a,b){return a.date<b.date?1:a.date>b.date?-1:0}
function dbMsg(e){
  var c=e&&e.code;
  if(c==='permission_denied'||c==='invalid_argument')return 'You do not have permission to do that.';
  if(c==='quota_exceeded')return 'This browser has no storage left for Coastlines. Remove a photo, or ask an admin to reset the data.';
  if(c==='not_found')return 'That item no longer exists. Reload the page.';
  return 'Could not save. Try again in a moment.';
}
async function guard(fn,ok){
  if(S.busy)return false;
  S.busy=true;
  try{await fn();if(ok)toast(ok);return true}
  catch(e){toast(dbMsg(e));return false}
  finally{S.busy=false}
}

/* ---------- session, redirects and small browser preferences ---------- */
function pref(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function drop(k){try{sessionStorage.removeItem(k)}catch(e){}}
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
function safeNext(n){
  var ok=Object.keys(PAGES).map(function(k){return PAGES[k]});
  if(typeof n==='string'){var file=n.split('?')[0];if(ok.indexOf(file)>-1&&file!==PAGES.auth&&/^[\w.\-]+(\?[\w=&%.\-]*)?$/.test(n))return n}
  return PAGES.dashboard;
}
function thisFile(){return (location.pathname.split('/').pop()||PAGES.dashboard)+location.search}
function navTo(v,qs){location.href=PAGES[v]+(qs?'?'+qs:'')}

/* ---------- data layer ---------- */
function snapList(s){return s.docs.map(function(d){var x=Object.assign({},d.data());x.id=d.id;return x})}
function sub(key,ref,fn){
  S.need.push(key);
  var done=function(){S.got[key]=1;S.dirty=true;repaint()};
  try{S.unsubs.push(ref.onSnapshot(function(s){fn(s);done()},function(e){S.loadErr=dbMsg(e);done()}))}
  catch(e){S.loadErr=dbMsg(e);S.got[key]=1}
}
function isLoading(){return S.need.some(function(k){return !S.got[k]})}
function boot(){
  var q=new URLSearchParams(location.search),th=pref('cl.theme');
  if(th==='light'||th==='dark')S.theme=th;
  var u=window.CLStore&&CLStore.user();
  if(PAGE==='auth'){
    if(u){location.replace(safeNext(q.get('next')));return}
    S.ready=true;S.painted=true;S.authTab=q.get('tab')==='up'?'up':'in';render();return;
  }
  if(!u){location.replace(PAGES.auth+'?next='+encodeURIComponent(thisFile()));return}
  var db=CLStore.db;
  S.db=db;S.uid=u.id;S.admin=u.isAdmin;S.ready=true;
  var from=q.get('from');S.back=PAGES[from]&&from!=='detail'&&from!=='auth'?from:'reports';
  if(PAGE==='detail')S.detailId=q.get('id');
  if(PAGE==='reports'){try{var sf=JSON.parse(ss('cl.f')||'null');if(sf)S.f=Object.assign(S.f,sf,{n:15})}catch(e){}}
  if(PAGE==='report'){
    try{var dr=JSON.parse(ss('cl.draft')||'null');if(dr)S.form=Object.assign(S.form,dr,{ev:[],errs:{}})}catch(e){}
    S.pendingSite=q.get('site');
  }
  sub('sites',db.collection('sites'),function(s){
    S.sites=snapList(s);
    if(S.pendingSite){var st=siteById(S.pendingSite);if(st){S.pickRegion=regionOfState(st.st);S.form.siteId=st.id;S.form.lat=st.lat;S.form.lng=st.lng;if(!S.form.cond&&CONDS.indexOf(st.cond)>-1)S.form.cond=st.cond}S.pendingSite=null}
  });
  sub('reports',db.collection('reports'),function(s){S.pubs=snapList(s)});
  sub('member',db.doc('members/'+S.uid),function(s){S.member=s.exists?Object.assign({},s.data()):null});
  if(PAGE==='profile'||PAGE==='detail'||PAGE==='report'||PAGE==='dashboard'){
    sub('mine',db.collection('submissions/'+S.uid+'/items'),function(s){S.mine=snapList(s)});
    sub('revs',db.collection('reviews/'+S.uid+'/items'),function(s){var m={};snapList(s).forEach(function(x){m[x.id]=x});S.ownRevs=m});
  }
  if(S.admin&&(PAGE==='admin'||PAGE==='detail')){
    S.need.push('inbox');
    sub('members',db.collection('members'),function(s){S.members=snapList(s);loadInbox()});
  }
  render();
}
async function loadInbox(){
  if(!S.admin||!S.db)return;
  S.inboxState='loading';
  var subs=[],revs={},ms=S.members.slice();
  try{
    for(var i=0;i<ms.length;i+=6){
      var chunk=ms.slice(i,i+6);
      var res=await Promise.all(chunk.map(function(m){return Promise.all([S.db.collection('submissions/'+m.id+'/items').get(),S.db.collection('reviews/'+m.id+'/items').get()])}));
      res.forEach(function(r){subs=subs.concat(snapList(r[0]));snapList(r[1]).forEach(function(x){revs[x.id]=x})});
    }
    S.inbox=subs;S.inboxRevs=revs;S.inboxState='ok';
  }catch(e){S.inboxState='error';toast(dbMsg(e))}
  S.got.inbox=1;S.dirty=true;repaint();
}

/* ---------- pieces ---------- */
var LOGO='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M3 12c3.3-3 6.7-3 10 0s6.7 3 10 0 4-2 6-1.5"/><path d="M3 20c3.3-3 6.7-3 10 0s6.7 3 10 0 4-2 6-1.5"/><path d="M3 27.5c3.3-2.4 6.7-2.4 10 0s6.7 2.4 10 0" opacity=".5"/></svg>';
function sevMeter(n){var h='<span class="sev s'+n+'" title="'+SEV[n]+'" aria-label="Severity: '+SEV[n]+'">';for(var i=1;i<=4;i++)h+='<i'+(i<=n?' class="on"':'')+'></i>';return h+'</span>'}
function pill(st){return '<span class="pill '+st+'">'+st+'</span>'}
function tdot(t){return '<span class="dot" style="background:var('+(TYPES[t]||TYPES.erosion).c+')"></span>'}
function fld(label,id,input,hint){return '<div class="fld"><label for="'+id+'">'+label+'</label>'+input+(hint?'<span class="hint">'+hint+'</span>':'')+'<span class="fe" id="e-'+id+'" role="alert"></span></div>'}
function showErrs(errs,ids){
  var first=null;
  Object.keys(ids).forEach(function(k){
    var el=$('#'+ids[k]),fe=$('#e-'+ids[k]),m=errs[k]||'';
    if(fe)fe.textContent=m;
    if(el){if(m){el.setAttribute('aria-invalid','true');if(!first)first=el}else el.removeAttribute('aria-invalid')}
  });
  if(first)first.focus();
  return !first;
}
function initials(n){var w=String(n).trim().split(/[\s\-]+/).filter(Boolean);return ((w[0]||'?').charAt(0)+(w.length>1?w[1].charAt(0):'')).toUpperCase()}
function header(){
  var signed=!!S.uid,t='';
  if(signed){
    var tabs=[['dashboard','Map dashboard'],['reports','Community reports'],['report','Report change'],['profile','My profile']];
    if(S.admin)tabs.push(['admin','Admin']);
    t='<nav class="tabs" aria-label="Sections">'+tabs.map(function(x){return '<a href="'+PAGES[x[0]]+'"'+(PAGE===x[0]||(PAGE==='detail'&&x[0]==='reports')?' aria-current="page"':'')+'>'+x[1]+'</a>'}).join('')+'</nav>';
  }
  var nm=S.member?S.member.name:'',role=S.admin?'admin':'member';
  return '<header class="top"><div class="bar"><a class="brand" href="'+(signed?PAGES.dashboard:PAGES.auth)+'">'+LOGO+'<span>Coastlines</span></a>'+t+'<div class="who"><button class="btn sm" data-act="water" aria-pressed="'+(document.documentElement.getAttribute('data-still')==='1'?'false':'true')+'" aria-label="Animate the water background">Motion</button><button class="btn sm" data-act="theme" aria-label="Switch colour theme">Theme</button>'+(signed?(nm?'<span class="av" title="'+esc(nm)+'" aria-label="Signed in as '+esc(nm)+'">'+esc(initials(nm))+'</span>':'')+'<span class="role">'+role+'</span><button class="btn sm" data-act="logout">Sign out</button>':'')+'</div></div></header>';
}
function evHtml(list,rm){
  if(!list||!list.length)return '<p class="muted" style="margin-top:8px;font-size:.88rem">No photos or video attached.</p>';
  var hasV=list.some(function(x){return x.kind==='video'});
  return '<div class="photos">'+list.map(function(x,i){
    var inner=x.src?'<img src="'+esc(x.src)+'" alt="'+(x.kind==='video'?'Still frame from video ':'Photo ')+esc(x.name)+'">':'<div class="vph">Video</div>';
    return '<div class="ph">'+inner+(x.kind==='video'?'<span class="vbadge">Video · '+fmtSize(x.size||0)+'</span>':'')+(rm?'<button type="button" data-act="rmev" data-i="'+i+'" aria-label="Remove '+esc(x.name)+'">×</button>':'')+'</div>';
  }).join('')+'</div>'+(hasV?'<p class="hint" style="margin-top:6px">A still frame is kept from each video, not the full clip.</p>':'');
}


/* ---------- sources and photographs ---------- */
function okUrl(u){return /^https:\/\/[^\s"'<>]+$/.test(String(u||''))?u:'#'}
function srcLink(r){var x=r.source||{};return '<a href="'+esc(okUrl(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.pub||r.authorName)+'</a>'}
function srcBlock(r){
  var x=r.source||{};
  return '<h3 style="margin-top:18px">Source</h3><div class="srcbox"><p style="margin:0"><b>'+esc(x.pub||r.authorName)+'</b>: '+esc(x.title||'')+'</p><p class="muted" style="margin:4px 0 0;font-size:.85rem">'+(x.by?'By '+esc(x.by)+' · ':'')+'Published '+fmtDate(x.date||r.date)+'</p><div class="acts" style="margin-top:10px"><a class="btn sm pri" href="'+esc(okUrl(x.url))+'" target="_blank" rel="noopener noreferrer">Read the original article</a></div></div>'+
    '<p class="hint" style="margin-top:8px">The summary above is a short paraphrase of the article. Severity and shoreline condition are an editorial reading of it, not a survey measurement.</p>';
}
function photoCaption(f){return String(f).replace(/\.[A-Za-z0-9]+$/,'').replace(/_/g,' ')}
function photoSrc(f,w){return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(f)+'?width='+(w||900)}
function photoPage(f){return 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(f)}
function figHtml(f,w,label){
  return '<figure class="pfig"><img src="'+esc(photoSrc(f,w))+'" alt="'+esc(photoCaption(f))+'" loading="lazy" decoding="async" data-ph="1"><figcaption>'+(label?'<b>'+esc(label)+'</b> · ':'')+esc(photoCaption(f))+' · <a class="credit" data-credit="'+esc(f)+'" href="'+esc(photoPage(f))+'" target="_blank" rel="noopener noreferrer">Photo: Wikimedia Commons</a></figcaption></figure>';
}
function photoBlock(s){
  if(!s||!s.img||!s.img.length)return '';
  return '<h3 style="margin-top:16px;font-size:.92rem">Photographs of the beach</h3><div class="pstrip">'+s.img.slice(0,2).map(function(f){return figHtml(f,700)}).join('')+'</div><p class="hint" style="margin-top:6px">File photos from Wikimedia Commons. They show the place, not the events in the reports.</p>';
}
function refsBlock(s){
  if(!s||!s.refs||!s.refs.length)return '';
  return '<h3 style="margin-top:16px;font-size:.92rem">Further reading</h3><ul class="refs">'+s.refs.map(function(x){
    return '<li><a href="'+esc(okUrl(x.u))+'" target="_blank" rel="noopener noreferrer">'+esc(x.t)+'</a><span class="muted"> · '+esc(x.pub)+' · '+(x.d?fmtDate(x.d):'date not shown')+'</span>'+(x.n?'<br><span class="muted" style="font-size:.82rem">'+esc(x.n)+'</span>':'')+'</li>';
  }).join('')+'</ul>';
}
function gallery(){
  var withImg=S.sites.filter(function(x){return x.img&&x.img.length});
  if(!withImg.length)return '';
  var n={};S.pubs.forEach(function(r){n[r.siteId]=(n[r.siteId]||0)+1});
  withImg.sort(function(a,b){return (n[b.id]||0)-(n[a.id]||0)||STATES.indexOf(a.st)-STATES.indexOf(b.st)||(a.n<b.n?-1:1)});
  var part=S.photosAll?withImg:withImg.slice(0,12);
  return '<section class="card" id="gallery"><h2>Beaches</h2><p class="muted" style="font-size:.85rem;margin:4px 0 12px">File photographs of the monitored beaches, from Wikimedia Commons. They show the place, not the events in the reports. Sites with reports come first.</p><div class="pgrid">'+
    part.map(function(x){return figHtml(x.img[0],480,x.n+', '+x.st)}).join('')+'</div>'+
    (withImg.length>12?'<div style="margin-top:12px"><button class="btn" data-act="photosall">'+(S.photosAll?'Show fewer photos':'Show all '+withImg.length+' beaches')+'</button></div>':'')+'</section>';
}

/* ---------- map ---------- */
function boxFor(key){var r=REGIONS.filter(function(x){return x[0]===key})[0];return r&&r[2]||null}
function regionOfState(st){var r=REGIONS.filter(function(x){return x[3].indexOf(st)>-1})[0];return r?r[0]:'all'}
function focusBox(lat,lng,span){var dx=span/2,dy=span/2/(MAP.W/MAP.H);return [lng-dx,lat-dy,lng+dx,lat+dy]}
/* the part of the map to show: x, y, w, h in map units, and k = how zoomed in (1 = whole coast) */
function viewOf(box){
  var W=MAP.W,H=MAP.H;
  if(!box)return {x:0,y:0,w:W,h:H,k:1};
  var a=px(box[0],box[3]),b=px(box[2],box[1]),w=b[0]-a[0],h=b[1]-a[1],cx=a[0]+w/2,cy=a[1]+h/2,ar=W/H;
  if(w/h<ar)w=h*ar;else h=w/ar;
  if(w>=W)return {x:0,y:0,w:W,h:H,k:1};
  return {x:Math.max(0,Math.min(W-w,cx-w/2)),y:Math.max(0,Math.min(H-h,cy-h/2)),w:w,h:h,k:w/W};
}
function niceKm(v){var n=[10,20,50,100,200,500,1000],i;for(i=n.length-1;i>0;i--)if(n[i]<=v)return n[i];return n[0]}
function mapSvg(list,o){
  o=o||{};
  var W=MAP.W,H=MAP.H,v=viewOf(o.focus?focusBox(o.focus.lat,o.focus.lng,o.focus.span):o.box),ks=Math.max(0.18,v.k),f=function(n){return +(n*ks).toFixed(2)};
  var p=COAST.map(function(c){return px(c[0],c[1])});
  var d='M'+p[0][0]+','+p[0][1];
  for(var i=1;i<p.length-1;i++){d+='Q'+p[i][0]+','+p[i][1]+' '+(p[i][0]+p[i+1][0])/2+','+(p[i][1]+p[i+1][1])/2}
  d+='L'+p[p.length-1][0]+','+p[p.length-1][1];
  var land=d+'L'+W+',0L0,0L0,'+p[0][1]+'Z',g='';
  /* graticule: coarser when the whole coast is shown, finer when zoomed */
  var step=v.k>0.6?5:v.k>0.28?2:1,x0=BOUNDS.lng0+v.x/MAP.s,x1=x0+v.w/MAP.s,y1=BOUNDS.lat1-v.y/MAP.s,y0=y1-v.h/MAP.s,l;
  for(l=Math.ceil(x0/step)*step;l<=x1;l+=step){var x=px(l,0)[0];g+='<line class="grat" x1="'+x+'" y1="'+v.y+'" x2="'+x+'" y2="'+(v.y+v.h)+'"/><text class="glbl" x="'+(x+f(4))+'" y="'+(v.y+v.h-f(8))+'" style="font-size:'+f(12)+'px">'+l+'°E</text>'}
  for(l=Math.ceil(y0/step)*step;l<=y1;l+=step){var y=px(0,l)[1];g+='<line class="grat" x1="'+v.x+'" y1="'+y+'" x2="'+(v.x+v.w)+'" y2="'+y+'"/><text class="glbl" x="'+(v.x+f(6))+'" y="'+(y-f(5))+'" style="font-size:'+f(12)+'px">'+l+'°N</text>'}
  var pl=PLACES.map(function(a){var q=px(a[1],a[2]);return '<text class="plc" x="'+(q[0]+f(a[3]))+'" y="'+(q[1]+f(a[4]))+'" text-anchor="'+({e:'end',s:'start',m:'middle'}[a[5]])+'" style="font-size:'+f(13)+'px">'+a[0]+'</text>'}).join('');
  var isl=ISLES.map(function(s){return 'M'+s.map(function(c){var q=px(c[0],c[1]);return q[0]+','+q[1]}).join('L')}).join('');
  var dots=DOTS.map(function(c){var q=px(c[0],c[1]);return '<circle class="isl" cx="'+q[0]+'" cy="'+q[1]+'" r="'+f(3.6)+'"/>'}).join('');
  var cx=BOUNDS.lng0+(v.x+v.w/2)/MAP.s,cy=BOUNDS.lat1-(v.y+v.h/2)/MAP.s;
  var kmPerUnit=111.32*Math.cos(cy*Math.PI/180)/MAP.s,km=niceKm(0.17*v.w*kmPerUnit),len=km/kmPerUnit,bx=v.x+v.w-f(16)-len,by=v.y+v.h-f(22);
  var scale='<g><line x1="'+bx+'" y1="'+by+'" x2="'+(bx+len)+'" y2="'+by+'" style="stroke:var(--ink)" stroke-width="3" vector-effect="non-scaling-stroke"/><text class="glbl" x="'+bx+'" y="'+(by-f(8))+'" style="fill:var(--ink);font-size:'+f(12)+'px">'+km+' km</text></g>';
  var sites=(o.sites||[]).map(function(s){
    var q=px(s.lng,s.lat),c='var(--s'+(s.sev||0)+')',h2=f(10),ring=o.siteSel===s.id?'<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+f(19)+'" fill="none" style="stroke:var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/>':'';
    var lbl=v.k<=0.5?'<text class="slbl" x="'+(q[0]+f(15))+'" y="'+(q[1]+f(4))+'" style="font-size:'+f(11)+'px;stroke-width:'+f(3)+'px">'+esc(s.n)+'</text>':'';
    return ring+'<rect class="site" tabindex="0" role="button" data-site="'+esc(s.id)+'" aria-label="'+esc('Coastal site '+s.n+(s.st?', '+s.st:'')+', '+s.cond+', erosion severity '+SEV[s.sev])+'" x="'+(q[0]-h2)+'" y="'+(q[1]-h2)+'" width="'+(2*h2)+'" height="'+(2*h2)+'" rx="'+f(2)+'" transform="rotate(45 '+q[0]+' '+q[1]+')" style="fill:'+c+';stroke:'+c+'"><title>'+esc(s.n+' · '+s.cond)+'</title></rect>'+lbl;
  }).join('');
  var pins=list.slice().sort(function(a,b){return a.severity-b.severity}).map(function(r){
    var q=px(r.lng,r.lat),rad=f(3.2+r.severity*1.3),out='';
    if(o.sel===r.id)out+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+(+rad+f(5))+'" fill="none" style="stroke:var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/>';
    return out+'<circle class="pin" tabindex="0" role="button" data-pin="'+esc(r.id)+'" aria-label="'+esc(TYPES[r.type].n+', '+r.place+', '+SEV[r.severity])+'" cx="'+q[0]+'" cy="'+q[1]+'" r="'+rad+'" style="fill:var('+TYPES[r.type].c+')"/>';
  }).join('');
  var cross='';
  if(o.pick&&o.pick.lat!==''&&o.pick.lng!==''&&!isNaN(parseFloat(o.pick.lat))&&!isNaN(parseFloat(o.pick.lng))){var c=px(parseFloat(o.pick.lng),parseFloat(o.pick.lat)),a1=f(11),a2=f(5.5);cross='<g style="stroke:var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke"><line x1="'+(c[0]-a1)+'" y1="'+c[1]+'" x2="'+(c[0]+a1)+'" y2="'+c[1]+'" vector-effect="non-scaling-stroke"/><line x1="'+c[0]+'" y1="'+(c[1]-a1)+'" x2="'+c[0]+'" y2="'+(c[1]+a1)+'" vector-effect="non-scaling-stroke"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+a2+'" fill="none" vector-effect="non-scaling-stroke"/></g>'}
  var sea=function(t,lng,lat,sz){var q=px(lng,lat);return '<text class="sea" x="'+q[0]+'" y="'+q[1]+'" text-anchor="middle" style="font-size:'+f(sz)+'px">'+t+'</text>'};
  var an=px(92.4,10.2),ln=px(71.9,9.6);
  var seas=sea('Arabian Sea',69.6,15.8,21)+sea('Bay of Bengal',86.2,13.4,21)+sea('Indian Ocean',80.5,7.0,19)+
    '<text class="plc" x="'+an[0]+'" y="'+an[1]+'" text-anchor="end" style="font-size:'+f(12)+'px">Andaman and Nicobar</text><text class="plc" x="'+ln[0]+'" y="'+ln[1]+'" text-anchor="end" style="font-size:'+f(12)+'px">Lakshadweep</text>';
  var idm=o.id||'map';
  return '<svg id="'+idm+'" viewBox="'+v.x+' '+v.y+' '+v.w+' '+v.h+'" role="img" aria-label="Schematic map of the Indian coast">'+
    '<defs><linearGradient id="wg-'+idm+'" x1="0.25" y1="0.2" x2="0.95" y2="1"><stop offset="0" style="stop-color:var(--water1)"/><stop offset="1" style="stop-color:var(--water2)"/></linearGradient></defs><rect x="0" y="0" width="'+W+'" height="'+H+'" style="fill:url(#wg-'+idm+')"/>'+g+
    '<path class="shore" d="'+d+'" style="stroke-width:'+f(14)+'px"/><path class="land" d="'+land+'"/><path class="coast" d="'+d+'" vector-effect="non-scaling-stroke"/>'+
    '<path class="isle-edge" d="'+isl+'" style="stroke-width:'+f(8)+'px"/><path class="isle" d="'+isl+'" style="stroke-width:'+f(5.5)+'px"/>'+dots+seas+pl+scale+sites+pins+cross+'</svg>';
}
function legend(){return '<div class="legend">'+Object.keys(TYPES).map(function(k){return '<span>'+tdot(k)+TYPES[k].n+'</span>'}).join('')+'<span><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" style="fill:var(--s3);fill-opacity:.2;stroke:var(--s3)" stroke-width="1.6"/></svg>Coastal site, coloured by erosion severity (grey: not rated)</span></div>'}
function earthUrl(lat,lng,range){return 'https://earth.google.com/web/@'+Number(lat).toFixed(5)+','+Number(lng).toFixed(5)+',10a,'+(range||1500)+'d,35y,0h,0t,0r'}
function earthLink(lat,lng){return '<a class="btn sm" href="'+earthUrl(lat,lng)+'" target="_blank" rel="noopener noreferrer">Open in Google Earth</a>'}
function kml(list){
  var pm=function(n,d,lat,lng){return '<Placemark><name>'+esc(n)+'</name><description>'+esc(d)+'</description><Point><coordinates>'+lng+','+lat+',0</coordinates></Point></Placemark>'};
  var sites=S.sites.map(function(s){return pm(s.n,(s.st?s.st+'. ':'')+'Shoreline condition: '+s.cond+'. Erosion severity: '+SEV[s.sev]+'. '+s.note,s.lat,s.lng)}).join('');
  var rs=list.map(function(r){return pm(r.id+' '+TYPES[r.type].n+' at '+r.place,(stateOf(r)?stateOf(r)+'. ':'')+fmtDate(r.date)+'. Severity: '+SEV[r.severity]+'. '+r.desc+(r.source?' Source: '+r.source.pub+' ('+r.source.url+').':''),r.lat,r.lng)}).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Coastlines coastal data</name><Folder><name>Coastal sites</name>'+sites+'</Folder><Folder><name>Reports</name>'+rs+'</Folder></Document></kml>';
}
async function saveFile(name,data){
  try{
    var kml=/\.kml$/.test(name),b=new Blob([kml?data:'\ufeff'+data],{type:(kml?'application/vnd.google-earth.kml+xml':'text/csv')+';charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500);return true;
  }catch(e){toast('Could not save the file. Use Copy instead.');return false}
}

/* ---------- charts and lists ---------- */
function trendSvg(list){
  var yr=new Date().getFullYear(),first=yr,cols=[],i;
  list.forEach(function(r){var y=+String(r.date).slice(0,4);if(y>1950&&y<first)first=y});
  for(i=first;i<=yr;i++)cols.push({k:String(i),n:0});
  list.forEach(function(r){cols.forEach(function(c){if(String(r.date).slice(0,4)===c.k)c.n++})});
  var max=Math.max(4,Math.max.apply(null,cols.map(function(c){return c.n}))),top=Math.ceil(max/2)*2;
  var W=480,H=210,L=30,B=26,T=14,bw=(W-L-8)/cols.length,out='';
  [0,top/2,top].forEach(function(v){var y=T+(H-T-B)*(1-v/top);out+='<line x1="'+L+'" y1="'+y+'" x2="'+W+'" y2="'+y+'" style="stroke:var(--line)"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" style="fill:var(--muted)">'+v+'</text>'});
  cols.forEach(function(c,j){
    var h=(H-T-B)*c.n/top,x=L+j*bw+bw*.18,w=bw*.64,y=H-B-h,last=j===cols.length-1;
    out+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" style="fill:url(#tg);opacity:'+(last?1:.6)+'"/>';
    if(c.n)out+='<text x="'+(x+w/2)+'" y="'+(y-4)+'" text-anchor="middle" font-size="10" style="fill:var(--ink)">'+c.n+'</text>';
    out+='<text x="'+(x+w/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" style="fill:var(--muted)">'+(cols.length>9?"’"+c.k.slice(2):c.k)+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Reports per year" style="width:100%;height:auto;margin-top:10px"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--aqua)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient></defs>'+out+'</svg>';
}
function typeBars(list){
  var max=1,cnt={};Object.keys(TYPES).forEach(function(k){cnt[k]=list.filter(function(r){return r.type===k}).length;max=Math.max(max,cnt[k])});
  return '<div class="bars">'+Object.keys(TYPES).map(function(k){return '<div class="hb"><span>'+TYPES[k].n+'</span><div class="track"><div class="fill" style="width:'+(cnt[k]/max*100)+'%;background:var('+TYPES[k].c+')"></div></div><span class="mono">'+cnt[k]+'</span></div>'}).join('')+'</div>';
}
function sevDist(list){
  var c=[0,0,0,0,0];list.forEach(function(r){c[r.severity]++});var tot=Math.max(1,list.length);
  return '<div class="sevbar" role="img" aria-label="Severity split">'+[1,2,3,4].map(function(i){return '<div style="width:'+(c[i]/tot*100)+'%;background:var(--s'+i+')"></div>'}).join('')+'</div>'+
  '<div class="legend">'+[1,2,3,4].map(function(i){return '<span><span class="dot" style="background:var(--s'+i+')"></span>'+SEV[i]+' <b class="mono">'+c[i]+'</b></span>'}).join('')+'</div>';
}
function rowsHtml(l,showStatus){
  if(!l.length)return '<p class="muted" style="padding:16px 4px">No reports to show.</p>';
  return '<div class="rows">'+l.map(function(r){
    return '<button class="row" data-open="'+esc(r.id)+'">'+tdot(r.type)+'<span style="min-width:0"><span class="t" style="display:block">'+esc(r.place)+'</span><span class="s">'+TYPES[r.type].n+' · '+fmtDate(r.date)+(r.measure!=null&&r.measure!==''?' · '+esc(r.measure)+' '+TYPES[r.type].u:'')+(r.kind==='press'?' · '+esc((r.source&&r.source.pub)||r.authorName):'')+'</span></span><span class="m">'+sevMeter(r.severity)+(showStatus?pill(statusOf(r)):'')+'</span></button>';
  }).join('')+'</div>';
}
function typeOptions(sel,all){return (all?'<option value="all">All types</option>':'')+Object.keys(TYPES).map(function(k){return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+TYPES[k].n+'</option>'}).join('')}
/* ---------- page 2: coastal map dashboard (whole Indian coast) ---------- */
function stateOf(r){return r.state||((r.siteId&&siteById(r.siteId))||{}).st||''}
function zoomRow(id,sel){return '<div class="zoomrow"><label for="'+id+'">Zoom to</label><select id="'+id+'">'+REGIONS.map(function(r){return '<option value="'+r[0]+'"'+(sel===r[0]?' selected':'')+'>'+esc(r[1])+'</option>'}).join('')+'</select></div>'}
function stateBars(list){
  var cnt={};STATES.forEach(function(s){cnt[s]=0});list.forEach(function(r){var s=stateOf(r);if(s in cnt)cnt[s]++});
  var rows=STATES.map(function(s){return [s,cnt[s]]}).sort(function(a,b){return b[1]-a[1]||STATES.indexOf(a[0])-STATES.indexOf(b[0])}),max=Math.max(1,rows[0][1]);
  return '<div class="bars">'+rows.map(function(x){return '<div class="hb"><span>'+esc(x[0])+'</span><div class="track"><div class="fill" style="width:'+(x[1]/max*100)+'%;background:var(--accent)"></div></div><span class="mono">'+x[1]+'</span></div>'}).join('')+'</div>';
}
function anchorSites(){return S.sites.filter(function(s){return s.anchor}).sort(function(a,b){return STATES.indexOf(a.st)-STATES.indexOf(b.st)})}
function liveRow(w){
  if(w==='err')return '<td colspan="5" class="muted">Not available right now</td>';
  if(!w)return '<td colspan="5" class="muted">Loading…</td>';
  var n=function(v,u,dp){var m=Math.pow(10,dp||0);return v==null?'–':(Math.round(v*m)/m)+u},s=w.sea||{};
  return '<td>'+esc(w.text||'–')+'</td><td class="mono">'+n(w.temp,' °C',1)+'</td><td class="mono">'+n(w.wind,' km/h',0)+(w.windDir!=null?' '+CLWeather.compass(w.windDir):'')+'</td><td class="mono">'+n(s.wave,' m',1)+'</td><td class="mono">'+(s.level==null?'–':(s.level>0?'+':'')+n(s.level,' m',2))+'</td>';
}
function liveCoast(){
  var a=anchorSites();if(!a.length||!window.CLWeather)return '';
  return '<section class="card" id="livecoast"><h2>Coast now</h2><p class="muted" style="font-size:.85rem;margin:4px 0 12px">Live air and sea conditions at one anchor site in each coastal state and union territory.</p><div class="tablebox"><table style="min-width:760px"><thead><tr><th>Anchor site</th><th>Conditions</th><th>Air</th><th>Wind</th><th>Waves</th><th>Sea level vs mean</th></tr></thead><tbody>'+
    a.map(function(s){return '<tr data-lc="'+esc(s.id)+'"><td><b>'+esc(s.n)+'</b><br><span class="muted" style="font-size:.76rem">'+esc(s.st)+'</span></td>'+liveRow(CLWeather.peek(s.lat,s.lng))+'</tr>'}).join('')+
    '</tbody></table></div><p class="wxsrc">Weather data by Open-Meteo or OpenWeather; waves and sea level by Open-Meteo Marine (DWD wave model). Readings refresh every ten minutes.</p></section>';
}
var liveObs=null;
function fillLive(id,w){var tr=document.querySelector('tr[data-lc="'+id+'"]');if(tr&&tr.firstElementChild)tr.innerHTML=tr.firstElementChild.outerHTML+liveRow(w)}
function watchLive(){
  if(liveObs){liveObs.disconnect();liveObs=null}
  var box=$('#livecoast');if(!box||!window.CLWeather)return;
  var todo=anchorSites().filter(function(s){return !CLWeather.peek(s.lat,s.lng)});
  if(!todo.length)return;
  var start=function(){
    var q=todo.slice(),run=function(){var s=q.shift();if(!s)return;CLWeather.get(s.lat,s.lng).then(function(w){fillLive(s.id,w)},function(){fillLive(s.id,'err')}).then(run)};
    for(var i=0;i<4;i++)run();
  };
  if('IntersectionObserver' in window){
    liveObs=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){liveObs.disconnect();liveObs=null;start()}},{rootMargin:'250px'});
    liveObs.observe(box);
  }else start();
}
function dashboard(){
  var l=S.pubs,pressN=l.filter(function(r){return r.kind==='press'}).length,commN=l.length-pressN,rated=S.sites.filter(function(s){return s.sev>0}).length,serious=S.sites.filter(function(s){return s.sev>=3}).length;
  var states={};l.forEach(function(r){var s=stateOf(r);if(s)states[s]=1});
  var shown=l.filter(function(r){return S.mapTypes[r.type]});
  var chips='<div class="chips">'+Object.keys(TYPES).map(function(k){return '<button class="chip" data-act="chip" data-t="'+k+'" aria-pressed="'+(S.mapTypes[k]?'true':'false')+'">'+tdot(k)+TYPES[k].n+'</button>'}).join('')+'<button class="chip" data-act="chipsites" aria-pressed="'+S.showSites+'">Coastal sites</button></div>';
  var latest=l.slice().sort(byDate).slice(0,6);
  return '<section class="intro"><div><div class="eyebrow">India · '+STATES.length+' coastal states and union territories</div><h1 style="margin-top:8px">What the coast is doing, from published reports and the people who live on it</h1><p>Press and magazine reports, and verified reports from coastal communities, on shoreline erosion, flooding and shoreline change across India. Every press report links to its source.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn cta" href="'+PAGES.report+'">Report a change</a><a class="btn" href="'+PAGES.reports+'">Community reports</a><a class="btn" href="'+earthUrl(17.5,80,3200000)+'" target="_blank" rel="noopener noreferrer">View India in Google Earth</a></div></section>'+
  (S.loadErr?'<div class="banner bad" role="alert">'+esc(S.loadErr)+'</div>':'')+
  '<div class="notice">Each press report here comes from a published article and links to it. Severity and shoreline condition are an editorial reading of those articles, not survey measurements, and sites with no source are shown as not rated. Community reports appear once an admin verifies them. The coastline is schematic.</div>'+
  '<section class="kpis"><div class="kpi"><b>'+pressN+'</b><span>Press reports</span></div><div class="kpi"><b>'+commN+'</b><span>Community reports</span></div><div class="kpi"><b>'+rated+' of '+S.sites.length+'</b><span>Coastal sites rated</span></div><div class="kpi"><b>'+serious+'</b><span>Sites at serious or severe erosion</span></div><div class="kpi"><b>'+Object.keys(states).length+' of '+STATES.length+'</b><span>States and union territories with reports</span></div></section>'+
  '<section class="hero"><h2>Coastal change map</h2><p class="muted" style="margin:6px 0 12px">'+shown.length+' reports shown. Larger dots are more severe. Select a dot or a site outline for details, or zoom in to a region.</p>'+chips+zoomRow('m-region',S.region)+'</section>'+
  '<div class="mapwrap"><div><div class="mapbox" id="mapbox">'+mapSvg(shown,{sel:S.sel,siteSel:S.siteSel,sites:S.showSites?S.sites:[],box:boxFor(S.region)})+'</div>'+legend()+'</div><aside class="card" id="side">'+side()+'</aside></div>'+
  liveCoast()+
  '<section class="grid2"><div class="card"><h2>Reports per year</h2><p class="muted" style="font-size:.85rem">By date published or observed.</p>'+trendSvg(l)+'</div><div class="card"><h2>What is being reported</h2>'+typeBars(l)+'<h3 style="margin-top:22px">Report severity</h3>'+sevDist(l)+'</div></section>'+
  '<section class="card"><h2>Reports by state and union territory</h2><p class="muted" style="font-size:.85rem;margin-top:4px">Published and verified reports in each coastal state or union territory.</p>'+stateBars(l)+'</section>'+
  gallery()+'<section class="card"><h2>Coastal sites</h2><p class="muted" style="font-size:.85rem;margin-top:4px">Monitored locations, most severe first. Condition and severity follow the most recent report for the site; not assessed means no source yet.</p>'+sitesTable()+'</section>'+
  '<section class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h2>Latest reports</h2><a class="btn sm" href="'+PAGES.reports+'">See all</a></div>'+rowsHtml(latest,false)+'</section>';
}
function wxBlock(lat,lng,title){return '<h3 class="wxt">'+esc(title)+'</h3><div class="wx" data-lat="'+Number(lat)+'" data-lng="'+Number(lng)+'"></div>'}
function side(){
  var r=S.sel&&findReport(S.sel),s=S.siteSel&&siteById(S.siteSel);
  if(r)return '<div class="mh" style="display:flex;justify-content:space-between;gap:10px"><div style="min-width:0"><div class="eyebrow">'+esc(r.id)+(r.kind==='press'?' · Press report':'')+'</div><h3 style="margin-top:6px">'+esc(r.place)+'</h3></div></div>'+facts(r)+'<p style="font-size:.92rem">'+esc(r.desc.length>180?r.desc.slice(0,180)+'…':r.desc)+'</p><div class="acts" style="margin-top:14px"><button class="btn sm pri" data-open="'+esc(r.id)+'">Full report</button>'+earthLink(r.lat,r.lng)+'</div>'+wxBlock(r.lat,r.lng,'Weather at this report');
  if(s){
    var rs=S.pubs.filter(function(x){return x.siteId===s.id}).sort(byDate);
    return '<div class="eyebrow">Coastal site</div><h3 style="margin-top:6px">'+esc(s.n)+'</h3><dl class="kv"><dt>State</dt><dd>'+esc(s.st||'')+'</dd><dt>Condition</dt><dd>'+esc(s.cond)+'</dd><dt>Erosion severity</dt><dd>'+sevMeter(s.sev)+' '+SEV[s.sev]+'</dd><dt>Position</dt><dd class="mono">'+Number(s.lat).toFixed(3)+'°N, '+Number(s.lng).toFixed(3)+'°E</dd><dt>Reports</dt><dd class="mono">'+rs.length+'</dd></dl><p style="font-size:.92rem">'+esc(s.note)+'</p><div class="acts" style="margin-top:12px"><button class="btn sm pri" data-act="reportat" data-id="'+esc(s.id)+'">Report here</button>'+earthLink(s.lat,s.lng)+'</div>'+photoBlock(s)+refsBlock(s)+wxBlock(s.lat,s.lng,'Weather at '+s.n)+(rs.length?'<h3 style="margin-top:16px;font-size:.92rem">Reports at this site</h3>'+rowsHtml(rs,false):'');
  }
  var top=S.sites.slice().sort(function(a,b){return b.sev-a.sev})[0];
  return '<h3>Nothing selected</h3><p class="muted" style="margin-top:6px;font-size:.9rem">Pick a report dot to see what was reported. Pick a site outline to see its shoreline condition and erosion severity. Use Zoom to look closer at one part of the coast.</p>'+(top?wxBlock(top.lat,top.lng,'Weather at '+top.n):'');
}
function facts(r){
  var T=TYPES[r.type],st=r.siteId&&siteById(r.siteId),sn=stateOf(r);
  return '<dl class="kv"><dt>Type</dt><dd>'+tdot(r.type)+T.n+'</dd><dt>Severity</dt><dd>'+sevMeter(r.severity)+' '+SEV[r.severity]+'</dd>'+(r.kind==='press'?'<dt>Published</dt><dd>'+fmtDate(r.date)+'</dd>'+(r.when?'<dt>Event</dt><dd>'+esc(r.when)+'</dd>':''):'<dt>Observed</dt><dd>'+fmtDate(r.date)+'</dd>')+
  (r.measure!=null&&r.measure!==''?'<dt>'+T.m+'</dt><dd class="mono">'+esc(r.measure)+' '+T.u+'</dd>':'')+(r.cond?'<dt>Shoreline condition</dt><dd>'+esc(r.cond)+'</dd>':'')+(st?'<dt>Coastal site</dt><dd>'+esc(st.n)+'</dd>':'')+(sn?'<dt>State</dt><dd>'+esc(sn)+'</dd>':'')+
  '<dt>Position</dt><dd class="mono">'+Number(r.lat).toFixed(3)+'°N, '+Number(r.lng).toFixed(3)+'°E</dd>'+(r.source?'<dt>Source</dt><dd>'+srcLink(r)+'</dd>':'<dt>Reported by</dt><dd>'+esc(r.authorName)+'</dd>')+'</dl>';
}
function sitesTable(){
  if(!S.sites.length)return '<p class="muted" style="margin-top:10px">No coastal sites yet. An admin can add them in the admin panel.</p>';
  var all=S.sites.slice().sort(function(a,b){return b.sev-a.sev||STATES.indexOf(a.st)-STATES.indexOf(b.st)||(a.n<b.n?-1:1)}),part=S.sitesAll?all:all.slice(0,10);
  var rows=part.map(function(s){
    var n=S.pubs.filter(function(r){return r.siteId===s.id}).length;
    return '<tr><td><b>'+esc(s.n)+'</b></td><td>'+esc(s.st||'')+'</td><td class="mono">'+Number(s.lat).toFixed(3)+'°N '+Number(s.lng).toFixed(3)+'°E</td><td>'+esc(s.cond)+'</td><td>'+sevMeter(s.sev)+' '+SEV[s.sev]+'</td><td class="mono">'+n+'</td></tr>';
  }).join('');
  return '<div class="tablebox" style="margin-top:12px"><table style="min-width:760px"><thead><tr><th>Location</th><th>State or UT</th><th>Position</th><th>Shoreline condition</th><th>Erosion severity</th><th>Reports</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (all.length>10?'<div style="margin-top:12px"><button class="btn" data-act="sitesall">'+(S.sitesAll?'Show fewer sites':'Show all '+all.length+' sites')+'</button></div>':'');
}

/* ---------- page 4: community reports ---------- */
function filtered(){
  var f=S.f,q=f.q.trim().toLowerCase();
  var l=S.pubs.filter(function(r){return (f.type==='all'||r.type===f.type)&&(f.sev==='all'||String(r.severity)===f.sev)&&(f.state==='all'||stateOf(r)===f.state)&&(f.site==='all'||r.siteId===f.site)&&(f.src==='all'||(f.src==='press')===(r.kind==='press'))&&(!q||(r.place+' '+r.desc+' '+r.authorName+' '+stateOf(r)+' '+(r.source?r.source.title:'')).toLowerCase().indexOf(q)>-1)});
  return l.sort(f.sort==='sev'?function(a,b){return b.severity-a.severity||byDate(a,b)}:byDate);
}
function listBlock(){
  var l=filtered(),part=l.slice(0,S.f.n);
  return '<p class="muted" style="font-size:.86rem;margin-bottom:6px">'+l.length+' report'+(l.length===1?'':'s')+' match.</p>'+rowsHtml(part,false)+(l.length>part.length?'<div style="margin-top:12px"><button class="btn" data-act="more">Show more</button></div>':'');
}
function siteOptions(sel,state){
  var by={};S.sites.forEach(function(s){if(state&&state!=='all'&&s.st!==state)return;(by[s.st]=by[s.st]||[]).push(s)});
  return STATES.filter(function(s){return by[s]}).map(function(s){return '<optgroup label="'+esc(s)+'">'+by[s].sort(function(a,b){return a.n<b.n?-1:1}).map(function(x){return '<option value="'+esc(x.id)+'"'+(sel===x.id?' selected':'')+'>'+esc(x.n)+'</option>'}).join('')+'</optgroup>'}).join('');
}
function stateOptions(sel,all){return (all?'<option value="all">All states and union territories</option>':'<option value="">Select</option>')+STATES.map(function(s){return '<option value="'+esc(s)+'"'+(sel===s?' selected':'')+'>'+esc(s)+'</option>'}).join('')}
function reportsView(){
  var so='<option value="all">All sites</option>'+siteOptions(S.f.site,S.f.state);
  var sv='<option value="all">Any severity</option>'+[1,2,3,4].map(function(i){return '<option value="'+i+'"'+(S.f.sev===String(i)?' selected':'')+'>'+SEV[i]+'</option>'}).join('');
  return '<section class="hero"><h1>Community reports</h1><p class="muted" style="margin-top:8px;max-width:60ch">Published press and magazine reports, and verified reports from coastal communities, across India. Open one to see its source or evidence and where it sits on the coast.</p></section>'+
  '<section class="card"><div class="filters"><select id="f-type" aria-label="Filter by type">'+typeOptions(S.f.type,true)+'</select><select id="f-sev" aria-label="Filter by severity">'+sv+'</select><select id="f-state" aria-label="Filter by state or union territory">'+stateOptions(S.f.state,true)+'</select><select id="f-site" aria-label="Filter by site">'+so+'</select><select id="f-src" aria-label="Filter by source"><option value="all"'+(S.f.src==='all'?' selected':'')+'>All sources</option><option value="press"'+(S.f.src==='press'?' selected':'')+'>Press reports</option><option value="community"'+(S.f.src==='community'?' selected':'')+'>Community reports</option></select><select id="f-sort" aria-label="Sort"><option value="new"'+(S.f.sort==='new'?' selected':'')+'>Newest first</option><option value="sev"'+(S.f.sort==='sev'?' selected':'')+'>Most severe first</option></select><input id="f-q" type="search" placeholder="Search place, state, description, source or reporter" value="'+esc(S.f.q)+'" aria-label="Search reports"></div><div id="reclist">'+listBlock()+'</div></section>';
}

/* ---------- page 5: report details ---------- */
function backLink(){return '<a class="back" href="'+PAGES[S.back]+'">← Back</a>'}
function detailView(){
  var r=findReport(S.detailId);
  if(!r)return backLink()+'<div class="card"><h2>Report not found</h2><p class="muted" style="margin-top:8px">It may have been withdrawn, or you may not have access to it.</p></div>';
  var st=statusOf(r),site=r.siteId&&siteById(r.siteId),rv=revsAll()[r.id],mine=r.authorId===S.uid;
  var others=S.pubs.filter(function(x){return x.siteId&&x.siteId===r.siteId&&x.id!==r.id}).sort(byDate).slice(0,4);
  var review='';
  if(S.admin){
    review='<div class="card" style="margin-top:16px;background:var(--field)"><h3>Review</h3>'+
    (r.kind==='press'?'<p class="muted" style="font-size:.88rem;margin:6px 0 0">This press report is part of the starter data. Use Delete in the admin panel to remove it.</p>':st==='verified'?'<p class="muted" style="font-size:.88rem;margin:6px 0 10px">This report is public.</p><div class="acts"><button class="btn sm" data-act="unpublish" data-id="'+esc(r.id)+'">Unpublish</button></div>':
    '<div class="fld" style="margin-top:10px"><label for="rv-note">Note to the reporter</label><textarea id="rv-note" rows="2" maxlength="300" placeholder="Required when rejecting. Optional when verifying."></textarea><span class="fe" id="e-rv-note" role="alert"></span></div><div class="acts"><button class="btn sm pri" data-act="verify" data-id="'+esc(r.id)+'">Verify and publish</button><button class="btn sm danger" data-act="reject" data-id="'+esc(r.id)+'">Reject</button></div>')+'</div>';
  }
  var own=mine&&st!=='verified'?'<div class="acts" style="margin-top:14px">'+(S.confirm==='w:'+r.id?'<button class="btn sm danger" data-act="withdrawok" data-id="'+esc(r.id)+'">Confirm withdraw</button><button class="btn sm" data-act="delno">Cancel</button>':'<button class="btn sm danger" data-act="withdraw" data-id="'+esc(r.id)+'">Withdraw this report</button>')+'</div>':'';
  return backLink()+
  '<div class="hero" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start"><div style="min-width:0"><div class="eyebrow">'+esc(r.id)+(r.kind==='press'?' · Press report':'')+'</div><h1 style="margin-top:8px">'+esc(r.place)+'</h1><p class="muted" style="margin-top:6px">'+TYPES[r.type].n+' · '+(r.kind==='press'?'Published ':'')+fmtDate(r.date)+'</p></div>'+(r.kind==='press'?'<span class="pill verified">Press report</span>':pill(st))+'</div>'+
  (rv&&rv.note&&(S.admin||mine)?'<div class="banner'+(st==='rejected'?' bad':'')+'">Team note: '+esc(rv.note)+'</div>':'')+
  '<div class="grid2"><div class="card"><h2>What was reported</h2>'+facts(r)+'<p style="font-size:.95rem">'+esc(r.desc)+'</p>'+(r.source?srcBlock(r):'<h3 style="margin-top:18px">Evidence</h3>'+evHtml(r.evidence,false))+own+review+'</div>'+
  '<div class="card"><h2>Where it is</h2><div class="mapbox" style="margin-top:12px">'+mapSvg([r],{id:'dmap',sel:r.id,sites:site?[site]:[],focus:{lat:r.lat,lng:r.lng,span:3}})+'</div><div class="acts" style="margin-top:12px">'+earthLink(r.lat,r.lng)+'</div>'+wxBlock(r.lat,r.lng,'Weather here now')+
  (site?'<h3 style="margin-top:18px">'+esc(site.n)+'</h3><dl class="kv"><dt>Condition</dt><dd>'+esc(site.cond)+'</dd><dt>Erosion severity</dt><dd>'+sevMeter(site.sev)+' '+SEV[site.sev]+'</dd></dl><p style="font-size:.9rem">'+esc(site.note)+'</p>'+photoBlock(site)+refsBlock(site):'')+
  (others.length?'<h3 style="margin-top:18px;font-size:.92rem">Other reports at this site</h3>'+rowsHtml(others,false):'')+'</div></div>';
}

/* ---------- page 3: report submission ---------- */
function reportView(){
  if(!S.member)return gate('You need a member profile to submit a report.');
  var f=S.form,today=localDate(0);
  if(!f.date)f.date=today;
  var sevs=[1,2,3,4].map(function(i){return '<input type="radio" name="sev" id="sev'+i+'" value="'+i+'"'+(f.sev===i?' checked':'')+'><label for="sev'+i+'">'+SEV[i]+'</label>'}).join('');
  var sopts='<option value="">Select a location</option>'+siteOptions(f.siteId)+'<option value="other"'+(f.siteId==='other'?' selected':'')+'>Somewhere else (pin it on the map)</option>';
  var conds='<option value="">Not sure</option>'+CONDS.map(function(c){return '<option'+(f.cond===c?' selected':'')+'>'+c+'</option>'}).join('');
  var T=TYPES[f.type];
  return '<section class="hero"><h1>Report a coastal change</h1><p class="muted" style="margin-top:8px;max-width:60ch">Choose the coastal location, describe what you saw and attach evidence. A team member reviews each report before it appears publicly.</p></section>'+
  '<form id="rform" class="form" novalidate><div class="card">'+
  fld('1. Coastal location','r-site','<select id="r-site">'+sopts+'</select>','Pick a monitored site, or choose somewhere else and pin it on the map.')+
  '<div id="placewrap"'+(f.siteId==='other'?'':' hidden')+'>'+fld('Place name','r-place','<input id="r-place" maxlength="80" placeholder="Village, beach or landmark" autocomplete="off" value="'+esc(f.place)+'">')+fld('State or union territory','r-state','<select id="r-state">'+stateOptions(f.state)+'</select>')+'</div>'+
  '<div class="two">'+fld('Latitude (°N)','r-lat','<input id="r-lat" type="number" step="any" inputmode="decimal" value="'+esc(f.lat)+'">')+fld('Longitude (°E)','r-lng','<input id="r-lng" type="number" step="any" inputmode="decimal" value="'+esc(f.lng)+'">')+'</div><span class="fe" id="e-pos" role="alert"></span>'+
  fld('2. What happened','r-type','<select id="r-type">'+typeOptions(f.type)+'</select>')+
  '<div class="fld"><span class="lb">How serious is it</span><div class="seg" role="radiogroup" aria-label="Severity">'+sevs+'</div><span class="fe" id="e-sev" role="alert"></span></div>'+
  '<div class="two">'+fld('Date observed','r-date','<input id="r-date" type="date" max="'+today+'" min="'+localDate(1826)+'" value="'+esc(f.date)+'">')+fld('<span id="r-meas-l">'+T.m+' ('+T.u+')</span>','r-meas','<input id="r-meas" type="number" min="0" step="any" inputmode="decimal" placeholder="Optional" value="'+esc(f.measure)+'">')+'</div>'+
  fld('Shoreline condition you saw','r-cond','<select id="r-cond">'+conds+'</select>')+
  fld('3. What did you see','r-desc','<textarea id="r-desc" rows="4" maxlength="1000" placeholder="For example: sea wall cracked near the tea stall, water reached the road at high tide.">'+esc(f.desc)+'</textarea>')+
  '<div class="fld"><span class="lb">4. Evidence: photos or a short video (1 to 3 files)</span><div class="drop"><input id="r-files" type="file" accept="image/*,video/*" multiple aria-label="Add photos or video"><div class="hint" style="margin-top:6px">Photos are shrunk before saving. Videos up to 60 MB; a still frame is kept.</div></div><div id="phlist">'+evHtml(f.ev,true)+'</div><span class="fe" id="e-r-files" role="alert"></span></div>'+
  '<div class="fld"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:400"><input id="r-ok" type="checkbox" style="width:auto;margin-top:4px"'+(f.ok?' checked':'')+'><span>I recorded this evidence or have permission to share it, and I am happy for this report to appear publicly once verified.</span></label><span class="fe" id="e-r-ok" role="alert"></span></div>'+
  '<div class="err" id="e-form" role="alert"></div><button class="btn cta" type="submit">Submit for review</button></div>'+
  '<div class="card"><h2>Pin the location</h2><p class="muted" style="font-size:.86rem;margin:4px 0 12px">Zoom to your part of the coast, then click or tap the map to set the position, or click a diamond to use that coastal site.</p>'+zoomRow('p-region',S.pickRegion)+'<div class="mapbox" id="pickbox" style="cursor:crosshair">'+pickMap()+'</div><div class="acts" id="earthpick" style="margin-top:12px">'+earthPick()+'</div></div></form>';
}
function earthPick(){var f=S.form,la=parseFloat(f.lat),ln=parseFloat(f.lng);return !isNaN(la)&&!isNaN(ln)?earthLink(la,ln)+'<span class="hint">Check the spot on satellite imagery.</span>':'<span class="hint">Set a position to check it in Google Earth.</span>'}
function pickMap(){return mapSvg([],{id:'pickmap',pick:S.form,sites:S.sites,box:boxFor(S.pickRegion)})}
function refreshPick(){
  var b=$('#pickbox');if(b)b.innerHTML=pickMap();
  var ep=$('#earthpick');if(ep)ep.innerHTML=earthPick();
  var a=$('#r-lat'),o=$('#r-lng');if(a)a.value=S.form.lat;if(o)o.value=S.form.lng;
}
function shrink(file,dim,q){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,dim/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function videoPoster(file){return new Promise(function(res,rej){
  var u=URL.createObjectURL(file),v=document.createElement('video'),done=false;
  var end=function(ok,val){if(done)return;done=true;URL.revokeObjectURL(u);ok?res(val):rej()};
  v.muted=true;v.preload='metadata';v.playsInline=true;
  v.onloadeddata=function(){try{v.currentTime=Math.min(.5,(v.duration||1)/2)}catch(e){end(false)}};
  v.onseeked=function(){try{var w=v.videoWidth||560,h=v.videoHeight||315,k=Math.min(1,420/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(v,0,0,c.width,c.height);end(true,c.toDataURL('image/jpeg',.5))}catch(e){end(false)}};
  v.onerror=function(){end(false)};setTimeout(function(){end(false)},5000);v.src=u;
})}
function evSize(){return S.form.ev.reduce(function(a,x){return a+(x.src?x.src.length:0)},0)}
async function addFiles(files){
  var m=$('#e-r-files');m.textContent='';
  for(var i=0;i<files.length;i++){
    var f=files[i],isV=f.type.indexOf('video/')===0,isI=f.type.indexOf('image/')===0;
    if(S.form.ev.length>=3){m.textContent='You can add up to 3 files.';break}
    if(!isV&&!isI){m.textContent=f.name+' is not a photo or video.';continue}
    if(isI&&f.size>10*1048576){m.textContent=f.name+' is larger than 10 MB.';continue}
    if(isV&&f.size>60*1048576){m.textContent=f.name+' is larger than 60 MB.';continue}
    try{
      var src=isI?await shrink(f,560,.6):await videoPoster(f).catch(function(){return ''});
      if(isI&&evSize()+src.length>EV_LIMIT)src=await shrink(f,380,.5);
      if(evSize()+src.length>EV_LIMIT){m.textContent=f.name+' would make the report too large to save. Remove a file first.';continue}
      S.form.ev.push({kind:isI?'image':'video',src:src,name:f.name.slice(0,80),size:f.size});
    }catch(x){m.textContent=f.name+' could not be read.'}
  }
  $('#phlist').innerHTML=evHtml(S.form.ev,true);
}
function readForm(){
  var f=S.form,g=function(id){var e=$('#'+id);return e?e.value:''};
  f.siteId=g('r-site');f.place=g('r-place');f.state=g('r-state');f.lat=g('r-lat');f.lng=g('r-lng');f.type=g('r-type')||f.type;
  var sv=document.querySelector('input[name="sev"]:checked');f.sev=sv?+sv.value:f.sev;
  f.date=g('r-date');f.measure=g('r-meas');f.cond=g('r-cond');f.desc=g('r-desc');f.ok=!!($('#r-ok')&&$('#r-ok').checked);
}
async function submitReport(){
  readForm();
  var f=S.form,site=f.siteId&&f.siteId!=='other'?siteById(f.siteId):null;
  var existing=S.mine.concat(S.pubs);
  var errs=validateReport(f,{today:localDate(0),minDate:localDate(1826),site:site,evCount:f.ev.length,existing:existing,uid:S.uid,pending:S.mine.filter(function(r){return statusOf(r)==='pending'}).length});
  var ok=showErrs(errs,{site:'r-site',place:'r-place',state:'r-state',date:'r-date',measure:'r-meas',desc:'r-desc',ok:'r-ok',ev:'r-files'});
  var posEl=$('#e-pos');if(posEl)posEl.textContent=errs.pos||'';
  var fe=$('#e-form');if(fe)fe.textContent=errs.form||'';
  var sevEl=$('#e-sev');if(sevEl)sevEl.textContent=errs.sev||'';
  var fileEl=$('#e-r-files');if(fileEl)fileEl.textContent=errs.ev||'';
  if(!ok||errs.pos||errs.form||errs.sev||errs.ev)return;
  var id=newId();
  var rep={type:f.type,place:site?site.n:f.place.trim(),siteId:f.siteId==='other'?'':f.siteId,state:site?site.st:f.state,lat:+parseFloat(f.lat).toFixed(4),lng:+parseFloat(f.lng).toFixed(4),date:f.date,severity:f.sev,cond:f.cond,measure:f.measure===''?null:Number(f.measure),desc:f.desc.trim(),evidence:f.ev.map(function(x){return {kind:x.kind,name:x.name,size:x.size,src:x.src}}),authorId:S.uid,authorName:S.member.name,created:new Date().toISOString()};
  var done=await guard(function(){return S.db.doc('submissions/'+S.uid+'/items/'+id).set(rep)},'Report '+id+' sent for review');
  if(done){drop('cl.draft');location.href=PAGES.detail+'?id='+encodeURIComponent(id)+'&from=profile'}
}

/* ---------- page 1: sign in and register ---------- */
function gate(msg){
  return '<div class="card authcard"><h2>Profile not found</h2><p class="muted" style="margin-top:8px">'+esc(msg||'Your member profile could not be found in this browser.')+' Sign out, then create your account again.</p><div class="acts" style="margin-top:14px"><button class="btn pri" data-act="logout">Sign out</button></div></div>';
}
function validateAccount(v){
  var e=validateProfile(v);delete e.email;
  if(!v.email)e.email='Enter your email address. You sign in with it.';
  else if(!validEmail(v.email))e.email='Enter a valid email address.';
  var p=v.pass||'';
  if(p.length<8)e.pass='Use at least 8 characters.';
  else if(p.length>72)e.pass='Use 72 characters or fewer.';
  else if(!/[A-Za-z]/.test(p)||!/\d/.test(p))e.pass='Use at least one letter and one number.';
  else if(/password/i.test(p)||p.toLowerCase()===String(v.email||'').toLowerCase())e.pass='Choose a password that is harder to guess.';
  if(!e.pass&&v.pass2!==p)e.pass2='The two passwords do not match.';
  return e;
}
function validateNewPassword(cur,p,p2){
  var e={};
  if(!cur)e.cur='Enter your current password.';
  if(p.length<8)e.pw='Use at least 8 characters.';
  else if(p.length>72)e.pw='Use 72 characters or fewer.';
  else if(!/[A-Za-z]/.test(p)||!/\d/.test(p))e.pw='Use at least one letter and one number.';
  else if(/password/i.test(p))e.pw='Choose a password that is harder to guess.';
  else if(p===cur)e.pw='Choose a password different from your current one.';
  if(!e.pw&&p2!==p)e.pw2='The two passwords do not match.';
  return e;
}
function authMsg(x){
  var c=x&&x.code;
  if(c==='bad_login'||c==='locked'||c==='insecure_context'||c==='email_taken')return x.message;
  if(c==='quota_exceeded')return dbMsg(x);
  return 'Something went wrong. Try again.';
}
function pwField(label,id,ac,hint){return fld(label,id,'<input id="'+id+'" type="password" data-pw="1" autocomplete="'+ac+'" maxlength="72">',hint)}
function authView(){
  var cfg=window.CL_CONFIG||{},tab=S.authTab,store=window.CLStore;
  var tabs='<div class="authtabs" role="tablist" aria-label="Sign in or create an account"><button role="tab" id="tab-in" aria-selected="'+(tab==='in')+'" data-act="authtab" data-k="in">Sign in</button><button role="tab" id="tab-up" aria-selected="'+(tab==='up')+'" data-act="authtab" data-k="up">Create account</button></div>';
  var show='<label class="inl"><input type="checkbox" data-act="showpw"> Show password</label>';
  var body;
  if(tab==='in'){
    body='<form id="lform" novalidate>'+fld('Email','l-email','<input id="l-email" type="email" maxlength="120" autocomplete="email">')+pwField('Password','l-pass','current-password')+show+
    '<div class="err" id="e-lform" role="alert" style="margin:8px 0"></div><button class="btn pri" type="submit" style="width:100%">Sign in</button></form>'+
    '<p class="muted" style="margin-top:12px;font-size:.88rem">New here? <button class="linkbtn" data-act="authtab" data-k="up">Create an account</button></p>';
  }else{
    body='<form id="aform" novalidate><p class="muted" style="font-size:.88rem;margin-bottom:12px">Your public name appears on reports you submit. Your email, phone and location are visible only to you and the programme admins.</p>'+
    fld('Public name','a-name','<input id="a-name" maxlength="60" autocomplete="name">')+
    fld('Email (you sign in with this)','a-email','<input id="a-email" type="email" maxlength="120" autocomplete="email">')+
    fld('Phone (optional)','a-phone','<input id="a-phone" type="tel" maxlength="20" autocomplete="tel" placeholder="+91 …">')+
    fld('Where you live','a-loc','<input id="a-loc" maxlength="80" placeholder="Village or town, district, state" autocomplete="address-level2">')+
    pwField('Password','a-pass','new-password','At least 8 characters with a letter and a number.')+pwField('Repeat password','a-pass2','new-password')+show+
    '<div class="fld" style="margin-top:10px"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:400"><input id="a-ok" type="checkbox" style="width:auto;margin-top:4px"><span>I agree that the programme team can contact me about my reports.</span></label><span class="fe" id="e-a-ok" role="alert"></span></div>'+
    '<div class="err" id="e-aform" role="alert" style="margin-bottom:8px"></div><button class="btn pri" type="submit" style="width:100%">Create account</button></form>'+
    '<p class="muted" style="margin-top:12px;font-size:.88rem">Already registered? <button class="linkbtn" data-act="authtab" data-k="in">Sign in</button></p>';
  }
  var demo=cfg.showDemoAccounts?'<details class="demo"><summary>Demo account for reviewers</summary><p class="muted" style="margin:8px 0">A starter member account in this browser. Use it to try submitting a report.</p><div class="acts"><button class="btn sm" type="button" data-act="demofill">Fill member login</button></div><dl class="kv" style="margin:10px 0 0"><dt>Member</dt><dd class="mono">member@coastlines.example<br>Coastlines-Member-26</dd></dl></details>':'';
  var warn=store&&!store.available?'<div class="banner bad" role="alert" style="margin-bottom:12px">This browser is blocking site storage, so Coastlines cannot keep accounts or reports. Allow storage for this site, or leave private browsing, then reload.</div>':'';
  return '<section class="hero authintro"><div class="eyebrow">Gujarat to West Bengal · Lakshadweep · Andaman and Nicobar</div><h1 style="margin-top:8px">Report what is happening to your coast</h1><p style="margin-top:8px;max-width:58ch">Coastlines lets coastal communities report shoreline erosion, flooding and sea level changes, with photos, and brings published press and magazine reports together with them on a map of the whole Indian coast.</p></section>'+
  '<div class="card authcard">'+warn+'<h2>'+(tab==='in'?'Sign in':'Create your account')+'</h2>'+tabs+body+demo+'</div>';
}
function nextUrl(){return safeNext(new URLSearchParams(location.search).get('next'))}
async function doLogin(){
  var email=$('#l-email').value.trim(),pass=$('#l-pass').value,e={};
  if(!email||!validEmail(email))e.email='Enter the email you registered with.';
  if(!pass)e.pass='Enter your password.';
  $('#e-lform').textContent='';
  if(!showErrs(e,{email:'l-email',pass:'l-pass'}))return;
  if(S.busy)return;S.busy=true;
  var btn=$('#lform button[type="submit"]');btn.disabled=true;btn.textContent='Signing in…';
  try{await CLStore.login(email,pass);location.href=nextUrl()}
  catch(x){
    S.busy=false;btn.disabled=false;btn.textContent='Sign in';
    $('#e-lform').textContent=authMsg(x);$('#l-pass').value='';$('#l-pass').focus();
  }
}
async function doRegister(){
  var v={name:$('#a-name').value.trim(),email:$('#a-email').value.trim(),phone:$('#a-phone').value.trim(),loc:$('#a-loc').value.trim(),pass:$('#a-pass').value,pass2:$('#a-pass2').value,ok:$('#a-ok').checked};
  $('#e-aform').textContent='';
  if(!showErrs(validateAccount(v),{name:'a-name',email:'a-email',phone:'a-phone',loc:'a-loc',pass:'a-pass',pass2:'a-pass2',ok:'a-ok'}))return;
  if(S.busy)return;S.busy=true;
  var btn=$('#aform button[type="submit"]');btn.disabled=true;btn.textContent='Creating account…';
  try{await CLStore.register({name:v.name,email:v.email,phone:v.phone,location:v.loc,password:v.pass});location.href=nextUrl()}
  catch(x){
    S.busy=false;btn.disabled=false;btn.textContent='Create account';
    if(x&&x.code==='email_taken')showErrs({email:x.message},{email:'a-email'});else $('#e-aform').textContent=authMsg(x);
  }
}
async function changePw(){
  var cur=$('#pw-cur').value,p=$('#pw-new').value,p2=$('#pw-new2').value;
  if(!showErrs(validateNewPassword(cur,p,p2),{cur:'pw-cur',pw:'pw-new',pw2:'pw-new2'}))return;
  if(S.busy)return;S.busy=true;
  try{await CLStore.changePassword(cur,p);$('#pwform').reset();toast('Password changed')}
  catch(x){if(x&&x.code==='bad_login')showErrs({cur:x.message},{cur:'pw-cur'});else toast(authMsg(x))}
  finally{S.busy=false}
}

/* ---------- page 6: user profile ---------- */
function profileView(){
  if(!S.member)return gate();
  var u=S.member,mine=S.mine.slice().sort(byDate),c={verified:0,pending:0,rejected:0};
  mine.forEach(function(r){c[statusOf(r)]++});
  return '<section class="hero"><h1>My profile</h1><p class="muted" style="margin-top:8px">Your details and every report you have submitted.</p></section>'+
  '<div class="grid2"><form id="pform" class="card" novalidate><h2>Your details</h2><div style="margin-top:14px">'+fld('Public name','p-name','<input id="p-name" maxlength="60" value="'+esc(u.name)+'">','Shown on reports you submit from now on.')+fld('Sign-in email','p-email','<input id="p-email" type="email" maxlength="120" readonly value="'+esc(u.email||'')+'">','This is the email you sign in with, so it cannot be changed here.')+fld('Phone','p-phone','<input id="p-phone" type="tel" maxlength="20" value="'+esc(u.phone||'')+'">')+fld('Where you live','p-loc','<input id="p-loc" maxlength="80" value="'+esc(u.location||'')+'">')+
  '<p class="hint" style="margin-bottom:12px">Your email, phone and location are visible only to you and programme admins.</p><button class="btn pri" type="submit">Save details</button></div></form>'+
  '<section class="card"><h2>Submitted reports</h2><div class="tiles" style="margin:12px 0"><div><b>'+mine.length+'</b><span>Submitted</span></div><div><b>'+c.verified+'</b><span>Verified</span></div><div><b>'+c.pending+'</b><span>Waiting</span></div><div><b>'+c.rejected+'</b><span>Rejected</span></div></div><div id="mylist">'+myList()+'</div></section></div>'+
  '<form id="pwform" class="card" novalidate style="max-width:520px"><h2>Change password</h2><div style="margin-top:14px">'+pwField('Current password','pw-cur','current-password')+pwField('New password','pw-new','new-password','At least 8 characters with a letter and a number.')+pwField('Repeat new password','pw-new2','new-password')+'<label class="inl"><input type="checkbox" data-act="showpw"> Show passwords</label><div style="margin-top:12px"><button class="btn pri" type="submit">Change password</button></div></div></form>';
}
function myList(){var m=S.mine.slice().sort(byDate);return m.length?rowsHtml(m,true):'<p class="muted">You have not submitted a report yet.</p><button class="btn pri" style="margin-top:12px" data-nav="report">Report a change</button>'}
async function saveProfile(){
  var v={name:$('#p-name').value.trim(),email:S.member.email||'',phone:$('#p-phone').value.trim(),loc:$('#p-loc').value.trim(),ok:true};
  if(!showErrs(validateProfile(v),{name:'p-name',email:'p-email',phone:'p-phone',loc:'p-loc'}))return;
  var ok=await guard(function(){return S.db.doc('members/'+S.uid).update({name:v.name,email:v.email,phone:v.phone,location:v.loc})},'Details saved');
  if(ok){S.member=Object.assign({},S.member,{name:v.name,email:v.email,phone:v.phone,location:v.loc})}
}

/* ---------- page 7: admin panel ---------- */
function csv(kind){
  var q=function(s){return '"'+String(s==null?'':s).replace(/"/g,'""')+'"'},h,rows;
  if(kind==='kml')return kml(adminAll());
  if(kind==='sites'){h=['id','location','state','lat','lng','shoreline_condition','erosion_severity','note'];rows=S.sites.map(function(s){return [s.id,s.n,s.st,s.lat,s.lng,s.cond,SEV[s.sev],s.note]})}
  else if(kind==='members'){h=['id','name','email','phone','location','joined'];rows=S.members.map(function(u){return [u.id,u.name,u.email,u.phone,u.location,u.joined]})}
  else{h=['report_id','status','date','type','severity','place','state','site_id','lat','lng','shoreline_condition','measure','unit','evidence_files','reporter','description','source_title','source_url'];rows=adminAll().map(function(r){return [r.id,statusOf(r),r.date,TYPES[r.type].n,SEV[r.severity],r.place,stateOf(r),r.siteId,r.lat,r.lng,r.cond,r.measure,TYPES[r.type].u,(r.evidence||[]).map(function(x){return x.name}).join('; '),r.authorName,r.desc,r.source?r.source.title:'',r.source?r.source.url:'']})}
  return [h.join(',')].concat(rows.map(function(r){return r.map(q).join(',')})).join('\n');
}
function adminAll(){var m={};S.inbox.concat(S.pubs).forEach(function(r){m[r.id]=r});return Object.keys(m).map(function(k){return m[k]}).sort(byDate)}
function adminView(){
  if(!S.admin)return '<div class="card authcard"><h2>Admin only</h2><p class="muted" style="margin-top:8px">This panel is for the admins of this site.</p></div>';
  var all=adminAll(),queue=all.filter(function(r){return statusOf(r)==='pending'});
  var qrows=queue.map(function(r){return '<tr><td class="mono">'+esc(r.id)+'</td><td>'+fmtDate(r.date)+'</td><td>'+tdot(r.type)+TYPES[r.type].n+'</td><td>'+esc(r.place)+'</td><td>'+sevMeter(r.severity)+'</td><td class="mono">'+(r.evidence||[]).length+'</td><td>'+esc(r.authorName)+'</td><td><div class="acts"><button class="btn sm" data-open="'+esc(r.id)+'">Review</button><button class="btn sm pri" data-act="verify" data-id="'+esc(r.id)+'">Verify</button></div></td></tr>'}).join('');
  var prows=S.pubs.slice().sort(byDate).map(function(r){
    var del=S.confirm==='d:'+r.id?'<button class="btn sm danger" data-act="delok" data-id="'+esc(r.id)+'">Confirm delete</button><button class="btn sm" data-act="delno">Cancel</button>':'<button class="btn sm" data-open="'+esc(r.id)+'">Open</button><button class="btn sm danger" data-act="del" data-id="'+esc(r.id)+'">Delete</button>';
    return '<tr><td class="mono">'+esc(r.id)+'</td><td>'+fmtDate(r.date)+'</td><td>'+tdot(r.type)+TYPES[r.type].n+'</td><td>'+esc(r.place)+'</td><td>'+sevMeter(r.severity)+'</td><td>'+esc(r.authorName)+'</td><td><div class="acts">'+del+'</div></td></tr>';
  }).join('');
  var srows=S.sites.slice().sort(function(a,b){return STATES.indexOf(a.st)-STATES.indexOf(b.st)||(a.n<b.n?-1:1)}).map(function(s){return '<tr><td><b>'+esc(s.n)+'</b></td><td>'+esc(s.st||'')+'</td><td class="mono">'+Number(s.lat).toFixed(3)+', '+Number(s.lng).toFixed(3)+'</td><td><select data-site-cond="'+esc(s.id)+'" aria-label="Shoreline condition for '+esc(s.n)+'">'+SITE_CONDS.map(function(c){return '<option'+(s.cond===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select></td><td><select data-site-sev="'+esc(s.id)+'" aria-label="Erosion severity for '+esc(s.n)+'">'+[0,1,2,3,4].map(function(i){return '<option value="'+i+'"'+(s.sev===i?' selected':'')+'>'+i+' · '+SEV[i]+'</option>'}).join('')+'</select></td></tr>'}).join('');
  var mrows=S.members.map(function(u){var n=all.filter(function(r){return r.authorId===u.id}).length;return '<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email||'')+'<br><span class="muted mono" style="font-size:.78rem">'+esc(u.phone||'no phone')+'</span></td><td>'+esc(u.location||'')+'</td><td class="mono">'+n+'</td><td>'+fmtDate(String(u.joined||'').slice(0,10))+'</td></tr>'}).join('');
  var sf=S.sform,ks=[['reports','Reports CSV'],['sites','Sites CSV'],['members','Members CSV'],['kml','Google Earth KML']].map(function(k){return '<button class="chip" data-act="csvk" data-k="'+k[0]+'" aria-pressed="'+(S.csvKind===k[0])+'">'+k[1]+'</button>'}).join('');
  var th=function(a){return '<thead><tr>'+a.map(function(x){return '<th>'+x+'</th>'}).join('')+'</tr></thead>'};
  return '<section class="hero"><h1>Admin panel</h1><p class="muted" style="margin-top:8px">Review incoming reports, keep site conditions current, see members and export the data.</p></section>'+
  '<section class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h2>Review queue ('+queue.length+')</h2><button class="btn sm" data-act="refresh">'+(S.inboxState==='loading'?'Refreshing…':'Refresh')+'</button></div><p class="muted" style="font-size:.86rem;margin:4px 0 12px">Reports waiting for a decision. Open one to see the evidence and add a note.</p><div class="tablebox"><table>'+th(['ID','Observed','Type','Place','Severity','Evidence','Reporter',''])+'<tbody>'+(qrows||'<tr><td colspan="8" class="muted">Nothing is waiting for review.</td></tr>')+'</tbody></table></div></section>'+
  '<section class="card"><h2>Published reports ('+S.pubs.length+')</h2><div class="tablebox" style="margin-top:12px"><table style="min-width:720px">'+th(['ID','Observed','Type','Place','Severity','Reporter',''])+'<tbody>'+(prows||'<tr><td colspan="7" class="muted">No published reports.</td></tr>')+'</tbody></table></div></section>'+
  '<section class="card"><h2>Coastal sites</h2><p class="muted" style="font-size:.86rem;margin:4px 0 12px">Changes show on the map and dashboard straight away.</p><div class="tablebox" style="max-height:520px;overflow:auto"><table style="min-width:760px">'+th(['Location','State or UT','Position','Shoreline condition','Erosion severity'])+'<tbody>'+srows+'</tbody></table></div>'+
  '<form id="sform" novalidate style="margin-top:18px"><h3>Add a coastal site</h3><div class="two" style="margin-top:10px">'+fld('Site name','s-name','<input id="s-name" maxlength="60" value="'+esc(sf.name)+'">')+fld('Shoreline condition','s-cond','<select id="s-cond">'+SITE_CONDS.map(function(c){return '<option'+(sf.cond===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select>')+'</div><div class="two">'+fld('Latitude (°N)','s-lat','<input id="s-lat" type="number" step="any" value="'+esc(sf.lat)+'">')+fld('Longitude (°E)','s-lng','<input id="s-lng" type="number" step="any" value="'+esc(sf.lng)+'">')+'</div><div class="two">'+fld('State or union territory','s-st','<select id="s-st">'+stateOptions(sf.st)+'</select>')+fld('Erosion severity','s-sev','<select id="s-sev">'+[0,1,2,3,4].map(function(i){return '<option value="'+i+'"'+(sf.sev===String(i)?' selected':'')+'>'+i+' · '+SEV[i]+'</option>'}).join('')+'</select>')+'</div>'+fld('Note','s-note','<textarea id="s-note" rows="2" maxlength="300">'+esc(sf.note)+'</textarea>')+'<button class="btn pri" type="submit">Add site</button></form></section>'+
  '<section class="card"><h2>Members ('+S.members.length+')</h2><div class="tablebox" style="margin-top:12px"><table style="min-width:720px">'+th(['Name','Contact','Location','Reports','Joined'])+'<tbody>'+(mrows||'<tr><td colspan="5" class="muted">No registered members yet.</td></tr>')+'</tbody></table></div></section>'+
  '<section class="card"><h2>Export for researchers</h2><p class="muted" style="font-size:.86rem;margin:4px 0 12px">The full dataset including pending and rejected reports. Save the CSV files for a spreadsheet, or take the KML into Google Earth (save the .kml file, then use File, Import KML in Google Earth). The members file contains contact details, so handle it with care.</p><div class="chips" style="margin-bottom:10px">'+ks+'</div><textarea class="csv" id="csvbox" readonly aria-label="Export preview">'+esc(csv(S.csvKind))+'</textarea><div class="acts" style="margin-top:10px"><button class="btn sm pri" data-act="copycsv">Copy</button><button class="btn sm" data-act="savefile">Save file</button></div></section>'+
  '<section class="card"><h2>Browser data</h2><p class="muted" style="font-size:.86rem;margin:4px 0 12px">This copy of Coastlines keeps its accounts and reports in this browser only ('+Math.round(CLStore.usedBytes()/1024)+' KB used of about 5000 KB). Resetting deletes every account (including yours, so you will need to register again) and every submitted report in this browser, and loads the published press reports again.</p>'+(S.confirm==='reset'?'<div class="acts"><button class="btn sm danger" data-act="resetok">Yes, reset everything</button><button class="btn sm" data-act="delno">Cancel</button></div>':'<button class="btn sm danger" data-act="reset">Reset browser data</button>')+'</section>';
}
async function reviewAct(id,status){
  var r=findReport(id);if(!r||!S.admin)return;
  var note=($('#rv-note')?$('#rv-note').value.trim():'');
  if(status==='rejected'&&note.length<5){var fe=$('#e-rv-note');if(fe)fe.textContent='Add a note of at least 5 characters so the reporter knows why.';else toast('Open the report to add a rejection note.');var n=$('#rv-note');if(n)n.focus();return}
  var pubDoc=Object.assign({},r);delete pubDoc.id;
  var ok=await guard(async function(){
    if(status==='verified')await S.db.doc('reports/'+id).set(pubDoc);
    await S.db.doc('reviews/'+r.authorId+'/items/'+id).set({status:status,note:note,by:S.uid,at:new Date().toISOString()});
  },status==='verified'?'Report '+id+' is now public':'Report '+id+' rejected');
  if(ok){S.inboxRevs[id]={id:id,status:status,note:note};if(status==='verified'&&!S.pubs.some(function(x){return x.id===id}))S.pubs=S.pubs.concat([r]);render()}
}

/* ---------- render and events ---------- */
var FOOT='<footer class="foot">Map links open Google Earth. Live weather by Open-Meteo or OpenWeather.</footer>';
function render(){
  var body;
  if(PAGE!=='auth'&&isLoading()){body='<div class="card authcard"><p class="muted" role="status">Loading…</p></div>'}
  else if(PAGE==='dashboard')body=dashboard();
  else if(PAGE==='reports')body=reportsView();
  else if(PAGE==='detail')body=detailView();
  else if(PAGE==='report')body=reportView();
  else if(PAGE==='profile')body=profileView();
  else if(PAGE==='admin')body=adminView();
  else body=authView();
  S.dirty=false;
  $('#app').innerHTML=header()+'<main id="main">'+body+'</main>'+FOOT;
  if(window.CLWeather)CLWeather.mount($('#app'));
  if(window.CLPhotos)CLPhotos.credits($('#app'));
  if(PAGE==='dashboard')watchLive();
}
function repaint(){
  if(!S.painted){if(!isLoading()){S.painted=true;render()}return}
  var a=document.activeElement,typing=a&&$('#app').contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(PAGE==='report'||PAGE==='auth'){var h=$('.top');if(h)h.outerHTML=header();return}
  if(PAGE==='profile'){var ml=$('#mylist');if(ml)ml.innerHTML=myList();var hh=$('.top');if(hh)hh.outerHTML=header();return}
  if(typing)return;
  render();
}
function openReport(id){location.href=PAGES.detail+'?id='+encodeURIComponent(id)+'&from='+PAGE}
function saveF(){ss('cl.f',JSON.stringify({type:S.f.type,sev:S.f.sev,state:S.f.state,site:S.f.site,src:S.f.src,q:S.f.q,sort:S.f.sort}))}
function saveDraft(){var f=S.form;ss('cl.draft',JSON.stringify({type:f.type,sev:f.sev,date:f.date,measure:f.measure,siteId:f.siteId,place:f.place,state:f.state,lat:f.lat,lng:f.lng,cond:f.cond,desc:f.desc,ok:f.ok}))}

document.addEventListener('click',function(e){
  var t=e.target,el;
  if((el=t.closest('[data-pin]'))){var id=el.getAttribute('data-pin');if(PAGE==='dashboard'){S.sel=id;S.siteSel=null;render()}else openReport(id);return}
  if((el=t.closest('[data-site]'))){
    var sid=el.getAttribute('data-site'),st=siteById(sid);
    if(PAGE==='dashboard'){S.siteSel=sid;S.sel=null;render()}
    else if(PAGE==='report'&&st){readForm();S.pickRegion=regionOfState(st.st);S.form.siteId=st.id;S.form.lat=st.lat;S.form.lng=st.lng;if(!S.form.cond&&CONDS.indexOf(st.cond)>-1)S.form.cond=st.cond;render()}
    return}
  if(PAGE==='report'&&t.closest('#pickmap')){
    var svg=$('#pickmap'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;var q=pt.matrixTransform(svg.getScreenCTM().inverse());
    readForm();S.form.lat=+(BOUNDS.lat1-q.y/MAP.s).toFixed(4);S.form.lng=+(BOUNDS.lng0+q.x/MAP.s).toFixed(4);
    var near=S.sites.filter(function(s){return kmBetween(S.form.lat,S.form.lng,s.lat,s.lng)<5})[0];
    if(S.form.siteId===''||S.form.siteId==='other')S.form.siteId=near?near.id:'other';
    if(S.form.siteId==='other'&&!S.form.state){var nn=S.sites.map(function(x){return [kmBetween(S.form.lat,S.form.lng,x.lat,x.lng),x]}).sort(function(a,b){return a[0]-b[0]})[0];if(nn&&nn[0]<250)S.form.state=nn[1].st}
    render();return}
  if((el=t.closest('[data-nav]'))){navTo(el.getAttribute('data-nav'));return}
  if((el=t.closest('[data-open]'))){openReport(el.getAttribute('data-open'));return}
  el=t.closest('[data-act]');if(!el)return;
  var a=el.getAttribute('data-act'),id2=el.getAttribute('data-id');
  if(a==='water'){var still=document.documentElement.getAttribute('data-still')!=='1';pref('cl.still',still?'1':'0');document.dispatchEvent(new CustomEvent('cl-motion',{detail:{still:still}}));var hd=$('.top');if(hd)hd.outerHTML=header();toast(still?'Water is still':'Water is moving');return}
  if(a==='theme'){var order=['auto','light','dark'];S.theme=order[(order.indexOf(S.theme)+1)%3];if(S.theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',S.theme);try{if(S.theme==='auto')localStorage.removeItem('cl.theme');else localStorage.setItem('cl.theme',S.theme)}catch(x){}toast('Theme: '+S.theme);return}
  if(a==='chip'){var k=el.getAttribute('data-t');S.mapTypes[k]=S.mapTypes[k]?0:1;render();return}
  if(a==='chipsites'){S.showSites=!S.showSites;if(!S.showSites)S.siteSel=null;render();return}
  if(a==='sitesall'){S.sitesAll=!S.sitesAll;render();return}
  if(a==='photosall'){S.photosAll=!S.photosAll;render();return}
  if(a==='more'){S.f.n+=15;$('#reclist').innerHTML=listBlock();return}
  if(a==='reportat'){navTo('report','site='+encodeURIComponent(id2));return}
  if(a==='rmev'){S.form.ev.splice(+el.getAttribute('data-i'),1);$('#phlist').innerHTML=evHtml(S.form.ev,true);return}
  if(a==='verify'){reviewAct(id2,'verified');return}
  if(a==='reject'){reviewAct(id2,'rejected');return}
  if(a==='unpublish'){var r=findReport(id2);if(r)guard(async function(){await S.db.doc('reports/'+id2).delete();await S.db.doc('reviews/'+r.authorId+'/items/'+id2).set({status:'pending',note:'',by:S.uid,at:new Date().toISOString()});S.pubs=S.pubs.filter(function(x){return x.id!==id2});delete S.inboxRevs[id2];if(!S.inbox.some(function(x){return x.id===id2}))S.inbox=S.inbox.concat([r])},'Report unpublished').then(render);return}
  if(a==='del'){S.confirm='d:'+id2;render();return}
  if(a==='delno'){S.confirm=null;render();return}
  if(a==='delok'){var r2=findReport(id2);guard(async function(){await S.db.doc('reports/'+id2).delete();if(r2&&r2.kind!=='press')await S.db.doc('reviews/'+r2.authorId+'/items/'+id2).set({status:'rejected',note:'Removed by an admin.',by:S.uid,at:new Date().toISOString()});S.pubs=S.pubs.filter(function(x){return x.id!==id2});if(S.sel===id2)S.sel=null;S.confirm=null},'Report deleted').then(render);return}
  if(a==='withdraw'){S.confirm='w:'+id2;render();return}
  if(a==='withdrawok'){guard(async function(){await S.db.doc('submissions/'+S.uid+'/items/'+id2).delete();S.mine=S.mine.filter(function(x){return x.id!==id2});S.confirm=null},'Report withdrawn').then(function(){navTo('profile')});return}
  if(a==='refresh'){loadInbox();return}
  if(a==='csvk'){S.csvKind=el.getAttribute('data-k');render();return}
  if(a==='copycsv'){var box=$('#csvbox');box.select();var done=function(){toast('Copied')},fail=function(){toast('Press Ctrl+C to copy the selected text')};try{navigator.clipboard.writeText(box.value).then(done,fail)}catch(x){fail()}return}
  if(a==='savefile'){var kk=S.csvKind;saveFile(kk==='kml'?'coastlines-google-earth.kml':'coastlines-'+kk+'.csv',csv(kk)).then(function(ok){if(ok)toast(kk==='kml'?'Saved. In Google Earth, choose File, then Import KML':'File saved')});return}
  if(a==='logout'){CLStore.logout();location.href=PAGES.auth;return}
  if(a==='authtab'){S.authTab=el.getAttribute('data-k')==='up'?'up':'in';render();return}
  if(a==='demofill'){S.authTab='in';render();$('#l-email').value='member@coastlines.example';$('#l-pass').value='Coastlines-Member-26';$('#lform button[type="submit"]').focus();return}
  if(a==='wxretry'){try{Object.keys(sessionStorage).forEach(function(k){if(k.indexOf('cl.wx.')===0)sessionStorage.removeItem(k)})}catch(x){}CLWeather.mount($('#app'));return}
  if(a==='reset'){S.confirm='reset';render();return}
  if(a==='resetok'){try{CLStore.resetAll();S.confirm=null;toast('Data reset');setTimeout(function(){location.reload()},600)}catch(x){toast(dbMsg(x))}return}
});
document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.hasAttribute('data-ph')){var f=t.closest('figure');if(f){f.hidden=true;var g=f.closest('#gallery');if(g&&!g.querySelector('figure:not([hidden])'))g.hidden=true}}},true);
document.addEventListener('keydown',function(e){
  var pin=e.target&&e.target.closest&&e.target.closest('[data-pin],[data-site]');
  if(pin&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pin.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
});
document.addEventListener('submit',function(e){
  e.preventDefault();var id=e.target.id;
  if(id==='aform')doRegister();
  if(id==='lform')doLogin();
  if(id==='pwform')changePw();
  if(id==='rform')submitReport();
  if(id==='pform')saveProfile();
  if(id==='sform')addSite();
});
document.addEventListener('input',function(e){
  var id=e.target.id;
  if(id==='f-q'){S.f.q=e.target.value;S.f.n=15;saveF();$('#reclist').innerHTML=listBlock()}
  if(PAGE==='report'&&e.target.closest&&e.target.closest('#rform')){readForm();saveDraft()}
  if(id==='r-lat'||id==='r-lng'){S.form.lat=$('#r-lat').value;S.form.lng=$('#r-lng').value;var b=$('#pickbox');if(b)b.innerHTML=pickMap();var ep=$('#earthpick');if(ep)ep.innerHTML=earthPick()}
  if(id&&id.indexOf('s-')===0){var m={'s-name':'name','s-lat':'lat','s-lng':'lng','s-note':'note'}[id];if(m)S.sform[m]=e.target.value}
});
document.addEventListener('change',function(e){
  var t=e.target,id=t.id;
  if(id==='f-type'||id==='f-sev'||id==='f-site'||id==='f-sort'||id==='f-src'){S.f[id.slice(2)]=t.value;S.f.n=15;saveF();$('#reclist').innerHTML=listBlock()}
  if(id==='f-state'){S.f.state=t.value;S.f.site='all';S.f.n=15;saveF();render()}
  if(id==='m-region'){S.region=t.value;render()}
  if(id==='p-region'){readForm();S.pickRegion=t.value;render()}
  if(t.getAttribute&&t.getAttribute('data-act')==='showpw'){Array.prototype.forEach.call(document.querySelectorAll('[data-pw]'),function(p){p.type=t.checked?'text':'password'})}
  if(id==='r-site'){readForm();var st=siteById(S.form.siteId);if(st){S.pickRegion=regionOfState(st.st);S.form.lat=st.lat;S.form.lng=st.lng;if(!S.form.cond&&CONDS.indexOf(st.cond)>-1)S.form.cond=st.cond}saveDraft();render()}
  if(id==='r-type'){readForm();saveDraft();render()}
  if(id==='s-cond')S.sform.cond=t.value;
  if(id==='s-st')S.sform.st=t.value;
  if(id==='s-sev')S.sform.sev=t.value;
  if(id==='r-files'){var files=Array.prototype.slice.call(t.files);readForm();addFiles(files).then(function(){t.value=''})}
  if(t.hasAttribute&&S.admin&&(t.hasAttribute('data-site-cond')||t.hasAttribute('data-site-sev'))){
    var sid=t.getAttribute('data-site-cond')||t.getAttribute('data-site-sev'),patch=t.hasAttribute('data-site-cond')?{cond:t.value}:{sev:+t.value};
    guard(function(){return S.db.doc('sites/'+sid).update(patch)},'Site updated');
  }
});
async function addSite(){
  var g=function(id){return $('#'+id).value};
  var v={name:g('s-name').trim(),st:g('s-st'),lat:parseFloat(g('s-lat')),lng:parseFloat(g('s-lng')),cond:g('s-cond'),sev:+g('s-sev'),note:g('s-note').trim()};
  if(!showErrs(validateSite(v),{name:'s-name',st:'s-st',lat:'s-lat',lng:'s-lng',note:'s-note'}))return;
  if(S.sites.some(function(s){return s.n.toLowerCase()===v.name.toLowerCase()})){showErrs({name:'A site with this name already exists.'},{name:'s-name'});return}
  var n=S.sites.reduce(function(a,s){var k=parseInt(String(s.id).slice(2),10);return isNaN(k)?a:Math.max(a,k)},0)+1,id='S-'+String(n).padStart(2,'0');
  var ok=await guard(function(){return S.db.doc('sites/'+id).set({n:v.name,st:v.st,lat:v.lat,lng:v.lng,cond:v.cond,sev:v.sev,note:v.note})},'Site added');
  if(ok){S.sform={name:'',st:'',lat:'',lng:'',cond:'Stable',sev:'0',note:''};render()}
}
boot();
})();
