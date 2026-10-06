const test = require('node:test');
const assert = require('node:assert/strict');
const {searchItems,findItem} = require('../js/core.js');
const items = [
  {id:'1',type:'lost',title:'黑色雨伞',category:'生活用品',place:'图书馆',description:'长柄蓝色标签',contact:'private-only',status:'active',createdAt:'2026-10-03T12:00:00Z'},
  {id:'2',type:'found',title:'白色耳机 AirPods',category:'电子用品',place:'食堂',description:'黑色保护套',status:'active',createdAt:'2026-10-02T12:00:00Z'},
  {id:'3',type:'lost',title:'黑色折叠伞',category:'生活用品',place:'教学楼',description:'小号',status:'completed',createdAt:'2026-10-01T12:00:00Z'}
];
const ids = options => searchItems(items,options).map(x=>x.id);
test('空查询和仅空格查询返回全部按发布时间排序的信息',()=>{
  assert.deepEqual(ids({}),['1','2','3']);
  assert.deepEqual(ids({keyword:'   '}),['1','2','3']);
});
test('关键词搜索覆盖名称、地点、类别及描述',()=>{
  for(const keyword of ['雨伞','图书馆','蓝色标签']) assert.deepEqual(ids({keyword}),['1']);
  assert.deepEqual(ids({keyword:'电子用品'}),['2']);
});
test('英文关键词忽略大小写，去除首尾空格',()=>{
  assert.deepEqual(ids({keyword:'  AIRpods  '}),['2']);
});
test('多个关键词需同时命中，可分别命中不同字段',()=>{
  assert.deepEqual(ids({keyword:'黑色  图书馆'}),['1']);
  assert.deepEqual(ids({keyword:'黑色 食堂'}),['2']);
  assert.deepEqual(ids({keyword:'雨伞 食堂'}),[]);
});
test('类别、类型和关键词组合生效',()=>{
  assert.deepEqual(ids({keyword:'黑色',category:'生活用品',type:'lost'}),['1','3']);
  assert.deepEqual(ids({keyword:'黑色',category:'生活用品',type:'found'}),[]);
});
test('仅未完成排除已找回及已归还信息',()=>{
  assert.deepEqual(ids({activeOnly:true}),['1','2']);
  assert.deepEqual(searchItems([{...items[1],status:'completed'}],{activeOnly:true}),[]);
});
test('空数据和无匹配查询返回空列表',()=>{
  assert.deepEqual(searchItems([],{keyword:'雨伞'}),[]);
  assert.deepEqual(ids({keyword:'不存在的物品'}),[]);
});
test('搜索不会把联系方式纳入公开检索，也不使用正则解释关键词',()=>{
  assert.deepEqual(ids({keyword:'private-only'}),[]);
  assert.deepEqual(ids({keyword:'.*'}),[]);
});
test('搜索不修改原数据，清空条件后仍能取得全部数据',()=>{
  const before=structuredClone(items);
  ids({category:'电子用品'});
  assert.deepEqual(items,before);
  assert.deepEqual(ids({keyword:'',type:'all',category:'all',activeOnly:false}),['1','2','3']);
});
test('详情按唯一编号精确定位，找不到时返回 null',()=>{
  assert.equal(findItem(items,'2'),items[1]);
  assert.equal(findItem(items,'missing'),null);
  assert.equal(findItem([], '1'),null);
});
