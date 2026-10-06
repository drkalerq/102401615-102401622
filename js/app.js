(function () {
  'use strict';
  const core = window.LostFoundCore;
  const items = window.LostFoundDemo;
  const icons = { '证件': '🪪', '电子用品': '🎧', '生活用品': '☂️' };
  let homeFilter = 'all';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function createCard(item) {
    const card = element('article', 'item-card');
    const info = element('div', 'item-info');
    const badges = element('div', 'badges');
    badges.append(element('span', 'badge ' + item.type, item.type === 'lost' ? '寻物' : '招领'));
    badges.append(element('span', 'badge ' + (item.status === 'completed' ? 'done' : 'status'), core.statusLabel(item)));
    info.append(badges, element('h3', 'item-title', item.title),
      element('p', 'item-meta', item.place + ' · ' + item.eventTime),
      element('p', 'item-owner', (item.type === 'lost' ? '失主：' : '拾得者：') + item.owner));
    const thumb = element('div', 'item-thumb ' + item.type, icons[item.category] || '📦');
    thumb.setAttribute('aria-hidden', 'true');
    card.append(info, thumb);
    return card;
  }
  function renderHome() {
    const visible = core.filterItems(items, homeFilter);
    const list = document.getElementById('home-list');
    list.replaceChildren();
    document.getElementById('result-count').textContent = '共 ' + visible.length + ' 条';
    if (!visible.length) list.append(element('p', 'empty-state', '暂无相关信息'));
    else visible.forEach(function (item) { list.append(createCard(item)); });
  }
  function navigate(page) {
    if (!['home', 'search', 'publish', 'mine'].includes(page)) return;
    document.querySelectorAll('.page').forEach(function (section) { section.hidden = section.id !== page + '-page'; });
    document.querySelectorAll('.nav-item').forEach(function (button) {
      const active = button.dataset.page === page;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (page === 'home') renderHome();
    document.getElementById('main-content').focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-page]').forEach(function (button) {
    button.addEventListener('click', function () { navigate(button.dataset.page); });
  });
  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      homeFilter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(function (filter) {
        const active = filter === button;
        filter.classList.toggle('active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      renderHome();
    });
  });
  renderHome();
})();
