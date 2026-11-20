(() => {
'use strict';
const schema=globalThis.YuanYuanPetSchema;
async function normalizeImage(file,spec){
 if(file.size>schema.maxFileBytes)throw Error('單張圖片不可超過 10 MiB。');
 const magic=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=magic[0]===137&&magic[1]===80&&magic[2]===78&&magic[3]===71;
 const webp=String.fromCharCode(...magic.slice(0,4))==='RIFF'&&String.fromCharCode(...magic.slice(8,12))==='WEBP';
 if(!png&&!webp)throw Error('只接受真正的 PNG 或 WebP 圖片；不接受 SVG、GIF、JPEG 或改副檔名的檔案。');
 const image=await createImageBitmap(file);
 try{
  if(image.width>4096||image.height>4096||image.width<spec.cols*64||image.height<spec.rows*64)throw Error('圖片尺寸需每格至少 64 px，且單邊不可超過 4096 px。');
  const ratio=(image.width/spec.cols)/(image.height/spec.rows)/(384/416);
  if(ratio<.45||ratio>2)throw Error('畫布比例不像指定宮格，請確認欄列數。');
  const canvas=document.createElement('canvas');canvas.width=spec.cols*384;canvas.height=spec.rows*416;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  for(let r=0;r<spec.rows;r++)for(let c=0;c<spec.cols;c++){
   const sw=image.width/spec.cols,sh=image.height/spec.rows,scale=Math.min(384/sw,416/sh);
   ctx.drawImage(image,c*sw,r*sh,sw,sh,c*384+(384-sw*scale)/2,r*416+(416-sh*scale),sw*scale,sh*scale);
   const pixels=ctx.getImageData(c*384,r*416,384,416).data;
   let transparent=0,art=0,samples=0;
   for(let i=3;i<pixels.length;i+=16){samples++;if(pixels[i]<16)transparent++;if(pixels[i]>48)art++;}
   // Check transparency in the source cell as padding added during resizing must not pass opaque art.
   const check=document.createElement('canvas');check.width=96;check.height=104;
   const checkCtx=check.getContext('2d',{willReadFrequently:true});checkCtx.drawImage(image,c*sw,r*sh,sw,sh,0,0,96,104);
   const source=checkCtx.getImageData(0,0,96,104).data;let clear=0;
   for(let i=3;i<source.length;i+=4)if(source[i]<16)clear++;
   if(clear/(96*104)<.08)throw Error('第 '+(r+1)+' 列、第 '+(c+1)+' 格缺少透明背景。請生成真正 alpha PNG，不要白底或棋盤格。');
   if(art/samples<.003)throw Error('第 '+(r+1)+' 列、第 '+(c+1)+' 格沒有足夠角色圖像。');
  }
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('圖片編碼失敗。')),'image/png'));
  return {blob,width:canvas.width,height:canvas.height,sourceWidth:image.width,sourceHeight:image.height};
 }finally{image.close();}
}
function blobBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('讀取圖片失敗。'));r.readAsDataURL(blob);});}
function fromBase64(value){if(typeof value!=='string'||value.length>18*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('備份圖片編碼不正確。');const raw=atob(value);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'image/png'});}
globalThis.YuanYuanPetImages={normalizeImage,blobBase64,fromBase64};
})();
