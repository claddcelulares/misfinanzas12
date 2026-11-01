const C='mis-finanzas-v28';
const A=['./','index.html','manifest.webmanifest','icon-192-v3.png','icon-512-v3.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match('index.html'))))});

/* Avisos de servicios en segundo plano (Periodic Background Sync): el sistema decide cuando corre */
function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('mf',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function idbGet(db,k){return new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function idbPut(db,k,v){return new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function checkServSW(){
  const now=new Date();if(now.getHours()<8)return;
  const p=n=>String(n).padStart(2,'0');
  const t=now.getFullYear()+'-'+p(now.getMonth()+1)+'-'+p(now.getDate());
  const db=await idbOpen();
  try{
    const list=(await idbGet(db,'serv'))||[],notified=(await idbGet(db,'notified'))||{};
    let ch=false;
    for(const s of list){
      if(s.due<=t&&s.notified!==t&&notified[s.id]!==t){
        const body=new Intl.NumberFormat('es-AR',{style:'currency',currency:s.cur}).format(s.amount);
        await self.registration.showNotification('Vence: '+s.name,{body,tag:'serv-'+s.id,icon:'icon-192-v3.png'});
        notified[s.id]=t;ch=true}}
    if(ch)await idbPut(db,'notified',notified)
  }finally{db.close()}}
self.addEventListener('periodicsync',e=>{if(e.tag==='serv-check')e.waitUntil(checkServSW().catch(()=>{}))});
self.addEventListener('notificationclick',e=>{e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cl=>{
    for(const c of cl){if('focus' in c)return c.focus()}
    if(self.clients.openWindow)return self.clients.openWindow('./')}))});
