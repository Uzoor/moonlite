/* =====================================================================
   Moon Lite's Footwear — PAGE RENDERERS
   Home, Shop, Product detail, Contact. Reads window.ML from store.js.
   ===================================================================== */
(function () {
  "use strict";
  const FALLBACK = "assets/img/mark.png";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function sizeRange(sizes) {
    if (!sizes || !sizes.length) return "";
    const s = sizes.slice().sort((a, b) => a - b);
    return s.length === 1 ? ("Size " + s[0]) : ("Sizes " + s[0] + "–" + s[s.length - 1]);
  }

  /* ---------- shared product card ---------- */
  function card(p) {
    const img = (p.images && p.images[0]) || FALLBACK;
    const flag = p.soldOut
      ? '<span class="card__flag card__flag--sold">Sold out</span>'
      : (p.badge ? `<span class="card__flag">${esc(p.badge)}</span>` : "");
    const price = p.oldPrice && p.oldPrice > p.price
      ? `<span class="card__price"><s>${ML.money(p.oldPrice)}</s>${ML.money(p.price)}</span>`
      : `<span class="card__price">${ML.money(p.price)}</span>`;
    const wa = p.soldOut ? ML.waHref(ML.restockMessage(p)) : ML.waHref(ML.singleProductMessage(p));
    const waLabel = p.soldOut ? "Ask about restock" : "Order on WhatsApp";
    return `
      <article class="card${p.soldOut ? " is-sold" : ""}" data-reveal>
        <a class="card__media" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}">
          ${flag}
          <img src="${esc(img)}" alt="${esc(p.name)} — ${esc(p.subtitle || "")}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK}'">
        </a>
        <div class="card__body">
          <span class="card__cat">${esc(p.category || "")}</span>
          <h3 class="card__name"><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
          <div class="card__row">
            ${price}
            <span class="card__sizes">${sizeRange(p.sizes)}</span>
          </div>
          <a class="btn ${p.soldOut ? "btn--ghost" : "btn--gold"} btn--sm btn--block card__wa"
             href="${wa}" target="_blank" rel="noopener">${ML.icon.wa} ${waLabel}</a>
        </div>
      </article>`;
  }

  /* ======================= HOME ======================= */
  function initHome() {
    const feat = document.querySelector("[data-home-featured]");
    if (feat) {
      const items = ML.getProducts().filter(p => p.featured).slice(0, 8);
      const list = items.length ? items : ML.getProducts().slice(0, 8);
      feat.innerHTML = list.map(card).join("");
    }
    const cats = document.querySelector("[data-home-cats]");
    if (cats) {
      const imgByCat = {};
      ML.getProducts().forEach(p => { if (p.category && !imgByCat[p.category]) imgByCat[p.category] = (p.images && p.images[0]) || FALLBACK; });
      cats.innerHTML = ML.categories().map(c => `
        <a class="cat-tile" href="shop.html?cat=${encodeURIComponent(c)}" data-reveal>
          <img src="${esc(imgByCat[c] || FALLBACK)}" alt="${esc(c)}" loading="lazy" onerror="this.src='${FALLBACK}'">
          <span class="cat-tile__label">${esc(c)}<em>Shop now →</em></span>
        </a>`).join("");
    }
    ML.initReveal();
  }

  /* ======================= SHOP ======================= */
  let shopApply = null;                     // set once, reused on refresh
  function initShop() {
    const grid = document.querySelector("[data-shop-grid]");
    if (!grid) return;
    if (shopApply) { shopApply(); return; } // live data arrived — just redraw
    const params = new URLSearchParams(location.search);
    const state = { cat: params.get("cat") || "All", size: "All", sort: "featured", q: (params.get("q") || "") };

    const catWrap = document.querySelector("[data-filter-cat]");
    const sizeWrap = document.querySelector("[data-filter-size]");
    const sortSel = document.querySelector("[data-sort]");
    const countEl = document.querySelector("[data-shop-count]");
    const searchEl = document.querySelector("[data-shop-search]");

    const cats = ["All"].concat(ML.categories());
    catWrap.innerHTML = cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join("");
    const sizes = ["All"].concat(ML.allSizes());
    sizeWrap.innerHTML = sizes.map(s => `<button class="chip" data-size="${s}" aria-pressed="${String(s) === String(state.size)}">${s}</button>`).join("");
    if (searchEl && state.q) searchEl.value = state.q;

    function apply() {
      let list = ML.getProducts();
      if (state.cat !== "All") list = list.filter(p => p.category === state.cat);
      if (state.size !== "All") list = list.filter(p => (p.sizes || []).map(String).includes(String(state.size)));
      if (state.q) {
        const q = state.q.toLowerCase();
        list = list.filter(p => (p.name + " " + (p.subtitle || "") + " " + (p.category || "")).toLowerCase().includes(q));
      }
      if (state.sort === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
      else if (state.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
      else if (state.sort === "featured") list = list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

      grid.innerHTML = list.length
        ? list.map(card).join("")
        : `<div class="notice">${ML.icon.search}<h3>Nothing here yet</h3><p>Try clearing a filter or searching for something else.</p></div>`;
      if (countEl) countEl.textContent = list.length + (list.length === 1 ? " pair" : " pairs");
      ML.initReveal();
    }

    catWrap.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; state.cat = b.dataset.cat; catWrap.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === b)); apply(); });
    sizeWrap.addEventListener("click", e => { const b = e.target.closest("[data-size]"); if (!b) return; state.size = b.dataset.size; sizeWrap.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === b)); apply(); });
    if (sortSel) sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });
    if (searchEl) searchEl.addEventListener("input", () => { state.q = searchEl.value.trim(); apply(); });

    const ft = document.querySelector("[data-filter-toggle]");
    if (ft) ft.addEventListener("click", () => document.querySelector(".filters").classList.toggle("is-open"));

    shopApply = apply;
    apply();
  }

  /* ======================= PRODUCT ======================= */
  let pdpShown = "";                        // JSON of what's on screen
  function initProduct() {
    const root = document.querySelector("[data-pdp]");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const p = id && ML.getProduct(id);
    const stamp = JSON.stringify(p || null);
    if (pdpShown === stamp) return;         // nothing changed — leave the page alone
    pdpShown = stamp;
    document.querySelector("[data-crumb]") && (document.querySelector("[data-crumb]").textContent = p ? p.name : "Not found");

    if (!p) {
      root.innerHTML = `<div class="notice">${ML.icon.search}<h3>Pair not found</h3><p>It may have sold out or been removed.</p><p style="margin-top:1rem"><a class="btn btn--gold" href="shop.html">Back to the shop</a></p></div>`;
      return;
    }
    document.title = p.name + " — " + ML.CFG.brandName;

    const imgs = (p.images && p.images.length) ? p.images : [FALLBACK];
    let sel = { size: null, color: (p.colors && p.colors[0] && p.colors[0].name) || "", img: 0 };

    const priceHtml = p.oldPrice && p.oldPrice > p.price
      ? `<s>${ML.money(p.oldPrice)}</s>${ML.money(p.price)}`
      : ML.money(p.price);

    root.innerHTML = `
      <div class="gallery">
        <div class="gallery__main">
          <img data-main src="${esc(imgs[0])}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${FALLBACK}'">
        </div>
        ${imgs.length > 1 ? `<div class="gallery__thumbs" data-thumbs>${imgs.map((im, i) => `<button aria-current="${i === 0}" data-thumb="${i}"><img src="${esc(im)}" alt="View ${i + 1}" onerror="this.src='${FALLBACK}'"></button>`).join("")}</div>` : ""}
      </div>
      <div class="pdp__info">
        <span class="eyebrow pdp__cat">${esc(p.category || "")}</span>
        <h1 class="pdp__title">${esc(p.name)}</h1>
        ${p.subtitle ? `<p class="card__cat" style="margin-bottom:1rem">${esc(p.subtitle)}</p>` : ""}
        <div class="pdp__price">${priceHtml}</div>
        <p class="pdp__desc">${esc(p.description || "")}</p>

        ${p.colors && p.colors.length ? `<div class="pdp__block"><h3>Colour: <span data-color-name>${esc(sel.color)}</span></h3>
          <div class="swatch-row" data-swatches>${p.colors.map((c, i) => `<button class="swatch" title="${esc(c.name)}" style="background:${esc(c.hex)}" data-color="${esc(c.name)}" aria-pressed="${i === 0}"></button>`).join("")}</div></div>` : ""}

        <div class="pdp__block">
          <h3>Select size (EU)</h3>
          <div class="size-grid" data-sizes>
            ${(p.sizes || []).map(s => `<button class="size-opt" data-size="${s}" ${p.soldOut ? "disabled" : ""}>${s}</button>`).join("")}
          </div>
        </div>

        <div class="pdp__actions">
          <a class="btn btn--gold btn--block" data-wa target="_blank" rel="noopener">${ML.icon.wa} ${p.soldOut ? "Ask about restock" : "Order on WhatsApp"}</a>
          <p class="pdp__wa-note">Opens WhatsApp with this pair${p.soldOut ? "" : " and your selected size"} ready to send — no account or checkout needed.</p>
        </div>

        <div class="pdp__meta">
          <div><strong>Delivery</strong><span>${esc(ML.CFG.delivery || "")}</span></div>
          <div><strong>Returns</strong><span>${esc(ML.CFG.returns || "")}</span></div>
          <div><strong>Stock</strong><span>${p.soldOut ? "Currently unavailable" : ((p.stock || 0) > 0 ? (p.stock + " pairs available") : "Made to order")}</span></div>
        </div>
      </div>`;

    // gallery thumbs
    root.querySelectorAll("[data-thumb]").forEach(b => b.addEventListener("click", () => {
      sel.img = +b.dataset.thumb;
      root.querySelector("[data-main]").src = imgs[sel.img];
      root.querySelectorAll("[data-thumb]").forEach(t => t.setAttribute("aria-current", t === b));
    }));
    // colours
    root.querySelectorAll("[data-color]").forEach(b => b.addEventListener("click", () => {
      sel.color = b.dataset.color;
      const nameEl = root.querySelector("[data-color-name]"); if (nameEl) nameEl.textContent = sel.color;
      root.querySelectorAll("[data-color]").forEach(s => s.setAttribute("aria-pressed", s === b));
      updateWa();
    }));
    // sizes
    root.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => {
      sel.size = b.dataset.size;
      root.querySelectorAll("[data-size]").forEach(s => s.setAttribute("aria-pressed", s === b));
      updateWa();
    }));
    // whatsapp order link (updates as size / colour change)
    function updateWa() {
      const a = root.querySelector("[data-wa]");
      if (a) a.href = p.soldOut ? ML.waHref(ML.restockMessage(p)) : ML.waHref(ML.singleProductMessage(p, sel.size, sel.color));
    }
    updateWa();

    // related
    const rel = document.querySelector("[data-related]");
    if (rel) {
      const others = ML.getProducts().filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
      const list = others.length ? others : ML.getProducts().filter(x => x.id !== p.id).slice(0, 4);
      rel.innerHTML = list.map(card).join("");
    }
    ML.initReveal();
  }

  /* ======================= CONTACT ======================= */
  let contactWired = false;
  function initContact() {
    const form = document.querySelector("[data-contact-form]");
    if (!form || contactWired) return;
    contactWired = true;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = form.name.value.trim();
      const msg = form.message.value.trim();
      const text = `Hello ${ML.CFG.brandName} 👋\n\nMy name is ${name || "(customer)"}.\n${msg || "I have an enquiry."}`;
      window.open(ML.waHref(text), "_blank", "noopener");
    });
  }

  ready(function () {
    const draw = () => { initHome(); initShop(); initProduct(); initContact(); };

    /* Paint straight away when there's something to show — the shipped
       catalogue, or the last copy we cached — so the page is never blank
       while the live catalogue is on its way. Then draw again with the
       fresh data. */
    if (ML.mode !== "live" || ML.hasCache()) draw();
    if (ML.load) ML.load().then(draw).catch(draw);
    else draw();
  });
})();
