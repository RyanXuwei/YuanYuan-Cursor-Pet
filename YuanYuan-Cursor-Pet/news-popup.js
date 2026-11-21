(() => {
'use strict';
const N=YuanYuanNews,T=YuanYuanNewsText,$=id=>document.getElementById(id);let busy=false,note='';
async function render(){
 try{
  const s=await chrome.storage.local.get(['newsEnabled','language','newsCache','newsRead']),v=N.snapshot(s),t=T.get(v.lang);
  for(const e of document.querySelectorAll('[data-news-i18n]'))e.textContent=t[e.dataset.newsI18n];
  $('newsEnabled').checked=v.enabled;$('newsEnabled').disabled=busy;$('newsRefresh').disabled=busy||!v.enabled;
  const count=v.articles.filter(a=>!v.read[a.id]).length;let text=busy?t.loading:note?(t[note]||t.error):!v.enabled?t.disabled:v.error?t[v.error]||t.error:count?T.format(t.unread,{count}):v.articles.length?t.allRead:t.empty;
  if(v.checkedAt)text+=' · '+T.format(t.updated,{time:new Date(v.checkedAt).toLocaleTimeString(v.lang,{hour:'2-digit',minute:'2-digit'})});
  $('newsStatus').textContent=text;
 }catch{$('newsStatus').textContent=T.get('en').error;}
}
async function request(action){
 let retry=false;busy=true;note='';render();try{const r=await chrome.runtime.sendMessage({type:'yuanyuan-news',action});if(!r?.ok)throw Error('fetch');retry=r.view.notice==='cancelled'&&r.view.enabled;note=r.view.notice==='cooldown'?'cooldown':r.view.error||'';}catch{note='error';}finally{busy=false;render();if(retry)queueMicrotask(()=>request('get'));}
}
$('newsEnabled').addEventListener('change',async e=>{
 const enabled=e.target.checked;busy=true;note='';e.target.disabled=true;
 try{
  if(enabled&&!await chrome.permissions.request({origins:[N.origin]})){e.target.checked=false;note='permission';return;}
  await chrome.storage.local.set({newsEnabled:enabled});if(enabled){busy=false;await request('get');}
 }catch{note='error';}finally{busy=false;render();}
});
$('newsRefresh').onclick=()=>request('refresh');
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&['newsEnabled','language','newsCache','newsRead'].some(k=>changes[k])){if(changes.language)note='';render().then(async()=>{if(changes.language&&!busy&&(await chrome.storage.local.get('newsEnabled')).newsEnabled)request('get');});}});
render().then(async()=>{const s=await chrome.storage.local.get('newsEnabled');if(s.newsEnabled)request('get');});
})();
