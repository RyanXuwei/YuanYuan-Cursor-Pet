(() => {
'use strict';
function hostname(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.hostname.toLowerCase().replace(/\.$/,''):'';}catch{return '';}}
function normalize(value){return [...new Set((Array.isArray(value)?value:[]).filter(h=>typeof h==='string').map(h=>h.trim().toLowerCase().replace(/\.$/,'')).filter(h=>h&&hostname('https://'+h+'/')===h))].sort();}
globalThis.YuanYuanCage={hostname,normalize,contains:(sites,url)=>normalize(sites).includes(hostname(url))};
})();

