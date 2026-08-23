/* =====================================================================
   Moon Lite's Footwear — STORE ENGINE
   Shared across the storefront. No frameworks, no build step.
   Handles: config, product source (seed + local edits), currency,
   direct WhatsApp contact, and shared chrome (nav/footer).
   NO CART — customers order by messaging on WhatsApp directly.
   ===================================================================== */
(function () {
  "use strict";

  const CFG = window.MOONLITE_CONFIG || {};
  const SEED = window.MOONLITE_SEED || [];
  const KEY_PRODUCTS = "moonlite.products.v1";

  /* ---------- safe storage (degrades if storage is blocked) ---------- */
  const mem = {};
  const store = {
    get(k) {
      try { const v = localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : null) : v; }
      catch (e) { return k in mem ? mem[k] : null; }
    },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  };

  /* ---------- products ---------- */
  function getProducts() {
    const raw = store.get(KEY_PRODUCTS);
    if (raw) { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch (e) {} }
    return SEED.slice();
  }
  function saveProducts(list) { store.set(KEY_PRODUCTS, JSON.stringify(list)); }
  function resetProducts() { store.del(KEY_PRODUCTS); }
  function getProduct(id) { return getProducts().find(p => p.id === id) || null; }
  function categories() {
    const set = new Set();
    getProducts().forEach(p => p.category && set.add(p.category));
    return Array.from(set).sort();
  }
  function allSizes() {
    const set = new Set();
    getProducts().forEach(p => (p.sizes || []).forEach(s => set.add(s)));
    return Array.from(set).sort((a, b) => a - b);
  }

  /* ---------- currency ---------- */
  const cur = CFG.currency || { code: "NGN", symbol: "₦", locale: "en-NG" };
  function money(n) {
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: "currency", currency: cur.code, maximumFractionDigits: 0
      }).format(n);
    } catch (e) {
      return (cur.symbol || "") + Number(n || 0).toLocaleString();
    }
  }

  /* ---------- WhatsApp contact (no cart) ---------- */
  function waHref(text) {
    const num = (CFG.whatsappNumber || "").replace(/\D/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
  }
  function contactMessage() {
    return "Hello " + (CFG.brandName || "") + " 👋\n\nI'd like to make an enquiry.";
  }
  function singleProductMessage(p, size, color) {
    const L = [];
    L.push("Hello " + (CFG.brandName || "") + " 👋");
    L.push("I'd like to order this pair:");
    L.push("");
    L.push("• " + p.name + (p.subtitle ? " (" + p.subtitle + ")" : ""));
    if (size) L.push("• Size (EU): " + size);
    if (color) L.push("• Colour: " + color);
    L.push("• Price: " + money(p.price));
    L.push("");
    L.push("Is it available? Please confirm and let me know about delivery. Thank you!");
    return L.join("\n");
  }
  function restockMessage(p) {
    return "Hello " + (CFG.brandName || "") + " 👋\n\nIs \"" + p.name + "\" back in stock? Please let me know when it's available.";
  }

  /* ---------- SHA-256 (admin passcode) ---------- */
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(t);
    }
    t.querySelector("span").textContent = msg;
    requestAnimationFrame(() => t.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  /* ---------- shared chrome: header + footer ---------- */
  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    tk: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 4v2.3c-1.3 0-2.5-.4-3.5-1v6.2a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.4a3.2 3.2 0 1 0 2.3 3V3h2.4z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.8.5-1 .9-1H17V3h-2.5C11.8 3 11 4.8 11 6.7v1.8H9V11h2v10h3V11h2.2l.4-2.5H14z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.9 5-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.8.9.8 1.7 1 2 1.2.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.1.1.6-.1 1.3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
  };
  window.ML_ICON = ICON;

  function chrome() {
    const cur_page = document.body.getAttribute("data-page") || "";
    const socials = CFG.social || {};
    const nav = [
      ["Home", "index.html", "home"],
      ["Shop", "shop.html", "shop"],
      ["Size Guide", "size-guide.html", "size"],
      ["About", "about.html", "about"],
      ["Contact", "contact.html", "contact"]
    ];
    const navLinks = nav.map(([t, h, k]) =>
      `<a href="${h}"${k === cur_page ? ' aria-current="page"' : ""}>${t}</a>`).join("");

    const header = document.querySelector("[data-chrome=header]");
    if (header) {
      header.innerHTML = `
        <div class="wrap nav">
          <a class="nav__logo" href="index.html" aria-label="${CFG.brandName} home">
            <img src="assets/img/logo-web.png" alt="${CFG.brandName}">
          </a>
          <nav class="nav__links" aria-label="Primary">${navLinks}</nav>
          <a class="nav__wa" href="${waHref(contactMessage())}" target="_blank" rel="noopener" aria-label="Contact us on WhatsApp">
            ${ICON.wa}<span>WhatsApp</span>
          </a>
          <button class="nav__toggle" data-nav-toggle aria-label="Menu" aria-expanded="false"><span></span></button>
        </div>`;
    }

    const footer = document.querySelector("[data-chrome=footer]");
    if (footer) {
      const soc = [];
      if (socials.instagram) soc.push(`<a href="${socials.instagram}" aria-label="Instagram" target="_blank" rel="noopener">${ICON.ig}</a>`);
      if (socials.tiktok) soc.push(`<a href="${socials.tiktok}" aria-label="TikTok" target="_blank" rel="noopener">${ICON.tk}</a>`);
      if (socials.facebook) soc.push(`<a href="${socials.facebook}" aria-label="Facebook" target="_blank" rel="noopener">${ICON.fb}</a>`);
      soc.push(`<a href="${waHref(contactMessage())}" aria-label="WhatsApp" target="_blank" rel="noopener">${ICON.wa}</a>`);
      footer.innerHTML = `
        <div class="wrap">
          <div class="footer-grid">
            <div>
              <img class="f-logo" src="assets/img/logo-light.png" alt="${CFG.brandName}">
              <p class="f-tag">${CFG.tagline || ""}</p>
              <div class="f-social">${soc.join("")}</div>
            </div>
            <div class="f-col">
              <h4>Shop</h4>
              <a href="shop.html">All footwear</a>
              <a href="shop.html?cat=Sneakers">Sneakers</a>
              <a href="shop.html?cat=Running">Running</a>
              <a href="shop.html?cat=Luxury">Luxury</a>
            </div>
            <div class="f-col">
              <h4>Help</h4>
              <a href="size-guide.html">Size guide</a>
              <a href="contact.html">Contact us</a>
              <a href="about.html">Our story</a>
            </div>
            <div class="f-col">
              <h4>Visit</h4>
              <p>${CFG.address || ""}</p>
              <a href="tel:${(CFG.phoneDisplay||'').replace(/\s/g,'')}">${CFG.phoneDisplay || ""}</a>
            </div>
          </div>
          <div class="footer-base">
            <span>© ${new Date().getFullYear()} ${CFG.brandName}. All rights reserved.</span>
            <span>Step into the night in style.</span>
          </div>
        </div>`;
    }

    wireChrome();
  }

  function wireChrome() {
    const toggle = document.querySelector("[data-nav-toggle]");
    if (toggle) toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") document.body.classList.remove("nav-open"); });
    // sticky header shadow
    const header = document.querySelector(".site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
      onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  }

  /* ---------- expose ---------- */
  window.ML = {
    CFG, money, sha256, toast,
    getProducts, saveProducts, resetProducts, getProduct, categories, allSizes,
    waHref, contactMessage, singleProductMessage, restockMessage,
    chrome, initReveal, icon: ICON
  };

  document.addEventListener("DOMContentLoaded", () => { chrome(); initReveal(); });
})();
