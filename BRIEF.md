# Gleam exterior cleaning quote: brief

## What this is
A production version of Claude's demo in `claude-v1/index.html`. Keep its look and its hook: a weathered home that gets cleaned part by part as the customer taps it, a live price bar, and the home pinned on screen while scrolling.

`wip/` holds unfinished work. Copy it and keep building from there. QA has not passed yet and nothing has been deployed.

## Markets
- One static page is served at `/`, `/us/`, `/ca/`, `/uk/`, `/au/`, `/ie/`, `/nz/` and `/sa/`.
- On `/`, the market is guessed from the timezone, then from the browser language.
- `?region=xx` overrides the guess.
- Do NOT add Germany, the Netherlands or Spain. Remove DE, NL and ES from the country list.

## Booking per market
- Use one placeholder number constant, `971500000000`, everywhere.
- US, CA: "Text us" opens `sms:+971500000000?&body=...` with the message pre filled. Do not use asterisks.
- NZ: text, chosen by the previous agent and still to be confirmed. NZ tradespeople mostly work by text and calls.
- UK, IE, AU: "Book on WhatsApp" opens `https://wa.me/971500000000?text=...`.
- SA: WhatsApp, with the message in Arabic.
- The message holds:
  - the name
  - the mobile number with its country code
  - the home type
  - each service with its price
  - the bundle saving or minimum visit
  - the estimate
  - the preferred day and time
  - the location link

## Contact fields
- Name and mobile number only. No address, ZIP or postcode fields.
- The mobile field has a country code picker that defaults to the market: +1, +44, +353, +61, +64, +966. Drop the leading 0 from the local number.
- Location uses real geolocation with an adjustable map pin on OpenStreetMap tiles.
  - Show the "© OpenStreetMap contributors" credit.
  - Booking must still work without a location.

## Home types and prices
- US, CA, AU, NZ: Small, Medium and Large.
- UK and IE: Detached, Semi detached, Terraced and Bungalow. Prices scale by type.
  - IE is in EUR, a bit above the UK.
- SA home types: Small villa, Medium villa, Large villa, Duplex and Apartment.
  - Glass facade: SAR 350 to 2,000, by villa size.
  - Solar: SAR 35 to 45 a panel.
  - Set realistic pressure washing, gutter and roof rates.
- NZ is in NZD and reuses AU.
- Services:
  - windows, with "inside too" as an option
  - solar panel cleaning, with the roof also cleanable
  - gutters
  - roof soft wash
  - walls soft wash
  - driveway (1, 2 or 3 cars)
  - patio and paths
- Bundle: 3 or more services saves 10%. Each market has a minimum visit charge.

## Saudi Arabia
- English is the default, with a clear switch to Arabic. Arabic turns on a full right to left layout and an Arabic WhatsApp message. The choice is remembered (localStorage `gleam.lang`). The same rule applies to any future market with a native language.
- Use natural Gulf or Saudi Arabic, with no dashes.
- Prices are in SAR. Dates use the Gregorian calendar with Western digits.

## Brand
Peak Clean is renamed to **Gleam** everywhere. In Arabic it is **جليم**.

Name check (web, 25 Oct 2026): no big exterior cleaning brand is called just "Gleam".
- Small local firms use the name: Gleam (gleamserves.com, Lakeland FL), Gleam Team (San Antonio and St Paul), and Gleam Clean (Houston).
- The fallback "Glint" is also used by a small local window cleaner in Spokane (glintspokane.com).
- So the name stays Gleam. Adhil should confirm before using it commercially.

## The 3D house
- Build a real 3D home in Three.js, reusing the approach from the saafi-cleaning-estimator repo.
- It turns gently on its own and on drag. It starts weathered:
  - moss and leaves
  - wall streaks
  - a stained driveway
  - dusty windows and panels
- Tapping a part toggles that service. Each clean is animated in 3D with a wash sweep, a glow and particles.
- The shape changes with:
  - the number of floors
  - the UK and IE house types (with neighbours for semi detached and terraced homes)
  - the SA villa sizes (flat roofs with parapets)
- Keep it premium. Keep the price bar and the pinned home.
- Performance:
  - low poly and lazy loaded
  - pixel ratio capped
  - a still fallback (the drawn SVG) if WebGL fails
  - FPS tested on a phone viewport
- `wip/src/house3d.js` is a working start: about 40 to 57 fps in software rendering. The page shows the SVG until it loads.

## Copy rules
- No dashes of any kind in visible text or messages.
- No invented claims, reviews or numbers. No banners.
- If any people appear, they are male. Halal content only.

## QA rules
- Use Playwright as a customer at 360, 390, 1280, 1440 and 1920 for every market. Then do an owner walk.
- Checks:
  - no sideways scroll
  - no dashes
  - the default country code
  - home types and price scaling
  - every service: the 3D wash runs, the grime is cleared, and the price changes
  - the options
  - no address fields
  - the location and OSM credit
  - the button text
  - the exact sms or wa.me link and its message body
  - RTL screenshots for SA at every width, plus the EN toggle
  - root timezone guesses and `?region=`
  - the still fallback
  - phone FPS
- Owner checks: the number appears once in the code, settings are at the top, and the booking channel is set per market.
- `wip/e2e/qa.mjs` covers most of this.

## Hosting
- Cloudflare Pages only, on a new project `exterior-cleaning-quote`, using direct upload.
- Use ONLY the account "Shanifadhil33@gmail.com's Account" (4b20ba6a3ed444eea82c1607d00d7eb7).
- Never touch John.dreyer's account or any other project. Free tier only.
- Deploy only after all QA passes.
- Nothing is sent, posted or paid for without Adhil's OK.
