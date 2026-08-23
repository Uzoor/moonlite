# Switching on the database — 10 minutes, once

This is the only technical setup left. Do it once and Moon Lite's can manage
her own shop forever: she signs in with an email and password, edits products
and photos, and the changes are live for customers straight away. No exporting
files, no re-uploading, no calling you.

Until you finish this, the site still works exactly as it does now (products
come from the file `assets/js/products.seed.js`, and the dashboard opens with
the passcode). Nothing breaks in between.

---

## 1. Create the project

Go to **supabase.com**, sign in with GitHub, then **New project**.

- **Name:** `moonlites-footwear`
- **Database password:** let it generate one and save it in your password
  manager. You will almost certainly never need it, but if you lose it you
  cannot get it back.
- **Region:** pick the closest to Lagos — **eu-west-1 (Ireland)** or
  **eu-central-1 (Frankfurt)**. Both are fine; Ireland is usually a touch
  quicker from Nigeria.

It takes about two minutes to finish building.

## 2. Create the tables

In the left sidebar: **SQL Editor → New query**. Open the file
`supabase-setup.sql` from the project folder, copy **all** of it, paste it in,
and press **Run**.

You should see "Success. No rows returned." That one paste creates the products
table, the settings table, the photo storage bucket, and all the security rules.
It is safe to run again if you are ever unsure whether it worked.

## 3. Create her login

**Authentication → Users → Add user → Create new user.**

- Enter her email and a starting password (something like `MoonLite2026!` —
  she can change it herself from the dashboard).
- **Tick "Auto Confirm User."** If you skip this she has to click a
  confirmation email that may never arrive, and she won't be able to sign in.

Then, importantly: **Authentication → Sign In / Providers → Email** and turn
**"Enable sign ups" OFF**. Without this, anyone who finds the site could create
their own account and start editing the shop. This is the single most important
switch on the page.

## 4. Copy the two keys into the site

**Project Settings → API keys** (older layouts call it **Settings → API**).
You need two values:

- **Project URL** — looks like `https://abcdefghijk.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Open `assets/js/config.js` and paste them in:

```js
  supabaseUrl:     "https://abcdefghijk.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJI...the-long-one...",
  supabaseBucket:  "product-photos",
```

Do **not** copy the `service_role` key. That one bypasses every security rule
and must never go in a website. The anon key is designed to be public — it sits
in every visitor's browser by design, and the security rules from step 2 are
what actually protect the data: the public can only read, and every write
requires a signed-in account that only you can create.

## 5. Push and seed the catalogue

Commit and push to GitHub as usual; Vercel redeploys in under a minute.

Then open **moonlitesfootwear.com/admin**, sign in with the email and password
from step 3, and press **Upload catalogue to the database**. That copies the 11
starting products up. The button disappears afterwards because it's no longer
needed.

Load the shop in another tab to confirm the products are showing. That's it —
you're done.

---

## What changes for you after this

| | Before | After |
|---|---|---|
| Adding a product | You edit files and push | She does it herself, live |
| Changing the WhatsApp number | Export `config.js`, push | She types it in the dashboard |
| Product photos | Committed into the repo | Uploaded to Supabase Storage |
| Dashboard access | Shared passcode | Her own email and password |
| Your involvement | Every change | Only if something breaks |

## Costs

The free tier covers this comfortably: 500 MB of database (this catalogue uses
well under 1 MB), 1 GB of file storage (roughly 5,000 product photos at the size
the dashboard compresses them to), and 50,000 monthly active users where "user"
means her, once.

The one thing to know: a free Supabase project **pauses after 7 days with no
activity**. Reads from real visitors count as activity, so a live shop never
pauses. But if the site is quiet for a week during handover, log in and it wakes
back up. If you'd rather not think about it, the Pro plan is $25/month.

## If something goes wrong

**"Wrong email or password"** when you know it's right — the user probably
wasn't auto-confirmed. Delete the user and add them again with "Auto Confirm
User" ticked.

**Products save but don't appear for customers** — you're likely signed in on
one browser and looking at a different one. Hard-refresh the shop
(Ctrl+Shift+R).

**"Can't reach the server"** — check the Project URL for a trailing slash or a
typo, and check the project isn't paused (the Supabase dashboard says so
plainly at the top).

**Everything looks broken after pasting the keys** — set both `supabaseUrl` and
`supabaseAnonKey` back to `""` and push. The site instantly reverts to the old
file-based mode, which still works. Then fix the keys at your leisure.

## Emptying the safety net

The shop keeps a copy of the last catalogue it loaded in each visitor's browser,
so a Supabase outage shows the shop as it was rather than an empty page. The
file `assets/js/products.seed.js` is the deepest fallback, used only if a
first-time visitor arrives during an outage. It's harmless to leave it as the
sample products, but once her real catalogue is settled you can press
**Export catalogue** in the dashboard and commit that file so even the worst
case shows real stock.
