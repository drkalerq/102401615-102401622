const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/core.js');
const input = { type: 'lost', title: ' 雨伞 ', category: '生活用品', place: ' 食堂 ', eventTime: '', description: ' 黑色 ', contact: ' 微信 demo ' };
const now = '2026-10-06T09:00:00Z';
test('去除字段首尾空格并允许微信联系方式', () => {
  const result = core.validatePost(input);
  assert.equal(result.valid, true);
  assert.equal(result.data.title, '雨伞');
  assert.equal(result.data.contact, '微信 demo');
});
test('必填字段拒绝空白输入', () => {
  const result = core.validatePost({...input, title:' ', place:' ', contact:' '});
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['contact','place','title']);
});
test('每个文本字段检查边界长度', () => {
  for (const [key, limit] of [['title',40],['place',80],['contact',100],['description',500]]) {
    assert.equal(core.validatePost({...input,[key]:'字'.repeat(limit)}).valid, true);
    assert.ok(core.validatePost({...input,[key]:'字'.repeat(limit+1)}).errors[key]);
  }
});
test('非法类型和类别不能发布', () => {
  const result = core.validatePost({...input,type:'other',category:'not-a-category'});
  assert.ok(result.errors.type);
  assert.ok(result.errors.category);
});
test('日期接受闰日，拒绝不存在的日期和非法格式', () => {
  assert.equal(core.validatePost({...input,eventTime:'2024-02-29T12:30'}).valid, true);
  for (const eventTime of ['2026-02-30T12:30','2026-13-01T12:30','tomorrow','2026-10-06T25:00']) {
    assert.ok(core.validatePost({...input,eventTime}).errors.eventTime);
  }
});
test('寻物及招领发布后均具有有效初始状态和归属', () => {
  for (const type of ['lost','found']) {
    const post = core.createPost({...input,type}, 'post-'+type, now);
    assert.equal(post.type,type);
    assert.equal(post.status,'active');
    assert.equal(post.isMine,true);
    assert.equal(post.owner,'我');
    assert.equal(post.createdAt,now.replace('Z','.000Z'));
    assert.ok(post.eventTime);
    assert.equal(post.image,'');
  }
});
test('非法表单不能绕过校验创建记录', () => {
  assert.throws(() => core.createPost({...input,title:''},'post',now));
});
test('用户填写的丢失时间保留，展示排序使用发布时刻', () => {
  const post = core.createPost({...input,eventTime:'2026-09-01T10:30'},'post',now);
  assert.equal(post.eventTime,'2026-09-01 10:30');
  assert.equal(core.filterItems([{id:'old',type:'lost',createdAt:'2026-10-06T16:00:00+08:00'},post],'all')[0].id,'post');
});
