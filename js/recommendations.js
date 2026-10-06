/* 可解释的规则匹配：仅提供待核对线索，不判定物品归属。 */
(function(root){
 'use strict';
 const DAY=24*60*60*1000;
 function normalize(text){return String(text||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
 function similarity(left,right){
  const a=normalize(left),b=normalize(right);
  if(!a||!b) return 0;
  if(a===b) return 1;
  if(Math.min(a.length,b.length)>=2&&(a.includes(b)||b.includes(a))) return 0.85;
  function pairs(text){const result=new Set();for(let i=0;i<text.length-1;i++) result.add(text.slice(i,i+2));return result;}
  const x=pairs(a),y=pairs(b);if(!x.size||!y.size) return 0;
  const shared=[...x].filter(value=>y.has(value)).length;
  return shared/(x.size+y.size-shared);
 }
 function eventTimestamp(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return NaN;
  const [year,month,day,hour,minute]=value.match(/\d+/g).map(Number);
  const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(hour,minute,0,0);
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day||date.getUTCHours()!==hour||date.getUTCMinutes()!==minute) return NaN;
  return date.getTime();
 }
 function recommend(items,sourceId,limit){
  const source=items.find(item=>item.id===sourceId);
  if(!source||source.status!=='active'||!['lost','found'].includes(source.type)) return [];
  const opposite=source.type==='lost'?'found':'lost';
  const sourceTime=eventTimestamp(source.eventTime);
  const results=[];
  items.forEach(function(item){
   if(item.id===source.id||item.type!==opposite||item.status!=='active'||item.category!==source.category) return;
   const name=similarity(source.title,item.title);
   if(name<0.25) return;
   const targetTime=eventTimestamp(item.eventTime);
   const validTime=Number.isFinite(sourceTime)&&Number.isFinite(targetTime);
   const gap=validTime?Math.abs(sourceTime-targetTime)/DAY:NaN;
   if(validTime&&gap>7) return;
   const location=similarity(source.place,item.place);
   let score=Math.round(name*60)+15;
   const reasons=[name===1?'物品名称相同':'物品名称相似','类别相同'];
   if(location>=0.25){score+=Math.round(location*15);reasons.push(location===1?'地点相同':'地点相近（文字匹配）');}
   if(validTime){score+=gap<=1?10:gap<=3?7:4;reasons.push(gap<=1?'时间相差不超过 1 天':gap<=3?'时间相差不超过 3 天':'时间相差不超过 7 天');}
   results.push({item,score,reasons});
  });
  results.sort((a,b)=>b.score-a.score||(Date.parse(b.item.createdAt)||0)-(Date.parse(a.item.createdAt)||0)||a.item.id.localeCompare(b.item.id));
  const count=limit===undefined?3:Number.isFinite(limit)?Math.max(0,Math.min(10,Math.floor(limit))):3;
  return results.slice(0,count);
 }
 const api={normalize,similarity,eventTimestamp,recommend};
 if(typeof module!=='undefined'&&module.exports) module.exports=api;else root.LostFoundRecommendations=api;
})(typeof globalThis!=='undefined'?globalThis:this);
