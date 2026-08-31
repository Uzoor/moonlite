/* =====================================================================
   Moon Lite's Footwear — PAGE RENDERERS
   Home, Shop, Product detail, Contact. Reads window.ML from store.js.
   Ordering is by email form (Web3Forms). No cart, no WhatsApp.
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
  const okMark = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>';

  /* Order-form styling, injected once. Uses CSS variables with safe
     fallbacks so it matches the theme without touching moonlite.css.     */
  function ensureFormStyles() {
    if (document.getElementById("ml-order-css")) return;
    const s = document.createElement("style");
    s.id = "ml-order-css";
    s.textContent = ".order-form .field{margin-bottom:.7rem}"
      + ".order-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}"
      + "@media(max-width:520px){.order-grid{grid-template-columns:1fr}}"
      + ".order-form__note{font-size:.82rem;color:var(--muted,#8a8a8e);margin-top:.75rem;line-height:1.45}"
      + ".order-form__note.is-bad{color:#c0392b}"
      + ".order-done{text-align:center;padding:1.4rem 0}"
      + ".order-done svg{width:42px;height:42px;color:var(--gold,#C38F42);margin-bottom:.4rem}"
      + ".order-done h3{font-family:var(--display,'Bodoni Moda',serif);font-size:1.4rem;margin:.2rem 0 .45rem}"
      + ".order-done p{color:var(--muted,#8a8a8e);line-height:1.5}";
    document.head.appendChild(s);
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
    const href = `product.html?id=${encodeURIComponent(p.id)}`;
    const label = p.soldOut ? "View details" : "View & order";
    return `
      <article class="card${p.soldOut ? " is-sold" : ""}" data-reveal>
        <a class="card__media" href="${href}" aria-label="${esc(p.name)}">
          ${flag}
          <img src="${esc(img)}" alt="${esc(p.name)} — ${esc(p.subtitle || "")}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK}'">
        </a>
        <div class="card__body">
          <span class="card__cat">${esc(p.category || "")}</span>
          <h3 class="card__name"><a href="${href}">${esc(p.name)}</a></h3>
          <div class="card__row">
            ${price}
            <span class="card__sizes">${sizeRange(p.sizes)}</span>
          </div>
          <a class="btn ${p.soldOut ? "btn--ghost" : "btn--gold"} btn--sm btn--block card__wa"
             href="${href}">${label}</a>
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
          <form class="order-form" data-order-form novalidate>
            <div class="field"><label for="of-name">Your name</label><input id="of-name" name="name" type="text" autocomplete="name" placeholder="e.g. Ejiofor Emmanuel" required></div>
            <div class="order-grid">
              <div class="field"><label for="of-phone">Phone number</label><input id="of-phone" name="phone" type="tel" autocomplete="tel" placeholder="e.g. 0816 517 8225" required></div>
              <div class="field"><label for="of-alt">Alternative phone <span style="opacity:.6">(optional)</span></label><input id="of-alt" name="alt_phone" type="tel" autocomplete="tel" placeholder="Another number to reach you"></div>
            </div>
            <div class="field"><label for="of-addr">Home / office address</label><input id="of-addr" name="address" type="text" autocomplete="street-address" placeholder="e.g. Ali Jodi, Sokoto"></div>
            <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none">
            <button class="btn btn--gold btn--block" type="submit" data-order-submit>${p.soldOut ? "Ask about restock" : "Place order"}</button>
            <p class="order-form__note" data-order-msg>${p.soldOut ? "Leave your details and we’ll reach out the moment this pair is back in stock." : "Pick your size above, then send. We’ll receive your order and call you to confirm and arrange delivery — no online payment needed."}</p>
          </form>
        </div>

        <div class="pdp__meta">
          <div><strong>Delivery</strong><span>${esc(ML.CFG.delivery || "")}</span></div>
          <div><strong>Returns</strong><span>${esc(ML.CFG.returns || "")}</span></div>
          <div><strong>Stock</strong><span>${p.soldOut ? "Currently unavailable" : ((p.stock || 0) > 0 ? (p.stock + " pairs available") : "Made to order")}</span></div>
        </div>
      </div>`;

    ensureFormStyles();

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
    }));
    // sizes
    root.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => {
      sel.size = b.dataset.size;
      root.querySelectorAll("[data-size]").forEach(s => s.setAttribute("aria-pressed", s === b));
    }));

    // order form → email (Web3Forms)
    const orderForm = root.querySelector("[data-order-form]");
    if (orderForm) orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = orderForm.querySelector("[data-order-submit]");
      const msg = orderForm.querySelector("[data-order-msg]");
      const name = orderForm.elements["name"].value.trim();
      const phone = orderForm.elements["phone"].value.trim();
      if (!name || !phone) { msg.textContent = "Please add your name and phone number."; msg.classList.add("is-bad"); return; }
      msg.classList.remove("is-bad");
      const fields = {
        "Name": name,
        "Home/Office Address": orderForm.elements["address"].value.trim() || "(not given)",
        "Phone Number": phone,
        "Alternative Phone Number": orderForm.elements["alt_phone"].value.trim() || "(none given)",
        "Sneaker": p.name + (p.subtitle ? " (" + p.subtitle + ")" : "") + " — " + ML.money(p.price),
        "Size": sel.size ? ("Size " + sel.size) : "(not selected)",
        botcheck: orderForm.elements["botcheck"] && orderForm.elements["botcheck"].checked ? true : ""
      };
      if (p.colors && p.colors.length) fields["Colour"] = sel.color || "(any)";
      const subject = (p.soldOut ? "Restock enquiry" : "New order") + " — " + p.name + " · " + (ML.CFG.brandName || "Moon Lite's Footwear");
      const original = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        await ML.submitForm(fields, subject);
        orderForm.innerHTML = `<div class="order-done">${okMark()}<h3>${p.soldOut ? "Thanks — noted!" : "Order received!"}</h3><p>${p.soldOut ? "We’ll be in touch as soon as this pair is back in stock." : "We’ll call you shortly on " + esc(phone) + " to confirm and arrange delivery."}</p></div>`;
      } catch (err) {
        btn.disabled = false; btn.textContent = original;
        msg.textContent = (err && err.message) || "Couldn’t send — please try again."; msg.classList.add("is-bad");
      }
    });

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
    ensureFormStyles();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const name = form.elements["name"] ? form.elements["name"].value.trim() : "";
      const message = form.elements["message"] ? form.elements["message"].value.trim() : "";
      if (!message) { ML.toast("Please type your message first."); return; }
      const original = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      try {
        await ML.submitForm(
          { name: name || "(not given)", message: message, botcheck: "" },
          "Website enquiry — " + (ML.CFG.brandName || "Moon Lite's Footwear")
        );
        form.innerHTML = `<div class="order-done">${okMark()}<h3>Message sent!</h3><p>Thanks${name ? ", " + esc(name) : ""} — we’ll get back to you shortly.</p></div>`;
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = original; }
        ML.toast((err && err.message) || "Couldn’t send — please try again.");
      }
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
