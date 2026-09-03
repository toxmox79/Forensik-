const CACHE='forensik-zentrale-v1.1-flat';
const CORE=[
 './','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png',
 './medizin.html','./medizin.css','./medizin.js',
 './alltag.html','./alltag.css','./alltag.js',
 './nachrichten.html','./nachrichten.css','./nachrichten.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('forensik-zentrale-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match('./index.html'))));});
