# Campus GIG

A campus gig marketplace: post work, browse it, take it, and manage the reward
and technical spec as things change — all backed by a JSON file database.

## Structure

```
frontend/            static site — entry point is index.html
  index.html          landing page: "Post a Gig" or "Work on a Gig" + identity capture
  css/style.css
  js/                  api.js, session.js + one script per page
  pages/
    gigs.html          browse / take / fix reward / fix architecture / mark complete
    post.html          post a new gig

backend/              Node.js + Express API and static host
  server.js            entry point
  routes/              users, gigs, activity
  controllers/         request handling + business rules
  utils/                JSON file store, id generation, validation
  data/                 the "database" — users.json, gigs.json, activity.json
```

## The flow

1. Land on the homepage and pick **Post a Gig** or **Work on a Gig**.
2. First time through, you're asked for your **name and email** — no password.
   That identity is stored in the browser and sent with every request, so
   everything you do is tied to your session in `backend/data/`.
3. From there:
   - **Post** — describe the work, set a reward, and define the architecture
     / requirements (tools, deliverables, constraints).
   - **See** — browse open gigs, search, and filter by category.
   - **Take** — claim an open gig that isn't your own.
   - **Fix the Reward** — as the poster, change the reward amount anytime.
   - **Fix the Architecture** — as the poster, edit the requirements anytime.
   - **Mark Completed** — as the person who took a gig, close it out.
   - **Release Payment** — as the poster, release the reward after checking the completed work; the worker sees it under **Rewards**.
   - **Delete** — as the poster, remove an open gig from **Posted by Me**.

Every action is appended to `backend/data/activity.json`, visible under the
**Activity** tab on the Gigs page.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev        # or: npm start
```

Open `http://localhost:5000/` — the backend serves the frontend directly, so
one server is all you need locally.

## Deploy on Render

**Single service (simplest):** the backend already serves `frontend/` as
static files, so one Render Web Service hosts the whole app.

1. New **Web Service** → connect this repo.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add an environment variable `NODE_ENV=production` (optional but recommended).

A `render.yaml` is included at the repo root if you prefer Render's Blueprint
deploy (`New +` → `Blueprint`).

**Two services instead**, if you'd rather host the frontend separately as a
Render Static Site:

1. Deploy `backend/` as a Web Service as above.
2. Deploy `frontend/` as a Static Site (Publish Directory: `frontend`).
3. In `frontend/index.html`, `frontend/pages/gigs.html`, and
   `frontend/pages/post.html`, change the inline
   `window.CAMPUSGIG_CONFIG = { apiBase: '/api' }` to the deployed backend's
   full URL, e.g. `https://campusgig-backend.onrender.com/api`.
4. Set `ALLOWED_ORIGIN` on the backend service to the static site's URL so
   CORS allows it.

## Data

The JSON "database" lives entirely in `backend/data/` and never ships to the
frontend directly — all reads and writes go through the API. It comes
pre-seeded with a handful of demo gigs (posted by `demo@campusgig.app`) so the
board isn't empty on first run; everything you post or take under your own
email lives alongside them.
