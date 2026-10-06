const test = require('node:test');
const assert = require('node:assert/strict');
const {createStore,KEY} = require('../js/storage.js');
const {createPost} = require('../js/core.js');
const post = createPost({type:'lost',title:'雨伞',category:'生活用品',place:'食堂',contact:'微信demo'}, 'one', '2026-10-06T09:00:00Z');
function memory(initial) {
  const map = new Map(initial === undefined ? [] : [[KEY,initial]]);
  return {getItem:key => map.has(key) ? map.get(key) : null, setItem:(key,value) => map.set(key,value)};
}
test('首次打开使用演示数据且不改动输入', () => {
  const seed = [structuredClone(post)];
  const result = createStore(memory()).load(seed);
  assert.equal(result.writable,true);
  result.items[0].title='changed';
  assert.equal(seed[0].title,'雨伞');
});
test('发布内容保存后可从新存储实例中恢复', () => {
  const storage=memory();
  const store=createStore(storage);store.load([]);
  assert.equal(store.save([post]).ok,true);
  assert.deepEqual(createStore(storage).load([]).items,[post]);
});
test('已保存的空列表不重新填入演示信息', () => {
  assert.deepEqual(createStore(memory(JSON.stringify({version:1,items:[]}))).load([post]).items,[]);
});
test('损坏数据暂停发布并保留原始字节', () => {
  for(const raw of ['bad json', JSON.stringify({version:99,items:[post]}),JSON.stringify({version:1,items:[{title:'bad'}]})]) {
    const storage=memory(raw);const store=createStore(storage);
    const result=store.load([post]);
    assert.equal(result.writable,false);
    assert.ok(result.warning);
    assert.equal(store.save([post]).ok,false);
    assert.equal(storage.getItem(KEY),raw);
  }
});
test('存储不可访问时展示告警并暂停写入', () => {
  const store=createStore({getItem(){throw new Error('SecurityError');}});
  assert.equal(store.load([post]).writable,false);
  assert.equal(store.save([post]).ok,false);
});
test('容量不足导致保存失败，不修改原始数据', () => {
  const raw=JSON.stringify({version:1,items:[]});
  const storage=memory(raw);storage.setItem=()=>{throw new Error('QuotaExceededError');};
  const store=createStore(storage);store.load([]);
  const result=store.save([post]);
  assert.equal(result.ok,false);
  assert.ok(result.error.includes('表单内容已保留'));
  assert.equal(storage.getItem(KEY),raw);
});
test('重复编号及非法数据被拒绝写入', () => {
  const storage=memory();const store=createStore(storage);store.load([]);
  assert.equal(store.save([post,post]).ok,false);
  assert.equal(store.save([{...post,status:'unknown'}]).ok,false);
  assert.equal(storage.getItem(KEY),null);
});
