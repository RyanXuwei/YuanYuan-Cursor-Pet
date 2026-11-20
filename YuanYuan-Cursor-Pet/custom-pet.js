(() => {
'use strict';
const S=YuanYuanPetSchema,DB=YuanYuanPetStore,I=YuanYuanPetImages,$=id=>document.getElementById(id);
let assets={},bitmaps={},busy=false,saveQueue=Promise.resolve(),active=null;
const cards={};
function message(text){$('message').textContent=text;}
function snapshot(id='draft'){return {id,name:$('petName').value.trim()||'My Pet',description:$('description').value,assets:{...assets},createdAt:Date.now()};}
function persist(){const pack=snapshot();saveQueue=saveQueue.catch(()=>{}).then(()=>DB.put(pack));return saveQueue;}
function refresh(){const count=S.sheets.filter(s=>assets[s.id]).length;$('progress').textContent=count+' / 8 張已準備';$('apply').disabled=$('export').disabled=busy||count!==8;document.querySelectorAll('.mutation').forEach(b=>{if(b.id==='restore')b.disabled=busy;});$('promptText').value=S.allPrompts($('description').value);}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function copy(text){try{await navigator.clipboard.writeText(text);message('提示詞已複製，請貼到 ChatGPT。');}catch{const area=$('promptText');area.value=text;area.closest('details').open=true;area.focus();area.select();message('請按 Ctrl+C 複製已選取的提示詞。');}}
function txt(text,name){download(new Blob(['\ufeff',text],{type:'text/plain;charset=utf-8'}),name);}
async function preview(spec,asset){const bitmap=await createImageBitmap(asset.blob);bitmaps[spec.id]?.close();bitmaps[spec.id]=bitmap;const card=cards[spec.id];card.badge.textContent='已就緒';card.badge.className='badge ready';card.status.textContent=asset.sourceWidth+' × '+asset.sourceHeight+' → '+asset.width+' × '+asset.height;card.status.className='card-status';if(card.url)URL.revokeObjectURL(card.url);card.url=URL.createObjectURL(asset.blob);card.img.src=card.url;}
for(const s of S.sheets){
 const card=document.createElement('article');card.className='card';
 const head=document.createElement('div');head.className='card-head';const title=document.createElement('h3');title.textContent=s.label;const badge=document.createElement('span');badge.className='badge';badge.textContent='待匯入';head.append(title,badge);
 const filename=document.createElement('p');filename.className='filename';filename.textContent=s.file;
 const spec=document.createElement('p');spec.className='spec';spec.textContent=s.cols*384+' × '+s.rows*416+' px · '+s.cols+' 欄 × '+s.rows+' 列 · '+s.frames+' 格';
 const box=document.createElement('div');box.className='preview';const wrap=document.createElement('div');wrap.className='canvas-wrap';const canvas=document.createElement('canvas');canvas.width=384;canvas.height=416;wrap.append(canvas);const info=document.createElement('div');info.className='preview-info';
 const row=document.createElement('select');row.setAttribute('aria-label',s.label+'預覽列');for(let i=0;i<s.rows;i++){const o=document.createElement('option');o.value=i;o.textContent='第 '+(i+1)+' 列';row.append(o);}
 const bg=document.createElement('button');bg.textContent='切換預覽背景';let bgIndex=0;bg.onclick=()=>{wrap.className='canvas-wrap '+['','dark','light'][++bgIndex%3];};info.append(row,bg);box.append(wrap,info);
 const status=document.createElement('p');status.className='card-status';status.textContent='尚未選取圖片';
 const buttons=document.createElement('div');buttons.className='buttons';const input=document.createElement('input');input.type='file';input.accept='.png,.webp';input.hidden=true;
 const choose=document.createElement('button');choose.textContent='選圖／替換';choose.onclick=()=>input.click();input.onchange=()=>run(()=>importPairs([{file:input.files[0],spec:s}])).finally(()=>input.value='');
 const prompt=document.createElement('button');prompt.textContent='複製本張提示詞';prompt.onclick=()=>copy(S.prompt(s,$('description').value));
 const remove=document.createElement('button');remove.textContent='移除草稿圖';remove.onclick=()=>run(async()=>{delete assets[s.id];bitmaps[s.id]?.close();delete bitmaps[s.id];canvas.getContext('2d').clearRect(0,0,384,416);badge.textContent='待匯入';badge.className='badge';status.textContent='已移除草稿圖，目前套用的寵物不受影響。';img.removeAttribute('src');await persist();});
 buttons.append(choose,prompt,remove,input);
 const details=document.createElement('details'),summary=document.createElement('summary'),img=document.createElement('img');summary.textContent='展開完整宮格圖';img.alt=s.label+'完整宮格';details.append(summary,img);
 card.append(head,filename,spec,box,status,buttons,details);$('cards').append(card);cards[s.id]={badge,status,canvas,row,img};
}
async function run(fn){if(busy)return;busy=true;refresh();try{await fn();}catch(e){message(e.message||'操作失敗，請重試。');}finally{busy=false;refresh();}}
async function importPairs(pairs){
 let ok=0;for(const {file,spec} of pairs){if(!file)continue;try{
 const asset=await I.normalizeImage(file,spec);const total=Object.entries(assets).reduce((n,[id,a])=>n+(id===spec.id?0:a.blob.size),asset.blob.size);if(total>S.maxPackBytes)throw Error('整套圖片超過 12 MiB，請減少圖片複雜度。');
 await preview(spec,asset);assets[spec.id]=asset;ok++;
 }catch(e){cards[spec.id].status.textContent=file.name+'：'+e.message+'（原有有效圖保留）';cards[spec.id].status.className='card-status error';}}
 await persist();message('已匯入 '+ok+' 張草稿；確認 8 張預覽後按「套用我的寵物」。');
}
function mapUnknown(files,reserved){return new Promise(resolve=>{
 const rows=$('mappingRows');rows.replaceChildren();const selects=[];
 files.forEach(file=>{const label=document.createElement('label');label.className='mapping-row';const text=document.createElement('span');text.textContent=file.name;const select=document.createElement('select');select.append(new Option('略過',''));S.sheets.filter(s=>!reserved.has(s.id)).forEach(s=>select.append(new Option(s.file+' — '+s.label,s.id)));label.append(text,select);rows.append(label);selects.push({file,select});});
 $('mappingError').textContent='';$('confirmMapping').onclick=e=>{const ids=selects.map(x=>x.select.value).filter(Boolean);if(new Set(ids).size!==ids.length){e.preventDefault();$('mappingError').textContent='同一張卡片只能對應一個檔案。';}};
 $('mapping').onclose=()=>resolve($('mapping').returnValue==='confirm'?selects.filter(x=>x.select.value).map(x=>({file:x.file,spec:S.sheets.find(s=>s.id===x.select.value)})):[]);
 $('mapping').showModal();
});}
async function backup(file){if(file.size>24*1024*1024)throw Error('備份超過 24 MiB。');const pack=JSON.parse(await file.text());if(pack.format!==S.format)throw Error('不是支援的寵物備份格式。');const candidate={};let size=0;
 for(const s of S.sheets){const blob=I.fromBase64(pack.assets?.[s.id]?.base64);const asset=await I.normalizeImage(new File([blob],s.file,{type:'image/png'}),s);size+=asset.blob.size;if(size>S.maxPackBytes)throw Error('備份圖片超過 12 MiB。');candidate[s.id]=asset;}
 assets=candidate;$('petName').value=String(pack.name||'My Pet').slice(0,50);$('description').value=String(pack.description||'').slice(0,1200);for(const s of S.sheets)await preview(s,assets[s.id]);await persist();message('備份已載入草稿，請檢查後套用。');
}
async function files(list){const all=Array.from(list);if(all.some(f=>f.name.endsWith('.petpack.json'))){if(all.length!==1)throw Error('請單獨匯入一個 .petpack.json 備份。');return backup(all[0]);}
 const pairs=[],unknown=[],reserved=new Set();for(const file of all){const spec=S.sheets.find(s=>s.file.replace('.png','')===file.name.toLowerCase().replace(/\.(png|webp)$/,''));if(spec&&!reserved.has(spec.id)){reserved.add(spec.id);pairs.push({file,spec});}else unknown.push(file);}
 if(unknown.length)pairs.push(...await mapUnknown(unknown,reserved));await importPairs(pairs);
}
const drop=$('dropzone');drop.onclick=()=>$('batchFiles').click();drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();drop.click();}};drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover');};drop.ondragleave=()=>drop.classList.remove('dragover');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');run(()=>files(e.dataTransfer.files));};$('batchFiles').onchange=()=>run(()=>files($('batchFiles').files)).finally(()=>$('batchFiles').value='');
$('copyReference').onclick=()=>copy('角色設定：'+$('description').value+'\n'+S.referencePrompt);$('copyAll').onclick=()=>copy(S.allPrompts($('description').value));
$('downloadPrompts').onclick=()=>txt(S.allPrompts($('description').value),'自訂寵物完整提示詞.txt');$('downloadSop').onclick=()=>txt(S.sopText(),'自訂寵物替換SOP.txt');
for(const [heading,text] of S.sop){const h=document.createElement('h3'),p=document.createElement('p');h.textContent=heading;p.textContent=text;$('sopBody').append(h,p);}
for(const id of ['petName','description'])$(id).onchange=()=>run(async()=>{await persist();message('草稿文字已儲存。');});
$('apply').onclick=()=>run(async()=>{if(S.sheets.some(s=>!assets[s.id]))throw Error('請先備齊 8 張圖片。');await saveQueue;const previous=(await chrome.storage.local.get('customPet')).customPet;const pack=snapshot(crypto.randomUUID());await DB.put(pack);await chrome.storage.local.set({customPet:{id:pack.id,name:pack.name}});if(previous?.id&&previous.id!==pack.id)await DB.remove(previous.id).catch(()=>{});message('已套用！一般網頁上的寵物將自動換裝。');});
$('restore').onclick=()=>run(async()=>{await chrome.storage.local.remove('customPet');message('已恢復圓圓；自訂草稿保留，可再次套用。');});
$('export').onclick=()=>run(async()=>{const pack=snapshot();pack.format=S.format;pack.assets={};for(const s of S.sheets)pack.assets[s.id]={base64:await I.blobBase64(assets[s.id].blob)};download(new Blob([JSON.stringify(pack)],{type:'application/json'}),'custom-pet.petpack.json');message('已匯出備份，請保存下載的檔案。');});
async function activeStatus(){active=(await chrome.storage.local.get('customPet')).customPet;$('active').textContent=active?'目前套用：'+active.name:'目前套用：原版圓圓';}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.customPet)activeStatus();});
let last=-1;function animate(now){const frame=$('play').checked?Math.floor(now/140):0;if(frame!==last&&!document.hidden){last=frame;for(const s of S.sheets){const bitmap=bitmaps[s.id];if(!bitmap)continue;const c=cards[s.id],n=s.id==='run'?frame%8:Number(c.row.value)*s.cols+frame%s.cols;const ctx=c.canvas.getContext('2d');ctx.clearRect(0,0,384,416);ctx.drawImage(bitmap,n%s.cols*384,Math.floor(n/s.cols)*416,384,416,0,0,384,416);}}requestAnimationFrame(animate);}requestAnimationFrame(animate);
run(async()=>{await activeStatus();const draft=await DB.get('draft')||(active?await DB.get(active.id):null);if(draft){$('petName').value=draft.name||'';$('description').value=draft.description||'';for(const s of S.sheets)if(draft.assets?.[s.id]){await preview(s,draft.assets[s.id]);assets[s.id]=draft.assets[s.id];}}message('草稿已就緒，選圖不會立即替換目前的寵物。');});
})();
