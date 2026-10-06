/* 详情依据编号从共享数据中读取，所有用户文字均通过 textContent 渲染。 */
(function () {
  'use strict';
  function create(context) {
    const box = document.getElementById('detail-content');
    function render(id) {
      box.replaceChildren();
      const item = context.core.findItem(context.getItems(), id);
      if (!item) {
        box.append(context.element('p', 'empty-state', '这条信息已不存在，请返回列表查看其他信息。'));
        return;
      }
      const el = context.element;
      const panel = el('article', 'detail-panel');
      const image = el('div', 'detail-image', context.icons[item.category] || '📦');
      image.setAttribute('aria-hidden', 'true');
      window.LostFoundImages.renderPhoto(image,item.image,item.title + '照片');
      const badges = el('div', 'badges');
      badges.append(el('span', 'badge ' + item.type, item.type === 'lost' ? '寻物' : '招领'),
        el('span', 'badge ' + (item.status === 'completed' ? 'done' : 'status'), context.core.statusLabel(item)));
      const title = el('h3', 'detail-item-title', item.title);
      const info = el('dl', 'detail-info');
      [['类别', item.category], ['丢失／捡到地点', item.place], ['丢失／捡到时间', item.eventTime], ['发布者', item.owner], ['发布时间', new Date(item.createdAt).toLocaleString('zh-CN', {hour12: false})]].forEach(function (pair) {
        const row = el('div', 'detail-row');
        row.append(el('dt', '', pair[0]), el('dd', '', pair[1]));
        info.append(row);
      });
      panel.append(image, badges, title, info, el('h4', 'detail-subtitle', '物品描述'),
        el('p', 'detail-description', item.description || '发布者暂未补充描述。'));
      if (item.status === 'completed') panel.append(el('p', 'notice success-notice', '这条信息已完成，请留意物品状态，避免重复联系。'));
      const contactButton = el('button', 'primary-button submit-button', '联系发布者');
      contactButton.type = 'button';
      contactButton.setAttribute('aria-expanded', 'false');
      contactButton.setAttribute('aria-controls', 'detail-contact');
      const contactBox = el('div', 'contact-box');
      contactBox.id = 'detail-contact';
      contactBox.hidden = true;
      const contactLabel = el('label', 'detail-subtitle', '联系方式');
      contactLabel.htmlFor = 'contact-value';
      const contactValue = el('textarea', 'contact-value');
      contactValue.id = 'contact-value';
      contactValue.readOnly = true;
      contactValue.rows = 2;
      contactValue.value = item.contact;
      const copyButton = el('button', 'secondary-button', '复制联系方式');
      copyButton.type = 'button';
      const copyFeedback = el('p', 'field-hint');
      copyFeedback.setAttribute('role', 'status');
      copyButton.addEventListener('click', async function () {
        copyButton.disabled = true;
        try {
          let clipboard;
          try { clipboard = navigator.clipboard; } catch (_) { clipboard = null; }
          const result = await window.LostFoundClipboard.copyText(item.contact, clipboard);
          if (result.ok) copyFeedback.textContent = '已复制联系方式，可前往联系发布者。';
          else {
            copyFeedback.textContent = '自动复制失败，请在下方联系方式中按 Ctrl+C 手动复制。';
            if (contactValue.isConnected && !contactBox.hidden) {
              contactValue.focus();
              contactValue.select();
            }
          }
        } finally { copyButton.disabled = false; }
      });
      contactBox.append(contactLabel, contactValue, copyButton, copyFeedback,
        el('p', 'field-hint', '请通过上述方式自行联系发布者。初始示例联系方式仅用于演示。'));
      contactButton.addEventListener('click', function () {
        const show = contactBox.hidden;
        contactBox.hidden = !show;
        contactButton.setAttribute('aria-expanded', String(show));
        contactButton.textContent = show ? '收起联系方式' : '联系发布者';
      });
      panel.append(contactButton, contactBox);
      box.append(panel);
    }
    return { render };
  }
  window.LostFoundDetail = { create };
})();
