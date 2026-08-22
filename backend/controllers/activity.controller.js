const { readCollection, updateCollection } = require('../utils/jsonStore');
const { nextId } = require('../utils/id');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVITY_FILE = 'activity.json';

// Appends one entry to the activity log — this is the "session record" of
// who did what, used to back the recent-activity feed on the gigs page.
async function logActivity({ type, user, gigId = null, note = '' }) {
  return updateCollection(ACTIVITY_FILE, entries => {
    const entry = {
      id: nextId('A'),
      type,
      userId: user.id,
      name: user.name,
      email: user.email,
      gigId,
      note,
      at: new Date().toISOString()
    };
    entries.push(entry);
    if (entries.length > 500) entries.splice(0, entries.length - 500);
    return entry;
  });
}

const list = asyncHandler(async (req, res) => {
  const { email, limit } = req.query;
  let entries = await readCollection(ACTIVITY_FILE);
  if (email) entries = entries.filter(e => e.email === String(email).toLowerCase());
  entries = entries.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  const max = Math.min(Number(limit) || 20, 100);
  res.json(entries.slice(0, max));
});

module.exports = { logActivity, list };
