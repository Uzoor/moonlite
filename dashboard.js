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
