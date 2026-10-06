const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/core.js');
const {createStore}=require('../js/storage.js');
const input={type:'lost',title:'雨伞',category:'生活用品',place:'食堂',contact:'demo',description:'黑色'};
const mine={...core.createPost(input,'mine','2026-10-06T09:00:00Z'),status:'completed',image:'existing-image'};
const other={...mine,id:'other',isMine:false};
const revised={...input,type:'found',title:' 蓝色水杯 ',place:' 图书馆 ',category:'其他',contact:' new-contact ',description:'蓝色杯盖'};
test('编辑只更新表单字段，保留编号、发布时间、身份、图片和完成状态',()=>{
 const result=core.editPost([mine,other],'mine',revised);
 assert.deepEqual(result[0],{...mine,...revised,title:'蓝色水杯',place:'图书馆',contact:'new-contact',eventTime:mine.eventTime});
 assert.equal(result[1],other);
 assert.equal(core.statusLabel(result[0]),'已归还');
});
test('编辑时间可修改，留空保留原时间',()=>{
 assert.equal(core.editPost([mine],'mine',{...input,eventTime:'2026-10-05T08:30'})[0].eventTime,'2026-10-05 08:30');
 assert.equal(core.editPost([mine],'mine',input)[0].eventTime,mine.eventTime);
});
test('编辑复用发布校验，拒绝必填空白、超长和非法时间',()=>{
 for(const bad of [{title:' '},{contact:''},{description:'x'.repeat(501)},{eventTime:'2026-02-30T12:00'},{category:'invalid'}])
 assert.throws(()=>core.editPost([mine],'mine',{...input,...bad}));
});
test('编辑和删除都拒绝他人记录与缺失编号',()=>{
 for(const action of [id=>core.editPost([mine,other],id,input),id=>core.deletePost([mine,other],id)]) {
 assert.throws(()=>action('other'));assert.throws(()=>action('missing'));
 }
});
test('编辑不能通过额外输入篡改编号、状态或身份',()=>{
 const result=core.editPost([mine],'mine',{...input,id:'fake',status:'active',isMine:false,owner:'other',createdAt:'fake',image:''})[0];
 for(const key of ['id','status','isMine','owner','createdAt','image']) assert.equal(result[key],mine[key]);
});
test('编辑后新关键词能搜到，旧关键词不再匹配',()=>{
 const next=core.editPost([mine],'mine',revised);
 assert.equal(core.searchItems(next,{keyword:'水杯 图书馆',type:'found'}).length,1);
 assert.equal(core.searchItems(next,{keyword:'雨伞'}).length,0);
});
test('编辑和删除不改变传入数组及原记录',()=>{
 const items=[mine,other];const snapshot=structuredClone(items);
 core.editPost(items,'mine',revised);core.deletePost(items,'mine');
 assert.deepEqual(items,snapshot);
});
test('删除后首页、搜索、详情查找和我的统计不再包含目标',()=>{
 const next=core.deletePost([mine,other],'mine');
 assert.equal(next.length,1);assert.equal(next[0],other);
 assert.equal(core.findItem(next,'mine'),null);
 assert.equal(core.mySummary(next).total,0);
 assert.equal(core.myItems(next,'all').length,0);
 assert.equal(core.filterItems(next,'all').length,1);
 assert.equal(core.searchItems(next,{}).length,1);
});
test('编辑和删除保存后重新加载仍生效，删空不恢复演示记录',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=createStore(storage);store.load([mine]);
 assert.equal(store.save(core.editPost([mine],'mine',revised)).ok,true);
 const recovered=createStore(storage).load([mine]).items;
 assert.equal(recovered[0].title,'蓝色水杯');assert.equal(recovered[0].status,'completed');
 assert.equal(store.save(core.deletePost(recovered,'mine')).ok,true);
 assert.deepEqual(createStore(storage).load([mine]).items,[]);
});
test('存储失败时编辑及删除都不改原数据和持久化记录',()=>{
 const raw=JSON.stringify({version:1,items:[mine]});
 const storage={getItem:()=>raw,setItem:()=>{throw Error('full');}};
 const store=createStore(storage);const loaded=store.load([]);
 for(const next of [core.editPost(loaded.items,'mine',revised),core.deletePost(loaded.items,'mine')]) assert.equal(store.save(next).ok,false);
 assert.deepEqual(loaded.items,[mine]);assert.deepEqual(createStore(storage).load([]).items,[mine]);
});
