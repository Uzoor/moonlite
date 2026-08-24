/* =====================================================================
   Moon Lite's Footwear — DASHBOARD
   ---------------------------------------------------------------------
   Two modes, chosen automatically by whether Supabase is configured in
   config.js:

     LIVE  — real email + password login. Products, photos and business
             details are written straight to the database, so every change
             is live for customers immediately. Photos upload to Storage.

     LOCAL — no backend. A passcode unlocks the dashboard; products and
             photos live in this browser (localStorage); changes are
             published by exporting files. (The original design — kept as
             a fallback so nothing ever breaks if the database is off.)

   Uses window.ML from store.js and window.MLSB from supabase.js.
   ===================================================================== */
(function () {
  "use strict";

  const ML = window.ML;
  const SB = (window.MLSB && window.MLSB.enabled) ? window.MLSB : null;
  const LIVE = ML.mode === "live" && !!SB;
  const CFG = (ML && ML.CFG) || window.MOONLITE_CONFIG || {};
  const SEED = window.MOONLITE_SEED || [];
  const FALLBACK = "assets/img/mark.png";
  const KEY_PRODUCTS = "moonlite.products.v1";
  const KEY_UNLOCK = "moonlite.dash.unlock";
  const EU_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47];
  const IMG_MAXDIM = 1000;   // px — photos are downscaled to fit this
  const IMG_QUALITY = 0.82;  // jpeg quality
  const STORAGE_BUDGET = 4.6 * 1024 * 1024; // ~localStorage ceiling for the bar

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const show = (el) => { if (el) el.hidden = false; };
  const hide = (el) => { if (el) el.hidden = true; };

  /* editor state */
  let editingId = null;
  let formImages = [];   // array of {src} — data URLs (new) or existing URLs/paths
  let searchTerm = "";
  let busyCount = 0;     // how many live operations are in flight

  /* ================= BANNER ================= */
  function banner(msg, kind) {
    const b = $("[data-banner]");
    if (!b) return;
    if (!msg) { b.hidden = true; b.textContent = ""; return; }
    b.className = "banner" + (kind ? " " + kind : "");
    b.innerHTML = msg;
    b.hidden = false;
  }

  /* small helper: run an async action with a button in a "working" state */
  async function withBusy(btn, label, fn) {
    const original = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = label || "Working…"; }
    busyCount++;
    try { return await fn(); }
    finally {
      busyCount--;
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  }

  /* ================= MODE-AWARE UI ================= */
  function applyModeUI() {
    // gate
    const gateSub = $("[data-gate-sub]");
    const passForm = $("[data-gate-form]");
    const loginForm = $("[data-login-form]");
    if (LIVE) {
      hide(passForm); show(loginForm);
      if (gateSub) gateSub.textContent = "Sign in to manage your shop.";
    } else {
      show(passForm); hide(loginForm);
    }

    // the top-right button locks a passcode session but truly signs out of an
    // account, so say which — the owner guide tells her to press "Sign out".
    const lockBtn = $("[data-lock]");
    if (lockBtn) {
      lockBtn.textContent = LIVE ? "Sign out" : "Lock";
      lockBtn.title = LIVE
        ? "Sign out of your account on this device"
        : "Lock the dashboard on this device";
    }

    // settings note + local-only export buttons
    const note = $("[data-settings-note]");
    if (LIVE && note) note.innerHTML = "Your contact info and the WhatsApp number that receives every order. <b>Changes go live for customers the moment you save</b> — there's nothing to upload.";
    if (LIVE) {
      hide($("[data-export-settings]"));
      hide($("[data-export]"));
      hide($("[data-reset]"));
    } else {
      // Not connected to the database. Say so plainly, and say *why*: from the
      // outside a missing supabase.js and empty keys look identical (both just
      // leave the export buttons sitting there), and guessing between the two
      // has already cost a day.
      const why = !window.MLSB
        ? "the file <b>assets/js/supabase.js</b> is not loading — check that it exists in the repo and that <b>dashboard.html</b> still has its &lt;script&gt; tag"
        : "<b>assets/js/config.js</b> has no database keys yet — <b>supabaseUrl</b> and <b>supabaseAnonKey</b> are still empty";
      banner(
        "<b>Offline mode.</b> Changes save in this browser only, and publishing "
        + "still means exporting a file. Reason: " + why + ".", "warn");
    }

    // side panels
    if (LIVE) {
      hide($("[data-passcode-panel]")); show($("[data-account-panel]"));
      hide($("[data-storage-panel]")); show($("[data-db-panel]"));
      const em = $("[data-account-email]");
      if (em) em.textContent = SB.currentEmail() || "your account";
      const st = $("[data-db-status]");
      if (st) st.textContent = "Connected to your database at " + SB.base.replace(/^https?:\/\//, "") + ".";
    } else {
      show($("[data-passcode-panel]")); hide($("[data-account-panel]"));
      show($("[data-storage-panel]")); hide($("[data-db-panel]"));
    }
  }

  /* ================= GATE (passcode OR login) ================= */
  const gate = $("[data-gate]");
  const app = $("[data-app]");

  function sessionUnlocked() {
    try { return sessionStorage.getItem(KEY_UNLOCK) === "1"; } catch (e) { return false; }
  }
  function markUnlocked(on) {
    try { on ? sessionStorage.setItem(KEY_UNLOCK, "1") : sessionStorage.removeItem(KEY_UNLOCK); } catch (e) {}
  }

  function openApp() {
    gate.style.display = "none";
    app.classList.add("is-on");
  }
  function closeApp() {
    app.classList.remove("is-on");
    gate.style.display = "grid";
  }

  /* ---- local (passcode) ---- */
  function unlockLocal() {
    openApp();
    renderAll();
  }
  function lockLocal() {
    markUnlocked(false);
    closeApp();
    const inp = $("[data-gate-input]");
    if (inp) { inp.value = ""; inp.focus(); }
  }

  const passForm = $("[data-gate-form]");
  if (passForm) passForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("[data-gate-input]");
    const err = $("[data-gate-err]");
    const val = inp.value.trim();
    if (!val) return;
    err.textContent = "";
    let hash;
    try { hash = await ML.sha256(val); }
    catch (ex) { err.textContent = "This browser can't run the lock. Try Chrome or Safari."; return; }
    if (hash === CFG.adminPassHash) { markUnlocked(true); unlockLocal(); }
    else { err.textContent = "Incorrect passcode. Try again."; inp.select(); }
  });

  /* ---- live (email + password) ---- */
  async function enterLive() {
    openApp();
    banner("Loading your shop…");
    try {
      const ok = await SB.ensureFresh();
      if (!ok) { showLoginGate("Your session expired. Please sign in again."); return; }
      await reloadLive();
      const em = $("[data-account-email]");
      if (em) em.textContent = SB.currentEmail() || "your account";
      if (!ML.getProducts().length) {
        banner("Your catalogue is empty. Tap <b>Upload catalogue to the database</b> to start with the sample products, or use <b>+ Add product</b> to add your own.", "warn");
        show($("[data-upload-seed]"));
      } else {
        banner("");
        hide($("[data-upload-seed]"));
      }
    } catch (e) {
      banner("Couldn't load from the database: " + (e && e.message ? e.message : "unknown error") + " — showing the last saved copy.", "bad");
      renderAll();
    }
  }

  function showLoginGate(msg) {
    closeApp();
    const err = $("[data-login-err]");
    if (err) err.textContent = msg || "";
    const email = $("[data-login-form] [name=email]");
    if (email) setTimeout(() => email.focus(), 100);
  }

  const loginForm = $("[data-login-form]");
  if (loginForm) loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-login-err]");
    const btn = $("[data-login-btn]");
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    err.textContent = "";
    if (!email || !password) { err.textContent = "Enter your email and password."; return; }
    try {
      await withBusy(btn, "Signing in…", () => SB.signIn(email, password));
      loginForm.password.value = "";
      await enterLive();
    } catch (ex) {
      err.textContent = (ex && ex.message) ? ex.message : "Couldn't sign in. Please try again.";
    }
  });

  async function lockLive() {
    await withBusy($("[data-lock]"), "Signing out…", () => SB.signOut());
    showLoginGate("");
  }

  $("[data-lock]").addEventListener("click", () => { LIVE ? lockLive() : lockLocal(); });

  /* ================= LIVE DATA ================= */
  async function reloadLive() {
    const list = await SB.listProducts();
    ML.setProducts(list);       // caches for the storefront too
    renderAll();
    return list;
  }

  /* ================= STATS + ROWS ================= */
  function computeStats(list) {
    const total = list.length;
    let inStock = 0, low = 0, sold = 0, feat = 0;
    list.forEach(p => {
      const s = Number(p.stock || 0);
      if (p.soldOut || s <= 0) sold++;
      else { inStock++; if (s <= 3) low++; }
      if (p.featured) feat++;
    });
    return { total, inStock, low, sold, feat };
  }

  function renderStats() {
    const s = computeStats(ML.getProducts());
    $("[data-stats]").innerHTML = [
      ["Products", s.total, ""],
      ["In stock", s.inStock, ""],
      ["Low stock", s.low, s.low ? "warn" : ""],
      ["Sold out", s.sold, s.sold ? "bad" : ""],
      ["Featured", s.feat, ""]
    ].map(([label, val, cls]) =>
      `<div class="stat ${cls}"><b>${val}</b><span>${label}</span></div>`
    ).join("");
  }

  function rowTags(p) {
    const t = [];
    if (p.featured) t.push('<span class="row__tag gold">Featured</span>');
    if (p.soldOut || Number(p.stock || 0) <= 0) t.push('<span class="row__tag sold">Sold out</span>');
    if (p.badge) t.push('<span class="row__tag">' + esc(p.badge) + "</span>");
    return t.join("");
  }

  function renderRows() {
    const host = $("[data-rows]");
    let list = ML.getProducts();
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.subtitle || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q));
    }
    if (!list.length) {
      host.innerHTML = '<div class="stat" style="text-align:center;padding:2.5rem">' +
        (searchTerm ? "No products match your search." : "No products yet. Tap <b>+ Add product</b> to create your first one.") + "</div>";
      return;
    }
    host.innerHTML = list.map(p => {
      const img = (p.images && p.images[0]) || FALLBACK;
      const stock = Number(p.stock || 0);
      return `
        <div class="row" data-row="${esc(p.id)}">
          <img class="row__img" src="${esc(img)}" alt="" onerror="this.onerror=null;this.src='${FALLBACK}'">
          <div>
            <div class="row__name">${esc(p.name || "Untitled")}</div>
            <div class="row__sub">${esc(p.subtitle || "")} ${rowTags(p)}</div>
          </div>
          <div class="row__meta row__cat">${esc(p.category || "—")}</div>
          <div class="row__meta row__price">${ML.money(p.price || 0)}${p.oldPrice ? ' <s style="color:var(--muted)">' + ML.money(p.oldPrice) + "</s>" : ""}</div>
          <div class="row__meta row__stock">${stock} in stock</div>
          <div class="row__actions">
            <button class="icon-btn" data-edit="${esc(p.id)}" title="Edit" aria-label="Edit ${esc(p.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            </button>
            <button class="icon-btn danger" data-del="${esc(p.id)}" title="Delete" aria-label="Delete ${esc(p.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>`;
    }).join("");

    $$("[data-edit]", host).forEach(b => b.addEventListener("click", () => openEditor(b.dataset.edit)));
    $$("[data-del]", host).forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.del)));
  }

  function renderStorage() {
    if (LIVE) return;   // storage panel is hidden in live mode
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        used += (localStorage.getItem(k) || "").length + k.length;
      }
      used *= 2; // UTF-16 bytes
    } catch (e) { used = 0; }
    const pct = Math.min(100, Math.round((used / STORAGE_BUDGET) * 100));
    const bar = $("[data-storagebar]");
    if (bar) { bar.style.width = pct + "%"; bar.style.background = pct > 85 ? "#A83232" : pct > 65 ? "#C98A2B" : "var(--gold)"; }
    const txt = $("[data-storagetxt]");
    if (txt) {
      txt.textContent = (used / 1024 / 1024).toFixed(2) + " MB used of ~" + (STORAGE_BUDGET / 1024 / 1024).toFixed(1) + " MB" +
        (pct > 85 ? " — running low. Export your catalogue and remove older photos." : "");
    }
  }

  function renderAll() { renderStats(); renderRows(); renderStorage(); fillSettings(); }

  /* ================= EDITOR MODAL ================= */
  const scrim = $("[data-modal-scrim]");
  const modal = $("[data-modal]");
  const form = $("[data-product-form]");

  function openModal() {
    scrim.classList.add("is-on"); modal.classList.add("is-on");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    scrim.classList.remove("is-on"); modal.classList.remove("is-on");
    document.body.style.overflow = "";
  }
  $$("[data-modal-close]").forEach(b => b.addEventListener("click", closeModal));
  scrim.addEventListener("click", closeModal);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("is-on")) closeModal(); });

  function buildSizeToggles(selected) {
    selected = selected || [];
    $("[data-size-toggles]").innerHTML = EU_SIZES.map(s =>
      `<button type="button" class="size-toggle" data-size="${s}" aria-pressed="${selected.indexOf(s) > -1 ? "true" : "false"}">${s}</button>`
    ).join("");
    $$("[data-size-toggles] .size-toggle").forEach(b => b.addEventListener("click", () => {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }));
  }
  function selectedSizes() {
    return $$("[data-size-toggles] .size-toggle")
      .filter(b => b.getAttribute("aria-pressed") === "true")
      .map(b => Number(b.dataset.size));
  }

  function addColorRow(name, hex) {
    const wrap = $("[data-colors]");
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML =
      `<input type="color" value="${hex || "#111111"}" aria-label="Colour swatch">
       <input type="text" placeholder="Colour name (e.g. Black)" value="${esc(name || "")}">
       <button type="button" class="icon-btn danger" aria-label="Remove colour">✕</button>`;
    row.querySelector(".icon-btn").addEventListener("click", () => row.remove());
    wrap.appendChild(row);
  }
  function collectColors() {
    return $$("[data-colors] .color-row").map(r => ({
      name: r.querySelector('input[type=text]').value.trim(),
      hex: r.querySelector('input[type=color]').value
    })).filter(c => c.name);
  }

  function renderThumbs() {
    const host = $("[data-thumbs]");
    host.innerHTML = formImages.map((im, i) =>
      `<div class="thumb ${i === 0 ? "is-first" : ""}" data-thumb="${i}">
         <img src="${esc(im.src)}" alt="">
         <button type="button" class="thumb__x" data-thumb-del="${i}" aria-label="Remove photo">✕</button>
         ${i === 0 ? '<span class="thumb__first">Main</span>' : ""}
       </div>`
    ).join("");
    $$("[data-thumb]", host).forEach(t => t.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-thumb-del")) return;
      const i = Number(t.dataset.thumb);
      if (i > 0) { const [m] = formImages.splice(i, 1); formImages.unshift(m); renderThumbs(); }
    }));
    $$("[data-thumb-del]", host).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      formImages.splice(Number(b.dataset.thumbDel), 1); renderThumbs();
    }));
  }

  function openEditor(id) {
    editingId = id || null;
    form.reset();
    $("#cat-list").innerHTML = ML.categories().map(c => `<option value="${esc(c)}">`).join("");

    if (id) {
      const p = ML.getProduct(id);
      if (!p) { ML.toast("Product not found."); return; }
      $("[data-modal-title]").textContent = "Edit product";
      form.name.value = p.name || "";
      form.subtitle.value = p.subtitle || "";
      form.category.value = p.category || "";
      form.price.value = p.price != null ? p.price : "";
      form.oldPrice.value = p.oldPrice != null ? p.oldPrice : "";
      form.stock.value = p.stock != null ? p.stock : "";
      form.badge.value = p.badge || "";
      form.description.value = p.description || "";
      form.featured.checked = !!p.featured;
      form.soldOut.checked = !!p.soldOut;
      buildSizeToggles(p.sizes || []);
      formImages = (p.images || []).map(src => ({ src }));
    } else {
      $("[data-modal-title]").textContent = "Add product";
      buildSizeToggles([]);
      formImages = [];
    }
    $("[data-colors]").innerHTML = "";
    if (id) {
      const p = ML.getProduct(id);
      (p.colors || []).forEach(c => addColorRow(c.name, c.hex));
    }
    renderThumbs();
    openModal();
    setTimeout(() => form.name.focus(), 320);
  }

  $("[data-add-product]").addEventListener("click", () => openEditor(null));
  $("[data-add-color]").addEventListener("click", () => addColorRow("", "#111111"));

  /* ---------- id + local persistence ---------- */
  function slugify(s) {
    return String(s || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
  }
  function uniqueId(base, list) {
    let id = base, n = 2;
    const taken = new Set(list.map(p => p.id));
    while (taken.has(id)) id = base + "-" + (n++);
    return id;
  }
  function persistLocal(list) {
    try { localStorage.setItem(KEY_PRODUCTS, JSON.stringify(list)); return true; }
    catch (e) { ML.saveProducts(list); return false; }
  }

  /* ---------- build a product object from the form ---------- */
  function readForm(product) {
    product.name = form.name.value.trim();
    product.subtitle = form.subtitle.value.trim();
    product.category = form.category.value.trim() || "Uncategorised";
    product.price = Number(form.price.value);
    const oldP = Number(form.oldPrice.value);
    product.oldPrice = form.oldPrice.value !== "" && oldP > product.price ? oldP : null;
    product.stock = form.stock.value === "" ? 0 : Math.max(0, Math.round(Number(form.stock.value)));
    product.badge = form.badge.value.trim();
    product.description = form.description.value.trim();
    product.sizes = selectedSizes();
    product.colors = collectColors();
    product.images = formImages.map(im => im.src);
    product.featured = form.featured.checked;
    product.soldOut = form.soldOut.checked;
    return product;
  }

  async function saveProduct() {
    const name = form.name.value.trim();
    const price = Number(form.price.value);
    if (!name) { ML.toast("Please add a product name."); form.name.focus(); return; }
    if (!(price >= 0) || form.price.value === "") { ML.toast("Please add a valid price."); form.price.focus(); return; }

    const list = ML.getProducts();

    if (LIVE) {
      const btn = $("[data-save-product]");
      let product;
      if (editingId) {
        product = Object.assign({}, list.find(p => p.id === editingId));
        if (!product || !product.id) { ML.toast("Product not found."); return; }
      } else {
        product = { id: uniqueId(slugify(name), list) };
        const sorts = list.map(p => Number(p.sort || 0));
        product.sort = (sorts.length ? Math.min.apply(null, sorts) : 0) - 1; // new goes to the top
      }
      readForm(product);
      try {
        await withBusy(btn, "Saving…", async () => {
          // upload any brand-new photos (data: URLs) to Storage
          const finalImages = [];
          for (let i = 0; i < product.images.length; i++) {
            const src = product.images[i];
            if (/^data:/.test(src)) {
              btn.textContent = "Uploading photo " + (finalImages.length + 1) + "…";
              finalImages.push(await SB.uploadPhoto(src, product.id, i));
            } else {
              finalImages.push(src);
            }
          }
          product.images = finalImages;
          await SB.saveProduct(product, product.sort);
          await reloadLive();
        });
        closeModal();
        banner(""); hide($("[data-upload-seed]"));
        ML.toast(editingId ? "Product updated — live now." : "Product added — live now.");
      } catch (e) {
        ML.toast(friendly(e));
      }
      editingId = null;
      return;
    }

    /* ---- local mode (localStorage) ---- */
    let product;
    if (editingId) {
      product = list.find(p => p.id === editingId);
      if (!product) { ML.toast("Product not found."); return; }
    } else {
      product = { id: uniqueId(slugify(name), list) };
      list.unshift(product);
    }
    readForm(product);
    const ok = persistLocal(list);
    ML.saveProducts(list);
    renderAll();
    closeModal();
    if (ok) ML.toast(editingId ? "Product updated." : "Product added.");
    else ML.toast("Saved for now, but storage is full — export your catalogue and trim photos.");
    editingId = null;
  }
  $("[data-save-product]").addEventListener("click", saveProduct);

  async function deleteProduct(id) {
    const p = ML.getProduct(id);
    if (!p) return;
    if (!confirm('Delete "' + (p.name || "this product") + '"? This cannot be undone.')) return;

    if (LIVE) {
      try {
        await SB.deleteProduct(id);
        // best-effort: remove its uploaded photos from Storage
        (p.images || []).forEach(url => { if (/^https?:\/\//.test(url)) SB.removePhotoByUrl(url); });
        await reloadLive();
        ML.toast("Product deleted.");
      } catch (e) { ML.toast(friendly(e)); }
      return;
    }

    const list = ML.getProducts().filter(x => x.id !== id);
    persistLocal(list);
    ML.saveProducts(list);
    renderAll();
    ML.toast("Product deleted.");
  }

  function friendly(e) {
    const m = (e && e.message) ? e.message : "";
    if (/sign in again|expired/i.test(m)) { showLoginGate("Your session expired. Please sign in again."); return "Please sign in again."; }
    return m || "Something went wrong. Please try again.";
  }

  /* ================= IMAGE UPLOAD (client-side downscale) ================= */
  function downscale(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) { reject(new Error("not an image")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("bad image"));
        img.onload = () => {
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > IMG_MAXDIM || h > IMG_MAXDIM) {
            if (w >= h) { h = Math.round(h * IMG_MAXDIM / w); w = IMG_MAXDIM; }
            else { w = Math.round(w * IMG_MAXDIM / h); h = IMG_MAXDIM; }
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          try { resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); }
          catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    const arr = Array.from(files).filter(f => /^image\//.test(f.type));
    if (!arr.length) return;
    ML.toast("Processing " + arr.length + " photo" + (arr.length > 1 ? "s" : "") + "…");
    for (const f of arr) {
      try { const src = await downscale(f); formImages.push({ src }); renderThumbs(); }
      catch (e) { ML.toast("Couldn't read one photo — skipped."); }
    }
  }

  const dropzone = $("[data-dropzone]");
  const fileInput = $("[data-file-input]");
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { handleFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove("drag"); }));
  dropzone.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });

  /* ================= SEARCH ================= */
  $("[data-dash-search]").addEventListener("input", (e) => { searchTerm = e.target.value.trim(); renderRows(); });

  /* ================= UPLOAD CATALOGUE (live, one-time seed) ================= */
  const uploadSeedBtn = $("[data-upload-seed]");
  if (uploadSeedBtn) uploadSeedBtn.addEventListener("click", async () => {
    if (!LIVE) return;
    const existing = ML.getProducts();
    if (existing.length && !confirm("Your catalogue already has products. Upload the sample products on top of them?")) return;
    const source = existing.length ? existing : SEED;
    if (!source.length) { ML.toast("Nothing to upload."); return; }
    try {
      await withBusy(uploadSeedBtn, "Uploading…", async () => {
        await SB.saveProducts(source.map((p, i) => Object.assign({ sort: i }, p)));
        await reloadLive();
      });
      banner(""); hide(uploadSeedBtn);
      ML.toast("Catalogue uploaded — your shop is live.");
    } catch (e) { ML.toast(friendly(e)); }
  });

  /* ================= EXPORT / RESET (local only) ================= */
  const exportBtn = $("[data-export]");
  if (exportBtn) exportBtn.addEventListener("click", () => {
    const list = ML.getProducts();
    const body =
      "/* =====================================================================\n" +
      "   Moon Lite's Footwear — PRODUCT CATALOGUE\n" +
      "   Exported from the dashboard on " + new Date().toLocaleString() + "\n" +
      "   To make these your permanent catalogue, replace the file\n" +
      "   assets/js/products.seed.js with this one and re-upload it.\n" +
      "   ===================================================================== */\n" +
      "window.MOONLITE_SEED = " + JSON.stringify(list, null, 2) + ";\n";
    download("products.seed.js", body);
    ML.toast("Catalogue exported.");
  });

  const resetBtn = $("[data-reset]");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (!confirm("Reset the catalogue to the original sample products? Any changes you've made in this browser will be cleared.")) return;
    ML.resetProducts();
    renderAll();
    ML.toast("Catalogue reset to samples.");
  });

  /* ================= BUSINESS DETAILS ================= */
  const sForm = $("[data-settings-form]");

  function normalizeWa(raw) {
    let d = String(raw || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.slice(0, 4) === "0234") d = d.slice(1);
    if (d[0] === "0") d = "234" + d.slice(1);
    return d;
  }

  function waPreview() {
    const box = $("[data-wa-preview]");
    if (!box) return;
    const d = normalizeWa(sForm.whatsappNumber.value);
    if (!d) { box.className = "hint"; box.textContent = "Orders can't be sent until you add a number."; return; }
    const looksOff = d.length < 11 || d.length > 15 || d.slice(0, 3) === "000";
    box.className = "hint " + (looksOff ? "wa-bad" : "wa-ok");
    box.textContent = (looksOff ? "⚠ This doesn't look complete — " : "✓ Orders will go to ") + "wa.me/" + d;
  }

  function addHourRow(day, time) {
    const wrap = $("[data-hours]");
    const row = document.createElement("div");
    row.className = "hour-row";
    row.innerHTML =
      `<input type="text" placeholder="e.g. Monday – Friday" value="${esc(day || "")}" data-hour-day>
       <input type="text" placeholder="e.g. 9:00 AM – 7:00 PM" value="${esc(time || "")}" data-hour-time>
       <button type="button" class="icon-btn danger" aria-label="Remove this line">✕</button>`;
    row.querySelector(".icon-btn").addEventListener("click", () => row.remove());
    wrap.appendChild(row);
  }
  function collectHours() {
    return $$("[data-hours] .hour-row").map(r => ({
      day: r.querySelector("[data-hour-day]").value.trim(),
      time: r.querySelector("[data-hour-time]").value.trim()
    })).filter(h => h.day || h.time);
  }

  function fillSettings() {
    if (!sForm) return;
    const c = ML.CFG || {};
    const soc = c.social || {};
    sForm.brandName.value = c.brandName || "";
    sForm.tagline.value = c.tagline || "";
    sForm.whatsappNumber.value = c.whatsappNumber || "";
    sForm.phoneDisplay.value = c.phoneDisplay || "";
    sForm.email.value = c.email || "";
    sForm.address.value = c.address || "";
    sForm.mapsUrl.value = c.mapsUrl || "";
    sForm.instagram.value = soc.instagram || "";
    sForm.tiktok.value = soc.tiktok || "";
    sForm.facebook.value = soc.facebook || "";
    sForm.freeDeliveryOver.value = c.freeDeliveryOver != null ? c.freeDeliveryOver : "";
    sForm.delivery.value = c.delivery || "";
    sForm.returns.value = c.returns || "";
    $("[data-hours]").innerHTML = "";
    const hrs = Array.isArray(c.hours) && c.hours.length ? c.hours : [{ day: "", time: "" }];
    hrs.forEach(h => addHourRow(h.day, h.time));
    waPreview();
  }

  function collectSettings() {
    const fd = Number(sForm.freeDeliveryOver.value);
    return {
      brandName: sForm.brandName.value.trim(),
      tagline: sForm.tagline.value.trim(),
      whatsappNumber: normalizeWa(sForm.whatsappNumber.value),
      phoneDisplay: sForm.phoneDisplay.value.trim(),
      email: sForm.email.value.trim(),
      address: sForm.address.value.trim(),
      mapsUrl: sForm.mapsUrl.value.trim(),
      social: {
        instagram: sForm.instagram.value.trim(),
        tiktok: sForm.tiktok.value.trim(),
        facebook: sForm.facebook.value.trim()
      },
      hours: collectHours(),
      delivery: sForm.delivery.value.trim(),
      returns: sForm.returns.value.trim(),
      freeDeliveryOver: sForm.freeDeliveryOver.value === "" || !(fd >= 0) ? 0 : Math.round(fd)
    };
  }

  if (sForm) {
    sForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const patch = collectSettings();
      if (!patch.whatsappNumber) { ML.toast("Add your WhatsApp number — orders need it."); sForm.whatsappNumber.focus(); return; }
      const btn = $("[data-save-settings]");
      if (LIVE) {
        try {
          await withBusy(btn, "Saving…", () => ML.saveSettingsRemote(patch));
          sForm.whatsappNumber.value = patch.whatsappNumber;
          waPreview();
          ML.toast("Details saved — live now.");
        } catch (ex) { ML.toast(friendly(ex)); }
      } else {
        ML.saveSettings(patch);
        sForm.whatsappNumber.value = patch.whatsappNumber;
        waPreview();
        ML.toast("Details saved. Export the settings file to publish them.");
      }
    });
    sForm.whatsappNumber.addEventListener("input", waPreview);
    $("[data-add-hour]").addEventListener("click", () => addHourRow("", ""));

    $("[data-reset-settings]").addEventListener("click", async () => {
      if (LIVE) {
        if (!confirm("Reload your saved details from the database, dropping any unsaved edits on screen?")) return;
        try { await reloadLive(); fillSettings(); ML.toast("Reloaded from the database."); }
        catch (e) { ML.toast(friendly(e)); }
        return;
      }
      if (!confirm("Undo your changes and go back to the details in the settings file?")) return;
      ML.resetSettings();
      fillSettings();
      ML.toast("Reverted to the saved settings file.");
    });

    const exportSettingsBtn = $("[data-export-settings]");
    if (exportSettingsBtn) exportSettingsBtn.addEventListener("click", () => {
      ML.saveSettings(collectSettings());
      fillSettings();
      download("config.js", buildConfigFile());
      ML.toast("Settings file exported.");
    });
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "application/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const J = (v) => JSON.stringify(v == null ? "" : v);

  function buildConfigFile() {
    const c = ML.CFG || {};
    const soc = c.social || {};
    const curr = c.currency || { code: "NGN", symbol: "₦", locale: "en-NG" };
    const hours = (Array.isArray(c.hours) ? c.hours : [])
      .map(h => "    { day: " + J(h.day) + ", time: " + J(h.time) + " }").join(",\n");
    return `/* =====================================================================
   Moon Lite's Footwear — SITE CONFIG
   ---------------------------------------------------------------------
   Exported from the dashboard on ${new Date().toLocaleString()}
   Replace assets/js/config.js with this file and re-upload to publish
   these details to your customers.
   ===================================================================== */

window.MOONLITE_CONFIG = {

  /* --- Business --- */
  brandName: ${J(c.brandName)},
  tagline: ${J(c.tagline)},

  /* --- WhatsApp orders (full international format, digits only) --- */
  whatsappNumber: ${J(c.whatsappNumber)},

  /* --- Currency --- */
  currency: { code: ${J(curr.code)}, symbol: ${J(curr.symbol)}, locale: ${J(curr.locale)} },

  /* --- Contact & store info --- */
  phoneDisplay: ${J(c.phoneDisplay)},
  email: ${J(c.email)},
  address: ${J(c.address)},
  mapsUrl: ${J(c.mapsUrl)},

  /* --- Social (empty string hides the icon) --- */
  social: {
    instagram: ${J(soc.instagram)},
    tiktok:    ${J(soc.tiktok)},
    facebook:  ${J(soc.facebook)}
  },

  /* --- Opening hours --- */
  hours: [
${hours}
  ],

  /* --- Policies --- */
  delivery: ${J(c.delivery)},
  returns:  ${J(c.returns)},

  /* --- Free-delivery hint (0 hides it) --- */
  freeDeliveryOver: ${Number(c.freeDeliveryOver || 0)},

  /* --- Database (paste from Supabase → Settings → API; empty = off) --- */
  supabaseUrl:     ${J(c.supabaseUrl)},
  supabaseAnonKey: ${J(c.supabaseAnonKey)},
  supabaseBucket:  ${J(c.supabaseBucket || "product-photos")},

  /* =====================================================================
     ADMIN PASSCODE — this is a SHA-256 hash, not the passcode itself.
     Only used when the database above is switched off. Change it from the
     dashboard, then export this file again. A static site can't keep true
     secrets, so don't reuse a password you use anywhere else.
     ===================================================================== */
  adminPassHash: ${J(c.adminPassHash)}
};
`;
  }

  /* ================= CHANGE PASSCODE (local) ================= */
  const genhash = $("[data-genhash]");
  if (genhash) genhash.addEventListener("click", async () => {
    const val = ($("[data-newpass]").value || "").trim();
    const out = $("[data-hashout]");
    out.classList.add("is-on");
    if (!val) { out.textContent = "Type a passcode above first."; return; }
    if (val.length < 6) { out.textContent = "Use at least 6 characters."; return; }
    let hash;
    try { hash = await ML.sha256(val); }
    catch (e) { out.textContent = "Couldn't generate — try a modern browser."; return; }
    ML.saveSettings({ adminPassHash: hash });
    $("[data-newpass]").value = "";
    out.innerHTML = "✓ Passcode changed. It works in this browser now — tap <b>Export settings file</b> above " +
      "and upload that <b>config.js</b> to make it permanent.<br><br>" +
      '<span style="user-select:all">adminPassHash: "' + hash + '"</span>';
    ML.toast("Passcode updated.");
  });

  /* ================= CHANGE PASSWORD (live) ================= */
  const savepw = $("[data-savepw]");
  if (savepw) savepw.addEventListener("click", async () => {
    if (!LIVE) return;
    const val = ($("[data-newpw]").value || "");
    const out = $("[data-pwout]");
    out.classList.add("is-on");
    if (val.length < 8) { out.textContent = "Use at least 8 characters."; return; }
    try {
      await withBusy(savepw, "Saving…", () => SB.changePassword(val));
      $("[data-newpw]").value = "";
      out.textContent = "✓ Password changed. Use the new one next time you sign in.";
      ML.toast("Password updated.");
    } catch (e) { out.textContent = friendly(e); }
  });

  /* ================= BOOT ================= */
  applyModeUI();
  if (LIVE) {
    if (SB.signedIn()) enterLive();
    else showLoginGate("");
  } else {
    if (sessionUnlocked()) unlockLocal();
    else { const inp = $("[data-gate-input]"); if (inp) setTimeout(() => inp.focus(), 100); }
  }
})();
