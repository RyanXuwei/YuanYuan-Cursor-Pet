'use strict';
importScripts('translations.js','cage.js','pet-schema.js','pet-store.js');
const cage=globalThis.YuanYuanCage;
let writes=Promise.resolve(),menus=Promise.resolve();
function updateSites(action,host){
 const operation=writes.catch(()=>{}).then(async()=>{
  const valid=cage.normalize([host])[0];if(!valid)throw Error('Invalid website');
  const saved=await chrome.storage.local.get('cageSites'),sites=cage.normalize(saved.cageSites);
  const next=action==='add'?cage.normalize([...sites,valid]):sites.filter(h=>h!==valid);
  await chrome.storage.local.set({cageSites:next});return next;
 });
 writes=operation;return operation;
}
function createMenu(options){return new Promise((resolve,reject)=>{chrome.contextMenus.create(options,()=>{const error=chrome.runtime.lastError;if(error)reject(Error(error.message));else resolve();});});}
function rebuildMenus(){
 menus=menus.catch(()=>{}).then(async()=>{
  const saved=await chrome.storage.local.get('language'),tr=globalThis.YuanYuanI18n.get(saved.language);
  await chrome.contextMenus.removeAll();
  const options={contexts:['page','frame','selection','link','image','editable','video','audio'],documentUrlPatterns:['http://*/*','https://*/*']};
  await createMenu({...options,id:'yuanyuan-cage',title:tr.cageTitle});
  await createMenu({...options,id:'yuanyuan-cage-add',parentId:'yuanyuan-cage',title:tr.cageAdd});
  await createMenu({...options,id:'yuanyuan-cage-remove',parentId:'yuanyuan-cage',title:tr.cageRemove});
 });return menus;
}
chrome.runtime.onInstalled.addListener(()=>{rebuildMenus().catch(console.error);});
chrome.runtime.onStartup.addListener(()=>{rebuildMenus().catch(console.error);});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.language)rebuildMenus().catch(console.error);});
async function onCageClick(info){
 if(!['yuanyuan-cage-add','yuanyuan-cage-remove'].includes(info.menuItemId))return;
 const host=cage.hostname(info.pageUrl);
 if(host)await updateSites(info.menuItemId==='yuanyuan-cage-add'?'add':'remove',host);
}
chrome.contextMenus.onClicked.addListener(info=>{onCageClick(info).catch(console.error);});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=='yuanyuan-cage-remove'||sender.url!==chrome.runtime.getURL('popup.html'))return;
 updateSites('remove',message.hostname).then(sites=>reply({ok:true,sites}),()=>reply({ok:false}));
 return true;
});

let petCache=null;
async function serializedPet(){
 const saved=await chrome.storage.local.get('customPet'),meta=saved.customPet;
 if(!meta)return {ok:true,meta:null};
 if(petCache?.id===meta.id)return petCache.promise;
 const promise=(async()=>{
  const pack=await globalThis.YuanYuanPetStore.get(meta.id);
  if(!pack)throw Error('Custom pet pack is missing');
  const assets={};let size=0;
  for(const spec of globalThis.YuanYuanPetSchema.sheets){
   const asset=pack.assets[spec.id];if(!asset?.blob)throw Error('Incomplete custom pet pack');
   size+=asset.blob.size;if(size>globalThis.YuanYuanPetSchema.maxPackBytes)throw Error('Custom pet pack too large');
   const bytes=new Uint8Array(await asset.blob.arrayBuffer());let binary='';
   for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
   assets[spec.id]={base64:btoa(binary),width:asset.width,height:asset.height};
  }
  return {ok:true,meta:{id:pack.id,name:pack.name},assets};
 })();petCache={id:meta.id,promise};return promise;
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.customPet)petCache=null;});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=='yuanyuan-custom-pet-get'||sender.id!==chrome.runtime.id)return;
 serializedPet().then(reply,()=>reply({ok:false,error:'Custom pet could not be loaded'}));return true;
});
