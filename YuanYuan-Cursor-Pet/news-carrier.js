(() => {
'use strict';
function mount(shadow,signal){
 const style=document.createElement('style');style.textContent='.news-paper{position:absolute;pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1px solid #927c56;border-radius:2px;background:linear-gradient(135deg,#fff9df 76%,#e2d4b3 77%);box-shadow:0 2px 4px #0003;color:#4d5646;padding:2px;z-index:3;font:700 17px/1 system-ui;touch-action:manipulation}.news-paper::before{content:"";width:65%;height:55%;border-top:3px solid #74816b;border-bottom:2px solid #9aa28e;background:repeating-linear-gradient(0deg,transparent 0 3px,#aab09c 3px 4px)}.news-paper small{position:absolute;right:-6px;top:-7px;border-radius:10px;background:#ad5138;color:white;font:700 10px/16px system-ui;min-width:16px;text-align:center}.news-paper:focus-visible{outline:3px solid #c79a41;outline-offset:3px}.news-paper[hidden],.news-reader-card[hidden]{display:none!important}.news-reader-card{position:fixed;pointer-events:auto;z-index:4;width:min(360px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain;border-radius:14px;box-shadow:0 8px 35px #0004}';
 const paper=document.createElement('button');paper.type='button';paper.className='news-paper';paper.hidden=true;const count=document.createElement('small');paper.append(count);
 const panel=document.createElement('div');panel.className='news-reader-card';panel.hidden=true;panel.setAttribute('role','region');shadow.append(style,paper,panel);
 let view={enabled:false,articles:[],read:{},lang:'en'},pose=null,dead=false,lastCheck='',timer;
 const viewer=YuanYuanNewsView.mount(panel,{onClose:()=>{panel.hidden=true;paper.focus();},onState:v=>{view=v;const t=YuanYuanNewsText.get(v.lang),unread=v.articles.filter(a=>!v.read[a.id]).length;count.textContent=String(unread);paper.title=t.title;paper.setAttribute('aria-label',t.title+' · '+YuanYuanNewsText.format(t.unread,{count:unread}));panel.setAttribute('aria-label',t.title);if(!v.enabled){paper.hidden=true;panel.hidden=true;}if(pose)update(pose);queueMicrotask(fitPanel);}});
 function update(next){
  pose=next;if(dead)return;const unread=view.articles.filter(a=>!view.read[a.id]).length;
  const hide=!next.visible||['held','dropFall','bubble','bubbleFall','sleep','treat','fetch','peek'].includes(next.state);
  paper.hidden=!view.enabled||!unread||hide;
  if(hide)panel.hidden=true;
  const width=Math.max(28,Math.min(48,next.w*.4)),height=width*.65;
  const px=Math.max(4,Math.min(innerWidth-width-4,next.x+next.w*(next.moving?(next.flip?.12:.75):.48)-width/2)),py=Math.max(4,Math.min(innerHeight-height-4,next.y+next.h*.47));
  paper.style.width=width+'px';paper.style.height=height+'px';paper.style.transform='translate('+px+'px,'+py+'px) rotate('+(next.flip?8:-8)+'deg)';
 }
 function fitPanel(){if(panel.hidden)return;const rect=panel.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(innerWidth-rect.width-12,parseFloat(panel.style.left)||12))+'px';panel.style.top=Math.max(12,Math.min(innerHeight-rect.height-12,parseFloat(panel.style.top)||12))+'px';}
 paper.onclick=e=>{e.stopPropagation();panel.hidden=!panel.hidden;if(!panel.hidden){panel.style.left=((pose?.x||0)+(pose?.w||96)+12)+'px';panel.style.top=(pose?.y||12)+'px';fitPanel();panel.querySelector('button')?.focus();}};
 addEventListener('resize',fitPanel,{signal});
 panel.addEventListener('click',e=>e.stopPropagation(),{signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;paper.focus();}},{signal});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDay();},{signal});
 function checkDay(){const day=YuanYuanNews.day()+YuanYuanNews.zone();if(view.enabled&&day!==lastCheck&&!document.hidden){lastCheck=day;viewer.request('get');}}
 // Only a date check; no repeated network polling while today's cache is valid.
 timer=setInterval(checkDay,60000);
 return {update,destroy(){dead=true;clearInterval(timer);viewer.destroy();paper.remove();panel.remove();style.remove();}};
}
globalThis.YuanYuanNewsCarrier={mount};
})();
