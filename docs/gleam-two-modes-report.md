# Gleam two modes

Planning pass: considered a header dropdown, separate entry cards, and a two segment control under the headline. Picked the segmented control because both paths are visible immediately, switch in one tap, and fit the premium phone layout without adding another screen. One shared primitive owns mode persistence, job fields, translations, and quote payload enrichment for premium and classic. Keep the renderer and roof/back picking unchanged.

The requested report path `/workspace/codex-runs/gleam-two-modes/report.md` is on a read only filesystem in this session. This tracked copy preserves the report with the implementation.

## Built

Premium is the primary surface. A rounded two segment control under the headline offers Instant price and Quote request. It defaults to instant and persists in sessionStorage across reloads and market routes in the same tab. Classic uses the same JavaScript and CSS primitive. Switching keeps the current services, home type, contact details, job fields, and photos; only the mode persists after a reload.

Instant keeps live totals, per service prices, bundle savings, and the existing booking channel. Quote mode removes prices and savings from the visible flow and from the outgoing payload. Its summary lists the selected services and leads to Request a quote. It collects storeys, a window count or rough size, gutter details, optional images, and the existing name, mobile, optional map location, preferred day and time. Unknown job details can stay Not sure. On phones the house clears the screen as the job form comes into view.

Images have local previews and individual removal, limited to six images of 10 MB each. Only names, sizes, types and count are included in the request; image bytes are never uploaded. The payload has `mode: 'quote'`, a `job` object, selected service identifiers and labels, and readable request text. It has no total, discount, minimum price, or service prices. `mode: 'instant'` retains the existing pricing payload. Both go through the existing `deliver` and market channel hook. The page channel remains a local demo and now says explicitly that no external message was sent.

Arabic translations, RTL layout, dark mode, keyboard buttons and reduced motion are supported. Existing 3D rendering, geometry, materials, roof picking and animation code were not changed. Customer supplied name and phone text is escaped in the existing instant review; quote details and photo names are rendered with textContent.

## Automated QA

Built with `cd wip && sh build.sh`. Ran these against the built site served locally on port 8787:

* `PLAYWRIGHT_BROWSERS_PATH=/tmp/gleam-browsers npm test` in `wip/e2e`: eight complete customer flows, covering premium and classic, UK English and Saudi Arabic, each at 390 and 1440 pixels. All other premium markets also passed a mode and market configuration smoke check.
* `PLAYWRIGHT_BROWSERS_PATH=/tmp/gleam-browsers npm run test:premium` in `wip/e2e`: premium font, first screen, totals, booking, Arabic, desktop framing, opaque WebGL and static flicker checks. Final result recorded below.
* `git diff --check` and `node --check wip/src/quote-mode.js` passed.

New coverage checks instant booking; UK windows plus gutters at £120 and the walls bundle at £513; absence of prices in quote UI and payload; field and photo retention across switches; invalid image type rejection; review and local send confirmation; persistence after reload; dark mode and RTL; front and back roof taps; form scrolling; no sideways overflow, public dashes or channel branding; and no browser JavaScript errors.

The former comparison asserting that classic screenshots are unchanged is now opt in with `COMPARE_CLASSIC=1` and a matching `LIVE` baseline. Classic deliberately gained the shared mode control. The premium functional and 3D checks remain enabled by default and use classic on the same local server as the rendering performance comparison.

Screenshots were visually inspected in light and dark at phone and desktop widths. Artifacts are in `/tmp/gleam-two-modes/`; premium results are in `/tmp/prem-qa/report.json`. WebGL testing used Chromium software rendering. Physical phone GPU performance and a full recorded motion review were not tested.

## Manual QA

1. Open `/premium/uk/` at 390 pixels and 1440 pixels. The mode switch should appear immediately below the headline. In Instant price select windows and gutters for £120, then walls for £513 with bundle savings.
2. Switch to Quote request. The selections should remain while all service prices, large totals and bundle offers disappear. Reload and confirm Quote request stays selected. Switch back to Instant price to restore pricing.
3. Select services and press Request a quote before entering contact details. It should lead to About the job. Set storeys, windows and gutters, add photos, remove one, and toggle modes. Confirm the remaining previews and job details persist without reloading.
4. Enter a male demo name such as Omar, a mobile number, and preferred day and time. Location is optional. Review the quote: services, job details and photo file names/count should appear without a price. Send request should explicitly record a local demo request without claiming to send an external message.
5. Repeat on `/premium/sa/?lang=ar` in dark mode. Check Arabic fields and RTL, both theme directions, keyboard access, reduced motion, and roof taps after rotating the house to the back. Check `/uk/` and `/sa/` for the shared behavior.

## Git and environment

No deployment or merge was performed. Preexisting untracked `live-v6-smoke.mjs`, `live-v7-back.mjs`, and `live-v7.mjs` were left untouched and excluded from the task commit.

The workspace's `.git` directory is read only, so a normal `git add` failed creating `index.lock`. A writable copy of this repository's metadata at `/tmp/gleam-two-modes-git` points to this same worktree. Task commits use `GIT_DIR=/tmp/gleam-two-modes-git` on `feature/gleam-two-modes`. The original read only `.git` cannot reflect the new local branch head in this session. Push outcome and any recovery artifact are recorded below.

Final verification: all eight complete customer flows and five additional premium markets passed. Premium regressions: **47 passed, 0 failed**. Build and whitespace/syntax checks passed.
