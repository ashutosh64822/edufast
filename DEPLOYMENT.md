# Permanent hosting with Netlify/Vercel + Postgres (Option 2)

This is the recommended production setup:

```text
Browser
  ├── React website  → Netlify or Vercel static hosting
  └── /api/*         → Netlify Function or Vercel Function (same domain)
                              │
                              └── DATABASE_URL → Neon/Supabase Postgres
```

The old `server/data/db.json` file is **not** used when `DATABASE_URL` is set.
Users, password hashes, courses, enrollments, progress, wishlists, orders,
messages, and subscribers are stored in Postgres tables, so they survive new
deploys, server restarts, and serverless cold starts.

## Step 1 — Create the free Postgres database

Choose **one** provider:

### Neon (simple choice)

1. Create/login to a Neon account.
2. Create a project/database.
3. Open **Connection Details** / **Connect**.
4. Copy the Postgres connection string. It resembles:

```text
postgres://user:password@ep-something.aws.neon.tech/dbname?sslmode=require
```

### Supabase

1. Create/login to Supabase and create a project.
2. Open **Connect** / **Database connection string**.
3. Prefer the **Session pooler** connection string for serverless hosting.
4. Copy the full Postgres URI and replace its password placeholder with the
   database password you created.

> Keep this connection string private. Put it only in the hosting provider's
> Environment Variables—never in GitHub, the ZIP, or frontend `VITE_` variables.

## Step 2 — Put this project on GitHub

1. Create a GitHub repository named, for example, `edufast-react`.
2. Upload/extract the project files at the repository root.
3. Do not upload `node_modules`, `dist`, a real `.env`, or `server/data/db.json`.
   The included `.gitignore` excludes them for Git-based uploads.

## Step 3A — Deploy to Netlify

1. In Netlify, choose **Add new project → Import an existing project**.
2. Select the GitHub repository.
3. Confirm the settings (also saved in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Add these Environment Variables before/after the first deploy:

```text
DATABASE_URL=your-neon-or-supabase-connection-string
JWT_SECRET=a-long-random-secret
ADMIN_PASSWORD=your-private-admin-password
DEMO_PASSWORD=demo123
NODE_ENV=production
```

5. Deploy. Netlify gives a permanent address such as `https://edufast.netlify.app`
   (the exact name depends on availability/your site name).
6. The included `netlify.toml` sends `/api/*` to `netlify/functions/api.js` and
   all other routes to React's `index.html`.

## Step 3B — Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Confirm the settings (also saved in `vercel.json`):
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the same Environment Variables listed in Step 3A.
4. Deploy. Vercel gives a permanent address such as `https://edufast.vercel.app`
   (the exact name depends on availability/your project name).
5. `api/index.js` exports the Express app as the `/api` serverless function.

Do **not** set `VITE_API_URL` for either setup above; same-domain `/api` is correct.

## Step 4 — Test the permanent deployment

Open:

```text
https://YOUR-PERMANENT-URL/api/health
```

A correct response includes:

```json
{
  "status": "ok",
  "database": "postgres"
}
```

Then test:

- Home page and hero photo
- Register a brand-new account
- Log out and log in again
- Buy/enroll in a course and update progress
- Send a Contact message
- Log in as admin and add/edit a course
- Trigger/redeploy once and confirm the same account/data still exists

Seed accounts in an empty database:

| Role | Email | Password |
|---|---|---|
| Student | `demo@edufast.com` | value of `DEMO_PASSWORD` (default `demo123`) |
| Admin | `admin@edufast.com` | value of `ADMIN_PASSWORD` you set |

> Change/disable public demo credentials before using the site for real users.
> `ADMIN_PASSWORD` only affects the first seed of an empty database; changing
> the variable later does not reset an existing admin password.

## Existing local JSON data

At the first Postgres startup, if the Postgres tables are empty **and** the
server can still read the old `server/data/db.json`, EduFast imports that data
into Postgres. In the deployment ZIP/GitHub copy, `db.json` is intentionally
excluded, so a clean seed (2 accounts + 12 courses + demo learning state) is
created instead. Do not commit a database containing real user password hashes.

## Alternative: Render one-service deployment

The included `render.yaml` still supports Render. Set the same `DATABASE_URL`
there if you want permanent data on Render too. Without `DATABASE_URL`, Render
uses the JSON fallback and data on a free/ephemeral filesystem may reset.

## Run locally

Normal hot-reload development:

```bash
npm install
npm run server   # API: http://localhost:5000
npm run dev      # Website: http://localhost:5173
```

To test with the real hosted database locally, put `DATABASE_URL` in your shell
or a private local `.env`/terminal environment before starting the API. Never
commit that value.

Single-service production mode:

```bash
npm run build
npm start
```
