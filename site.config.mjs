// Single source of truth for business details and structured content.
// Anything marked EDIT is a placeholder you should replace before launch.

export const site = {
  name: "ADU America",
  url: "https://adu-america.com",
  phone: "(720) 544-1352",
  phoneTel: "+17205441352",
  email: "admin@adu-america.com",
  founder: "Marcus Flinders",

  // EDIT: shown in the footer, contact page and LocalBusiness schema when set.
  address: null, // { street: "", city: "", state: "", zip: "" }
  hours: null, // e.g. "Mon–Fri 8am–5pm MT"
  license: null, // e.g. "Colorado GC License #000000"
  insurance: null, // e.g. "Fully licensed and insured"

  // EDIT: social profiles. Empty strings are hidden.
  socials: { facebook: "", instagram: "", youtube: "", linkedin: "", google: "" },

  reviewUrl: "", // EDIT: Google/Yelp "leave a review" link
  calendarUrl: "", // EDIT: Calendly / Cal.com URL. When set, /book/ embeds it.

  // EDIT: analytics IDs. Empty = not loaded. GA4 / Meta load only after consent.
  analytics: { ga4: "", metaPixel: "", plausible: "" },

  // EDIT: Cloudflare Turnstile *site* key (public). The secret goes in Worker secrets.
  turnstileSiteKey: "",

  // EDIT: real reviews. Each: { name, city, project, text, rating }
  reviews: [],
};

// EDIT: illustrative figures. Replace with real numbers before launch.
export const pricing = {
  perSqftLow: 275,
  perSqftHigh: 400,
  shellFactor: 0.6, // "about 60% of a finished unit" (from the home page copy)
  upgradeUplift: { premium: 0.12, attached: 0.1, siteWork: 0.08 },
};

export const models = [
  {
    slug: "studio",
    name: "Studio",
    project: "Studio",
    index: "01",
    image: "model-studio",
    sqft: [350, 450],
    beds: "Open plan",
    baths: "1",
    summary:
      "For one person, a student, or a private workspace. A lot of function in a small footprint, without giving up comfort.",
    bestFor: ["Home office or studio", "Student or first apartment", "Short guest stays"],
  },
  {
    slug: "1-bedroom",
    name: "1 Bedroom",
    project: "1 Bedroom",
    index: "02",
    image: "model-one-bed",
    sqft: [500, 650],
    beds: "1",
    baths: "1",
    summary:
      "A fit for a couple, or for one person who wants a real bedroom and a door that closes.",
    bestFor: ["Aging parents", "Long-term rental", "Guest house"],
  },
  {
    slug: "2-bedroom",
    name: "2 Bedroom",
    project: "2 Bedroom",
    index: "03",
    image: "model-two-bed",
    sqft: [750, 900],
    beds: "2",
    baths: "1–2",
    summary:
      "More room for a small family or for guests who stay the week, not the night. Enough space that nobody is living in the hallway.",
    bestFor: ["Small family", "Rental with more income", "Adult children plus a roommate"],
  },
];

export const services = [
  {
    slug: "tiny-homes",
    name: "Tiny homes",
    project: "Tiny home",
    image: "service-tiny",
    blurb: "Detached, private living space at the back of your lot.",
    body: [
      "Extra living space that stays private, and a bump to what the property is worth. Guest house, rental, or a retreat that is yours.",
      "We build them to sit comfortably next to the house you already have. Floor plans come from our models, or a custom drawing if the lot asks for one.",
    ],
  },
  {
    slug: "adus",
    name: "Accessory dwelling units",
    project: "ADU or granny flat",
    image: "service-adu",
    blurb: "Backyard cottages, garage conversions, granny flats, and attached ADUs.",
    body: [
      "A backyard cottage, a garage conversion, or a granny flat. Detached, or tied to the main house by a breezeway or a true addition.",
      "We handle the code questions, the materials, and the build, and we stay with the job until it is actually done.",
    ],
  },
  {
    slug: "pool-houses",
    name: "Pool houses",
    project: "Pool house",
    image: "pool-house",
    blurb: "Storage, a place to change, or a room you actually entertain in.",
    body: [
      "Built with the same materials and the same crew as the homes, and drawn to sit with the pool and the house you already own.",
      "Add a bathroom, a kitchenette, or a full lounge. The scope is yours to set.",
    ],
  },
  {
    slug: "shell-homes",
    name: "Shell homes",
    project: "Shell build",
    image: "materials",
    blurb: "Finished exterior with rough-in, for owners who finish the inside.",
    body: [
      "The shell includes the finished exterior plus rough plumbing, electrical, and framing. It runs about 60% of the cost of a fully finished unit.",
      "Useful if you have your own subcontractors, or if you want to do the interior yourself.",
    ],
  },
];

export const markets = [
  {
    slug: "denver",
    name: "Denver Metro",
    state: "Colorado",
    abbr: "CO",
    cities: ["Denver"],
    blurb: "Stick-built ADUs and backyard tiny homes across the Denver metro area.",
  },
  {
    slug: "colorado-springs",
    name: "Colorado Springs",
    state: "Colorado",
    abbr: "CO",
    cities: ["Colorado Springs"],
    blurb: "Backyard cottages, granny flats and pool houses in Colorado Springs.",
  },
  {
    slug: "salt-lake",
    name: "Salt Lake Metro",
    state: "Utah",
    abbr: "UT",
    cities: ["Salt Lake City"],
    blurb: "ADUs and tiny homes built on site across the Salt Lake metro.",
  },
  {
    slug: "chicagoland",
    name: "Chicagoland",
    state: "Illinois",
    abbr: "IL",
    cities: ["Chicago", "Naperville"],
    blurb: "Backyard homes and ADUs for Chicago and the surrounding suburbs.",
  },
];

export const projectTypes = [
  "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "Tiny home",
  "ADU or granny flat",
  "Garage conversion",
  "Pool house",
  "Backyard office",
  "Shell build",
  "Not sure yet",
];

export const cityOptions = ["Denver", "Colorado Springs", "Salt Lake City", "Chicago", "Naperville"];

const A = {
  hero: "Cedar backyard cottage with a black roof and glowing French doors at dusk, set behind a stone path.",
  "model-studio":
    "Compact studio cottage with cream board-and-batten, cedar siding, and black French doors opening onto a small deck.",
  "model-one-bed":
    "One-bedroom backyard cottage with a covered porch, cream lap siding, and a shingle roof in late-day light.",
  "model-two-bed": "Two-bedroom modern farmhouse ADU with a dining terrace, seen across a lawn at dusk.",
  "service-tiny":
    "Detached tiny home at the back of a leafy yard, separated from the main house by a hedge and gravel path.",
  "service-adu": "Cedar ADU connected to a main house by an open wood breezeway, with a garden between them.",
  "pool-house":
    "Wood pool house beside a still rectangular pool at dusk, with warm light inside and lounge chairs along the water.",
  "interior-living":
    "Small ADU interior with white shaker cabinets, a wood counter, subway tile, and a living area in warm afternoon light.",
  materials:
    "Material samples arranged on stone: cedar siding, a roof shingle, subway tile, butcher block, and a metal pull.",
  "craft-detail": "Close view of cedar board-and-batten siding meeting a black window frame.",
  "story-rental": "Backyard tiny home lit at night, with a bicycle by the porch and warm windows.",
  "story-parents":
    "Morning garden path between a main house and a small cedar cottage, with two coffee mugs on the porch rail.",
  "story-friends": "Twilight dinner table set under string lights, with a glowing cedar ADU behind it.",
  "story-child": "Night view into a compact studio with a made bed, a desk lamp, and a small plant.",
};

// `key` is a built-in image key, or any site path / URL (e.g. "/images/my-photo.jpg").
export const img = (key, alt) => {
  key = String(key || "hero");
  if (A[key]) return { src: `/images/${key === "hero" ? "hero-backyard" : key}.jpg`, alt: alt || A[key] };
  return { src: /^(\/|https?:)/.test(key) ? key : `/images/${key}`, alt: alt || "" };
};
export const imageKeys = Object.keys(A);

// Existing photography is labeled on the site as design studies.
export const projects = [
  { slug: "backyard-cottage", title: "Cedar backyard cottage", type: "ADU", image: "hero", note: "Detached cottage with French doors and a stone path to the main house." },
  { slug: "studio-cottage", title: "Studio cottage with deck", type: "Tiny home", image: "model-studio", note: "Board-and-batten studio with a small deck." },
  { slug: "one-bedroom-cottage", title: "One-bedroom cottage", type: "ADU", image: "model-one-bed", note: "Covered porch, lap siding and a shingle roof." },
  { slug: "two-bedroom-farmhouse", title: "Two-bedroom farmhouse ADU", type: "ADU", image: "model-two-bed", note: "Two bedrooms with a dining terrace." },
  { slug: "detached-tiny-home", title: "Detached tiny home", type: "Tiny home", image: "service-tiny", note: "Private home at the back of the yard." },
  { slug: "breezeway-adu", title: "ADU with breezeway", type: "ADU", image: "service-adu", note: "Attached to the main house by an open wood breezeway." },
  { slug: "pool-house", title: "Wood pool house", type: "Pool house", image: "pool-house", note: "Changing room and lounge beside the pool." },
  { slug: "kitchen-interior", title: "Kitchen and living interior", type: "Interior", image: "interior-living", note: "Shaker cabinets, butcher block and subway tile." },
];

// Built from the live lists, so edits in the admin flow into the menu.
export const getNav = () => [
  {
    label: "Models",
    href: "/models/",
    children: [...models.map((m) => [m.name, `/models/${m.slug}/`]), ["Compare models", "/models/#compare"]],
  },
  {
    label: "Services",
    href: "/services/",
    children: services.map((s) => [s.name, `/services/${s.slug}/`]),
  },
  {
    label: "Locations",
    href: "/locations/",
    children: markets.map((m) => [m.name, `/locations/${m.slug}/`]),
  },
  { label: "Projects", href: "/projects/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "Financing", href: "/financing/" },
  {
    label: "More",
    children: [
      ["Process", "/process/"],
      ["About", "/about/"],
      ["Reviews", "/reviews/"],
      ["Resources", "/resources/"],
      ["Free tools", "/tools/"],
      ["FAQ", "/faq/"],
      ["Contact", "/contact/"],
    ],
  },
];
