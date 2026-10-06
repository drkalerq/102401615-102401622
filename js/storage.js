/* 统一存储接口：只有写入成功，调用者才更新当前页面中的数据。 */
(function (root) {
  'use strict';
  const KEY = 'campus-lost-found.v1';
  function validRecord(item) {
    if (!item || typeof item !== 'object') return false;
    if (!['lost', 'found'].includes(item.type) || !['active', 'completed'].includes(item.status)) return false;
    if (typeof item.isMine !== 'boolean') return false;
    return ['id', 'title', 'category', 'place', 'eventTime', 'createdAt', 'description', 'contact', 'owner', 'image'].every(k => typeof item[k] === 'string')
      && item.id.length > 0 && item.title.trim().length > 0 && Number.isFinite(Date.parse(item.createdAt));
  }
  function validItems(items) {
    return Array.isArray(items) && items.every(validRecord) && new Set(items.map(x => x.id)).size === items.length;
  }
  function copy(items) { return JSON.parse(JSON.stringify(items)); }
  function createStore(storage) {
    let writable = true;
    function load(seed) {
      try {
        const raw = storage.getItem(KEY);
        if (raw === null) { writable = true; return { items: copy(seed), warning: '', writable: true }; }
        const saved = JSON.parse(raw);
        if (!saved || saved.version !== 1 || !validItems(saved.items)) throw new Error('invalid data');
        writable = true;
        return { items: copy(saved.items), warning: '', writable: true };
      } catch (_) {
        writable = false;
        return { items: copy(seed), warning: '无法读取本地数据，暂展示初始演示信息并暂停发布。请勿清除原记录，可先备份后排查浏览器存储设置。', writable: false };
      }
    }
    function save(items) {
      if (!writable) return { ok: false, error: '当前本地数据无法读取，发布已暂停，原记录未被覆盖。' };
      if (!validItems(items)) return { ok: false, error: '信息数据格式有误，未保存。' };
      try {
        storage.setItem(KEY, JSON.stringify({ version: 1, items: items }));
        return { ok: true, error: '' };
      } catch (_) {
        return { ok: false, error: '保存失败，可能是存储空间不足或浏览器禁止本地保存。表单内容已保留，请检查后重试。' };
      }
    }
    return { load, save };
  }
  const api = { KEY, createStore, validItems };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LostFoundStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
