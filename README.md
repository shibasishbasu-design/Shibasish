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

## Campus GIG

Campus GIG is a lightweight campus marketplace for posting small jobs,
finding student workers, tracking completion, and releasing rewards. It uses a
static frontend and an Express API backed by JSON files, so it can run locally
without a database service.

## What It Supports

- Identity-based sign in with a name and email. There are no passwords in this
   prototype.
- Posting a gig with a title, description, category, skills, requirements,
   reward, deadline, and location.
- Browsing open gigs with text search and category filtering.
- Taking an open gig as a worker.
- Viewing gigs posted by the current user.
- Editing the reward and requirements of an owned gig.
- Marking a taken gig as completed as the assigned worker.
- Releasing the reward as the gig owner after the work is completed.
- Viewing completed work and reward status in the worker's **Rewards** tab.
- Deleting an owned gig while it is still open.
- Viewing account-specific activity for posting, taking, completing, editing,
   payment release, deletion, and sign-in events.

## Complete User Flow

### 1. Identify yourself

From the homepage, choose **Post a Gig** or **Work on a Gig**. The first visit
asks for a name and email. The browser stores this identity in local storage
under `campusgig_user`, and the identity is sent with requests that change
data.

This is a prototype identity system, not production authentication. Anyone who
knows an email could technically submit requests as that email, so a real
deployment should replace it with authenticated accounts and server-side
sessions.

### 2. Post a gig

Open **Post a Gig**, complete the form, and submit it. A new gig starts with:

- `status: open`
- `paymentReleased: false`
- no assigned worker
- an empty applicant list
- a history entry recording the post

The owner can then find the gig in **Posted by Me**.

### 3. Find and take work

The **Open Gigs** tab shows gigs with `status: open`. Search checks the title,
description, and skills. Category filtering narrows the results.

A user cannot take their own gig. Taking someone else's gig:

1. Assigns the current user to `assignedTo`.
2. Adds the user to `applicants` if they are not already there.
3. Changes the status from `open` to `in-progress`.
4. Adds a `taken` history entry and activity entry.

### 4. Manage an owned gig

The **Posted by Me** tab provides owner actions:

- **Fix Reward** changes the INR reward amount and records the old and new
   amounts.
- **Fix Architecture** changes the requirements, deliverables, or constraints.
- **Release Payment** appears only after the assigned worker marks the gig
   completed and payment has not already been released.
- **Delete Gig** appears only while the gig is open. A confirmation dialog is
   shown before deletion.

Only the owner email stored on the gig can perform owner actions. A gig that is
already in progress or completed cannot be deleted, which protects an active
assignment and its payment history.

### 5. Mark work completed

The assigned worker uses **My Taken Gigs** and selects **Mark Completed**.
Only the assigned worker can perform this action, and only an
`in-progress` gig can be completed. Completion changes the gig to:

```text
status: completed
paymentReleased: false
```

Completion does not release money automatically. It signals that the owner
should review the work.

### 6. Release the reward

The owner returns to **Posted by Me** and selects **Release Payment**. The API
checks that:

1. The requester owns the gig.
2. The gig status is `completed`.
3. Payment has not already been released.

After a successful release:

```text
paymentReleased: true
paymentReleasedAt: <ISO timestamp>
status: completed
```

The reward amount remains on the gig, and a `payment_released` history entry is
added. The worker can open **Rewards** to see the completed gig, the reward
amount, and either `Awaiting owner release` or `Reward released`.

> The current implementation records a release in the JSON data store. It does
> not connect to a bank, UPI provider, Stripe, or another real payment
> processor.

## Gig Lifecycle

```text
open -> in-progress -> completed -> payment released
```

The final step is represented by `paymentReleased: true`; the status remains
`completed` so completion and payment settlement are distinct concepts.

| State | Meaning | Main available actions |
| --- | --- | --- |
| `open` | Available for a worker to take | Take, edit owner details, delete owner gig |
| `in-progress` | Taken by a worker | Mark completed by assigned worker |
| `completed` | Worker reported the work complete | Release payment by owner |
| Completed and released | Owner recorded reward release | View reward and activity |

## Screens

### Homepage

`frontend/index.html` introduces the two main paths and collects identity when
needed.

### Gigs board

`frontend/pages/gigs.html` contains:

- **Open Gigs**: search and filter available work.
- **Posted by Me**: manage owned gigs, release rewards, and delete open gigs.
- **My Taken Gigs**: track assigned work and mark it complete.
- **Rewards**: view completed gigs assigned to the current worker and payment
   state.
- **Activity**: view recent actions associated with the current email.

### Post form

`frontend/pages/post.html` creates a new gig and displays a live reward
preview.

## API Reference

The API is mounted at `/api`.

### Health

```http
GET /api/health
```

Returns `{ "status": "ok" }` when the server is running.

### Users

```http
POST /api/users/identify
Content-Type: application/json
```

Body:

```json
{
   "name": "Ananya Rao",
   "email": "ananya@campus.edu"
}
```

Creates or updates the user record and logs an identify activity.

### Gigs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/gigs` | List gigs |
| `GET` | `/api/gigs/:id` | Get one gig |
| `POST` | `/api/gigs` | Create a gig |
| `POST` | `/api/gigs/:id/take` | Take an open gig |
| `PATCH` | `/api/gigs/:id/reward` | Update reward as owner |
| `PATCH` | `/api/gigs/:id/architecture` | Update requirements as owner |
| `POST` | `/api/gigs/:id/complete` | Mark completed as assigned worker |
| `POST` | `/api/gigs/:id/release-payment` | Release payment as owner |
| `DELETE` | `/api/gigs/:id` | Delete an open gig as owner |

`GET /api/gigs` supports these query parameters:

- `status=open`, `status=in-progress`, or `status=completed`
- `category=<category>`
- `mine=<owner email>`
- `assignedTo=<worker email>`
- `q=<search text>` for title, description, and skills

Identity-changing requests use a JSON body containing `email`. Create and take
requests also use `name`:

```json
{
   "name": "Ananya Rao",
   "email": "ananya@campus.edu"
}
```

Release and delete requests use the same identity fields. A successful delete
returns the deleted gig in a response like:

```json
{
   "message": "Gig deleted.",
   "gig": { "id": "GIG-..." }
}
```

### Activity

```http
GET /api/activity?email=ananya@campus.edu&limit=30
```

Returns the newest activity entries for an account. The server caps the result
at 100 entries.

## Project Structure

```text
frontend/
   index.html                 Homepage and identity entry
   css/style.css              Shared styling
   js/api.js                  Frontend API client
   js/session.js              Browser identity and UI helpers
   js/home.js                 Homepage behavior
   js/gigs.js                 Gig board, actions, rewards, and activity
   js/post.js                 Post form behavior
   pages/gigs.html            Gig board
   pages/post.html            Post form

backend/
   server.js                  Express server and static frontend host
   routes/                    API route definitions
   controllers/               Request handling and business rules
   utils/                     JSON store, validation, IDs, async handling
   data/gigs.json              Gig records
   data/users.json            User records
   data/activity.json         Activity records
```

## Run Locally

Requirements: Node.js 18 or newer and npm.

```bash
cd backend
npm install
copy .env.example .env     # Windows PowerShell
# cp .env.example .env     # macOS/Linux
npm run dev                # nodemon development server
# npm start                # production-style local start
```

Open `http://localhost:5000/` in a browser. The backend serves the frontend,
so no separate frontend server is required.

Available environment variables are documented in
`backend/.env.example`:

- `PORT`: server port, default `5000`.
- `NODE_ENV`: optional runtime environment.
- `ALLOWED_ORIGIN`: optional CORS origin. It defaults to `*` for local use.

## Data and Persistence

The JSON files in `backend/data/` act as the database. The JSON store serializes
updates per file so simultaneous writes to the same collection are processed in
order.

Each gig contains the core marketplace data plus:

- `postedBy`: owner identity.
- `assignedTo`: worker identity or `null`.
- `applicants`: users who took the gig in the current workflow.
- `status`: lifecycle state.
- `paymentReleased`: settlement flag.
- `paymentReleasedAt`: settlement timestamp when released.
- `history`: chronological gig-specific actions.
- `createdAt`, `updatedAt`, and `completedAt`: timestamps.

Activity entries are retained in `activity.json` and capped at the newest 500
entries.

## Deploy on Render

### Single web service

The simplest deployment hosts the API and frontend together:

1. Create a Render **Web Service** connected to this repository.
2. Set the root directory to `backend`.
3. Set the build command to `npm install`.
4. Set the start command to `node server.js`.
5. Optionally set `NODE_ENV=production`.

The server hosts the frontend from the repository's `frontend/` directory.

### Separate frontend and backend

For a separate Render Static Site and Web Service:

1. Deploy `backend/` as a Web Service.
2. Deploy `frontend/` as a Static Site with publish directory `frontend`.
3. In `frontend/index.html`, `frontend/pages/gigs.html`, and
    `frontend/pages/post.html`, change `window.CAMPUSGIG_CONFIG.apiBase` from
    `/api` to the deployed backend API URL.
4. Set the backend `ALLOWED_ORIGIN` to the static site's URL.

## Important Prototype Limitations

- Identity is email-based and has no password or session verification.
- Payment release is a recorded state change, not a real money transfer.
- JSON files are suitable for a demo or small prototype, not high-concurrency
   production traffic.
- There is no worker submission upload, owner approval workflow, dispute flow,
   refund flow, or payment provider integration yet.
