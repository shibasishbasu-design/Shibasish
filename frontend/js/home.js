(() => {
  const modal = document.getElementById('identity-modal');
  const form = document.getElementById('identity-form');
  const nameInput = document.getElementById('identity-name');
  const emailInput = document.getElementById('identity-email');
  const errorEl = document.getElementById('identity-error');
  const submitBtn = document.getElementById('identity-submit');
  const closeBtn = document.getElementById('identity-close');

  const targetPage = { post: 'post', gigs: 'gigs' };
  let pendingTarget = null;

  function goTo(page) {
    window.location.href = session.pageHref(page);
  }

  function openModal(target) {
    pendingTarget = target;
    errorEl.textContent = '';
    const existing = session.getUser();
    if (existing) { nameInput.value = existing.name; emailInput.value = existing.email; }
    modal.classList.add('open');
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    pendingTarget = null;
  }

  document.querySelectorAll('[data-choice]').forEach(card => {
    const activate = () => {
      const choice = card.dataset.choice;
      const page = targetPage[choice];
      const existing = session.getUser();
      if (existing) { goTo(page); return; }
      openModal(page);
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Continuing...';
    try {
      const { user } = await api.identify(nameInput.value.trim(), emailInput.value.trim());
      session.setUser(user);
      goTo(pendingTarget || 'gigs');
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
    }
  });

  session.renderIdentityBadge();

  // Arriving here with ?next=... (bounced from a guarded page) resumes that flow.
  const next = new URLSearchParams(window.location.search).get('next');
  if (next) {
    const existing = session.getUser();
    if (existing) goTo(next); else openModal(next);
  }
})();
