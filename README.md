# Moon Lite's Footwear — developer notes

A hand-built static site: seven pages, no framework, no build step, no
dependencies. Open `index.html` in a browser and it runs.

**If you are the shop owner, you want [OWNER-GUIDE.md](OWNER-GUIDE.md) instead.**
This file is for whoever maintains the code.

---

## The two modes

The site runs in one of two modes and picks between them automatically, based on
whether `assets/js/config.js` has Supabase credentials in it.

**Live mode** — `supabaseUrl` and `supabaseAnonKey` are filled in. Products and
settings come from Supabase, photos go to Supabase Storage, and the dashboard
asks for an email and password. The owner manages the shop herself and her
changes are visible to customers immediately. This is the intended production
setup; see [SETUP-DATABASE.md](SETUP-DATABASE.md) for the one-time wiring.

**Local mode** — those two values are `""`. Products come from the shipped file
`assets/js/products.seed.js`, edits are saved to `localStorage` in whichever
browser made them, and publishing means pressing **Export catalogue**, replacing
`assets/js/products.seed.js` with the download, and re-deploying. The dashboard
is protected by a SHA-256 passcode instead of a login.

Local mode is the fallback, not a lesser version — everything in the dashboard
works in both. Emptying the two credential strings and redeploying is a complete,
instant rollback if Supabase ever becomes a problem.

```js
// assets/js/config.js
supabaseUrl:     "",   // "" → local mode
supabaseAnonKey: "",   // "" → local mode
supabaseBucket:  "product-photos",
```

## Layout

```
moonlites-site/
├── index.html            Home
├── shop.html             Catalogue with size / category filters
├── product.html          PDP, reads ?id= from the query string
├── about.html
├── size-guide.html
├── contact.html
├── dashboard.html        Product manager, served at /admin
├── 404.html              Standalone — root-absolute paths, no JS (see below)
├── robots.txt
├── sitemap.xml
├── vercel.json           /admin rewrite, security + cache headers, clean URLs
├── supabase-setup.sql    Tables, RLS policies, storage bucket
├── SETUP-DATABASE.md     One-time Supabase setup (for you)
├── OWNER-GUIDE.md        How to run the shop (for the client)
└── assets/
    ├── css/moonlite.css
    ├── js/
    │   ├── config.js          Business details, credentials, passcode hash
    │   ├── products.seed.js   Starting catalogue / deepest fallback
    │   ├── supabase.js        window.MLSB — auth, REST, storage. No SDK.
    │   ├── store.js           window.ML — data layer, settings, chrome
    │   ├── pages.js           Storefront behaviour
    │   └── dashboard.js       Dashboard behaviour
    └── img/
        ├── share-card.jpg        1200×630 link preview (WhatsApp, socials)
        ├── apple-touch-icon.png  180×180 Add-to-Home-Screen icon
        ├── logo-*.png, mark-*.png, favicon.png
        └── catalog/              Sample product photos
```

Script order matters and is identical on every page:
`config.js → products.seed.js → supabase.js → store.js → pages.js|dashboard.js`.

`404.html` is the one exception to everything above: it is served by the host at
whatever URL was mistyped — including deep ones like `/shoes/nike` — so relative
paths would resolve against the wrong directory. It therefore uses root-absolute
paths (`/assets/...`) and is fully standalone, with no `config.js` or `store.js`
and its own inline styles, so it renders even if the scripts fail. The trade-off
is that it is the only page that won't look right opened directly from `file://`.

## How the pieces fit

`supabase.js` exposes `window.MLSB` and is the only file that touches the
network. It wraps the Supabase REST and Auth endpoints with `fetch` — no SDK, no
CDN. It holds the session in `localStorage` and refreshes the access token 60
seconds before it expires. `MLSB.enabled` is `false` when credentials are absent,
which is what puts the site into local mode.

`store.js` exposes `window.ML` and is the data layer both the storefront and the
dashboard read from. `ML.mode` is `"live"` or `"local"`. `ML.load()` never
rejects: it tries Supabase, falls back to the `localStorage` cache, then falls
back to the shipped seed. A shop page therefore always renders something.

`ML.CFG` is the merged settings object — shipped `MOONLITE_CONFIG` plus any
overrides, merged by `mergeCfg` and mutated **in place** by `applyCfg` so every
holder of the reference sees updates. **New pages must read `ML.CFG`, never
`window.MOONLITE_CONFIG` directly**, or they will show stale business details.

Catalogue order is driven by the `sort` column (`order=sort.asc,name.asc`). A new
product gets `min(existing sort) - 1` so it lands at the front without
renumbering anything.

Photos are downscaled in the browser before they go anywhere — canvas, longest
edge 1000px, JPEG quality 0.82. In live mode the result is uploaded to Storage
and the row stores a public URL; in local mode the data URL is stored as-is.
Replacing or deleting a product cleans up its orphaned Storage objects.

## Security

The anon key is public by design and sits in every visitor's browser. Row-level
security is the actual boundary: anonymous reads are allowed, all writes require
an authenticated user. Two rules follow from that, and neither is optional:

- The `service_role` key must never appear anywhere in this repo.
- **Enable sign ups** must be OFF in the Supabase Auth settings, or a stranger
  can create their own account and edit the shop.

In local mode, `adminPassHash` is a SHA-256 hash of the passcode. It keeps casual
visitors out of the dashboard and nothing more — a static site cannot keep a
secret, so that passcode must not be one used anywhere else.

## Deployment

Vercel from the git repo; Cloudflare Registrar for the domain, which locks it to
Cloudflare nameservers. DNS: `A @ → 76.76.21.21` and
`CNAME www → cname.vercel-dns.com`, both set to **DNS only** (grey cloud).
Leaving Cloudflare's orange proxy on causes an SSL redirect loop.

`vercel.json` rewrites `/admin` to `dashboard.html` and sets `X-Robots-Tag:
noindex` on it. The dashboard URL is not a secret; the login is what protects it.
It also sets `nosniff`, `SAMEORIGIN`, a referrer policy and a locked-down
permissions policy on every route, caches `/assets/img/*` for a week and forces
revalidation on CSS and JS so a push to `config.js` reaches returning visitors
immediately. There is deliberately no CSP: the pages use inline `<style>` blocks
and inline `onerror` image fallbacks, so any useful policy would need
`unsafe-inline` and would buy nothing.

Because `cleanUrls` is on, `/shop.html` 308-redirects to `/shop`. Internal links
still use the `.html` form on purpose — that keeps the site working when opened
from `file://`, at the cost of one redirect hop per navigation. The canonical tag
on each page points at the clean URL, so search engines only ever see one
version.

Link previews are static: pasting any URL into WhatsApp shows the site-wide
`share-card.jpg` rather than a per-product image, because WhatsApp's crawler
doesn't run JavaScript and the product data arrives client-side. Per-product
previews would need server-side rendering, which this site deliberately doesn't
have.

## Verifying changes

`test-live.js` boots both scripts in a Node `vm` with browser shims and a mock
Supabase server, then asserts 88 things: that local mode makes zero network
calls, that sign-in and session refresh behave, that the snake_case ↔ camelCase
round trip is lossless, that photo upload and cleanup hit the right paths, that
settings merge nested objects correctly, that a visitor can read but not write,
that outages degrade to cache and then seed, and that every `[data-*]` selector
the dashboard queries exists in `dashboard.html`.

Run it with `node test-live.js` from wherever you keep it. Add an assertion when
you add a behaviour; the selector audit in particular has already caught markup
drift.

One CSS note worth keeping: `[hidden] { display: none !important; }` is load
bearing. `.btn` sets `display: inline-flex`, which beats the user-agent `[hidden]`
rule, so without it every hidden button in the dashboard would be visible.
