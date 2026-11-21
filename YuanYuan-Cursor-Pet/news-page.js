'use strict';
const newsReader=YuanYuanNewsView.mount(document.getElementById('newsReader'),{ai:true,onState:view=>{document.documentElement.lang=view.lang;document.title=YuanYuanNewsText.get(view.lang).title+' · YuanYuan Cursor Pet';}});
addEventListener('pagehide',()=>newsReader.destroy(),{once:true});
