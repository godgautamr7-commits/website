# ⚡ LEGACY CLOUD — Premium Minecraft Server Hosting

A complete, **real, working** full-stack hosting platform: public marketing site, live
plan catalogue, cart + invoice-based checkout, customer dashboard, and a full admin
control room where every change is written to the database and reflected instantly on
the live website.

- **Frontend:** React 19 + Vite 8 + Tailwind CSS + React Router 7
- **Backend:** Express 5 + better-sqlite3 (SQLite) + JWT + bcrypt
- **Design:** dark glassmorphism, navy / electric-violet / cyan neon gradients, fully responsive

> **No fake data.** Statistics come from real database counts, testimonials only show
> when approved, and payments are **never** simulated — orders are created as `unpaid`
> and an administrator marks them paid after funds are confirmed.

---

## 1. Project structure

```
swift-cloud/
├── server/                 # Express API + SQLite database
│   ├── src/
│   │   ├── index.js        # App entry, middleware, SPA static serving
│   │   ├── db.js           # Schema + seed (plans, admin, content, coupon)
│   │   ├── utils.js        # serializers, validation helpers
│   │   └── routes/
│   │       ├── auth.js     # register / login / me / change-password
│   │       ├── public.js   # plans, content, stats, coupons, contact
│   │       ├── customer.js # orders, servers, billing, tickets
│   │       └── admin.js    # full admin CRUD + stats
│   ├── .env.example
│   └── package.json
└── client/                 # React SPA
    ├── src/
    │   ├── pages/          # Home, Plans, Checkout, Dashboard, Admin, Static, NotFound
    │   ├── components/     # Layout, PlanCard, ui, icons, ProtectedRoute
    │   ├── context/        # Auth, Cart, Content, Toast
    │   └── lib/            # api client, formatters
    └── package.json
```

---

## 2. Run locally

### Prerequisites
- Node.js **18+** (Node 20 recommended)
- npm

### Step 1 — Backend

```bash
cd server
npm install
cp .env.example .env      # then edit .env (see below)
npm run dev               # or: npm start
```

The API starts on **http://localhost:4100** and creates `server/data/swift-cloud.db`
automatically on first run (schema + seed data).

### Step 2 — Frontend (development)

```bash
cd client
npm install
cp .env.example .env      # optional — defaults to /api
npm run dev               # http://localhost:5173
```

Vite proxies `/api` → `http://localhost:4100`, so the frontend talks to the API with
no extra configuration.

### Step 3 — Production build (single server)

```bash
cd client
npm run build             # outputs client/dist
cd ../server
npm start                 # serves the built SPA + API on http://localhost:4100
```

When `client/dist` exists, the Express server serves the SPA with a catch-all fallback,
so a single process/port hosts the whole site.

---

## 3. Environment variables (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4100` | API / site port |
| `NODE_ENV` | `development` | Environment |
| `JWT_SECRET` | dev value | **Change in production** — `openssl rand -hex 48` |
| `ADMIN_USERNAME` | `admin` | Initial admin username (seed only) |
| `ADMIN_PASSWORD` | `admin` | Initial admin password (seed only) |
| `PAYMENT_PROVIDER` | `manual` | `manual` \| `stripe` \| `paypal` (integration is configurable) |
| `CORS_ORIGIN` | *(all)* | Restrict CORS to your domain in production |
| `DATA_DIR` | `server/data` | SQLite database directory |
| `UPLOAD_DIR` | `server/data/uploads` | Uploaded logo/image directory |

### Client environment (`client/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL. Keep `/api` to use the Vite dev proxy or a reverse proxy; set a full URL for a separate API host. |

Both folders ship with a working `.env` plus a `.env.example`. The root `.gitignore`
keeps real `.env` files out of version control while preserving the examples.

### ⚠️ Default development admin credentials

```
username: admin
password: admin
```

These are **development-only** and are documented here on purpose. The admin account is
created **once** from environment variables on the first database seed — credentials are
never shipped in frontend code. **Before deploying to production you must:**

1. Set a strong `ADMIN_PASSWORD` (and ideally a unique `ADMIN_USERNAME`) in `.env`
   **before** the first run, or change the password via the account API afterwards.
2. Set a long random `JWT_SECRET`.
3. Set `NODE_ENV=production` and `CORS_ORIGIN=https://yourdomain.com`.
4. Put the app behind HTTPS (reverse proxy such as Nginx/Caddy).
5. Configure a real `PAYMENT_PROVIDER` if you want automated payments — the app never
   marks an order paid on its own.

---

## 4. Feature tour

### Motion & loading experience
The UI ships with a premium motion layer and skeleton screens (no spinners on content pages):

- **Skeleton loaders** — `Skeleton`, `SkeletonLine`, `SkeletonText`, `PlanCardSkeleton`,
  `PlanGridSkeleton`, `TableSkeleton`, `StatCardSkeleton`, `DashboardSkeleton`, `HomeSkeleton`
  and `ThreadSkeleton` in `components/ui.jsx`. Each uses a sweeping violet→cyan shimmer.
- **Route transitions** — a slim gradient progress bar animates at the top of the viewport on
  every navigation, and each page fades/slides in via the `AnimatedOutlet` wrapper in `App.jsx`.
- **Card treatments** — `.card-premium` adds an animated gradient border and lift on hover;
  `.sheen` sweeps a light reflection across plan and stat cards.
- **Staggered reveals** — `.stagger` cascades grid children in on the home and plans pages.
- **Animated headline** — `.text-gradient-animated` pans a white→violet→cyan gradient across the
  hero title.
- **Accessibility** — every animation is disabled under `prefers-reduced-motion: reduce`.

### Public site
- **Home** — hero (“Power Your Gaming World.”), live DB stats, Why Choose Legacy Cloud,
  features, approved testimonials, FAQ accordion, promo banner, footer with Discord/support/social.
- **Plans** — organised into **Intel Hosting**, **AMD Ryzen** and **Infinity Servers** sections,
  with search, sort, comparison and add to cart. Any plan can be flagged **Most Popular**, which
  renders the blue "MOST POPULAR" badge on its card.
- **Plan detail pages** — every plan has its own page at `/plans/:id` with full specs, all
  included features, provisioning steps, Add to cart / Buy now and related plans. Reach it by
  clicking a plan name, its **View details** link, or the **Open a plan page** dropdown on the
  plans page.
- **Checkout** — quantity controls, coupon codes, invoice-based payment (no fake success).
- **Order confirmation** — order numbers + payment instructions.
- **Contact** — real form that persists to the admin Contact Inbox.
- **Status** — live API health checks (no invented uptime).
- **Terms / Privacy**, custom **404**.
- **Registration consent** \u2014 the sign-up form requires the user to tick a box agreeing to the
  **Terms of Service** and **Privacy Policy** (both linked, open in a new tab). The server rejects
  registration without consent and stores the acceptance timestamp in `users.terms_accepted_at`.

### Customer dashboard (`/dashboard`)
Registration/login, overview stats, My Servers, My Orders, Subscriptions, Billing History,
Support Tickets (threaded), and Profile Settings (name + password change). The overview and
sidebar include a **Join our Discord** card that links to the admin-managed Discord server URL.

### Admin control room (`/admin`)
- **Overview** — total revenue, customers, orders, open tickets, active servers.
- **Hosting Plans** — add/edit/delete Intel, AMD and Infinity plans; change the name, RAM, CPU,
  storage, location, **price**, features, sort order and active state, plus a **Mark as Most
  Popular** toggle. Changes appear on the live site immediately, including the Most Popular badge.
- **Orders** — update payment status and order status; marking an order **active**
  provisions a server + subscription for the customer.
- **Servers** — edit IP/status.
- **Customers** — change role, suspend/activate, delete.
- **Support Tickets** — read threads, reply as staff, change status.
- **Contact Inbox** — messages from the public contact form; mark read / archive / delete.
- **Announcements**, **Homepage Content** (JSON editor for hero/why/features/faq/promo/footer/contact),
  **Branding & Links** (upload or link a custom logo, edit the brand name/alt text and the Discord
  server invite URL), **Locations & Nodes** (create your own custom locations and control the live
  node status \u2014 operational / degraded / maintenance / offline \u2014 plus latency, capacity, visibility
  and sort order), **Discord** (dedicated page to set the Discord server URL used in the footer,
  Support page and customer dashboard), **Coupons**, **Testimonials** (approve to publish).

### Locations & node status
Admins can add any number of custom locations from **Admin \u2192 Locations & Nodes**. Each location has
a name, region/country, flag emoji, hardware capacity, latency and a live status. Changing a node's
status (or visibility) from the table saves instantly. The published statuses appear on the customer
dashboard **Network & node status** card and on the public **/status** page, with a summary banner
(\u201cAll systems operational\u201d or \u201cN nodes need attention\u201d).

Every location can also be actively monitored:

| Field | What it does |
| --- | --- |
| **Probe URL** | Any `http://` / `https://` endpoint the server requests to test health. `localhost` / `127.0.0.1` is detected as a local tunnel. |
| **IPv4 address** | Optional manual IP; otherwise resolved from the probe hostname. |
| **Node type** | `Dedicated`, `Shared` or `Auto`. Auto marks a node as shared when more than one node uses the same IP. |
| **Cloudflare detection** | Detected in the background from `cf-ray` / `cf-cache-status` / `server: cloudflare` headers or a Cloudflare IPv4 CIDR match. Not shown as a badge in the UI. |
| **Check interval** | Minutes between automatic probes (default 5). |
| **Uptime** | Rolling `uptime_percent` plus a 24-hour timeline (`uptime_bars`, 48 half-hour slots) rendered as a status strip on the node card. |
| **Maintenance window** | `maintenance_until` + note. While the window is active the node's effective status becomes `maintenance` everywhere, with a live countdown. |

Checks run in the background (`server/src/monitor.js`, `NODE_MONITOR=off` disables the scheduler) and
can be triggered manually with **Check** / **Check all** in the admin table. `POST /api/admin/locations/:id/check`
returns the probe result; `GET /api/admin/locations/:id/checks` returns the last 200 probe records.

---

## 5. API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/change-password` |
| Public | `GET /api/plans` (`?category=`, `?q=`), `GET /api/plans/:id`, `GET /api/stats`, `GET /api/home`, `GET /api/locations` (nodes + status summary), `GET /api/announcements`, `GET /api/testimonials`, `POST /api/coupons/validate`, `POST /api/contact` |
| Customer | `POST/GET /api/account/orders`, `GET /api/account/orders/:id`, `GET /api/account/servers`, `GET /api/account/subscriptions`, `GET /api/account/billing`, `GET/POST /api/account/tickets`, `POST /api/account/tickets/:id/messages` |
| Admin | `GET /api/admin/stats`, CRUD `/api/admin/plans`, `/users`, `/orders`, `/servers`, `/tickets`, `/announcements`, `/content/:key`, `/locations`, `/coupons`, `/testimonials`, `/messages`, `POST /api/admin/upload` (logo upload) |

All admin routes require a valid JWT **and** `role = admin` (`authenticate` + `requireAdmin`).

---

## 6. Security notes

- Passwords hashed with **bcrypt** (cost 12).
- JWT bearer tokens (7-day expiry), verified on every protected request.
- `helmet`, `express-rate-limit` (stricter on auth), CORS allow-list.
- All inputs validated server-side; plan prices are re-read from the DB at checkout
  (client-supplied prices are never trusted).
- Admin credentials live only in `server/.env`, never in frontend bundles.
- Payment status is only ever changed by an administrator.

---

## 7. Default seed data

- **8 plans:** Intel Starter/Pro/Elite, AMD Ryzen Starter/Pro/Elite, Intel Infinity, AMD Infinity
  (all editable in the admin panel). One plan per category is seeded as **Most Popular**
  (Intel Pro, AMD Ryzen Pro, Intel Infinity) and can be changed at any time.
- **Coupons:** `SWIFT10` — 10% off (percentage coupons are supported and editable in admin).
- **Content blocks:** hero, why_choose, features, faq, promo, footer, contact (all editable in admin).

Everything above is editable from the admin panel after first run.

## Themes & background changer

A floating palette button (bottom-left) switches the whole UI between
**Cyberpunk**, **Neumorphism**, **Bento UI**, **Material** and the **Original** look,
and sets the background to **Animated**, **Texture** (static) or **Plain**.
The choice is saved in `localStorage`.

- `client/src/themes.css` – design tokens, per-theme component styling, textures, animations
- `client/src/lib/themes.js` – theme registry (keep ids in sync with the script in `client/index.html`)
- `client/src/context/ThemeProvider.jsx` – state, persistence, Material ripple, card spotlight
- `client/src/components/ThemeSwitcher.jsx`, `BackgroundFX.jsx` – the picker and background layers
- `client/tailwind.config.js` – colours now read CSS variables, so every page follows the theme

Default theme is set by `DEFAULT_THEME` in `lib/themes.js` (and the boot script in `index.html`).

### Admin → Appearance
Edit the look from the admin panel (changes preview live on the site behind the form):
default theme and background mode, page colour, accent colour, an uploaded background
picture (opacity + blur), the hero mouse-motion style (cursor orbs / spotlight grid / off)
and its strength, the brand name and the small label above the headline.
Stored as the `appearance` content block; visitors can still pick their own theme from the
palette button (turn that off in Appearance) and "Use the site default" resets them.

## Legacy Cloud — editorial design (Legacy Black / Legacy White)

The default look is now an editorial black/white design with huge type, hairlines, numbered
labels, a mouse-reactive Minecraft island hero, a Worlds carousel, a morphing orb with a
List/Grid worlds overlay, and a ring cursor. Switch **Black / White** from the header button
(or from the palette button / Admin → Appearance). The older themes are still available.

- `client/src/components/legacy.jsx` – hero, marquee, worlds carousel, explore orb, overlay panel, facts, guides, CTA, skeleton, Black/White toggle, cursor
- `client/src/pages/Minecraft.jsx` – the full Minecraft guide at `/minecraft` (modes, worlds, mobs, redstone, Java vs Bedrock, RAM guide, plugins vs mods)
- `client/src/lib/minecraft.js` – the Minecraft content (edit text here)
- `client/src/components/Emoji.jsx` – custom pixel emoji (`gift`, `diamond`, `pickaxe`, `sword`, `heart`, `fire`, `star`, `shield`, `bolt`, `cube`, `check`). Write `:gift:` in any announcement/promo text; system emoji are replaced automatically.
- `client/public/images/*.webp` – original voxel dioramas (generated with code, not copied from the game)
- Images show a skeleton shimmer until they load; the home page shows a skeleton while content loads.
- Brand is now **Legacy Cloud**. On first start the server migrates the stored brand name, hero text and default theme once (your other edits are kept).
