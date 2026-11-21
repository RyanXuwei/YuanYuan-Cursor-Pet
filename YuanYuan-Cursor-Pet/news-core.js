(() => {
'use strict';
const editions={
 'zh-TW':{hl:'zh-TW',gl:'TW',ceid:'TW:zh-Hant',pet:/(寵物|毛孩|犬|狗|貓|獸醫|動物醫院)/i,terms:['(寵物 OR 犬貓 OR 毛孩) (新聞 OR 救援 OR 認養 OR 動保)','(寵物 OR 狗 OR 貓) (旅遊 OR 旅行 OR 友善住宿 OR 飯店)','(寵物展 OR 寵物博覽會 OR 犬貓展)','(寵物 OR 犬貓) (獸醫 OR 動物醫院) (健康 OR 疫苗 OR 疾病 OR 保健)']},
 'zh-CN':{hl:'zh-TW',gl:'TW',ceid:'TW:zh-Hant',pet:/(寵物|宠物|毛孩|犬|狗|貓|猫|獸醫|兽医|動物醫院|动物医院)/i,terms:['(宠物 OR 犬猫) (新闻 OR 救援 OR 领养 OR 动物保护)','(宠物 OR 狗 OR 猫) (旅游 OR 旅行 OR 友好酒店 OR 住宿)','(宠物展 OR 宠物博览会 OR 犬猫展)','(宠物 OR 犬猫) (兽医 OR 动物医院) (健康 OR 疫苗 OR 疾病 OR 护理)']},
 en:{hl:'en-US',gl:'US',ceid:'US:en',pet:/\b(pets?|dogs?|cats?|pupp(?:y|ies)|kittens?|veterinar\w*)\b/i,terms:['("pet news" OR "animal rescue" OR "pet adoption" OR "dog rescue" OR "cat rescue" OR "animal welfare")','(pets OR dogs OR cats) (travel OR tourism OR hotel OR accommodation)','("pet expo" OR "pet exhibition" OR "pet fair" OR "dog show" OR "cat show")','(pets OR dogs OR cats) (veterinarian OR veterinary) (health OR vaccine OR disease OR care)']},
 ja:{hl:'ja',gl:'JP',ceid:'JP:ja',pet:/(ペット|犬|猫|ネコ|獣医)/i,terms:['(ペット OR 犬 OR 猫) (ニュース OR 保護 OR 譲渡 OR 救助)','(ペット OR 犬 OR 猫) (旅行 OR 観光 OR 宿泊 OR ホテル)','(ペット博 OR ペット展 OR ペットフェア OR インターペット)','(ペット OR 犬 OR 猫) (獣医 OR 動物病院) (健康 OR 病気 OR ワクチン OR ケア)']},
 ko:{hl:'ko',gl:'KR',ceid:'KR:ko',pet:/(반려|강아지|고양이|반려견|반려묘|수의|펫)/i,terms:['(반려동물 OR 강아지 OR 고양이) (뉴스 OR 구조 OR 입양 OR 보호)','(반려동물 OR 반려견) (여행 OR 관광 OR 숙소 OR 호텔)','(펫박람회 OR 반려동물박람회 OR 펫페어 OR 펫쇼)','(반려동물 OR 강아지 OR 고양이) (수의사 OR 동물병원) (건강 OR 예방접종 OR 질병 OR 관리)']}
};
const origin='https://news.google.com/*',cooldown=60000;
function day(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function zone(){return Intl.DateTimeFormat().resolvedOptions().timeZone;}
function language(choice){return globalThis.YuanYuanI18n.resolve(choice);}
function url(lang,category){const e=editions[lang]||editions.en;const u=new URL('https://news.google.com/rss/search');u.search=new URLSearchParams({q:e.terms[category]+' when:1d',hl:e.hl,gl:e.gl,ceid:e.ceid}).toString();return u.href;}
function text(raw){return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,v)=>{if(v[0]==='#'){const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v.toLowerCase()];}).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();}
function field(item,tag){const m=item.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));return m?text(m[1]):'';}
function safeURL(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function category(title){
 if(/寵物展|宠物展|博覽會|博览会|犬貓展|犬猫展|ペット博|ペット展|ペットフェア|インターペット|박람회|펫페어|펫쇼|\b(pet (expo|exhibition|fair)|dog show|cat show)\b/i.test(title))return 2;
 if(/旅遊|旅游|旅行|住宿|飯店|酒店|ホテル|宿泊|観光|여행|관광|숙소|호텔|\b(travel|tourism|hotel|accommodation|pet-friendly|dog-friendly)\b/i.test(title))return 1;
 if(/獸醫|兽医|動物醫院|动物医院|醫療|医疗|疫苗|疾病|保健|健康|急救|手術|手术|獣医|病気|ワクチン|動物病院|ケア|수의|병원|건강|예방접종|질병|\b(veterinar\w*|vaccin\w*|disease|pet health)\b/i.test(title))return 3;
 return 0;
}
function identity(title,source){const clean=title.endsWith(' - '+source)?title.slice(0,-source.length-3):title;return clean.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function id(key){let h=2166136261;for(const c of key){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return 'n'+(h>>>0).toString(16);}
function parse(xml,lang,now=new Date()){
 if(typeof xml!=='string'||xml.length>2*1024*1024||/<!DOCTYPE/i.test(xml)||!/<rss\b/i.test(xml)||!/<\/rss>/i.test(xml))throw Error('invalid-feed');
 const e=editions[lang]||editions.en,out=[];
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  if(out.length>=200)break;const item=match[1],title=field(item,'title').slice(0,400),source=field(item,'source').slice(0,120),link=safeURL(field(item,'link')),publishedAt=Date.parse(field(item,'pubDate'));
  if(!title||!source||!link||!Number.isFinite(publishedAt)||day(new Date(publishedAt))!==day(now)||publishedAt>now.getTime()+300000||!e.pet.test(title))continue;
  if(/\bplastic\b.*\bpet\b|\bpet\b.*\b(plastic|resin|packaging|bottles?|scans?)\b|\bPET[- ]CT\b/i.test(title))continue;
  if(/\b(bird dogs|dogs of war|hot dogs?|cat burglars?|dog eat dog)\b/i.test(title))continue;
  if(/業配|业配|折扣碼|折扣码|抽獎|抽奖|\b(sponsored|coupon code|giveaway)\b/i.test(title))continue;
  const key=identity(title,source);out.push({id:id(day(now)+key),key,title,source,url:link,publishedAt,category:category(title),language:lang});
 }
 return out;
}
function select(items,read={},limit=2){const seen=new Set();return [...items].sort((a,b)=>a.category-b.category||b.publishedAt-a.publishedAt).filter(a=>{if(read[a.id]||seen.has(a.key))return false;seen.add(a.key);return true;}).slice(0,limit);}
function snapshot(saved,now=new Date()){
 const lang=language(saved.language),cache=saved.newsCache?.[lang],valid=cache?.day===day(now)&&cache.zone===zone();
 return {enabled:saved.newsEnabled===true,lang,articles:valid?(cache.articles||[]).filter(a=>day(new Date(a.publishedAt))===day(now)):[],read:saved.newsRead||{},checkedAt:valid?cache.checkedAt:0,error:valid?cache.error:'',edition:editions[lang].gl};
}
globalThis.YuanYuanNews={editions,origin,cooldown,day,zone,language,url,parse,select,snapshot,safeURL};
})();
