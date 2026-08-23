/* =====================================================================
   Moon Lite's Footwear — SUPABASE CLIENT
   ---------------------------------------------------------------------
   A small, dependency-free wrapper over Supabase's REST endpoints:
     • Auth      — email + password sign-in, token refresh, session memory
     • Database  — products + settings (read public, write signed-in)
     • Storage   — product photos (read public, write signed-in)

   No SDK, no CDN, no build step — just fetch(). If supabaseUrl or
   supabaseAnonKey are missing from config.js this stays dormant and the
   site runs in local (export-a-file) mode exactly as before.

   The anon key is designed to be public. Security comes from the
   row-level-security policies in supabase-setup.sql, which only allow
   writes from a signed-in user.
   ===================================================================== */
(function () {
  "use strict";

  const CFG = window.MOONLITE_CONFIG || {};
  const BASE = String(CFG.supabaseUrl || "").replace(/\/+$/, "");
  const ANON = String(CFG.supabaseAnonKey || "");
  const BUCKET = CFG.supabaseBucket || "product-photos";
  const enabled = !!(BASE && ANON && /^https?:\/\//.test(BASE));

  const KEY_SESSION = "moonlite.sb.session.v1";
  const TIMEOUT_MS = 15000;

  /* ---------- session memory (survives refreshes) ---------- */
  let session = null;
  try {
    const raw = localStorage.getItem(KEY_SESSION);
    if (raw) session = JSON.parse(raw);
  } catch (e) { session = null; }

  function keepSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(KEY_SESSION, JSON.stringify(s));
      else localStorage.removeItem(KEY_SESSION);
    } catch (e) {}
  }

  function signedIn() { return !!(session && session.access_token); }
  function currentEmail() { return (session && session.email) || ""; }

  /* ---------- low-level request ---------- */
  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("The connection timed out.")), ms || TIMEOUT_MS);
      promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  async function raw(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ apikey: ANON }, opts.headers || {});
    if (opts.auth !== false && signedIn()) headers.Authorization = "Bearer " + session.access_token;
    else if (opts.auth !== false) headers.Authorization = "Bearer " + ANON;

    let res;
    try {
      res = await withTimeout(fetch(BASE + path, {
        method: opts.method || "GET",
        headers,
        body: opts.body
      }), opts.timeout);
    } catch (e) {
      throw new Error(e && e.message === "The connection timed out."
        ? "The connection timed out. Check your internet and try again."
        : "Can't reach the server. Check your internet connection.");
    }
    return res;
  }

  async function parse(res) {
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
    if (!res.ok) {
      const msg = (data && (data.error_description || data.msg || data.message || data.error || data.hint)) ||
        ("Request failed (" + res.status + ")");
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- auth ---------- */
  async function signIn(email, password) {
    const res = await raw("/auth/v1/token?grant_type=password", {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ANON },
      body: JSON.stringify({ email: String(email || "").trim(), password: String(password || "") })
    });
    let data;
    try { data = await parse(res); }
    catch (e) {
      if (e.status === 400) throw new Error("Wrong email or password.");
      throw e;
    }
    keepSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (Number(data.expires_in || 3600) * 1000),
      email: (data.user && data.user.email) || String(email || "").trim()
    });
    return session;
  }

  async function refresh() {
    if (!session || !session.refresh_token) throw new Error("Not signed in.");
    const res = await raw("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ANON },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    let data;
    try { data = await parse(res); }
    catch (e) { keepSession(null); throw new Error("Your session expired. Please sign in again."); }
    keepSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: Date.now() + (Number(data.expires_in || 3600) * 1000),
      email: (data.user && data.user.email) || session.email
    });
    return session;
  }

  /* Refresh a little before expiry so a long editing session never fails. */
  async function ensureFresh() {
    if (!signedIn()) return false;
    if (Date.now() > (session.expires_at || 0) - 60000) {
      try { await refresh(); } catch (e) { return false; }
    }
    return true;
  }

  /* Lets the owner change her own password from the dashboard. */
  async function changePassword(newPassword) {
    if (!signedIn()) throw new Error("Please sign in first.");
    await ensureFresh();
    const res = await raw("/auth/v1/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: String(newPassword || "") })
    });
    let data;
    try { data = await parse(res); }
    catch (e) {
      if (e.status === 422 || e.status === 400) throw new Error(e.message || "That password wasn't accepted. Try a longer one.");
      throw e;
    }
    return !!data;
  }

  async function signOut() {
    if (signedIn()) {
      try { await raw("/auth/v1/logout", { method: "POST", headers: { "Content-Type": "application/json" } }); }
      catch (e) {}
    }
    keepSession(null);
  }

  /* ---------- shape mapping (db snake_case <-> app camelCase) ---------- */
  function fromRow(r) {
    return {
      id: r.id,
      name: r.name || "",
      subtitle: r.subtitle || "",
      category: r.category || "",
      price: Number(r.price || 0),
      oldPrice: r.old_price == null ? null : Number(r.old_price),
      stock: Number(r.stock || 0),
      badge: r.badge || "",
      description: r.description || "",
      sizes: Array.isArray(r.sizes) ? r.sizes : [],
      colors: Array.isArray(r.colors) ? r.colors : [],
      images: Array.isArray(r.images) ? r.images : [],
      featured: !!r.featured,
      soldOut: !!r.sold_out,
      sort: r.sort == null ? 0 : Number(r.sort)
    };
  }
  function toRow(p, sort) {
    return {
      id: p.id,
      name: p.name || "",
      subtitle: p.subtitle || "",
      category: p.category || "",
      price: Number(p.price || 0),
      old_price: p.oldPrice == null || p.oldPrice === "" ? null : Number(p.oldPrice),
      stock: Number(p.stock || 0),
      badge: p.badge || "",
      description: p.description || "",
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      images: Array.isArray(p.images) ? p.images : [],
      featured: !!p.featured,
      sold_out: !!p.soldOut,
      sort: sort == null ? (p.sort == null ? 0 : Number(p.sort)) : Number(sort)
    };
  }

  /* ---------- products ---------- */
  async function listProducts() {
    const res = await raw("/rest/v1/products?select=*&order=sort.asc,name.asc");
    const rows = await parse(res);
    return (Array.isArray(rows) ? rows : []).map(fromRow);
  }

  async function saveProduct(p, sort) {
    await ensureFresh();
    const res = await raw("/rest/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([toRow(p, sort)])
    });
    const rows = await parse(res);
    return Array.isArray(rows) && rows[0] ? fromRow(rows[0]) : p;
  }

  async function saveProducts(list) {
    await ensureFresh();
    const rows = (list || []).map((p, i) => toRow(p, i));
    if (!rows.length) return [];
    const res = await raw("/rest/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(rows)
    });
    const out = await parse(res);
    return (Array.isArray(out) ? out : []).map(fromRow);
  }

  async function deleteProduct(id) {
    await ensureFresh();
    const res = await raw("/rest/v1/products?id=eq." + encodeURIComponent(id), { method: "DELETE" });
    await parse(res);
    return true;
  }

  /* ---------- settings (single row, id = 1) ---------- */
  async function fetchSettings() {
    const res = await raw("/rest/v1/settings?id=eq.1&select=data");
    const rows = await parse(res);
    const row = Array.isArray(rows) && rows[0];
    return row && row.data && typeof row.data === "object" ? row.data : {};
  }

  async function pushSettings(obj) {
    await ensureFresh();
    const res = await raw("/rest/v1/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{ id: 1, data: obj || {} }])
    });
    await parse(res);
    return true;
  }

  /* ---------- storage ---------- */
  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl).split(",");
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
    const bin = atob(parts[1] || "");
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: mime });
  }

  function publicUrl(path) {
    return BASE + "/storage/v1/object/public/" + BUCKET + "/" + path;
  }

  /* Uploads a data URL and returns the public https URL. */
  async function uploadPhoto(dataUrl, productId, index) {
    await ensureFresh();
    const blob = dataUrlToBlob(dataUrl);
    const ext = (blob.type.indexOf("png") > -1) ? "png" : "jpg";
    const safeId = String(productId || "product").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
    const path = safeId + "/" + Date.now() + "-" + (index == null ? 0 : index) + "." + ext;
    const res = await raw("/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST",
      headers: { "Content-Type": blob.type, "x-upsert": "true" },
      body: blob,
      timeout: 45000
    });
    await parse(res);
    return publicUrl(path);
  }

  /* Best-effort cleanup — a leftover photo is harmless, so never throw. */
  async function removePhotoByUrl(url) {
    try {
      const marker = "/storage/v1/object/public/" + BUCKET + "/";
      const i = String(url).indexOf(marker);
      if (i === -1) return false;
      const path = String(url).slice(i + marker.length);
      await ensureFresh();
      const res = await raw("/storage/v1/object/" + BUCKET + "/" + path, { method: "DELETE" });
      await parse(res);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- quick reachability check ---------- */
  async function ping() {
    try {
      const res = await raw("/rest/v1/products?select=id&limit=1", { timeout: 8000 });
      return res.ok;
    } catch (e) { return false; }
  }

  window.MLSB = {
    enabled, base: BASE, bucket: BUCKET,
    signIn, signOut, refresh, ensureFresh, signedIn, currentEmail, changePassword,
    listProducts, saveProduct, saveProducts, deleteProduct,
    fetchSettings, pushSettings,
    uploadPhoto, removePhotoByUrl, publicUrl, dataUrlToBlob,
    fromRow, toRow, ping
  };
})();
