// Network-only app: never cache group data, auth pages, tokens, or API writes.
// The offline screen is embedded so it works without caching authenticated HTML.
const OFFLINE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#faf9f6"><title>RUdown · Offline</title><style>*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#243c31;font:16px/1.6 Arial,sans-serif;min-height:100svh;display:grid;place-items:center;padding:32px}main{max-width:370px}.brand{font-weight:bold;font-size:32px}i{color:#e46c38;font-style:normal}h1{font:40px/1.1 Georgia,serif;margin:38px 0 20px}p{color:#737d71}a{display:inline-block;background:#e46c38;color:white;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:12px}small{display:block;margin-top:28px;color:#737d71}</style></head><body><main><div class="brand">RUdown <i>↗</i></div><h1>A little off the grid.</h1><p>Reconnect to see the crew’s latest plans, prices and approvals.</p><a href="/">Try again</a><small>No changes or approvals are saved offline. Your saved group access stays on this device.</small></main></body></html>`;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin||url.pathname!=='/')return;
 event.respondWith(fetch(event.request).catch(()=>new Response(OFFLINE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
