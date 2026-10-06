const test = require('node:test');
const assert = require('node:assert/strict');
const {copyText} = require('../js/clipboard.js');
test('剪贴板写入成功后返回成功，传入完整联系方式',async()=>{
  let text;const result=await copyText('微信 demo\n电话 123',{writeText:async value=>{text=value;}});
  assert.equal(result.ok,true);assert.equal(text,'微信 demo\n电话 123');
});
test('权限拒绝或 API 抛错不会报告复制成功',async()=>{
  assert.equal((await copyText('demo',{writeText:async()=>{throw new Error('denied');}})).ok,false);
  assert.equal((await copyText('demo',{writeText:()=>{throw new Error('denied');}})).ok,false);
});
test('没有剪贴板 API 时返回失败，允许页面提示手动复制',async()=>{
  assert.equal((await copyText('demo',undefined)).ok,false);
  assert.equal((await copyText('demo',{})).ok,false);
});
test('空联系方式不会写入或清空系统剪贴板',async()=>{
  let calls=0;const clipboard={writeText:async()=>{calls++;}};
  for(const text of ['', '   ',null])assert.equal((await copyText(text,clipboard)).ok,false);
  assert.equal(calls,0);
});
