const test = require('node:test');
const assert = require('node:assert/strict');
const { filterItems, statusLabel } = require('../js/core.js');
const items = [
  { id: 'older', type: 'lost', createdAt: '2026-09-20T10:00:00+08:00', status: 'active' },
  { id: 'newer', type: 'found', createdAt: '2026-09-22T10:00:00+08:00', status: 'active' },
  { id: 'middle', type: 'lost', createdAt: '2026-09-21T10:00:00+08:00', status: 'completed' }
];
test('全部信息按发布时间倒序展示', () => {
  assert.deepEqual(filterItems(items, 'all').map(x => x.id), ['newer', 'middle', 'older']);
});
test('寻物筛选排除招领信息并保留已找回信息', () => {
  assert.deepEqual(filterItems(items, 'lost').map(x => x.id), ['middle', 'older']);
});
test('招领筛选排除寻物信息', () => {
  assert.deepEqual(filterItems(items, 'found').map(x => x.id), ['newer']);
});
test('空列表及无匹配类型返回空结果', () => {
  assert.deepEqual(filterItems([], 'all'), []);
  assert.deepEqual(filterItems([items[0]], 'found'), []);
});
test('筛选和排序不改变原始列表', () => {
  const snapshot = structuredClone(items);
  filterItems(items, 'all');
  assert.deepEqual(items, snapshot);
});
test('寻物与招领的进行中、完成状态文案分别正确', () => {
  assert.equal(statusLabel({type: 'lost', status: 'active'}), '待寻找');
  assert.equal(statusLabel({type: 'found', status: 'active'}), '待认领');
  assert.equal(statusLabel({type: 'lost', status: 'completed'}), '已找回');
  assert.equal(statusLabel({type: 'found', status: 'completed'}), '已归还');
});
