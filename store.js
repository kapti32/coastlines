/* Coastlines data and sign-in layer.

   This file is the ONLY place that knows where data lives. The pages talk to it through a small database
   interface (collection/doc/get/set/update/delete/onSnapshot) and a sign-in interface (register/login/logout).
   Here both are kept in the visitor's own browser (localStorage), so the site works on any static host with no
   server. That means data is per browser, not shared between people. To share data between people, replace the
   body of this file with calls to your own API and keep the same function names. See README.md.

   Passwords are never stored as text: each is salted and hashed with PBKDF2-SHA-256 (150,000 rounds) using the
   browser's Web Crypto. Browser storage can still be read by anyone using that browser, so treat this as a
   working prototype of the sign-in flow, not as server-grade security. */
(function(){
"use strict";

var DB_KEY='cl.db.v1',ACC_KEY='cl.accounts.v1',SES_KEY='cl.session.v1',LOCK_KEY='cl.lock.v1';
var ITER=150000,SESSION_MS=8*3600*1000,MAX_FAILS=5,LOCK_MS=60*1000;

function err(code,msg){var e=new Error(msg||code);e.code=code;return e}

/* ---------- raw storage ---------- */
var storageOk=(function(){try{var k='cl.probe';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}})();
var memory={};
function rawGet(k){try{return storageOk?localStorage.getItem(k):(memory[k]||null)}catch(e){return null}}
function rawSet(k,v){
  if(!storageOk){memory[k]=v;return}
  try{localStorage.setItem(k,v)}
  catch(e){throw err('quota_exceeded','Browser storage is full')}
}
function rawDel(k){try{if(storageOk)localStorage.removeItem(k);else delete memory[k]}catch(e){}}
function readJson(k){try{return JSON.parse(rawGet(k)||'null')}catch(e){return null}}

/* ---------- accounts and session ---------- */
var accCache=null;
function accounts(){
  if(accCache)return accCache;
  var a=readJson(ACC_KEY);
  if(!a||typeof a!=='object'){a=window.CLSeed?window.CLSeed.accounts():{};try{rawSet(ACC_KEY,JSON.stringify(a))}catch(e){}}
  accCache=a;return a;
}
function saveAccounts(){rawSet(ACC_KEY,JSON.stringify(accCache))}
function b64(buf){var s='',b=new Uint8Array(buf);for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)}
function unb64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function derive(password,saltB64,iter){
  if(!window.crypto||!crypto.subtle)throw err('insecure_context','This page must be opened over https or from localhost so the browser can protect passwords.');
  var key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  var bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unb64(saltB64),iterations:iter},key,256);
  return b64(bits);
}
function same(a,b){if(a.length!==b.length)return false;var d=0;for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function newSalt(){var s=new Uint8Array(16);crypto.getRandomValues(s);return b64(s)}
function newUid(){var s=new Uint8Array(9);crypto.getRandomValues(s);return 'u_'+Array.prototype.map.call(s,function(x){return ('0'+x.toString(16)).slice(-2)}).join('')}
function emailKey(e){return String(e||'').trim().toLowerCase()}
function findByEmail(e){var a=accounts(),k=emailKey(e);for(var id in a)if(a[id].email===k)return a[id];return null}

function lockState(k){var l=readJson(LOCK_KEY)||{},r=l[k];return r&&r.until>Date.now()?r.until:0}
function noteFail(k){
  var l=readJson(LOCK_KEY)||{},r=l[k]||{n:0,until:0};
  if(r.until&&r.until<=Date.now())r={n:0,until:0};
  r.n++;if(r.n>=MAX_FAILS){r.until=Date.now()+LOCK_MS;r.n=0}
  l[k]=r;try{rawSet(LOCK_KEY,JSON.stringify(l))}catch(e){}
}
function clearFails(k){var l=readJson(LOCK_KEY)||{};if(l[k]){delete l[k];try{rawSet(LOCK_KEY,JSON.stringify(l))}catch(e){}}}

function startSession(uid){rawSet(SES_KEY,JSON.stringify({uid:uid,exp:Date.now()+SESSION_MS}))}
function session(){
  var s=readJson(SES_KEY);
  if(!s||!s.uid||s.exp<Date.now()){return null}
  var a=accounts()[s.uid];
  if(!a)return null;
  return {uid:a.id,role:isAdminAccount(a)?'admin':a.role,email:a.email};
}
/* An account is an admin when its stored role says so, or when its email is listed in CL_CONFIG.adminEmails.
   The list is a convenience for a static site with no server; anyone who can edit config.js or browser storage
   can change it, so it is not a security boundary. See README.md. */
function isAdminAccount(a){
  if(a.role==='admin')return true;
  var list=(window.CL_CONFIG&&window.CL_CONFIG.adminEmails)||[];
  for(var i=0;i<list.length;i++)if(emailKey(list[i])===a.email)return true;
  return false;
}

/* ---------- database ---------- */
var cache=null,listeners=[];
function load(){
  if(cache)return cache;
  var d=readJson(DB_KEY);
  if(!d||d.v!==1||typeof d.docs!=='object'){
    d={v:1,docs:window.CLSeed?window.CLSeed.build():{}};
    cache=d;try{persist()}catch(e){}
  }
  cache=d;return d;
}
function persist(){rawSet(DB_KEY,JSON.stringify(cache))}
function clone(x){return x===undefined?undefined:JSON.parse(JSON.stringify(x))}
function segs(p){return String(p).split('/').filter(Boolean)}
function me(){return session()}

/* Who may read or write what. This mirrors the rules a real server would enforce. */
function allowed(op,path){
  var s=session();if(!s)return false;
  if(s.role==='admin')return true;
  var p=segs(path),top=p[0],owner=p[1];
  if(op==='read'){
    if(top==='sites'||top==='reports')return true;
    if(top==='members')return p.length>=2&&owner===s.uid;
    if(top==='submissions'||top==='reviews')return p.length>=2&&owner===s.uid;
    return false;
  }
  if(top==='submissions'||top==='members')return owner===s.uid;
  return false;
}
function snapDoc(path){
  var ok=allowed('read',path),d=ok?load().docs[path]:undefined;
  return {id:segs(path).pop(),exists:d!==undefined,data:function(){return clone(d)}};
}
function snapCol(path){
  var n=segs(path).length,docs=load().docs,out=[];
  /* listing a whole collection needs read rights on the collection itself */
  var colOk=n===1?(path==='sites'||path==='reports'||(session()&&session().role==='admin')):allowed('read',path+'/x');
  if(colOk)Object.keys(docs).sort().forEach(function(k){
    if(k.indexOf(path+'/')===0&&segs(k).length===n+1)out.push({id:segs(k).pop(),data:(function(v){return function(){return clone(v)}})(docs[k])});
  });
  return {docs:out,size:out.length,empty:!out.length};
}
function notify(){listeners.slice().forEach(function(l){try{l.cb(l.snap())}catch(e){if(l.er)try{l.er(e)}catch(x){}}})}
function listen(snap,cb,er){
  var l={snap:snap,cb:cb,er:er};listeners.push(l);
  setTimeout(function(){if(listeners.indexOf(l)>-1){try{cb(snap())}catch(e){if(er)er(e)}}},0);
  return function(){listeners=listeners.filter(function(x){return x!==l})};
}
window.addEventListener('storage',function(e){
  if(e.key===DB_KEY){cache=null;notify()}
  if(e.key===ACC_KEY){accCache=null}
});

function write(path,fn){
  if(!allowed('write',path))throw err('permission_denied','Not allowed');
  var db=load(),before=db.docs[path];
  fn(db.docs);
  try{persist()}catch(e){if(before===undefined)delete db.docs[path];else db.docs[path]=before;throw e}
  notify();
}
function doc(path){
  return {
    id:segs(path).pop(),path:path,
    get:async function(){return snapDoc(path)},
    set:async function(d){write(path,function(docs){docs[path]=clone(d)})},
    update:async function(d){write(path,function(docs){if(docs[path]===undefined)throw err('not_found','No such document');docs[path]=Object.assign({},docs[path],clone(d))})},
    delete:async function(){write(path,function(docs){delete docs[path]})},
    onSnapshot:function(cb,er){return listen(function(){return snapDoc(path)},cb,er)},
    collection:function(p){return col(path+'/'+p)}
  };
}
function col(path){
  return {
    path:path,
    get:async function(){return snapCol(path)},
    onSnapshot:function(cb,er){return listen(function(){return snapCol(path)},cb,er)},
    doc:function(id){return doc(path+'/'+id)}
  };
}
var db={doc:doc,collection:col};

/* ---------- public interface ---------- */
var Store={
  available:storageOk,
  db:db,
  session:session,

  /* signed-in person, or null */
  user:function(){
    var s=session();if(!s)return null;
    return {id:s.uid,email:s.email,isAdmin:s.role==='admin'};
  },

  /* create an account and its member profile, then sign in */
  register:async function(v){
    var k=emailKey(v.email);
    if(findByEmail(k))throw err('email_taken','An account with this email already exists. Sign in instead.');
    var a=accounts(),id=newUid(),salt=newSalt(),hash=await derive(v.password,salt,ITER);
    a[id]={id:id,email:k,role:'member',iter:ITER,salt:salt,hash:hash,created:new Date().toISOString()};
    try{saveAccounts()}catch(e){delete a[id];throw e}
    var d=load();
    d.docs['members/'+id]={name:v.name,email:k,phone:v.phone||'',location:v.location,joined:new Date().toISOString(),consent:true};
    try{persist()}catch(e){delete d.docs['members/'+id];delete a[id];try{saveAccounts()}catch(x){}throw e}
    startSession(id);notify();
    return id;
  },

  login:async function(email,password){
    var k=emailKey(email),until=lockState(k);
    if(until){var s=Math.ceil((until-Date.now())/1000);throw err('locked','Too many attempts. Try again in '+s+' seconds.')}
    var a=findByEmail(k),bad=err('bad_login','Email or password is incorrect.');
    if(!a){/* spend the same time as a real check so timing does not reveal which emails exist */
      try{await derive(password,newSalt(),ITER)}catch(e){if(e.code==='insecure_context')throw e}
      noteFail(k);throw bad}
    var h=await derive(password,a.salt,a.iter||ITER);
    if(!same(h,a.hash)){noteFail(k);throw bad}
    clearFails(k);startSession(a.id);return a.id;
  },

  logout:function(){rawDel(SES_KEY)},

  changePassword:async function(oldPw,newPw){
    var s=session();if(!s)throw err('signed_out','Sign in again.');
    var a=accounts()[s.uid],h=await derive(oldPw,a.salt,a.iter||ITER);
    if(!same(h,a.hash))throw err('bad_login','Your current password is not correct.');
    var salt=newSalt();a.salt=salt;a.iter=ITER;a.hash=await derive(newPw,salt,ITER);
    saveAccounts();
  },

  /* admin tool: wipe everything stored by this site in this browser and load the starter data again */
  resetAll:function(){
    var s=session();if(!s||s.role!=='admin')throw err('permission_denied','Admins only');
    [DB_KEY,ACC_KEY,LOCK_KEY].forEach(rawDel);cache=null;accCache=null;
    load();accounts();notify();
  },

  usedBytes:function(){var n=0;[DB_KEY,ACC_KEY].forEach(function(k){n+=(rawGet(k)||'').length});return n}
};
window.CLStore=Store;
})();
