/* =====================================================================
   Moon Lite's Footwear — SITE CONFIG
   ===================================================================== */

window.MOONLITE_CONFIG = {

  /* --- Business --- */
  brandName: "Moon Lite's Footwear",
  tagline: "Step into the night in style.",

  /* --- WhatsApp orders — 234 + number without the leading 0 --- */
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

  /* --- Opening hours --- */
  hours: [
    { day: "Monday – Friday", time: "9:00 AM – 7:00 PM" },
    { day: "Saturday",        time: "10:00 AM – 8:00 PM" },
    { day: "Sunday",          time: "1:00 PM – 6:00 PM" }
  ],

  /* --- Policies --- */
  delivery: "Same-day dispatch within Lagos, 2–4 days nationwide. Pay on delivery available in Lagos.",
  returns:  "Wrong size? Swap it within 7 days, unworn and in the original box.",

  freeDeliveryOver: 150000,

  /* =====================================================================
     THE DATABASE — these two lines are the switch.
     Supabase → Project Settings → API keys
       Project URL      -> supabaseUrl
       anon public key  -> supabaseAnonKey   (NEVER service_role)
     ===================================================================== */
  supabaseUrl:     "https://lablqmwpwzglughklixm.supabase.co",
  supabaseAnonKey: "sb_publishable_McqGgXRr0u_uWAsU4dh49w_MHKu-xWh",
  supabaseBucket:  "product-photos",

  /* --- Ignored once the database above is on --- */
  adminPassHash: "0adbb69bf6e3d0a3a51bfe939009779f588ab8565ace03aa661b8faa540b9526"
};
