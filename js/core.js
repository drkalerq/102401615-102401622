/* 无 DOM 的业务规则，后续可在 Node.js 单元测试中复用。 */
(function (root) {
  'use strict';
  function filterItems(items, type) {
    return items.filter(function (item) {
      return type === 'all' || item.type === type;
    }).sort(function (a, b) {
      return b.createdAt.localeCompare(a.createdAt);
    });
  }
  function statusLabel(item) {
    if (item.status === 'completed') return item.type === 'lost' ? '已找回' : '已归还';
    return item.type === 'lost' ? '待寻找' : '待认领';
  }
  const api = { filterItems: filterItems, statusLabel: statusLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LostFoundCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
