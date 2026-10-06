/* 只有剪贴板 API 确认写入成功，才返回成功；页面负责手动复制的备用操作。 */
(function (root) {
  'use strict';
  async function copyText(text, clipboard) {
    if (typeof text !== 'string' || !text.trim()) return {ok: false};
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') return {ok: false};
      await clipboard.writeText(text);
      return {ok: true};
    } catch (_) { return {ok: false}; }
  }
  const api = {copyText};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LostFoundClipboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
