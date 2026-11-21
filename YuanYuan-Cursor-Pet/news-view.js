(() => {
'use strict';
const N=YuanYuanNews,T=YuanYuanNewsText;
const css='.news-view{font:13px/1.65 system-ui,sans-serif;color:#35463c;background:#fffdf5;border:1px solid #d7dfcf;border-radius:14px;padding:16px;box-sizing:border-box;overflow-wrap:anywhere}.news-view *{box-sizing:border-box}.news-view h2{font-size:17px;margin:0}.news-view h3{font-size:14px;margin:0}.news-view p{margin:8px 0}.news-view .news-muted{font-size:11px;color:#6e7666}.news-view .news-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.news-view button,.news-view .news-manage{font:600 12px/1.4 system-ui;cursor:pointer;border:1px solid #bfcbb4;border-radius:8px;padding:9px 12px;background:#edf2e5;color:#345538;text-decoration:none}.news-view button:disabled{opacity:.5;cursor:wait}.news-view button:focus-visible,.news-view a:focus-visible{outline:3px solid #bf893f;outline-offset:3px}.news-view a{color:#315b47}.news-view article{border-top:1px solid #e0e4d8;margin-top:12px;padding-top:12px}.news-view article a{font-size:15px;font-weight:650;text-decoration:none}.news-view article a:hover{text-decoration:underline}.news-view .news-category{display:inline-block;font-size:10px;padding:2px 7px;background:#eef0df;border-radius:8px}.news-view .news-meta{font-size:11px;color:#777b6e}.news-view .news-read{opacity:.65}.news-view .news-translation{padding:8px;background:#eef4e9;border-radius:7px}.news-view details{margin-top:15px;border-top:1px solid #e0e4d8;padding-top:10px}.news-view summary{cursor:pointer}.news-view .news-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}';
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function mount(container,options={}){
 const style=node('style');style.textContent=css;const root=node('section',undefined,'news-view');container.append(style,root);
 let view={enabled:false,lang:'en',articles:[],read:{}},busy=false,notice='',closed=false;
 const tr=()=>T.get(view.lang),fmt=(key,vars)=>T.format(tr()[key],vars);
 function label(){if(notice)return tr()[notice]||tr().error;if(!view.enabled)return tr().disabled;if(view.error)return tr()[view.error]||tr().error;if(!view.articles.length)return tr().empty;if(view.articles.every(a=>view.read[a.id]))return tr().allRead;return fmt('unread',{count:view.articles.filter(a=>!view.read[a.id]).length});}
 function render(){
  if(closed)return;const t=tr();root.lang=view.lang;root.replaceChildren();
  const bar=node('div',undefined,'news-toolbar');bar.append(node('h2',t.title));
  if(options.onClose){const close=node('button',t.close);close.onclick=options.onClose;bar.append(close);}root.append(bar,node('p',t.intro,'news-muted'));
  const status=node('p',busy?t.loading:label());status.setAttribute('role','status');root.append(status);
  if(view.enabled)for(const a of view.articles){
   const article=node('article',undefined,view.read[a.id]?'news-read':'');article.dataset.newsId=a.id;
   const link=node('a',a.title);link.href=N.safeURL(a.url)||'#';link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-disabled',String(busy));link.onclick=e=>{if(busy){e.preventDefault();return;}request('read',a.id);};
   const date=new Date(a.publishedAt).toLocaleString(view.lang);article.append(node('span',t.categories[a.category]||t.categories[0],'news-category'),node('h3'));article.lastChild.append(link);article.append(node('p',a.source+' · '+date,'news-meta'));
   const actions=node('div',undefined,'news-actions'),read=node('button',t.read);read.disabled=Boolean(view.read[a.id])||busy;read.onclick=()=>request('read',a.id);actions.append(read);
   if(options.ai){const translate=node('button',t.aiTranslate);translate.onclick=()=>translateTitle(a,article,translate);actions.append(translate);}
   article.append(actions);root.append(article);
  }
  const actions=node('div',undefined,'news-actions'),refresh=node('button',t.refresh);refresh.disabled=busy||!view.enabled;refresh.onclick=()=>request('refresh');actions.append(refresh);if(options.ai){const manage=node('a',t.manage,'news-manage');manage.href='popup.html';actions.append(manage);}root.append(actions);
  let region=view.edition||'';try{region=new Intl.DisplayNames([view.lang],{type:'region'}).of(region)||region;}catch{}
  if(view.enabled)root.append(node('p',fmt('edition',{region}),'news-muted'));
  if(view.checkedAt)root.append(node('p',fmt('updated',{time:new Date(view.checkedAt).toLocaleString(view.lang)}),'news-muted'));
  root.append(node('p',t.hint,'news-muted'),node('p',t.localOnly,'news-muted'));
  if(options.ai){const details=node('details'),summary=node('summary',t.aiTitle),check=node('button',t.aiCheck),result=node('p',t.aiHint,'news-muted');check.onclick=async()=>{check.disabled=true;try{result.textContent=await aiStatus(view.lang);}finally{check.disabled=false;}};details.append(summary,node('p',t.aiHint,'news-muted'),check,result);root.append(details);}
 }
 async function request(action,id){
  if(closed||busy)return;let retry=false;busy=true;notice='';render();
  try{const response=await chrome.runtime.sendMessage({type:'yuanyuan-news',action,id});if(closed)return;if(!response?.ok)throw Error('fetch');view=response.view;retry=view.notice==='cancelled'&&view.enabled;notice=view.notice==='cooldown'?'cooldown':'';options.onState?.(view);}
  catch{notice='error';}finally{busy=false;render();if(retry&&!closed)queueMicrotask(()=>request('get'));}
 }
 async function sync(){try{const s=await chrome.storage.local.get(['newsEnabled','language','newsCache','newsRead']);if(closed)return;view=N.snapshot(s);render();options.onState?.(view);}catch{}}
 const changed=(c,area)=>{if(area==='local'&&['newsEnabled','language','newsCache','newsRead'].some(k=>c[k])){sync().then(()=>{if((c.language||c.newsEnabled?.newValue===true)&&view.enabled&&!closed)request('get');});}};chrome.storage.onChanged.addListener(changed);
 sync().then(()=>{if(view.enabled&&!closed)request('get');});
 return {request,sync,getView:()=>view,destroy(){closed=true;try{chrome.storage.onChanged.removeListener(changed);}catch{}root.remove();style.remove();}};
}
const rootLang=lang=>lang.startsWith('zh')?'zh':lang.split('-')[0];
function sourceLang(title,fallback){if(/[\u3040-\u30ff]/u.test(title))return 'ja';if(/[\uac00-\ud7af]/u.test(title))return 'ko';if(/[\u3400-\u9fff]/u.test(title))return 'zh';if(/[A-Za-z]/.test(title))return 'en';return rootLang(fallback);}
async function aiStatus(lang){
 const t=T.get(lang);if(!('Translator' in globalThis))return t.aiUnavailable;
 try{const targetLanguage=rootLang(lang),sourceLanguage=targetLanguage==='en'?'ja':'en';const result=await Translator.availability({sourceLanguage,targetLanguage});return result==='available'?t.aiAvailable:result==='unavailable'?t.aiUnavailable:t.aiDownload;}catch{return t.aiUnavailable;}
}
async function translateTitle(article,container,button){
 let lang=article.language;try{lang=N.language((await chrome.storage.local.get('language')).language);}catch{return;}const t=T.get(lang);
 container.querySelector('.news-translation')?.remove();const output=node('p',t.loading,'news-translation');container.append(output);button.disabled=true;let translator;
 try{
  if(!('Translator' in globalThis)){output.textContent=t.aiUnavailable;return;}
  const targetLanguage=rootLang(lang),sourceLanguage=sourceLang(article.title,article.language);
  if(sourceLanguage===targetLanguage){output.textContent=t.aiSame;return;}
  const availability=await Translator.availability({sourceLanguage,targetLanguage});if(availability!=='available'){output.textContent=availability==='unavailable'?t.aiUnavailable:t.aiDownload;return;}
  translator=await Translator.create({sourceLanguage,targetLanguage});output.textContent=t.translation+'：'+await translator.translate(article.title);
 }catch{output.textContent=t.aiError;}finally{translator?.destroy();button.disabled=false;}
}
globalThis.YuanYuanNewsView={mount,css,aiStatus};
})();
