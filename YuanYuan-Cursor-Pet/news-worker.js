(() => {
'use strict';
const N=YuanYuanNews;let flight=null,epoch=0,controller=null,writes=Promise.resolve();
const keys=['newsEnabled','language','newsCache','newsRead'];
const saved=()=>chrome.storage.local.get(keys);
function mutate(fn){const p=writes.catch(()=>{}).then(fn);writes=p;return p;}
async function state(extra={}){return {...N.snapshot(await saved()),...extra};}
async function obtain(force){
 const s=await saved();if(!s.newsEnabled)return N.snapshot(s);
 if(!await chrome.permissions.contains({origins:[N.origin]}))return {...N.snapshot(s),error:'permission'};
 const lang=N.language(s.language),now=new Date(),timeZone=N.zone(),cache=s.newsCache?.[lang],valid=cache?.day===N.day(now)&&cache.zone===N.zone();
 if(flight?.lang===lang)return flight.promise;
 const elapsed=Date.now()-(valid?cache.lastAttempt||0:0);
 if(valid&&force&&elapsed<N.cooldown)return {...N.snapshot(s),notice:'cooldown'};
 if(valid&&!force&&(cache.checkedAt||elapsed<600000))return N.snapshot(s);
 const token=epoch;controller?.abort();const abort=new AbortController();controller=abort;
 const promise=(async()=>{
  const candidates=[];let successes=0;
  for(let i=0;i<4;i++){
   if(abort.signal.aborted)break;
   try{
    const timer=setTimeout(()=>abort.abort(),15000);
    let response,xml;
    try{response=await fetch(N.url(lang,i),{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('fetch');xml=await response.text();}finally{clearTimeout(timer);}
    candidates.push(...N.parse(xml,lang,now));successes++;
   }catch{if(abort.signal.aborted)break;}
   const recent=await saved();if(N.select(candidates,recent.newsRead).filter(a=>a.category<=i).length>=2)break;
  }
  if(epoch!==token)return state({notice:'cancelled'});
  return mutate(async()=>{
   const current=await saved();
   if(epoch!==token||!current.newsEnabled||N.language(current.language)!==lang||N.day()!==N.day(now)||N.zone()!==timeZone)return N.snapshot(current);
   const old=current.newsCache?.[lang];
   const articles=successes?N.select(candidates,current.newsRead):old?.day===N.day(now)?old.articles:[];
   const entry={day:N.day(now),zone:N.zone(),articles,lastAttempt:Date.now(),checkedAt:successes?Date.now():old?.day===N.day(now)?old.checkedAt||0:0,error:successes?'':'fetch'};
   const cacheMap={...current.newsCache,[lang]:entry};for(const k of Object.keys(cacheMap))if(!N.editions[k])delete cacheMap[k];
   await chrome.storage.local.set({newsCache:cacheMap});
   return {...N.snapshot({...current,newsCache:cacheMap}),notice:force&&successes&&!articles.length?'empty':''};
  });
 })().finally(()=>{if(flight?.promise===promise)flight=null;if(controller===abort)controller=null;});
 flight={lang,promise};return promise;
}
async function markRead(id){
 return mutate(async()=>{const s=await saved(),view=N.snapshot(s);if(!view.articles.some(a=>a.id===id))return view;
 const read={...s.newsRead,[id]:Date.now()},entries=Object.entries(read).filter(([,at])=>Number.isFinite(at)&&Date.now()-at<14*86400000).sort((a,b)=>b[1]-a[1]).slice(0,300);
 const newsRead=Object.fromEntries(entries);await chrome.storage.local.set({newsRead});return N.snapshot({...s,newsRead});});
}
function invalidate(){epoch++;controller?.abort();flight=null;}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.language||changes.newsEnabled?.newValue===false))invalidate();});
chrome.permissions.onRemoved.addListener(p=>{if(p.origins?.some(o=>o.includes('news.google.com'))){invalidate();chrome.storage.local.set({newsEnabled:false}).catch(()=>{});}});
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='yuanyuan-news'||sender.id!==chrome.runtime.id)return;
 const p=m.action==='read'?markRead(String(m.id||'').slice(0,32)):m.action==='get'||m.action==='refresh'?obtain(m.action==='refresh'):null;
 if(!p)return;Promise.resolve(p).then(view=>reply({ok:true,view}),()=>reply({ok:false,error:'fetch'}));return true;
});
})();
