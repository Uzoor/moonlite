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
     Web3Forms relays it for free: a customer fills the order form, and
     the details land in the shop's inbox — then you just call them.

     One-time setup:
       1. Go to  https://web3forms.com
       2. Type the email where orders should arrive. They send you a key.
       3. Paste that key between the quotes below and re-upload this file.

     Leave "" and order buttons fall back to opening the customer's own
     email app, addressed to the "email" set further down — so nothing is
     ever a dead end while you finish setup.
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
     ❷ THE DATABASE  (Supabase)
     ---------------------------------------------------------------------
     Paste the two values from your Supabase project here and the site
     switches itself on: the shop reads its products from the database,
     and the dashboard asks for an email and password instead of a
     passcode. Every edit the shop owner makes goes live immediately —
     no exporting, no re-uploading files.

     Where to find them:
       Supabase → your project → Settings → API
         • Project URL       ->  supabaseUrl
         • anon public key   ->  supabaseAnonKey

     Leave both as "" and everything keeps working the old way: the
     shipped catalogue below, edits saved in the browser, published by
     exporting files. (See supabase-setup.sql for the full walkthrough.)

     The anon key is meant to be public — it is in every visitor's
     browser by design. What protects you is the row-level security in
     supabase-setup.sql: the public can only read, and every write needs
     a signed-in account that only you can create.
     ===================================================================== */
  supabaseUrl:     "",
  supabaseAnonKey: "",
  supabaseBucket:  "product-photos",

  /* =====================================================================
     ❸ ADMIN PASSCODE  (only used when the database above is switched off)
     ---------------------------------------------------------------------
     This is a SHA-256 hash of your passcode, NOT the passcode itself.
     The default below unlocks with:   moonlite2026
     To set your own: open dashboard.html, use the "Change passcode"
     tool at the top — it prints a new hash to paste here. Or run in any
     browser console:
        crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOURCODE'))
          .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
     NOTE: a static site can't keep secrets — this keeps casual visitors
     out, but anyone technical can view the source. Don't reuse a real
     password here. Once Supabase is switched on, the real login replaces
     this and the hash is ignored.
     ===================================================================== */
  adminPassHash: "0adbb69bf6e3d0a3a51bfe939009779f588ab8565ace03aa661b8faa540b9526"
};
