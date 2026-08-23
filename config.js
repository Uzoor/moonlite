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

  /* --- WhatsApp orders ---
     Put your number in full international format, digits only.
     Nigeria example: 234 + number without the leading 0.
     0803 123 4567  ->  "2348031234567"                                */
  whatsappNumber: "2348000000000",

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

  /* --- Free-delivery hint shown in the cart (set to 0 to hide) --- */
  freeDeliveryOver: 150000,

  /* =====================================================================
     ❷ ADMIN PASSCODE  (dashboard lock)
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
     password here.
     ===================================================================== */
  adminPassHash: "0adbb69bf6e3d0a3a51bfe939009779f588ab8565ace03aa661b8faa540b9526"
};
