(() => {
  const STORAGE_KEY = 'campusgig_user';

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function homeHref() {
    return document.body.dataset.depth === 'nested' ? '../index.html' : 'index.html';
  }

  function pageHref(page) {
    return document.body.dataset.depth === 'nested' ? `${page}.html` : `pages/${page}.html`;
  }

  // Renders the "Hi, name / Switch" badge into any element carrying
  // [data-identity-badge]. Falls back to a "Get started" link when signed out.
  function renderIdentityBadge() {
    document.querySelectorAll('[data-identity-badge]').forEach(el => {
      const user = getUser();
      if (!user) {
        el.innerHTML = `<a class="link-btn" href="${homeHref()}">Get started</a>`;
        return;
      }
      el.innerHTML = `<span class="identity-badge"><strong>${escapeHtml(user.name)}</strong><button type="button" class="link-btn" data-switch-account>Switch</button></span>`;
      el.querySelector('[data-switch-account]').addEventListener('click', () => {
        clearUser();
        window.location.href = homeHref();
      });
    });
  }

  // Guards a page that requires identity: redirects to the landing page
  // (carrying `next` so it can bounce the visitor back once identified).
  function requireIdentityOrRedirect(nextPage) {
    const user = getUser();
    if (!user) {
      window.location.href = `${homeHref()}?next=${encodeURIComponent(nextPage)}`;
      return null;
    }
    return user;
  }

  function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
  }

  window.session = { getUser, setUser, clearUser, escapeHtml, homeHref, pageHref, renderIdentityBadge, requireIdentityOrRedirect, showToast };
})();
