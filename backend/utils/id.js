function nextId(prefix) {
  const timePart = Date.now().toString(36);
  const randPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timePart}-${randPart}`.toUpperCase();
}

module.exports = { nextId };
