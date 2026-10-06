/* 搜索页只负责筛选状态及结果渲染；不维护第二份物品数据。 */
(function () {
  'use strict';
  function create(context) {
    const keyword = document.getElementById('search-keyword');
    const type = document.getElementById('search-type');
    const category = document.getElementById('search-category');
    const active = document.getElementById('search-active');
    function render() {
      const results = context.core.searchItems(context.getItems(), {
        keyword: keyword.value, type: type.value, category: category.value, activeOnly: active.checked
      });
      const list = document.getElementById('search-list');
      list.replaceChildren();
      document.getElementById('search-count').textContent = '共 ' + results.length + ' 条';
      if (!results.length) list.append(context.element('p', 'empty-state', '没有找到相关信息，请尝试更短的关键词或清空筛选。'));
      else results.forEach(function (item) { list.append(context.createCard(item, 'search')); });
    }
    document.getElementById('search-form').addEventListener('submit', function (event) { event.preventDefault(); render(); });
    keyword.addEventListener('input', render);
    [type, category, active].forEach(field => field.addEventListener('change', render));
    document.getElementById('search-reset').addEventListener('click', function () {
      keyword.value = '';
      type.value = 'all';
      category.value = 'all';
      active.checked = false;
      render();
      keyword.focus();
    });
    return { render };
  }
  window.LostFoundSearch = { create };
})();
