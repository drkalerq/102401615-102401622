const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/core.js');
const {createStore} = require('../js/storage.js');
const input = {type:'lost',title:'雨伞',category:'生活用品',place:'食堂',contact:'demo'};
const mine = core.createPost(input,'mine','2026-10-06T09:00:00Z');
const other = {...mine,id:'other',isMine:false,owner:'他人'};
const found = {...mine,id:'found',type:'found'};
test('我的列表只包括自己的记录并按状态筛选',()=>{
  const completed={...found,status:'completed'};
  assert.deepEqual(core.myItems([mine,other,completed],'all').map(x=>x.id),['mine','found']);
  assert.deepEqual(core.myItems([mine,completed],'active').map(x=>x.id),['mine']);
  assert.deepEqual(core.myItems([mine,completed],'completed').map(x=>x.id),['found']);
});
test('个人统计区分寻物中、招领中和已完成',()=>{
  assert.deepEqual(core.mySummary([mine,other,found,{...mine,id:'done',status:'completed'}]),{total:3,lostActive:1,foundActive:1,completed:1});
  assert.deepEqual(core.mySummary([]),{total:0,lostActive:0,foundActive:0,completed:0});
});
test('寻物完成文案为已找回，招领完成文案为已归还',()=>{
  for(const [item,label] of [[mine,'已找回'],[found,'已归还']]) {
    const updated=core.changeStatus([item],item.id,'completed')[0];
    assert.equal(core.statusLabel(updated),label);
  }
});
test('完成状态可恢复，恢复后重新出现在未完成搜索中',()=>{
  const completed=core.changeStatus([mine],mine.id,'completed');
  assert.equal(core.searchItems(completed,{activeOnly:true}).length,0);
  const restored=core.changeStatus(completed,mine.id,'active');
  assert.equal(core.statusLabel(restored[0]),'待寻找');
  assert.equal(core.searchItems(restored,{activeOnly:true}).length,1);
});
test('其他人的记录、不存在的编号和非法状态不可修改',()=>{
  assert.throws(()=>core.changeStatus([other],other.id,'completed'));
  assert.throws(()=>core.changeStatus([mine],'missing','completed'));
  assert.throws(()=>core.changeStatus([mine],mine.id,'deleted'));
});
test('状态更新只修改目标记录，不改原数据及物品字段',()=>{
  const original=[mine,other];const before=structuredClone(original);
  const result=core.changeStatus(original,mine.id,'completed');
  assert.deepEqual(original,before);
  assert.deepEqual(result[0],{...mine,status:'completed'});
  assert.equal(result[1],other);
});
test('保存并重新加载后，详情查找和首页文案能读到完成状态',()=>{
  const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=createStore(storage);store.load([mine]);
  assert.equal(store.save(core.changeStatus([mine],mine.id,'completed')).ok,true);
  const recovered=createStore(storage).load([]).items;
  assert.equal(core.statusLabel(core.findItem(recovered,mine.id)),'已找回');
  assert.equal(core.mySummary(recovered).completed,1);
});
test('存储失败时原始状态保持进行中',()=>{
  const raw=JSON.stringify({version:1,items:[mine]});
  const storage={getItem:()=>raw,setItem:()=>{throw new Error('full');}};
  const store=createStore(storage);const loaded=store.load([]);
  const next=core.changeStatus(loaded.items,mine.id,'completed');
  assert.equal(store.save(next).ok,false);
  assert.equal(loaded.items[0].status,'active');
  assert.equal(createStore(storage).load([]).items[0].status,'active');
});
