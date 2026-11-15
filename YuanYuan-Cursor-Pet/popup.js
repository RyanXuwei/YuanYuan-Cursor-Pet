'use strict';
const policy=globalThis.YuanYuanPolicy,i18n=globalThis.YuanYuanI18n;
const defaults={enabled:true,size:96,mischief:2,language:'auto',allowed:[...policy.ids]};
const htmlLang={en:'en','zh-TW':'zh-Hant','zh-CN':'zh-Hans',ja:'ja',ko:'ko'};
let settings={...defaults},statusKey='ready';
const $=id=>document.getElementById(id),status=$('status');
const t=()=>i18n.get(settings.language);
async function save(change){
 try{await chrome.storage.local.set(change);Object.assign(settings,change);statusKey='saved';}
 catch{statusKey='error';}
 render();
}
function render(){
 const tr=t();
 document.documentElement.lang=htmlLang[i18n.resolve(settings.language)];document.title=tr.appName;$('icon').alt=tr.iconAlt;$('studioLogo').alt=tr.logoAlt;$('version').textContent=chrome.runtime.getManifest().version;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=tr[el.dataset.i18n];
 [...$('mischief').options].forEach((o,i)=>o.textContent=tr.profiles[i]);
 $('language').options[0].textContent=tr.auto;
 status.textContent=tr[statusKey];
 const p=policy.profile(settings.mischief);
 $('policyHint').textContent=i18n.format(tr.gap,{min:p.gap[0],max:p.gap[1]});
 const allowed=settings.allowed;
 const total=allowed.reduce((n,id)=>n+policy.weight(id,settings.mischief),0);
 policy.ids.forEach((id,i)=>{
  $('allow-'+id).checked=allowed.includes(id);
  $('name-'+id).textContent=tr.behaviors[i];
  const weight=allowed.includes(id)?policy.weight(id,settings.mischief):0;
  $('chance-'+id).textContent=i18n.format(tr.chance,{percent:(total?100*weight/total:0).toFixed(1),seconds:Math.round(policy.cooldownMs(id,settings.mischief)/1000)});
 });
}
for(const code of ['auto',...i18n.codes]){const o=document.createElement('option');o.value=code;o.textContent=i18n.names[code]||'';$('language').append(o);}
for(const id of policy.ids){
 const row=document.createElement('label');row.className='behavior-row';
 const check=document.createElement('input');check.type='checkbox';check.id='allow-'+id;
 const name=document.createElement('span');name.id='name-'+id;
 const chance=document.createElement('small');chance.id='chance-'+id;
 row.append(check,name,chance);$('allowed').append(row);
 check.addEventListener('change',()=>save({allowed:policy.ids.filter(key=>$('allow-'+key).checked)}));
}
chrome.storage.local.get(null).then(saved=>{
 const s={...defaults,...saved,allowed:policy.allowedFor(saved)};
 if(!['auto',...i18n.codes].includes(s.language))s.language='auto';
 settings={...s,allowed:s.allowed.filter(id=>policy.ids.includes(id))};
 $('enabled').checked=s.enabled;$('size').value=s.size;$('sizeValue').textContent=s.size+' px';
 $('mischief').value=s.mischief;$('language').value=s.language;render();
});
render();
$('enabled').addEventListener('change',e=>save({enabled:e.target.checked}));
$('size').addEventListener('change',e=>save({size:Number(e.target.value)}));
$('size').addEventListener('input',e=>$('sizeValue').textContent=e.target.value+' px');
$('mischief').addEventListener('change',e=>save({mischief:Number(e.target.value)}));
$('language').addEventListener('change',e=>save({language:e.target.value}));
