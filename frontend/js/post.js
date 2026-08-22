(() => {
  const user = session.requireIdentityOrRedirect('post');
  if (!user) return;
  session.renderIdentityBadge();

  const form = document.getElementById('post-form');
  const notice = document.getElementById('form-notice');
  const submitBtn = document.getElementById('post-submit');

  const fields = {
    title: document.getElementById('f-title'),
    category: document.getElementById('f-category'),
    reward: document.getElementById('f-reward'),
    deadline: document.getElementById('f-deadline'),
    location: document.getElementById('f-location'),
    skills: document.getElementById('f-skills'),
    description: document.getElementById('f-description'),
    architecture: document.getElementById('f-architecture')
  };

  const preview = {
    title: document.getElementById('preview-title'),
    reward: document.getElementById('preview-reward'),
    deadline: document.getElementById('preview-deadline'),
    poster: document.getElementById('preview-poster'),
    description: document.getElementById('preview-description')
  };

  preview.poster.textContent = user.name;

  function updatePreview() {
    preview.title.textContent = fields.title.value.trim() || 'Your gig title';
    preview.reward.textContent = `₹${Number(fields.reward.value) || 0}`;
    preview.deadline.textContent = fields.deadline.value
      ? new Date(fields.deadline.value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    preview.description.textContent = fields.description.value.trim() || 'Fill in the form to see a live preview.';
  }

  Object.values(fields).forEach(el => el.addEventListener('input', updatePreview));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    notice.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    try {
      const gig = await api.createGig({
        name: user.name,
        email: user.email,
        title: fields.title.value.trim(),
        category: fields.category.value.trim(),
        reward: Number(fields.reward.value),
        deadline: fields.deadline.value,
        location: fields.location.value.trim(),
        skills: fields.skills.value,
        description: fields.description.value.trim(),
        architecture: fields.architecture.value.trim()
      });
      session.showToast(`Posted "${gig.title}"`);
      window.location.href = 'gigs.html';
    } catch (err) {
      notice.innerHTML = `<div class="notice error">${session.escapeHtml(err.message)}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post this Gig';
    }
  });

  updatePreview();
})();
