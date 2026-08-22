const { updateCollection } = require('../utils/jsonStore');
const { nextId } = require('../utils/id');
const { requireIdentity } = require('../utils/validate');
const { logActivity } = require('./activity.controller');
const asyncHandler = require('../utils/asyncHandler');

const USERS_FILE = 'users.json';

// Finds a user by email, or creates one. Updates the display name and
// lastSeenAt on every call so re-identifying keeps the record fresh.
async function upsertUser({ name, email }) {
  return updateCollection(USERS_FILE, users => {
    const now = new Date().toISOString();
    let user = users.find(u => u.email === email);
    if (user) {
      user.name = name;
      user.lastSeenAt = now;
    } else {
      user = { id: nextId('U'), name, email, createdAt: now, lastSeenAt: now };
      users.push(user);
    }
    return { ...user };
  });
}

const identify = asyncHandler(async (req, res) => {
  const { name, email } = requireIdentity(req.body);
  const user = await upsertUser({ name, email });
  await logActivity({ type: 'identify', user, gigId: null, note: 'Signed in with name and email.' });
  res.json({ user });
});

module.exports = { identify, upsertUser };
