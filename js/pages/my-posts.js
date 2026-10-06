/* 我的发布：只从共享数据读取，状态更新先保存再重新渲染。 */
(function () {
  'use strict';
  function create(context) {
    let filter = 'all';
    const el = context.element;
    const feedback = document.getElementById('mine-feedback');
    function render() {
      const summary = context.core.mySummary(context.getItems());
      const stats = document.getElementById('mine-summary');
      stats.replaceChildren();
      [['寻物中',summary.lostActive],['招领中',summary.foundActive],['已完成',summary.completed]].forEach(function (pair) {
        const stat = el('div', 'mine-stat');
        stat.append(el('strong','',String(pair[1])),el('span','',pair[0]));
        stats.append(stat);
      });
      const list = document.getElementById('mine-list');
      list.replaceChildren();
      const mine = context.core.myItems(context.getItems(),filter);
      if (!mine.length) list.append(el('p','empty-state','这个分类下还没有你的发布，可以先发布一条信息。'));
      mine.forEach(function (item) {
        const entry = el('div','mine-entry');
        entry.append(context.createCard(item,'mine'));
        const actions = el('div','mine-actions');
        const button = el('button','secondary-button', item.status === 'active'
          ? (item.type === 'lost' ? '标记已找回' : '标记已归还') : '恢复进行中');
        button.type = 'button';
        button.disabled = !context.writable;
        button.addEventListener('click',function () {
          const status = item.status === 'active' ? 'completed' : 'active';
          const label = status === 'completed' ? (item.type === 'lost' ? '已找回' : '已归还') : (item.type === 'lost' ? '待寻找' : '待认领');
          if (!window.confirm('确认将“' + item.title + '”标记为“' + label + '”？')) return;
          button.disabled = true;
          try {
            const nextItems = context.core.changeStatus(context.getItems(),item.id,status);
            const result = context.saveItems(nextItems);
            if (!result.ok) throw new Error(result.error);
            render();
            feedback.className = 'notice success-notice';
            feedback.textContent = '状态已更新为“' + label + '”，并已保存。';
          } catch (error) {
            feedback.className = 'notice error-notice';
            feedback.textContent = error.message || '状态更新失败。';
            button.disabled = !context.writable;
          }
          feedback.hidden = false;
        });
        actions.append(button);
        entry.append(actions);
        list.append(entry);
      });
    }
    document.querySelectorAll('[data-mine-filter]').forEach(function (button) {
      button.addEventListener('click',function () {
        filter = button.dataset.mineFilter;
        feedback.hidden = true;
        document.querySelectorAll('[data-mine-filter]').forEach(function (option) {
          const active = option === button;
          option.classList.toggle('active',active);
          option.setAttribute('aria-pressed',String(active));
        });
        render();
      });
    });
    return {render};
  }
  window.LostFoundMyPosts = {create};
})();
