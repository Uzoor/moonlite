/* =====================================================================
   Moon Lite's Footwear — DASHBOARD
   Passcode gate + product add/edit/delete with photo upload.
   No backend: products + photos live in this browser (localStorage),
   photos stored as compressed data URLs. Uses window.ML from store.js.
   ===================================================================== */
(function () {
  "use strict";

  const ML = window.ML;
  const CFG = window.MOONLITE_CONFIG || {};
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

  /* editor state */
  let editingId = null;
  let formImages = [];   // array of {src} — data URLs or existing paths
  let searchTerm = "";

  /* ================= PASSCODE GATE ================= */
  const gate = $("[data-gate]");
  const app = $("[data-app]");

  function sessionUnlocked() {
    try { return sessionStorage.getItem(KEY_UNLOCK) === "1"; } catch (e) { return false; }
  }
  function markUnlocked(on) {
    try { on ? sessionStorage.setItem(KEY_UNLOCK, "1") : sessionStorage.removeItem(KEY_UNLOCK); } catch (e) {}
  }

  function unlock() {
    gate.style.display = "none";
    app.classList.add("is-on");
    renderAll();
  }
  function lock() {
    markUnlocked(false);
    app.classList.remove("is-on");
    gate.style.display = "grid";
    const inp = $("[data-gate-input]");
    if (inp) { inp.value = ""; inp.focus(); }
  }

  $("[data-gate-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("[data-gate-input]");
    const err = $("[data-gate-err]");
    const val = inp.value.trim();
    if (!val) return;
    err.textContent = "";
    let hash;
    try { hash = await ML.sha256(val); }
    catch (ex) { err.textContent = "This browser can't run the lock. Try Chrome or Safari."; return; }
    if (hash === CFG.adminPassHash) {
      markUnlocked(true);
      unlock();
    } else {
      err.textContent = "Incorrect passcode. Try again.";
      inp.select();
    }
  });

  $("[data-lock]").addEventListener("click", lock);

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

  function renderAll() { renderStats(); renderRows(); renderStorage(); }

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
    // category suggestions
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
    // colours
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

  /* ---------- id + persistence ---------- */
  function slugify(s) {
    return String(s || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
  }
  function uniqueId(base, list) {
    let id = base, n = 2;
    const taken = new Set(list.map(p => p.id));
    while (taken.has(id)) id = base + "-" + (n++);
    return id;
  }
  function persist(list) {
    // Try a real localStorage write so we can detect a full quota,
    // since ML.saveProducts silently falls back to memory on failure.
    try {
      localStorage.setItem(KEY_PRODUCTS, JSON.stringify(list));
      return true;
    } catch (e) {
      ML.saveProducts(list); // keeps it in-session at least
      return false;
    }
  }

  function saveProduct() {
    const name = form.name.value.trim();
    const price = Number(form.price.value);
    if (!name) { ML.toast("Please add a product name."); form.name.focus(); return; }
    if (!(price >= 0) || form.price.value === "") { ML.toast("Please add a valid price."); form.price.focus(); return; }

    const list = ML.getProducts();
    let product;
    if (editingId) {
      product = list.find(p => p.id === editingId);
      if (!product) { ML.toast("Product not found."); return; }
    } else {
      product = { id: uniqueId(slugify(name), list) };
      list.unshift(product);
    }

    product.name = name;
    product.subtitle = form.subtitle.value.trim();
    product.category = form.category.value.trim() || "Uncategorised";
    product.price = price;
    const oldP = Number(form.oldPrice.value);
    product.oldPrice = form.oldPrice.value !== "" && oldP > price ? oldP : null;
    product.stock = form.stock.value === "" ? 0 : Math.max(0, Math.round(Number(form.stock.value)));
    product.badge = form.badge.value.trim();
    product.description = form.description.value.trim();
    product.sizes = selectedSizes();
    product.colors = collectColors();
    product.images = formImages.map(im => im.src);
    product.featured = form.featured.checked;
    product.soldOut = form.soldOut.checked;

    const ok = persist(list);
    renderAll();
    closeModal();
    if (ok) ML.toast(editingId ? "Product updated." : "Product added.");
    else ML.toast("Saved for now, but storage is full — export your catalogue and trim photos.");
    editingId = null;
  }
  $("[data-save-product]").addEventListener("click", saveProduct);

  function deleteProduct(id) {
    const p = ML.getProduct(id);
    if (!p) return;
    if (!confirm('Delete "' + (p.name || "this product") + '"? This cannot be undone.')) return;
    const list = ML.getProducts().filter(x => x.id !== id);
    persist(list);
    renderAll();
    ML.toast("Product deleted.");
  }

  /* ================= IMAGE UPLOAD ================= */
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

  /* ================= SEARCH / EXPORT / RESET ================= */
  $("[data-dash-search]").addEventListener("input", (e) => { searchTerm = e.target.value.trim(); renderRows(); });

  $("[data-export]").addEventListener("click", () => {
    const list = ML.getProducts();
    const body =
      "/* =====================================================================\n" +
      "   Moon Lite's Footwear — PRODUCT CATALOGUE\n" +
      "   Exported from the dashboard on " + new Date().toLocaleString() + "\n" +
      "   To make these your permanent catalogue, replace the file\n" +
      "   assets/js/products.seed.js with this one and re-upload it.\n" +
      "   ===================================================================== */\n" +
      "window.MOONLITE_SEED = " + JSON.stringify(list, null, 2) + ";\n";
    const blob = new Blob([body], { type: "application/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.seed.js";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    ML.toast("Catalogue exported.");
  });

  $("[data-reset]").addEventListener("click", () => {
    if (!confirm("Reset the catalogue to the original sample products? Any changes you've made in this browser will be cleared.")) return;
    ML.resetProducts();
    renderAll();
    ML.toast("Catalogue reset to samples.");
  });

  /* ================= CHANGE PASSCODE ================= */
  $("[data-genhash]").addEventListener("click", async () => {
    const val = ($("[data-newpass]").value || "").trim();
    const out = $("[data-hashout]");
    if (!val) { out.classList.add("is-on"); out.textContent = "Type a passcode above first."; return; }
    let hash;
    try { hash = await ML.sha256(val); } catch (e) { out.classList.add("is-on"); out.textContent = "Couldn't generate — try a modern browser."; return; }
    out.classList.add("is-on");
    out.innerHTML = 'Open <b>assets/js/config.js</b>, replace the <code>adminPassHash</code> line with this, and re-upload the file:<br><br>' +
      '<span style="user-select:all">adminPassHash: "' + hash + '"</span>';
  });

  /* ================= BOOT ================= */
  if (sessionUnlocked()) unlock();
  else { const inp = $("[data-gate-input]"); if (inp) setTimeout(() => inp.focus(), 100); }
})();
