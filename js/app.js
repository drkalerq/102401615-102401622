(function () {
  'use strict';
  const core = window.LostFoundCore;
  let browserStorage;
  try { browserStorage = window.localStorage; } catch (_) { browserStorage = null; }
  const store = window.LostFoundStorage.createStore(browserStorage);
  const loaded = store.load(window.LostFoundDemo);
  let items = loaded.items;
  if (loaded.warning) {
    const warning = document.getElementById('storage-warning');
    warning.textContent = loaded.warning;
    warning.hidden = false;
    document.getElementById('publish-submit').disabled = true;
  }
  const icons = { '证件': '🪪', '电子用品': '🎧', '生活用品': '☂️', '书籍文具': '📚', '其他': '📦' };
  let homeFilter = 'all';
  let detailFrom = 'home';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function createCard(item, from) {
    const card = element('a', 'item-card');
    card.href = '#detail-' + encodeURIComponent(item.id);
    card.setAttribute('aria-label', '查看' + item.title + '的详情，' + core.statusLabel(item));
    card.addEventListener('click', function (event) {
      event.preventDefault();
      detailFrom = from || 'home';
      detailPage.render(item.id);
      navigate('detail');
    });
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
    if (!['home', 'search', 'publish', 'mine', 'detail'].includes(page)) return;
    document.querySelectorAll('.page').forEach(function (section) { section.hidden = section.id !== page + '-page'; });
    document.querySelectorAll('.nav-item').forEach(function (button) {
      const active = button.dataset.page === (page === 'detail' ? detailFrom : page);
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('feedback').hidden = true;
    if (page === 'home') renderHome();
    if (page === 'search') searchPage.render();
    if (page === 'mine') minePage.render();
    document.getElementById('main-content').focus({ preventScroll: true });
  }
  function saveItems(nextItems) {
    const result = store.save(nextItems);
    if (result.ok) items = nextItems;
    return result;
  }
  const minePage = window.LostFoundMyPosts.create({ core, getItems: () => items, createCard, element, saveItems, writable: loaded.writable });
  const searchPage = window.LostFoundSearch.create({ core, getItems: () => items, createCard, element });
  const detailPage = window.LostFoundDetail.create({ core, getItems: () => items, icons, element });
  document.getElementById('detail-back').addEventListener('click', function () { navigate(detailFrom); });
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
  const form = document.getElementById('publish-form');
  function showErrors(errors) {
    ['title', 'place', 'eventTime', 'description', 'contact'].forEach(function (key) {
      const field = document.getElementById('f-' + key);
      const message = document.getElementById('error-' + key);
      message.textContent = errors[key] || '';
      message.hidden = !errors[key];
      field.setAttribute('aria-invalid', String(Boolean(errors[key])));
      if (errors[key]) field.setAttribute('aria-describedby', message.id);
      else field.removeAttribute('aria-describedby');
    });
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    const checked = core.validatePost(input);
    showErrors(checked.errors);
    const failure = document.getElementById('publish-error');
    failure.hidden = true;
    if (!checked.valid) {
      failure.textContent = '发布未完成：' + Object.values(checked.errors)[0];
      failure.hidden = false;
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    const submit = document.getElementById('publish-submit');
    submit.disabled = true;
    try {
      let id;
      do {
        id = window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : 'post-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      } while (items.some(item => item.id === id));
      const post = core.createPost(checked.data, id, new Date());
      const nextItems = [post].concat(items);
      const result = saveItems(nextItems);
      if (!result.ok) throw new Error(result.error);
      form.reset();
      homeFilter = 'all';
      document.querySelectorAll('[data-filter]').forEach(function (button) {
        const active = button.dataset.filter === 'all';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      navigate('home');
      const feedback = document.getElementById('feedback');
      feedback.textContent = '发布成功！信息已保存在当前浏览器，并展示在首页。';
      feedback.hidden = false;
    } catch (error) {
      failure.textContent = error.message || '发布失败，请稍后重试。';
      failure.hidden = false;
    } finally {
      submit.disabled = !loaded.writable;
    }
  });
  renderHome();
})();
