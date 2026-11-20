(() => {
'use strict';
let dbPromise;
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('yuanyuan-custom-pets',1);req.onupgradeneeded=()=>req.result.createObjectStore('packs',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(req.error);};});return dbPromise;}
async function transaction(mode,run){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('packs',mode),store=tx.objectStore('packs');let value;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Storage transaction aborted'));tx.onerror=()=>reject(tx.error);try{const req=value=run(store);req.onsuccess=()=>{value=req.result;};}catch(e){tx.abort();reject(e);}});}
const get=id=>transaction('readonly',s=>s.get(id)),put=pack=>transaction('readwrite',s=>s.put(pack)),remove=id=>transaction('readwrite',s=>s.delete(id));
globalThis.YuanYuanPetStore={get,put,remove};
})();
