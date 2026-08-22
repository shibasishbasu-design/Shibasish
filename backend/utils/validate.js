const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireIdentity(body = {}) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (!name) throw new HttpError(400, 'Name is required.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
  return { name, email };
}

function requireString(value, label, { min = 1, max = 4000 } = {}) {
  const str = String(value ?? '').trim();
  if (str.length < min) throw new HttpError(400, `${label} is required.`);
  if (str.length > max) throw new HttpError(400, `${label} is too long.`);
  return str;
}

function requireReward(value) {
  const reward = Number(value);
  if (!Number.isFinite(reward) || reward <= 0) throw new HttpError(400, 'Reward must be a positive number.');
  return Math.round(reward * 100) / 100;
}

function toSkillList(value) {
  if (Array.isArray(value)) return value.map(s => String(s).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

module.exports = { HttpError, requireIdentity, requireString, requireReward, toSkillList, EMAIL_RE };
