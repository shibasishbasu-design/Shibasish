const { readCollection, updateCollection } = require('../utils/jsonStore');
const { nextId } = require('../utils/id');
const { HttpError, requireIdentity, requireString, requireReward, toSkillList } = require('../utils/validate');
const { upsertUser } = require('./users.controller');
const { logActivity } = require('./activity.controller');
const asyncHandler = require('../utils/asyncHandler');

const GIGS_FILE = 'gigs.json';

function isOwner(gig, email) {
  return gig.postedBy.email === email;
}

function findGigOrThrow(gigs, id) {
  const gig = gigs.find(g => g.id === id);
  if (!gig) throw new HttpError(404, 'Gig not found.');
  return gig;
}

const list = asyncHandler(async (req, res) => {
  const { status, category, mine, assignedTo, q } = req.query;
  let gigs = await readCollection(GIGS_FILE);

  if (status) gigs = gigs.filter(g => g.status === status);
  if (category) gigs = gigs.filter(g => g.category === category);
  if (mine) gigs = gigs.filter(g => g.postedBy.email === String(mine).toLowerCase());
  if (assignedTo) gigs = gigs.filter(g => g.assignedTo && g.assignedTo.email === String(assignedTo).toLowerCase());
  if (q) {
    const needle = String(q).toLowerCase();
    gigs = gigs.filter(g =>
      g.title.toLowerCase().includes(needle) ||
      g.description.toLowerCase().includes(needle) ||
      g.skills.some(skill => skill.toLowerCase().includes(needle))
    );
  }

  gigs = gigs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(gigs);
});

const getOne = asyncHandler(async (req, res) => {
  const gigs = await readCollection(GIGS_FILE);
  res.json(findGigOrThrow(gigs, req.params.id));
});

const create = asyncHandler(async (req, res) => {
  const { name, email } = requireIdentity(req.body);
  const title = requireString(req.body.title, 'Title', { max: 140 });
  const description = requireString(req.body.description, 'Description', { max: 2000 });
  const category = requireString(req.body.category, 'Category', { max: 60 });
  const architecture = requireString(req.body.architecture, 'Architecture / requirements', { max: 3000 });
  const reward = requireReward(req.body.reward);
  const deadline = requireString(req.body.deadline, 'Deadline', { max: 40 });
  const location = requireString(req.body.location || 'On campus', 'Location', { max: 140 });
  const skills = toSkillList(req.body.skills);

  const user = await upsertUser({ name, email });
  const now = new Date().toISOString();

  const gig = {
    id: nextId('GIG'),
    title,
    description,
    category,
    skills,
    architecture,
    reward,
    deadline,
    location,
    status: 'open',
    paymentReleased: false,
    postedBy: { userId: user.id, name: user.name, email: user.email },
    assignedTo: null,
    applicants: [],
    history: [{ action: 'posted', by: { name: user.name, email: user.email }, at: now, note: `Posted for ₹${reward}` }],
    createdAt: now,
    updatedAt: now
  };

  const saved = await updateCollection(GIGS_FILE, gigs => {
    gigs.push(gig);
    return gig;
  });

  await logActivity({ type: 'post_gig', user, gigId: gig.id, note: `Posted "${gig.title}"` });
  res.status(201).json(saved);
});

const take = asyncHandler(async (req, res) => {
  const { name, email } = requireIdentity(req.body);
  const user = await upsertUser({ name, email });

  const gig = await updateCollection(GIGS_FILE, gigs => {
    const target = findGigOrThrow(gigs, req.params.id);
    if (isOwner(target, email)) throw new HttpError(400, 'You cannot take a gig you posted yourself.');
    if (target.status !== 'open') throw new HttpError(409, 'This gig is no longer open.');

    target.assignedTo = { userId: user.id, name: user.name, email: user.email };
    if (!target.applicants.some(a => a.email === email)) {
      target.applicants.push({ userId: user.id, name: user.name, email: user.email, appliedAt: new Date().toISOString() });
    }
    target.status = 'in-progress';
    target.updatedAt = new Date().toISOString();
    target.history.push({ action: 'taken', by: { name: user.name, email: user.email }, at: target.updatedAt, note: 'Took the gig.' });
    return target;
  });

  await logActivity({ type: 'take_gig', user, gigId: gig.id, note: `Took "${gig.title}"` });
  res.json(gig);
});

const updateReward = asyncHandler(async (req, res) => {
  const { email } = requireIdentity({ name: req.body.name || 'owner', email: req.body.email });
  const reward = requireReward(req.body.reward);

  const gig = await updateCollection(GIGS_FILE, gigs => {
    const target = findGigOrThrow(gigs, req.params.id);
    if (!isOwner(target, email)) throw new HttpError(403, 'Only the gig owner can change the reward.');
    const from = target.reward;
    target.reward = reward;
    target.updatedAt = new Date().toISOString();
    target.history.push({
      action: 'reward_updated',
      by: target.postedBy,
      at: target.updatedAt,
      note: `Reward changed from ₹${from} to ₹${reward}`
    });
    return target;
  });

  await logActivity({ type: 'update_reward', user: gig.postedBy, gigId: gig.id, note: `Set reward to ₹${reward} on "${gig.title}"` });
  res.json(gig);
});

const updateArchitecture = asyncHandler(async (req, res) => {
  const { email } = requireIdentity({ name: req.body.name || 'owner', email: req.body.email });
  const architecture = requireString(req.body.architecture, 'Architecture / requirements', { max: 3000 });

  const gig = await updateCollection(GIGS_FILE, gigs => {
    const target = findGigOrThrow(gigs, req.params.id);
    if (!isOwner(target, email)) throw new HttpError(403, 'Only the gig owner can change the architecture.');
    target.architecture = architecture;
    target.updatedAt = new Date().toISOString();
    target.history.push({ action: 'architecture_updated', by: target.postedBy, at: target.updatedAt, note: 'Updated the architecture / requirements.' });
    return target;
  });

  await logActivity({ type: 'update_architecture', user: gig.postedBy, gigId: gig.id, note: `Updated architecture on "${gig.title}"` });
  res.json(gig);
});

const complete = asyncHandler(async (req, res) => {
  const { email } = requireIdentity({ name: req.body.name || 'worker', email: req.body.email });

  const gig = await updateCollection(GIGS_FILE, gigs => {
    const target = findGigOrThrow(gigs, req.params.id);
    if (!target.assignedTo || target.assignedTo.email !== email) {
      throw new HttpError(403, 'Only the student who took this gig can mark it complete.');
    }
    if (target.status !== 'in-progress') throw new HttpError(409, 'Only an in-progress gig can be completed.');
    target.status = 'completed';
    target.updatedAt = new Date().toISOString();
    target.completedAt = target.updatedAt;
    target.history.push({ action: 'completed', by: target.assignedTo, at: target.updatedAt, note: 'Marked the gig as completed.' });
    return target;
  });

  await logActivity({ type: 'complete_gig', user: gig.assignedTo, gigId: gig.id, note: `Completed "${gig.title}"` });
  res.json(gig);
});

const releasePayment = asyncHandler(async (req, res) => {
  const { email } = requireIdentity({ name: req.body.name || 'owner', email: req.body.email });

  const gig = await updateCollection(GIGS_FILE, gigs => {
    const target = findGigOrThrow(gigs, req.params.id);
    if (!isOwner(target, email)) throw new HttpError(403, 'Only the gig owner can release the payment.');
    if (target.status !== 'completed') throw new HttpError(409, 'The gig must be completed before payment is released.');
    if (target.paymentReleased) throw new HttpError(409, 'Payment has already been released.');

    target.paymentReleased = true;
    target.paymentReleasedAt = new Date().toISOString();
    target.updatedAt = target.paymentReleasedAt;
    target.history.push({ action: 'payment_released', by: target.postedBy, at: target.updatedAt, note: `Released ₹${target.reward} to ${target.assignedTo.name}.` });
    return target;
  });

  await logActivity({
    type: 'release_payment',
    user: { id: gig.postedBy.userId, name: gig.postedBy.name, email: gig.postedBy.email },
    gigId: gig.id,
    note: `Released ₹${gig.reward} for "${gig.title}"`
  });
  res.json(gig);
});

const remove = asyncHandler(async (req, res) => {
  const { email } = requireIdentity({ name: req.body.name || 'owner', email: req.body.email });
  let deletedGig;

  await updateCollection(GIGS_FILE, gigs => {
    const index = gigs.findIndex(g => g.id === req.params.id);
    if (index === -1) throw new HttpError(404, 'Gig not found.');
    const target = gigs[index];
    if (!isOwner(target, email)) throw new HttpError(403, 'Only the gig owner can delete this gig.');
    if (target.status !== 'open') throw new HttpError(409, 'Only an open gig can be deleted.');
    deletedGig = gigs.splice(index, 1)[0];
    return deletedGig;
  });

  await logActivity({
    type: 'delete_gig',
    user: { id: deletedGig.postedBy.userId, name: deletedGig.postedBy.name, email: deletedGig.postedBy.email },
    gigId: deletedGig.id,
    note: `Deleted "${deletedGig.title}"`
  });
  res.json({ message: 'Gig deleted.', gig: deletedGig });
});

module.exports = { list, getOne, create, take, updateReward, updateArchitecture, complete, releasePayment, remove };
