# Moon Lite's Footwear — Website Guide

Everything you need to run your site. No coding needed for day‑to‑day use — just editing one settings file and using the dashboard.

---

## 1. What you have

A complete, self‑contained website. It needs **no server, no database, and no monthly fees** — it's just a folder of files you can open in any browser or upload to free hosting.

```
site/
├── index.html          Home page
├── shop.html           Shop / all products
├── product.html        Product detail page
├── about.html          Your story
├── size-guide.html     Size chart + care tips
├── contact.html        Contact + store info
├── dashboard.html      ← Your private product manager (passcode‑locked)
├── README.md           This guide
└── assets/
    ├── css/            The design (don't need to touch)
    ├── js/
    │   ├── config.js         ← YOUR SETTINGS live here
    │   ├── products.seed.js  ← Your starting product list
    │   ├── store.js          The engine (don't touch)
    │   ├── pages.js          Page behaviour (don't touch)
    │   └── dashboard.js      Dashboard behaviour (don't touch)
    └── img/            Logo, icons and product photos
```

To preview it on your computer, just **double‑click `index.html`**.

---

## 2. Make it yours — edit `config.js`

Open **`assets/js/config.js`** in any text editor (Notepad works). Everything a non‑coder needs to change is in this one file. Replace the placeholder values between the quote marks.

**The most important one — your WhatsApp number.** Orders and enquiries go here. Use full international format, digits only:

```
whatsappNumber: "2348000000000",
```
Example: the number `0803 123 4567` becomes `"2348031234567"` (drop the leading 0, add 234).

Then update the rest to your real details:

| Setting | What it is |
|---|---|
| `phoneDisplay` | Your phone number as you want it shown |
| `email` | Your contact email |
| `address` | Your store address |
| `mapsUrl` | A Google Maps link to your store |
| `social` | Your Instagram / TikTok / Facebook links (leave `""` to hide an icon) |
| `hours` | Your opening hours |
| `delivery` / `returns` | Your delivery and returns wording |
| `freeDeliveryOver` | Order value that unlocks free delivery (set to `0` to hide) |

Save the file when done. Refresh the site to see your changes.

---

## 3. Managing products — the dashboard

Open **`dashboard.html`** in your browser. It's passcode‑locked so only you can use it.

**Default passcode: `moonlite2026`** (change it — see section 5).

From the dashboard you can:

- **Add a product** — tap **+ Add product**, fill in the name, price, sizes, colours, description, and drag in photos. Photos are automatically shrunk for the web.
- **Edit** — tap the pencil on any product.
- **Delete** — tap the bin.
- **Mark sold out** or **feature** a product on the home page — tick the boxes in the editor.
- **Search** your products with the search box.
- See stock stats at a glance (in stock, low stock, sold out).

### Important: how saving works (please read)

Because there's no server, products you add in the dashboard are saved **in the browser you're using** — like notes saved on that one device. That's perfect for managing your shop from your own phone or laptop.

**To publish your changes so every visitor sees them**, do this:

1. In the dashboard, tap **Export catalogue**. This downloads a file called `products.seed.js`.
2. Replace the old `assets/js/products.seed.js` with this new file.
3. Re‑upload your site (section 6).

That "bakes in" your current products as the permanent catalogue everyone sees. Think of the dashboard as your workspace, and **Export catalogue** as the "publish" button.

> Tip: **Reset to samples** puts the original demo products back if you want to start over. Export first if you might want your changes back.

---

## 4. Replacing the logo and images

All images live in `assets/img/`. To swap the logo, replace `logo-web.png` (dark version) and `logo-light.png` (light version) with your own, keeping the same file names. Product photos are best added through the dashboard.

---

## 5. Changing your passcode

1. Open **`dashboard.html`** and unlock it.
2. Scroll to **Change passcode**, type your new passcode, and tap **Generate code**.
3. Copy the line it shows you (it looks like `adminPassHash: "a1b2c3…"`).
4. Open **`assets/js/config.js`**, find the `adminPassHash:` line at the bottom, and replace it with the copied line.
5. Save and re‑upload the file.

> A static website can't keep a true secret — this keeps casual visitors out, but don't reuse a password you use anywhere else.

---

## 6. Putting it online (free)

Any of these host static sites for free. Easiest first:

**Netlify Drop** — go to **app.netlify.com/drop** and drag your whole `site` folder onto the page. It gives you a live link in seconds. To update later, drag the folder again.

**Cloudflare Pages** or **GitHub Pages** also work well and are free; upload the same `site` folder.

Whichever you choose, upload the **entire `site` folder** so all the pages, styles, scripts and images stay together.

---

## 7. Before you go live — checklist

- [ ] Set your real **WhatsApp number** in `config.js`
- [ ] Update phone, email, address, and Google Maps link
- [ ] Add your Instagram / TikTok / Facebook links (or hide them)
- [ ] Check your opening hours and delivery/returns wording
- [ ] Change the **dashboard passcode**
- [ ] Add or update your **products** in the dashboard, then **Export catalogue** and replace `products.seed.js`
- [ ] Swap in your **logo** if needed
- [ ] Upload the whole folder to your host

That's it — you're open for business. Every "Order on WhatsApp" button opens a chat with your number and the customer's full order ready to send.
