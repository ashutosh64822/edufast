# EduFast — Education Website (React + Node.js Backend)

A complete recreation of the **EduFast "Education Website Design"** Dribbble shot
(https://dribbble.com/shots/20506753-Education-Website-Design) — as a full-stack website:
**React frontend + Express backend + persistent database.**

## Run it (2 terminals)

```bash
npm install
npm run server   # Terminal 1: backend API on http://localhost:5000
npm run dev      # Terminal 2: website on http://localhost:5173
npm run build    # production build into dist/
```

The frontend calls `/api/...` on its own origin; Vite proxies those calls to the
backend on port 5000 (see `vite.config.js`). So the same code works locally,
in the Arena live preview and behind a tunnel.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Student (demo) | `demo@edufast.com` | `demo123` |
| Admin | `admin@edufast.com` | `admin123` |

Demo student comes pre-enrolled in 2 courses so **My Learning** shows real server data.

## Backend (`server/`)

- `server/index.js` — Express API. `server/db.js` — database layer.
- Database: persistent JSON file at `server/data/db.json` (users, courses,
  enrollments, orders, messages, subscribers). Passwords are **bcrypt-hashed**;
  sessions use **JWT** (7-day token). Set `JWT_SECRET` in the environment for production.
- This layer can be swapped for MongoDB/MySQL later without changing API routes.

### Main API endpoints
```
GET    /api/health
GET    /api/courses?q=&cat=&level=&price=&sort=     GET /api/courses/:id
POST   /api/auth/register        POST /api/auth/login
GET    /api/me                   GET  /api/me/learning
POST   /api/enrollments (free)   PATCH /api/enrollments/:courseId/progress
POST   /api/me/wishlist/:courseId (toggle)
POST   /api/orders/checkout {courseIds, promoCode}  → server prices + HOLIDAY20 −20%
POST   /api/contact              POST /api/newsletter
Admin: GET /api/admin/stats      POST/PUT/DELETE /api/admin/courses(/:id)
```

## Pages

| Route | Page |
|---|---|
| `/` | Home — animated hero, scroll animations, marquee, categories, featured courses, instructors, events, testimonials |
| `/courses` · `/courses/:id` | Catalog (from backend DB) with search/filters/sort; detail with curriculum |
| `/about` · `/contact` | Story/values/timeline; contact form saved to backend + FAQ |
| `/register` · `/login` | Real backend accounts (hashed passwords, JWT) |
| `/my-learning` | Dashboard — server enrollments, progress, wishlist, **order history**, certificates |
| `/admin` | Admin panel — stats, add/edit/delete courses, orders, messages, users |

## Try this flow

1. **Register** a new account (or use the demo student) — it is saved in the database
2. Add a course to cart → apply `HOLIDAY20` → **Checkout** (server creates the order + enrollment)
3. **My Learning** → mark progress (saved on server) → 100% unlocks your certificate
4. Log in as **admin** → `/admin` → add a new course → it instantly appears on the website
5. Send a **Contact** message → see it appear in the admin panel

## Notes

- Payment is a demo gateway (orders are real records; connect bKash/Stripe for money).
- `dist/` and `node_modules/` are generated — always run `npm install` on a fresh copy.
- For a permanent URL and permanent data, deploy this repo to Netlify or Vercel
  and set a hosted Postgres `DATABASE_URL`; see [DEPLOYMENT.md](DEPLOYMENT.md).
  The included Render Blueprint also works and can use the same Postgres URL.
- `VITE_API_URL` is only needed if the frontend and API are on different domains.
  Leave it empty for the included same-domain Netlify/Vercel function setup.
- A free hosted service may sleep or cold-start when inactive; that does not
  erase data stored in external Postgres.
