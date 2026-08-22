(() => {
  const user = session.requireIdentityOrRedirect('gigs');
  if (!user) return;
  session.renderIdentityBadge();

  const grid = document.getElementById('gig-grid');
  const activityList = document.getElementById('activity-list');
  const filterBar = document.getElementById('open-filters');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const tabs = document.querySelectorAll('.tab');

  let activeTab = 'open';
  let allCategories = new Set();
  let debounceTimer = null;

  const STATUS_LABEL = { open: 'Open', 'in-progress': 'In progress', completed: 'Completed' };

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  function fmtDateTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  }

  function skeleton() {
    grid.innerHTML = Array.from({ length: 3 }).map(() => `
      <div class="glass-card gig-card">
        <div class="skeleton-line" style="width:60%"></div>
        <div class="skeleton-line" style="width:90%"></div>
        <div class="skeleton-line" style="width:40%"></div>
      </div>`).join('');
  }

  function renderGigCard(gig) {
    const esc = session.escapeHtml;
    const isOwner = gig.postedBy.email === user.email;
    const isAssignee = gig.assignedTo && gig.assignedTo.email === user.email;
    const skillsHtml = gig.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('');

    let actions = '';
    if (activeTab === 'open') {
      if (isOwner) {
        actions = `<span class="chip">Your gig</span>`;
      } else if (gig.status !== 'open') {
        actions = `<span class="chip">${gig.assignedTo && gig.assignedTo.email === user.email ? 'You took this' : 'Already taken'}</span>`;
      } else {
        actions = `<button class="btn btn-primary btn-small" data-action="take" data-gig-id="${gig.id}">Take this Gig</button>`;
      }
    } else if (activeTab === 'mine') {
      actions = `
        <button class="btn btn-secondary btn-small" data-action="toggle-reward" data-gig-id="${gig.id}">Fix Reward</button>
        <button class="btn btn-secondary btn-small" data-action="toggle-architecture" data-gig-id="${gig.id}">Fix Architecture</button>`;
    } else if (activeTab === 'taken') {
      if (gig.status === 'in-progress' && isAssignee) {
        actions = `<button class="btn btn-primary btn-small" data-action="complete" data-gig-id="${gig.id}">Mark Completed</button>`;
      } else {
        actions = `<span class="chip">${STATUS_LABEL[gig.status]}</span>`;
      }
    }

    const ownerLine = activeTab !== 'mine' ? `<div class="meta"><span>Posted by ${esc(gig.postedBy.name)}</span><span>${fmtDate(gig.deadline)}</span></div>` : `<div class="meta"><span>${gig.applicants.length} applicant${gig.applicants.length === 1 ? '' : 's'}</span><span>${fmtDate(gig.deadline)}</span></div>`;

    const assignedLine = gig.assignedTo ? `<p class="desc">Assigned to <strong>${esc(gig.assignedTo.name)}</strong></p>` : '';

    return `
      <article class="glass-card gig-card" data-card-id="${gig.id}">
        <div class="top-row">
          <span class="badge status-${gig.status}">${STATUS_LABEL[gig.status]}</span>
          <span class="reward-tag">₹${gig.reward}</span>
        </div>
        <h3>${esc(gig.title)}</h3>
        <p class="desc">${esc(gig.description)}</p>
        <div class="chip-row">${skillsHtml}<span class="chip">${esc(gig.category)}</span></div>
        ${ownerLine}
        ${assignedLine}
        <details class="architecture">
          <summary>Architecture / requirements</summary>
          <p>${esc(gig.architecture)}</p>
        </details>
        <div class="spacer"></div>
        <div class="actions">${actions}</div>
        <div class="inline-edit" data-inline="reward" data-gig-id="${gig.id}">
          <input type="number" min="1" step="1" value="${gig.reward}" data-input="reward">
          <button class="btn btn-primary btn-small" data-action="save-reward" data-gig-id="${gig.id}">Save</button>
          <button class="btn btn-ghost btn-small" data-action="toggle-reward" data-gig-id="${gig.id}">Cancel</button>
        </div>
        <div class="inline-edit" data-inline="architecture" data-gig-id="${gig.id}">
          <textarea data-input="architecture">${esc(gig.architecture)}</textarea>
          <button class="btn btn-primary btn-small" data-action="save-architecture" data-gig-id="${gig.id}">Save</button>
          <button class="btn btn-ghost btn-small" data-action="toggle-architecture" data-gig-id="${gig.id}">Cancel</button>
        </div>
      </article>`;
  }

  function renderEmpty(message) {
    grid.innerHTML = `<div class="empty-state">${message}</div>`;
  }

  function updateCategoryOptions() {
    const current = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">All categories</option>' +
      Array.from(allCategories).sort().map(c => `<option value="${session.escapeHtml(c)}">${session.escapeHtml(c)}</option>`).join('');
    categoryFilter.value = current;
  }

  async function loadOpenTab() {
    skeleton();
    const filters = { status: 'open' };
    if (searchInput.value.trim()) filters.q = searchInput.value.trim();
    if (categoryFilter.value) filters.category = categoryFilter.value;
    const gigs = await api.getGigs(filters);
    gigs.forEach(g => allCategories.add(g.category));
    updateCategoryOptions();
    grid.innerHTML = gigs.length ? gigs.map(renderGigCard).join('') : renderEmptyMessage('No open gigs match your filters yet.');
  }

  function renderEmptyMessage(message) {
    return `<div class="empty-state">${message}</div>`;
  }

  async function loadMineTab() {
    skeleton();
    const gigs = await api.getGigs({ mine: user.email });
    grid.innerHTML = gigs.length ? gigs.map(renderGigCard).join('') : renderEmptyMessage('You haven\'t posted a gig yet. <a class="link-btn" href="post.html">Post one now</a>.');
  }

  async function loadTakenTab() {
    skeleton();
    const gigs = await api.getGigs({ assignedTo: user.email });
    grid.innerHTML = gigs.length ? gigs.map(renderGigCard).join('') : renderEmptyMessage('You haven\'t taken a gig yet. Switch to Open Gigs to find one.');
  }

  async function loadActivityTab() {
    activityList.innerHTML = '<div class="skeleton-line" style="width:50%"></div>';
    const entries = await api.getActivity({ email: user.email, limit: 30 });
    activityList.innerHTML = entries.length ? entries.map(e => `
      <div class="activity-item">
        <strong>${session.escapeHtml(e.note)}</strong>
        <small>${fmtDateTime(e.at)}</small>
      </div>`).join('') : '<p>No activity recorded yet for your account.</p>';
  }

  async function loadActiveTab() {
    try {
      if (activeTab === 'activity') {
        grid.classList.add('hidden');
        filterBar.classList.add('hidden');
        activityList.classList.remove('hidden');
        await loadActivityTab();
        return;
      }
      grid.classList.remove('hidden');
      activityList.classList.add('hidden');
      filterBar.classList.toggle('hidden', activeTab !== 'open');

      if (activeTab === 'open') await loadOpenTab();
      else if (activeTab === 'mine') await loadMineTab();
      else if (activeTab === 'taken') await loadTakenTab();
    } catch (err) {
      renderEmpty(session.escapeHtml(err.message));
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    loadActiveTab();
  }));

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadActiveTab, 350);
  });
  categoryFilter.addEventListener('change', loadActiveTab);

  grid.addEventListener('click', async e => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const { action, gigId } = button.dataset;

    if (action === 'toggle-reward' || action === 'toggle-architecture') {
      const kind = action.replace('toggle-', '');
      const panel = grid.querySelector(`[data-inline="${kind}"][data-gig-id="${gigId}"]`);
      if (panel) panel.classList.toggle('open');
      return;
    }

    try {
      if (action === 'take') {
        button.disabled = true;
        button.textContent = 'Taking...';
        await api.takeGig(gigId, { name: user.name, email: user.email });
        session.showToast('Gig taken — good luck!');
        await loadActiveTab();
      } else if (action === 'complete') {
        button.disabled = true;
        button.textContent = 'Marking...';
        await api.completeGig(gigId, { name: user.name, email: user.email });
        session.showToast('Marked as completed.');
        await loadActiveTab();
      } else if (action === 'save-reward') {
        const input = grid.querySelector(`[data-inline="reward"][data-gig-id="${gigId}"] input`);
        await api.updateReward(gigId, { email: user.email, reward: Number(input.value) });
        session.showToast('Reward updated.');
        await loadActiveTab();
      } else if (action === 'save-architecture') {
        const textarea = grid.querySelector(`[data-inline="architecture"][data-gig-id="${gigId}"] textarea`);
        await api.updateArchitecture(gigId, { email: user.email, architecture: textarea.value });
        session.showToast('Architecture updated.');
        await loadActiveTab();
      }
    } catch (err) {
      session.showToast(err.message, 'error');
      button.disabled = false;
    }
  });

  loadActiveTab();
})();
