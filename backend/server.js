require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const usersRoutes = require('./routes/users.routes');
const gigsRoutes = require('./routes/gigs.routes');
const activityRoutes = require('./routes/activity.routes');
const { HttpError } = require('./utils/validate');

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/users', usersRoutes);
app.use('/api/gigs', gigsRoutes);
app.use('/api/activity', activityRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  next();
});
app.use(express.static(frontendDir));
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((error, req, res, next) => {
  const status = error instanceof HttpError ? error.status : (error.status || 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ error: error.message || 'Internal server error' });
});

app.listen(port, () => console.log(`Campus GIG running at http://localhost:${port}`));
