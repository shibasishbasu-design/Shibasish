const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const queues = new Map();

function enqueue(file, task) {
  const previous = queues.get(file) || Promise.resolve();
  const next = previous.then(task, task);
  queues.set(file, next.catch(() => {}));
  return next;
}

async function readFromDisk(file) {
  const filePath = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(filePath, '[]\n');
      return [];
    }
    throw error;
  }
}

async function writeToDisk(file, data) {
  const filePath = path.join(DATA_DIR, file);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

// Read-only snapshot of a collection.
function readCollection(file) {
  return enqueue(file, () => readFromDisk(file));
}

// Read + mutate + persist a collection atomically relative to other
// operations on the same file. `updater` receives the live array, mutates
// it in place (push/splice/etc.) and returns whatever the caller wants back.
function updateCollection(file, updater) {
  return enqueue(file, async () => {
    const data = await readFromDisk(file);
    const result = await updater(data);
    await writeToDisk(file, data);
    return result;
  });
}

module.exports = { readCollection, updateCollection };
