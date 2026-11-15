(() => {
  'use strict';
  const ids=['chase','shy','orbit','bounce','zoom','sleep','peek','dance','sniff','explore','fetch','treat','walk','pee','angry','bark','affection','watch','curious','bubble','dig'];
  const labels={chase:'跟隨',shy:'害羞逃跑',orbit:'繞圈',bounce:'跳跳',zoom:'衝刺',sleep:'睡覺',peek:'邊緣藏身偷看',dance:'搖擺',sniff:'嗅聞',explore:'探索',fetch:'丟接球',treat:'吃零食',walk:'散步',pee:'小便',angry:'生氣',bark:'吠叫',affection:'撒嬌',watch:'默默看著你',curious:'魚眼大頭探看',bubble:'泡泡漂浮',dig:'前腳挖洞'};
  const cooldown={chase:18,shy:65,orbit:75,bounce:65,zoom:90,sleep:110,peek:100,dance:95,sniff:35,explore:40,fetch:100,treat:160,walk:45,pee:360,angry:180,bark:90,affection:40,watch:25,curious:85,bubble:140,dig:160};
  const profiles=[
    {name:'乖巧安靜',gap:[20,34],factor:1.6,w:[8,0,0,0.4,0,10,0.2,0.2,5,3,1,2,5,.15,.1,.2,5,20,1,1,.5]},
    {name:'親人撒嬌',gap:[13,24],factor:1.2,w:[12,1,1,3,1,5,1,2,4,3,5,5,6,.2,.3,1,22,12,7,4,1]},
    {name:'活潑好奇',gap:[8,17],factor:1,w:[10,2,3,4,5,3,2,2,10,10,16,3,18,.5,1,3,7,5,5,6,8]},
    {name:'調皮搗蛋',gap:[5,12],factor:.8,w:[8,6,8,10,12,2,8,6,6,8,14,4,9,1.5,3,7,8,3,8,9,12]}
  ];
  function profile(i){return profiles[Math.round(Math.max(0,Math.min(3,Number(i)||0)))];}
  function weight(id,i){return profile(i).w[ids.indexOf(id)]||0;}
  function cooldownMs(id,i){return Math.round((cooldown[id]||30)*profile(i).factor)*1000;}
  function pick({policy,allowed,now,lastUsed,idleMs,width=1000,height=700,foodAvailable=true},random=Math.random){
    const candidates=ids.map(id=>{
      let w=allowed.includes(id)?weight(id,policy):0;
      if(now-(lastUsed[id]??-Infinity)<cooldownMs(id,policy))w=0;
      if(id==='sleep'&&idleMs<35000)w=0;
      if(id==='treat'&&!foodAvailable)w=0;
      if(id==='curious'&&(width<320||height<300))w=0;
      if(id==='fetch'&&(width<240||height<220))w=0;
      if(id==='bubble'&&(width<220||height<250))w=0;
      if(id==='dig'&&(width<200||height<200))w=0;
      if(idleMs>=35000)w*=id==='sleep'?8:id==='watch'?2:.35;
      return {id,w};
    });
    const total=candidates.reduce((s,c)=>s+c.w,0);if(!total)return 'idle';
    let n=random()*total;for(const c of candidates){n-=c.w;if(c.w&&n<0)return c.id;}return candidates.findLast(c=>c.w).id;
  }
  function gapMs(i,random=Math.random){const [a,b]=profile(i).gap;return (a+(b-a)*random())*1000;}
  function allowedFor(saved){if(!Array.isArray(saved.allowed))return [...ids];const prior=ids.filter(id=>!['bubble','dig'].includes(id));return saved.behaviorSchema!==2&&prior.every(id=>saved.allowed.includes(id))?[...ids]:saved.allowed.filter(id=>ids.includes(id));}
  globalThis.YuanYuanPolicy={allowedFor,ids,labels,profiles,profile,weight,cooldownMs,pick,gapMs};
})();
