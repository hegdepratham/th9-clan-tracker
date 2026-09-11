# TH9 Clan Tracker

A personal web application for tracking Clash of Clans Town Hall 9 clan visits.

Import your list of ~80 clans, then work through them one by one — marking each as visited. The app tracks your progress with stats, search, filtering, and a full visit history.

## Tech Stack

| Layer       | Technology                         |
|-------------|------------------------------------|
| Frontend    | React 18 + Vite (SPA)             |
| Backend     | Express 4 (Node.js)               |
| Database    | PostgreSQL (Neon free tier)        |
| Auth        | bcrypt + server-side sessions      |
| Hosting     | Render Web Service (one service)   |

## Features

- **Bulk Import** — CSV or pipe-delimited, with preview and duplicate detection
- **Visit Tracking** — Mark/unmark clans as visited; every visit creates a history record
- **Progress Dashboard** — Total / Visited / Remaining stats with progress bar
- **Next Unvisited** — Jump to the next clan you haven't checked yet
- **Search & Filter** — Search by name or tag; filter by visited/unvisited
- **Sort Options** — By name, recently added, or last visited
- **Export to CSV** — Back up your data anytime
- **Undo** — 5-second undo after marking a clan as visited
- **Responsive** — Works on desktop and mobile (card layout on small screens)
- **PWA** — Installable as a home-screen app with offline fallback
- **Secure** — Single-user login, bcrypt password, session cookies, Helmet headers, rate limiting

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** — Either:
  - A local PostgreSQL instance, or
  - A free [Neon](https://neon.tech) database (recommended — same as production)

### 1. Clone & Install

```bash
git clone <your-repo-url> th9-clan-tracker
cd th9-clan-tracker
npm run install:all
```

This installs root, server, and client dependencies.

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
SESSION_SECRET=<generate-a-random-string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
```

### 3. Generate Your Password Hash

```bash
npm run hash-password
```

Follow the prompt, then paste the resulting hash into `.env` as `ADMIN_PASSWORD_HASH`.

### 4. Initialize the Database

```bash
npm run init-db
```

This creates the `session`, `clans`, and `visit_history` tables.

Optionally seed 10 sample clans:

```bash
npm run seed
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- **Server** on `http://localhost:3001` (Express API, auto-reloads)
- **Client** on `http://localhost:5173` (Vite dev server with HMR)

Login with the username/password you configured.

---

## Running Tests

```bash
npm test
```

Runs 57 smoke tests against the API using an in-memory mock database. No PostgreSQL required.

---

## Production Deployment (Render + Neon)

### Step 1: Create a Neon Database

1. Sign up at [neon.tech](https://neon.tech) (free tier)
2. Create a new project and database
3. Copy the connection string — it looks like:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Step 2: Create a Render Web Service

1. Sign up at [render.com](https://render.com) (free tier)
2. New → **Web Service** → Connect your Git repo
3. Configure:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add these **Environment Variables**:

   | Variable               | Value                              |
   |------------------------|------------------------------------|
   | `DATABASE_URL`         | Your Neon connection string        |
   | `SESSION_SECRET`       | A random 64+ character string      |
   | `ADMIN_USERNAME`       | Your chosen username               |
   | `ADMIN_PASSWORD_HASH`  | Bcrypt hash from `npm run hash-password` |
   | `NODE_ENV`             | `production`                       |

5. Deploy!

### Step 3: Initialize the Production Database

After the first deploy, run the init script via Render's shell or locally:

```bash
# Using your Neon DATABASE_URL:
DATABASE_URL="postgresql://..." node server/initDb.js
```

### Architecture in Production

```
Browser → Render Web Service
            ├── /api/*   → Express API routes
            └── /*       → Static React app (from client/dist/)
                             ↕
                       Neon PostgreSQL
```

One service, no CORS, same-origin cookies.

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start takes ~30 seconds. This is acceptable for a personal app.

---

## Project Structure

```
th9-clan-tracker/
├── .env.example          # Environment variable template
├── package.json          # Root scripts (install:all, build, dev, etc.)
├── scripts/
│   └── hashPassword.js   # bcrypt password hash generator
├── server/
│   ├── index.js          # Express app entry point
│   ├── db.js             # PostgreSQL pool connection
│   ├── schema.sql        # Database schema (3 tables)
│   ├── initDb.js         # Schema initialization script
│   ├── seed.js           # Sample data seeder
│   ├── middleware/
│   │   ├── auth.js       # Session authentication check
│   │   └── rateLimiter.js # Rate limiting (login, import, API)
│   └── routes/
│       ├── auth.js       # Login / Logout / Status
│       └── clans.js      # CRUD, Visit, Import, Export
├── client/
│   ├── index.html        # SPA entry point
│   ├── vite.config.js    # Vite configuration
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json # PWA manifest
│   │   └── sw.js         # Service worker
│   └── src/
│       ├── main.jsx      # React entry
│       ├── index.css     # Full design system
│       ├── api.js        # API client (fetch wrapper)
│       ├── hooks/
│       │   └── useClans.js # Clan state + polling hook
│       └── components/
│           ├── App.jsx
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── ClanList.jsx
│           ├── ClanForm.jsx
│           ├── ImportModal.jsx
│           ├── SearchBar.jsx
│           ├── FilterBar.jsx
│           ├── ConfirmDialog.jsx
│           └── Toast.jsx
└── test/
    └── smokeTest.js      # 57 API smoke tests
```

---

## Import Format

### CSV

```csv
name,tag,notes
Dragon Warriors,#DW9TH001,Good base layouts
Barbarian Kings,#BK9TH002,Active war clan
```

### Pipe-delimited (paste)

```
Dragon Warriors | #DW9TH001 | Good base layouts
Barbarian Kings | #BK9TH002 | Active war clan
Wizard Tower | #WT9TH003
```

---

## Backups

This is a personal app — **you are responsible for your own backups**.

Use the **Export** button regularly to download a CSV of all your clans. This is your safety net if the database is ever lost.

Recommended: export after every tracking session.

---

## Security Notes

- Single-user authentication only (no registration)
- Passwords hashed with bcrypt (12 rounds)
- Sessions stored in PostgreSQL (7-day expiry)
- HttpOnly + Secure + SameSite cookies in production
- Helmet security headers (CSP, HSTS, etc.)
- Rate limiting: 5 login attempts/min, 100 API requests/min
- All SQL uses parameterized queries (no injection risk)
