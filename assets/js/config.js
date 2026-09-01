/* =====================================================================
   Moon Lite's Footwear — SITE CONFIG
   ---------------------------------------------------------------------
   ❶ EDIT THE VALUES BELOW TO MAKE THE SITE YOURS.
   Everything a non-coder needs to change lives in this one file.
   ===================================================================== */

window.MOONLITE_CONFIG = {

  /* --- Business --- */
  brandName: "Moon Lite's Footwear",
  tagline: "Step into the night in style.",

  /* =====================================================================
     ❶ ORDERS BY EMAIL  (Web3Forms)
     ---------------------------------------------------------------------
     The shop is a static site, so a form can't send mail on its own.
     Web3Forms relays it for free: a customer fills the order form on a
     product page, and the details land in the shop's inbox — then you
     just call them back.

     One-time setup:
       1. Sign in at  https://web3forms.com
       2. Create an access key, with the shop's order email as the
          recipient / "send to" address.
       3. Paste that key between the quotes below and re-upload this file.
       4. Place one test order and click the one-time "Activate" email
          that arrives in the shop inbox.

     Leave "" and the order button falls back to opening the customer's
     own email app, addressed to the "email" set further down — so an
     order is never a dead end while setup is being finished.
     ===================================================================== */
  web3formsKey: "",

  /* --- Currency --- */
  currency: { code: "NGN", symbol: "₦", locale: "en-NG" },

  /* --- Contact & store info --- */
  phoneDisplay: "+234 800 000 0000",
  email: "hello@moonlitesfootwear.com",
  address: "Shop 00, Balogun Market, Lagos Island, Lagos",
  mapsUrl: "https://maps.google.com/?q=Balogun+Market+Lagos",

  /* --- Social (leave "" to hide the icon) --- */
  social: {
    instagram: "https://instagram.com/",
    tiktok:    "https://tiktok.com/",
    facebook:  "https://facebook.com/"
  },

  /* --- Opening hours (shown on the contact page) --- */
  hours: [
    { day: "Monday – Friday", time: "9:00 AM – 7:00 PM" },
    { day: "Saturday",        time: "10:00 AM – 8:00 PM" },
    { day: "Sunday",          time: "1:00 PM – 6:00 PM" }
  ],

  /* --- Policies (plain sentences, shown around the site) --- */
  delivery: "Same-day dispatch within Lagos, 2–4 days nationwide. Pay on delivery available in Lagos.",
  returns:  "Wrong size? Swap it within 7 days, unworn and in the original box.",

  /* --- Free-delivery hint shown around the site (set to 0 to hide) --- */
  freeDeliveryOver: 150000,

  /* =====================================================================
     ❷ THE DATABASE  (Supabase)  —  ⚠ DO NOT BLANK THESE TWO VALUES
     ---------------------------------------------------------------------
     These are what switch the site into LIVE mode: the shop reads its
     products from the database, and the dashboard asks for an email and
     password instead of a passcode. Every edit the shop owner makes goes
     live immediately — no exporting, no re-uploading files.

     If either line is emptied, the whole site silently drops back to the
     old offline mode: the shipped seed catalogue and the passcode login.
     Nothing is lost when that happens — the database still holds
     everything — but the real dashboard disappears until these are back.

     Where to find them again:
       Supabase → your project → Settings → API
         • Project URL             ->  supabaseUrl
         • anon / publishable key  ->  supabaseAnonKey

     The publishable key is meant to be public — it sits in every
     visitor's browser by design. What protects the data is the row-level
     security in supabase-setup.sql: the public can only read, and every
     write needs a signed-in account that only you can create.
     NEVER put the service_role key in this file.
     ===================================================================== */
  supabaseUrl:     "https://lablqmwpwzglughklixm.supabase.co",
  supabaseAnonKey: "sb_publishable_McqGgXRr0u_uWAsU4dh49w_MHKu-xWh",
  supabaseBucket:  "product-photos",

  /* =====================================================================
     ❸ ADMIN PASSCODE  (only used when the database above is switched off)
     ---------------------------------------------------------------------
     Ignored while Supabase is connected — the real email/password login
     replaces it. This is a SHA-256 hash of a passcode, NOT the passcode
     itself. A static site can't keep secrets, so never reuse a real
     password here.
     ===================================================================== */
  adminPassHash: "0adbb69bf6e3d0a3a51bfe939009779f588ab8565ace03aa661b8faa540b9526"
};

/* =====================================================================
   ❹ PASSWORD-RESET CATCHER  —  nothing to edit here
   ---------------------------------------------------------------------
   The "reset your password" email sends the browser back carrying a
   one-time token in the part of the address after the #. Supabase decides
   which page to send it to, and if that page isn't on its own allow-list
   it quietly uses the Site URL instead — the home page. The token then
   lands somewhere that has no idea what to do with it, and the reset
   looks broken even though it worked.

   So: any page that spots a reset token in the address hands it straight
   over to the dashboard, token and all. With the allow-list set up
   properly this never fires — it's here so a console setting can't break
   the reset again.

   Allow-list to keep in Supabase → Authentication → URL Configuration:
     Site URL       https://moonlitesfootwear.com
     Redirect URLs  https://moonlitesfootwear.com/**
   ===================================================================== */
(function () {
  var hash = String(location.hash || "").replace(/^#/, "");
  if (!hash) return;

  var isRecovery = hash.indexOf("type=recovery") > -1;
  var isAuthError = hash.indexOf("error_code=") > -1 && hash.indexOf("error_description=") > -1;
  if (!isRecovery && !isAuthError) return;

  /* already on the dashboard — it handles this itself, don't loop */
  if (/dashboard/i.test(location.pathname)) return;

  location.replace("/dashboard.html#" + hash);
})();
