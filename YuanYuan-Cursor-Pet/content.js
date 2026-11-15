(() => {
'use strict';
if(document.getElementById('yuanyuan-cursor-pet'))return;
const policy=globalThis.YuanYuanPolicy;
const defaults={enabled:true,size:96,mischief:2,language:'auto',allowed:[...policy.ids]};
const i18n=globalThis.YuanYuanI18n;
const lastUsed={};
const poses={sleep:['daily',0],treat:['daily',1],pee:['daily',2],walk:['daily',3],angry:['moods',0],bark:['moods',1],affection:['moods',2],watch:['moods',3]};
const durations={sleep:18000,treat:5200,pee:7600,angry:3800,bark:3000,affection:6500,watch:11000,fetch:24000,walk:14000};
const counts=[6,8,8,4,5,8,6,6,6];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let settings={...defaults},x=100,y=100,mouse={x:180,y:180},lastMove=performance.now(),state='chase',started=performance.now(),until=started+6000,last=0,raf=0;
let facing=1,gait=0,explore={x:100,y:100},idleSince=0,renderKey='',peeReady=0;
let holdMotion={angle:0,velocity:0,target:0,lastX:0,lastT:0},landingUntil=0;
const bowlW=()=>Math.round(settings.size*.6),bowlH=()=>Math.round(settings.size*.6*50/58);
let bowlPos={x:Math.max(0,innerWidth-74),y:Math.max(0,innerHeight-54)},bowlDrag=null,skipBowlClick=false;
let bubble=null,fall=null,edge=null,digReady=0,digSpot=null,hole=null;
let puddle=null,dogDrag=null,eatReady=0,bowlFull=false,foodPending=Infinity,closeReady=0;
let ball={x:Math.max(20,innerWidth-130),y:innerHeight,vx:0,vy:0,r:17,hop:0,sleeping:true,phase:'out',since:0,home:{x:100,y:100}},drag=null;
const ballFloor=()=>globalThis.YuanYuanPhysics.floorY(innerHeight,ball.r);
function dropBallHere(hop=20){ball.vx=0;globalThis.YuanYuanPhysics.launch(ball,hop);}
const host=document.createElement('div');host.id='yuanyuan-cursor-pet';
host.style.cssText='all:initial!important;position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;overflow:hidden!important;z-index:2147483647!important;pointer-events:none!important;';
const shadow=host.attachShadow({mode:'closed'}),style=document.createElement('style');
style.textContent=':host{pointer-events:none}.pet{position:absolute;pointer-events:auto;touch-action:none;cursor:grab;will-change:transform}.sprite{width:192px;height:208px;transform-origin:top left;background-repeat:no-repeat}.ball{position:absolute;width:38px;height:38px;box-sizing:border-box;border:2px solid #cd6c23;border-radius:50%;background:radial-gradient(circle at 30% 25%,#ffe69b,#ee8b30 65%);box-shadow:0 2px 4px #0002;pointer-events:auto;cursor:grab;touch-action:none;padding:0}.ball:focus-visible{outline:3px solid #5584c4;outline-offset:3px}.ball[hidden]{display:none}.heart{position:absolute;bottom:80%;left:68%;font:20px system-ui;opacity:0;color:#d87083}';
const pet=document.createElement('div');pet.className='pet';pet.setAttribute('aria-label',i18n.get('auto').petAria);
const sprite=document.createElement('div');sprite.className='sprite';
// Suppress low-opacity matte residue in generated fur sprites at render time.
const svgNS='http://www.w3.org/2000/svg';
const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';
const defs=document.createElementNS(svgNS,'defs'),filter=document.createElementNS(svgNS,'filter');filter.id='yuanyuan-alpha-clean';
const transfer=document.createElementNS(svgNS,'feComponentTransfer'),alpha=document.createElementNS(svgNS,'feFuncA');
alpha.setAttribute('type','linear');alpha.setAttribute('slope','3');alpha.setAttribute('intercept','-2');transfer.append(alpha);filter.append(transfer);defs.append(filter);svg.append(defs);shadow.append(svg);
sprite.style.filter='url(#yuanyuan-alpha-clean)';
const heart=document.createElement('span');heart.className='heart';heart.textContent='♥';
const toy=document.createElement('button');toy.className='ball';toy.type='button';toy.hidden=false;
pet.append(sprite,heart);shadow.append(style,pet,toy);document.documentElement.append(host);
const peeLayer=document.createElementNS(svgNS,'svg');peeLayer.classList.add('pee-effect');peeLayer.setAttribute('viewBox','0 0 192 208');peeLayer.setAttribute('aria-hidden','true');peeLayer.style.cssText='position:absolute;pointer-events:none;overflow:visible;';
const urine=document.createElementNS(svgNS,'path');urine.setAttribute('d','M 90 150 Q 70 174 34 193');urine.setAttribute('fill','none');urine.setAttribute('stroke','#e1bd37');urine.setAttribute('stroke-width','2.4');urine.setAttribute('stroke-linecap','round');urine.setAttribute('stroke-dasharray','4 3');
const stain=document.createElementNS(svgNS,'ellipse');stain.setAttribute('cx','34');stain.setAttribute('cy','195');stain.setAttribute('ry','3.3');stain.setAttribute('fill','#dec65b');peeLayer.append(stain,urine);shadow.append(peeLayer);peeLayer.style.display='none';
const bowl=document.createElement('button');bowl.className='bowl';bowl.type='button';bowl.style.cssText='position:absolute;width:58px;height:50px;border:0;background:transparent center/contain no-repeat;pointer-events:auto;cursor:pointer;padding:0;filter:url(#yuanyuan-alpha-clean)';shadow.append(bowl);
toy.style.background='transparent center/contain no-repeat';toy.style.backgroundImage='url("'+chrome.runtime.getURL('assets/ball.png')+'")';toy.style.border='0';toy.style.filter='url(#yuanyuan-alpha-clean)';
pet.style.cursor='url("'+chrome.runtime.getURL('assets/hand-open.png')+'") 16 16, grab';
style.textContent+='.bubble{position:absolute;pointer-events:auto;cursor:pointer;border-radius:50%;clip-path:circle(50%);border:1.5px solid #c8eafa99;background:radial-gradient(ellipse at 28% 18%,#fff9 0%,#fff0 15%),radial-gradient(ellipse at 75% 82%,#f5b6e433,#def8ff08 45%,#8ac9ed26 85%,#efffff99 100%);box-shadow:inset 4px 5px 14px #fff5,inset -4px -4px 15px #c0b4ef33,0 0 7px #b5e9ff33;padding:0;appearance:none}.bubble::before{content:"";position:absolute;left:20%;top:12%;width:27%;height:11%;border-top:3px solid #ffffffe0;border-radius:50%;transform:rotate(-30deg)}.bubble[hidden]{display:none}.bubble:focus-visible{outline:3px solid #80b4e3;outline-offset:4px}';
const bubbleButton=document.createElement('button');bubbleButton.className='bubble';bubbleButton.type='button';bubbleButton.hidden=true;shadow.append(bubbleButton);
const burst=document.createElement('div');burst.style.cssText='position:absolute;pointer-events:none;border:3px dotted #c5ecff;border-radius:50%;opacity:0;box-sizing:border-box';burst.setAttribute('aria-hidden','true');shadow.append(burst);
const digFX=document.createElementNS(svgNS,'svg');digFX.classList.add('dig-effect');digFX.setAttribute('viewBox','0 0 192 208');digFX.style.cssText='position:absolute;pointer-events:none;overflow:visible;display:none';digFX.setAttribute('aria-hidden','true');
const pit=document.createElementNS(svgNS,'ellipse');pit.setAttribute('cx','160');pit.setAttribute('cy','204');pit.setAttribute('ry','5');pit.setAttribute('fill','#493326');pit.setAttribute('stroke','#9e7856');pit.setAttribute('stroke-width','2');
digFX.append(pit);const chips=Array.from({length:7},(_,i)=>{const c=document.createElementNS(svgNS,'ellipse');c.setAttribute('rx',String(1.5+i%3));c.setAttribute('ry','1.5');c.setAttribute('fill',i%2?'#a77a4c':'#795638');digFX.append(c);return c;});shadow.append(digFX);
function popBubble(){
 if(state!=='bubble')return;
 const w=settings.size,h=w*208/192,d=Math.max(w*1.6,h*1.45);
 if(!reduced){burst.style.left=(x+w/2-d/2)+'px';burst.style.top=(y+h/2-d/2)+'px';burst.style.width=d+'px';burst.style.height=d+'px';burst.animate([{opacity:.85,transform:'scale(1)'},{opacity:0,transform:'scale(1.25)'}],{duration:420,fill:'forwards'});}
 fall={vy:0,targetY:bounds().my};choose('bubbleFall',performance.now());until=Infinity;
}
bubbleButton.addEventListener('click',e=>{e.stopPropagation();popBubble();});
function foodPosition(){bowlPos.x=clamp(bowlPos.x,0,Math.max(0,innerWidth-bowlW()));bowlPos.y=clamp(bowlPos.y,0,Math.max(0,innerHeight-bowlH()));return bowlPos;}
bowl.style.touchAction='none';bowl.style.cursor='grab';
bowl.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();bowl.setPointerCapture(e.pointerId);const pos=foodPosition();bowlDrag={id:e.pointerId,ox:e.clientX-pos.x,oy:e.clientY-pos.y,startX:e.clientX,startY:e.clientY,moved:false};bowl.style.cursor='grabbing';});
bowl.addEventListener('pointermove',e=>{if(bowlDrag?.id!==e.pointerId)return;e.stopPropagation();if(Math.hypot(e.clientX-bowlDrag.startX,e.clientY-bowlDrag.startY)>6)bowlDrag.moved=true;if(bowlDrag.moved){bowlPos={x:clamp(e.clientX-bowlDrag.ox,0,Math.max(0,innerWidth-bowlW())),y:clamp(e.clientY-bowlDrag.oy,0,Math.max(0,innerHeight-bowlH()))};if(state==='treat'){eatReady=0;until=performance.now()+30000;}}});
function dropBowl(e){if(bowlDrag?.id!==e.pointerId)return;e.stopPropagation();skipBowlClick=bowlDrag.moved;bowlDrag=null;bowl.style.cursor='grab';if(bowlFull)foodPending=performance.now()+400;}
bowl.addEventListener('pointerup',dropBowl);bowl.addEventListener('pointercancel',dropBowl);bowl.addEventListener('lostpointercapture',dropBowl);
bowl.addEventListener('click',e=>{e.stopPropagation();if(skipBowlClick&&e.detail!==0){skipBowlClick=false;return;}skipBowlClick=false;bowlFull=true;foodPending=performance.now()+800+Math.random()*1200;});

function bounds(){return {mx:Math.max(0,innerWidth-settings.size),my:Math.max(0,innerHeight-settings.size*208/192)};}
function nearby(radius=260){const {mx,my}=bounds();return {x:clamp(x+(Math.random()-.5)*radius,0,mx),y:clamp(y+(Math.random()-.5)*radius*.6,0,my)};}
function throwBall(px,py,now=performance.now(),vx=0,vy=0){
 until=now+24000;
 ball={x:clamp(px,ball.r,Math.max(ball.r,innerWidth-ball.r)),y:clamp(py,ball.r,ballFloor()),vx,vy:0,r:ball.r,hop:0,sleeping:false,phase:'flight',since:now,home:{x,y}};globalThis.YuanYuanPhysics.launch(ball);
 if(settings.allowed.includes('fetch')&&!dogDrag&&!['bubble','bubbleFall'].includes(state))choose('fetch',now);
}
function choose(next,now){
 state=next;bubbleButton.hidden=next!=='bubble';started=now;until=now+(durations[next]||6000);if(policy.ids.includes(next))lastUsed[next]=now;idleSince=0;
 if(next!=='fetch'&&['catch','return'].includes(ball.phase)){ball.phase='out';dropBallHere(20);}
 if(next==='treat'){eatReady=0;until=now+30000;}
 if(next==='bubble'){bubble={vx:(Math.random()<.5?-1:1)*28,vy:-22};until=now+22000;}
 if(next==='peek'){edge={side:['left','right','bottom'][Math.floor(Math.random()*3)],ready:0,retractUntil:0};until=now+20000;}
 if(next==='dig'){digSpot=nearby(130);digSpot.y=Math.min(digSpot.y,Math.max(0,bounds().my-16));digReady=0;until=now+23000;}
 if(next==='curious'){closeReady=0;until=now+20000;}
 if(next==='walk'||next==='explore')explore=nearby(next==='walk'?500:260);
 if(next==='pee'){const {mx,my}=bounds();explore={x:x<mx/2?12:Math.max(0,mx-12),y:clamp(y+80,0,my)};peeReady=0;until=now+18000;}
 if(next==='fetch'){ball.home={x,y};if(ball.phase!=='flight'&&ball.phase!=='drag')ball.phase='out';}
}
function nextAuto(now){return policy.pick({policy:settings.mischief,allowed:settings.allowed,now,lastUsed,idleMs:now-lastMove,width:innerWidth,height:innerHeight,foodAvailable:bowlFull});}
function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
let fsHidden=false;const fsQuery=matchMedia('(display-mode: fullscreen)');
function isFullscreen(){
 if(document.fullscreenElement||document.webkitFullscreenElement)return true;   // video / player / whole-page fullscreen (YouTube etc.)
 return fsQuery.matches;                                                       // browser fullscreen (F11)
}
function showHost(){host.style.setProperty('display',settings.enabled&&!fsHidden?'block':'none','important');host.dataset.fullscreenHidden=String(fsHidden);}
function updateFullscreen(){const v=isFullscreen();if(v===fsHidden)return;fsHidden=v;if(fsHidden){dogDrag=null;drag=null;bowlDrag=null;stop();}showHost();if(!fsHidden)start();}
function start(){if(settings.enabled&&!fsHidden&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
function localize(){const t=i18n.get(settings.language);pet.setAttribute('aria-label',t.petAria);toy.title=t.ballTitle;toy.setAttribute('aria-label',t.ballAria);bowl.title=t.bowlTitle;bowl.setAttribute('aria-label',t.bowlAria);bubbleButton.setAttribute('aria-label',t.bubbleAria);}
function apply(value){
 settings={...defaults,...value};settings.size=clamp(Number(settings.size)||96,48,160);settings.mischief=Math.round(clamp(Number(settings.mischief)||0,0,3));settings.allowed=Array.isArray(settings.allowed)?settings.allowed.filter(id=>policy.ids.includes(id)):[...policy.ids];
 showHost();localize();pet.style.width=settings.size+'px';pet.style.height=settings.size*208/192+'px';ball.r=Math.max(9,Math.round(settings.size*.4/2));const oldW=parseFloat(bowl.style.width)||58,oldH=parseFloat(bowl.style.height)||50;bowl.style.width=bowlW()+'px';bowl.style.height=bowlH()+'px';bowlPos.x+=oldW-bowlW();bowlPos.y+=oldH-bowlH();
 dogDrag=null;drag=null;bowlDrag=null;pet.style.cursor='url("'+chrome.runtime.getURL('assets/hand-open.png')+'") 16 16, grab';if(ball.phase==='drag'){ball.phase='out';dropBallHere();}choose('idle',performance.now());until=performance.now()+1200;stop();start();
}
function tick(now){
 raf=0;if(!settings.enabled||fsHidden||document.hidden)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;
 if(state==='bubble'&&now>until)popBubble();
 if(!dogDrag&&now>until){if(state==='treat'&&eatReady)bowlFull=false;if(state==='idle'){choose(nextAuto(now),now);if(state==='idle')until=now+3000;}else{choose('idle',now);until=now+policy.gapMs(settings.mischief);}}
 const w=settings.size,h=w*208/192,{mx,my}=bounds(),t=(now-started)/1000;
 if(!dogDrag&&bowlFull&&state==='idle'&&now>foodPending&&settings.allowed.includes('treat')&&now-(lastUsed.treat??-Infinity)>=policy.cooldownMs('treat',settings.mischief))choose('treat',now);
 if(['flight','out','done'].includes(ball.phase))globalThis.YuanYuanPhysics.advance(ball,dt,innerWidth,innerHeight);
 const food=foodPosition();bowl.style.transform='translate('+food.x+'px,'+food.y+'px)';bowl.style.backgroundImage='url("'+chrome.runtime.getURL(bowlFull?'assets/bowl-full.png':'assets/bowl-empty.png')+'")';
 bowl.dataset.full=String(bowlFull);bowl.dataset.dragging=String(Boolean(bowlDrag?.moved));

 let tx=mouse.x+28,ty=mouse.y+28,r=0,jump=0,pose=poses[state],slow=false;
 if(state==='shy'){const a=x+w/2-mouse.x,b=y+h/2-mouse.y,d=Math.hypot(a,b)||1;tx=x+a/d*110;ty=y+b/d*90;}
 if(state==='orbit'){tx=mouse.x+Math.cos(t*2.6)*105-w/2;ty=mouse.y+Math.sin(t*2.6)*75-h/2;}
 if(state==='bounce'){r=6;jump=-Math.abs(Math.sin(t*5))*42;}
 if(state==='zoom'){tx=Math.sin(t*2)>0?mx:0;ty=my*.7;}
 if(state==='peek'&&edge){tx=edge.side==='left'?0:edge.side==='right'?mx:clamp(innerWidth*.45,0,mx);ty=edge.side==='bottom'?my:clamp(innerHeight*.55,0,my);if(Math.hypot(tx-x,ty-y)<8&&!edge.ready){edge.ready=now;until=now+10500;}if(edge.ready){tx=x;ty=y;}}
 if(['held','idle','bubble','bubbleFall','dropFall','sleep','dance','sniff','angry','bark','watch'].includes(state)){tx=x;ty=y;}
 if(state==='dance'){r=8;jump=-Math.abs(Math.sin(t*4))*12;}
 if(state==='sniff')r=2;
 if(state==='walk'||state==='explore'){tx=explore.x;ty=explore.y;slow=true;if(Math.hypot(tx-x,ty-y)<6&&t>1&&state==='walk'&&now%3500<60)explore=nearby(440);}
 if(state==='treat'){tx=clamp(food.x+bowlW()/2-w*.72,0,mx);ty=clamp(food.y+bowlH()-h,0,my);slow=Math.hypot(tx-x,ty-y)<w*1.5;if(Math.hypot(tx-x,ty-y)<7&&!bowlDrag?.moved){tx=x;ty=y;if(!eatReady){eatReady=now;until=now+5200;}}else{pose=null;if(eatReady){eatReady=0;until=now+30000;}}}
 if(state==='curious'){tx=(innerWidth-w)/2;ty=my;if(Math.hypot(tx-x,ty-y)<8){tx=x;ty=y;if(!closeReady){closeReady=now;until=now+6500;}}}
 if(state==='dig'){tx=digSpot.x;ty=digSpot.y;slow=true;if(Math.hypot(tx-x,ty-y)<7){tx=x;ty=y;if(!digReady){digReady=now;until=now+10000;}}}
 if(state==='affection'){tx=mouse.x-w*.35;ty=mouse.y+20;}
 if(state==='pee'){tx=explore.x;ty=explore.y;slow=true;if(Math.hypot(tx-x,ty-y)<7){tx=x;ty=y;if(!peeReady){peeReady=now;until=now+4800;}}else pose=null;}
 if(state==='fetch'){
  if(ball.phase==='out'||ball.phase==='flight'){tx=clamp(ball.x-w*.68,0,mx);ty=clamp(ball.y-h*.55,0,my);if(Math.hypot(tx-x,ty-y)<12&&Math.hypot(ball.vx,ball.vy)<180){ball.phase='catch';ball.since=now;}}
  if(ball.phase==='catch'){tx=x;ty=y;r=2;if(now-ball.since>450){ball.phase='return';}}
  if(ball.phase==='return'){tx=ball.home.x;ty=ball.home.y;if(Math.hypot(tx-x,ty-y)<10){ball.phase='done';ball.since=now;ball.x=x+w*.75;ball.y=y+h*.6;globalThis.YuanYuanPhysics.launch(ball,globalThis.YuanYuanPhysics.HOP*.3);ball.vx=40*facing;}}
  if(ball.phase==='done'||ball.phase==='drag'){tx=x;ty=y;if(ball.phase==='drag')until=now+12000;}
 }
 tx=clamp(tx,0,mx);ty=clamp(ty,0,my);
 const distance=Math.hypot(tx-x,ty-y),maxSpeed=(state==='zoom'?480:state==='shy'?330:slow?65:220)*(w/96);
 const speed=distance>4?Math.min(maxSpeed,Math.sqrt(2*650*distance)):0,step=reduced?distance:Math.min(distance,speed*dt);
 const dx=distance?(tx-x)/distance*step:0,dy=distance?(ty-y)/distance*step:0;
 x=clamp(x+dx,0,mx);y=clamp(y+dy,0,my);if(Math.abs(dx)>.15)facing=dx>0?1:-1;
 if(state==='bubble'&&bubble){
 const pad=Math.max(w*.3,h*.225)+8;
 const hiX=Math.max(pad,mx-pad),hiY=Math.max(pad,my-pad);
 if(!reduced){x+=bubble.vx*dt;y+=(bubble.vy+Math.sin(t*1.4)*18)*dt;if(x<pad||x>hiX)bubble.vx*=-1;if(y<pad||y>hiY)bubble.vy*=-1;}
 x=clamp(x,pad,hiX);y=clamp(y,pad,hiY);
}
if((state==='bubbleFall'||state==='dropFall')&&fall){const ground=Math.min(my,fall.targetY);fall.vy+=480*dt;y=Math.min(ground,y+(reduced?ground:fall.vy*dt));if(y>=ground){choose('idle',now);landingUntil=now+180;until=now+policy.gapMs(settings.mischief);}}
if(state==='held'){holdMotion.target*=Math.exp(-dt*6);holdMotion.velocity+=((holdMotion.target-holdMotion.angle)*85-holdMotion.velocity*9)*dt;holdMotion.angle=clamp(holdMotion.angle+holdMotion.velocity*dt,-28,28);}

const moving=!reduced&&speed>12&&step>0;
 if(!moving&&state==='chase'){if(!idleSince)idleSince=now;if(now-idleSince>2500)pose=poses.watch;}else idleSince=0;
 if(moving)gait+=step/(w*(slow?.7:.85))*(slow?4:8);
 let sheet='yuanyuan.png',cols=8,rows=11,f=reduced?0:Math.floor(now/165)%counts[r],rr=r,flip=false;
 if(moving&&slow){sheet='yuanyuan-daily.png';cols=4;rows=4;rr=3;f=Math.floor(gait)%4;flip=facing<0;}
 else if(moving){sheet='yuanyuan-run.png';cols=4;rows=2;f=Math.floor(gait)%8;rr=Math.floor(f/4);f%=4;flip=facing<0;}
 else if(pose){sheet='yuanyuan-'+pose[0]+'.png';cols=4;rows=4;rr=pose[1];const clock=state==='pee'?(now-peeReady)/1000:state==='treat'?(now-eatReady)/1000:t;f=reduced?0:Math.floor(clock*(state==='sleep'?.85:state==='watch'?1:state==='bark'?5:2.5))%4;if(state==='pee')f=Math.min(3,Math.floor(clock/1.2));}
 if(state==='idle')f=0;
 if(state==='bubble'||state==='bubbleFall'){sheet='yuanyuan-lifted.png';cols=4;rows=1;rr=0;f=reduced?0:Math.floor(t*3)%4;}
 if(state==='held'||state==='dropFall'){sheet='yuanyuan-held.png';cols=1;rows=1;rr=0;f=0;}
 if(state==='curious'&&closeReady){sheet='yuanyuan-curious.png';cols=4;rows=1;rr=0;f=reduced?0:Math.floor((now-closeReady)/800)%4;}
 if(state==='dig'&&digReady&&now-digReady>=1500){sheet='yuanyuan-dig.png';cols=4;rows=1;rr=0;f=reduced?0:Math.floor((now-digReady-1500)/110)%4;}
 if(state==='peek'&&edge?.ready&&now-edge.ready>1800&&now-edge.ready<7500){sheet='yuanyuan-curious.png';cols=4;rows=1;rr=0;f=reduced?0:Math.floor(now/650)%4;}
 host.dataset.heldAngle=String(holdMotion.angle);
 host.dataset.state=state;host.dataset.ballPhase=ball.phase;
 const key=sheet+':'+rr+':'+f;
 if(key!==renderKey){sprite.style.backgroundImage='url("'+chrome.runtime.getURL('assets/'+sheet)+'")';sprite.style.backgroundSize=cols*192+'px '+rows*208+'px';sprite.style.backgroundPosition=-f*192+'px '+-rr*208+'px';renderKey=key;}
 const closeScale=state==='curious'&&closeReady?1+Math.min(1,reduced?1:(now-closeReady)/650,reduced?1:(until-now)/600)*(Math.min(280,innerWidth*.65)/w-1):1;
 const drawW=w*closeScale,drawH=h*closeScale;
 sprite.style.transform='scale('+drawW/192+') '+(now<landingUntil&&!reduced?'scaleY(.96) ':'')+(flip?'translateX(192px) scaleX(-1)':'');
 pet.style.width=drawW+'px';pet.style.height=drawH+'px';
 const tilt=!reduced?(state==='held'?holdMotion.angle:state==='dance'?Math.sin(t*5)*9:state==='sniff'?5+Math.sin(t*3)*3:0):0;
 let drawX=clamp(x-(drawW-w)/2,0,Math.max(0,innerWidth-drawW)),drawY=closeScale>1?Math.max(0,innerHeight-drawH):clamp(y+(reduced?0:jump),0,my);
 pet.style.pointerEvents=state==='peek'&&edge?.ready?'none':'auto';
 host.dataset.edgePhase='none';
 if(state==='peek'&&edge?.ready){
 const q=(now-edge.ready)/1000;
 let hide=q<.7?q/.7:q<2?1:q<3?1-(q-2)*.7:q<6?.3:q<7?.3+(q-6)*.7:q<8?1:Math.max(0,1-(q-8)/1.5);
 const headX=edge.side==='left'?8:edge.side==='right'?innerWidth-8:x+w/2,headY=edge.side==='bottom'?innerHeight-8:y+h/2;
 if(q>2&&q<7&&Math.hypot(mouse.x-headX,mouse.y-headY)<w*1.5)edge.retractUntil=now+1000;
 if(now<edge.retractUntil&&q<8)hide=1;
 host.dataset.edgePhase=hide>=.98?'hidden':hide>.1?'peeking':'returning';
 if(edge.side==='left')drawX=-w*hide;else if(edge.side==='right')drawX=mx+w*hide;else drawY=my+h*hide;
 }
 const bubbleD=Math.max(w*1.6,h*1.45);
 if(state==='bubble'){bubbleButton.style.width=bubbleD+'px';bubbleButton.style.height=bubbleD+'px';bubbleButton.style.transform='translate('+(x+w/2-bubbleD/2)+'px,'+(y+h/2-bubbleD/2)+'px)';}
 const digging=state==='dig'&&digReady&&now-digReady>=1500;
 if(digging)hole={x,y,at:now,amount:Math.min(1,(now-digReady-1500)/3500)};
 if(hole){const fade=clamp(1-(now-hole.at)/6500,0,1);digFX.style.display=fade?'block':'none';digFX.style.width=w+'px';digFX.style.height=h+'px';digFX.style.transform='translate('+hole.x+'px,'+hole.y+'px)';pit.setAttribute('rx',String(9+hole.amount*15));pit.setAttribute('opacity',String(.85*fade));chips.forEach((c,i)=>{const phase=((now/550+i*.14)%1);c.style.display=digging&&!reduced?'block':'none';c.setAttribute('cx',String(160-phase*(36+i*5)));c.setAttribute('cy',String(200-Math.sin(phase*Math.PI)*(19+i*3)));c.setAttribute('opacity',String(1-phase));});if(!fade)hole=null;}
 host.dataset.digging=String(Boolean(digging));host.dataset.eating=String(Boolean(state==='treat'&&eatReady&&!bowlDrag?.moved));

 pet.style.transform='translate3d('+drawX+'px,'+drawY+'px,0) rotate('+tilt+'deg)';
 heart.style.opacity=state==='affection'&&!moving?'1':'0';
 const peeing=state==='pee'&&peeReady&&(now-peeReady)>1200&&(now-peeReady)<3600;
 host.dataset.peeing=String(Boolean(peeing));
 if(peeing)puddle={x,y,at:now,amount:Math.min(1,(now-peeReady-1200)/2100)};
 if(puddle){const fade=clamp(1-(now-puddle.at)/8000,0,1);peeLayer.style.display=fade?'block':'none';peeLayer.style.width=w+'px';peeLayer.style.height=h+'px';peeLayer.style.transform='translate('+puddle.x+'px,'+puddle.y+'px)';stain.setAttribute('rx',String(4+puddle.amount*11));stain.setAttribute('opacity',String(.48*fade));urine.style.display=peeing?'block':'none';urine.setAttribute('opacity','.78');urine.setAttribute('stroke-dashoffset',String(-now/40));if(!fade)puddle=null;}
 if(ball.phase==='catch'||ball.phase==='return'){ball.x=x+w*(facing<0?.15:.82);ball.y=y+h*.55;}
 toy.style.width=toy.style.height=ball.r*2+'px';toy.style.transform='translate('+clamp(ball.x-ball.r,0,Math.max(0,innerWidth-ball.r*2))+'px,'+clamp(ball.y-ball.r,0,Math.max(0,innerHeight-ball.r*2))+'px)';
 host.dataset.ballFloor=String(ballFloor());host.dataset.ballR=String(ball.r);
 host.dataset.ballX=String(ball.x);host.dataset.ballY=String(ball.y);host.dataset.ballVx=String(ball.vx);host.dataset.ballVy=String(ball.vy);
 raf=requestAnimationFrame(tick);
}
pet.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;e.stopPropagation();pet.setPointerCapture(e.pointerId);
 const rect=pet.getBoundingClientRect();dogDrag={id:e.pointerId,ox:(e.clientX-rect.left)*settings.size/rect.width,oy:(e.clientY-rect.top)*settings.size*208/192/rect.height};
 holdMotion={angle:0,velocity:0,target:0,lastX:e.clientX,lastT:performance.now()};
 choose('held',performance.now());pet.style.transformOrigin=(dogDrag.ox/settings.size*100)+'% '+(dogDrag.oy/(settings.size*208/192)*100)+'%';pet.style.cursor='url("'+chrome.runtime.getURL('assets/hand-grab.png')+'") 16 16, grabbing';
});
pet.addEventListener('pointermove',e=>{if(dogDrag?.id===e.pointerId){e.stopPropagation();const {mx,my}=bounds(),now=performance.now(),dt=Math.max(.008,(now-holdMotion.lastT)/1000),vx=(e.clientX-holdMotion.lastX)/dt;holdMotion.target=clamp(vx*.025,-24,24);holdMotion.lastX=e.clientX;holdMotion.lastT=now;x=clamp(e.clientX-dogDrag.ox,0,mx);y=clamp(e.clientY-dogDrag.oy,0,my);}});
function dropDog(e){if(dogDrag?.id!==e.pointerId)return;e.stopPropagation();dogDrag=null;fall={vy:0,targetY:Math.min(bounds().my,y+Math.max(18,settings.size*.28))};choose('dropFall',performance.now());until=Infinity;pet.style.transformOrigin='50% 50%';pet.style.cursor='url("'+chrome.runtime.getURL('assets/hand-open.png')+'") 16 16, grab';}
pet.addEventListener('pointerup',dropDog);pet.addEventListener('pointercancel',dropDog);pet.addEventListener('click',e=>e.stopPropagation());
pet.addEventListener('lostpointercapture',dropDog);
toy.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();toy.setPointerCapture(e.pointerId);const now=performance.now();drag={id:e.pointerId,x:e.clientX,y:e.clientY,samples:[{x:e.clientX,y:e.clientY,t:now}]};ball.phase='drag';});
toy.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){e.stopPropagation();ball.x=clamp(e.clientX,ball.r,Math.max(ball.r,innerWidth-ball.r));ball.y=clamp(e.clientY,ball.r,ballFloor());drag.samples.push({x:e.clientX,y:e.clientY,t:performance.now()});drag.samples=drag.samples.slice(-30);}});
toy.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();const now=performance.now(),moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;drag.samples.push({x:e.clientX,y:e.clientY,t:now});const v=moved?globalThis.YuanYuanPhysics.releaseVelocity(drag.samples,now):{vx:(Math.random()<.5?-1:1)*(280+Math.random()*220),vy:-450};drag=null;throwBall(e.clientX,e.clientY,now,v.vx,v.vy);});
toy.addEventListener('pointercancel',()=>{drag=null;ball.phase='out';dropBallHere();});toy.addEventListener('click',e=>e.stopPropagation());
toy.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId){drag=null;ball.phase='out';dropBallHere();}});
toy.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();throwBall(ball.x,ball.y,performance.now(),(ball.x>innerWidth/2?-1:1)*350,0);}});
addEventListener('pointermove',e=>{mouse={x:e.clientX,y:e.clientY};lastMove=performance.now();if(state==='sleep'){choose('idle',lastMove);until=lastMove+1500;}},{passive:true});
for(const type of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(type,updateFullscreen);fsQuery.addEventListener('change',updateFullscreen);addEventListener('resize',updateFullscreen);updateFullscreen();
document.addEventListener('visibilitychange',()=>{stop();start();});
chrome.storage.local.get(null).then(saved=>{const allowed=policy.allowedFor(saved);apply({...saved,allowed});if(saved.behaviorSchema!==2)chrome.storage.local.set({allowed,behaviorSchema:2});});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'){const next={...settings};for(const key of Object.keys(defaults))if(changes[key])next[key]=changes[key].newValue??defaults[key];apply(next);}});
})();
