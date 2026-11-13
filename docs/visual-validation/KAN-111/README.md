# KAN-111 — web verification, 12 November 2026

Verified with Edge/Playwright at 402×823 CSS px, equivalent to the 402×874 Figma
screens excluding their illustrative 51 px system bar. Compact checks use 360×720;
loading regression also covers 767, 768 and 1280 px. Fonts, SVG geometry, card/form
spacing, scroll, footer controls and representative dialogs were compared with
the current KAN-104/Argentina handoffs.

References: list `659:3817`, detail `2381:23759`, new court `2382:23085`, location
form `3260:36516`, last venue `2382:24413` in Figma file
`6ChpVD5gKDoC3kRXoGdVdK`. The scoped Mi Club entry is `3306:38161`; the FE-first
map states are `3309:38234`, `3309:38260`, `3309:38287`, `3309:38311`.
The map adapts to an accessible browser dialog; its cartography and SDK controls
vary with the selected locality and provider. Country is fixed to Argentina.

## Real services and exercised behavior

The branch ran on Vite 5191 against the actual Spring API on loopback 18086 and
PostgreSQL schema `kan111_qa`. Authentication used a synthetic administrator and
club; no demo environment or production data was changed. Successful requests
were not fulfilled with mocks. OpenStreetMap tiles were fetched from the real
provider; the map never requests administrator GPS.

- Login → Mi Club → venues, and return paths. Only Sedes y canchas and Reglas de
  categorías have Mi Club links; future entries retain their owning tickets.
- Create venue and court through the actual forms, then inspect persisted detail.
  The initial club location is prefilled without becoming an exact venue point.
- Search/select Buenos Aires → CABA → Buenos Aires/Tandil. Changing province clears
  locality and restores its placeholder; IDs come from the real catalogue.
- Deactivate/reactivate venue; its court remains individually active and becomes
  unusable while its parent is inactive. Last usable venue warning is separately
  captured after other synthetic venues were deactivated through the API.
- Edit/cancel/discard: leaving a dirty form confirms discard, and saved values
  remain unchanged. A failed save preserves the draft; retry persists through
  the real API.
- Mark and explicitly confirm a map point. API/PG confirm `ADMIN_CONFIRMED`.
  Changing address and saving clears coordinates to `LOCALITY_ONLY`.
- Catalogue/list failures offer retry. The provider failure has a finite timeout,
  disables confirmation and permits cancel; retry displays the remembered marker.
- Loading at 402/767 hides text/icons while retaining button size and opacity;
  at 768/1280 the existing desktop text behavior remains. Busy disables repeats.
  See `loading-results.json` and `web-saving-*.png`.

Failures were introduced by aborting selected browser requests; successful retries
used the real API/provider. These fixtures prove recovery behavior, not a live
outage. PostgreSQL and authorization/lifecycle cases are verified separately by
the backend suite (8 unit + 5 PostgreSQL tests).

## Corrections found by verification

The club route guard originally redirected the new routes to the dashboard;
it now admits only the intended club settings area while player contexts remain
excluded. Shared state cancels stale catalogue/tenant reads and refreshes predating
a write. Exact point provenance never falls back to zero coordinates or a locality
centroid. Map retry restores its visible selected marker. A refresh error retains
already loaded data rather than hiding it.

Checks: 11 venue-model tests, 11 session/access checks, TypeScript, focused ESLint
and production Vite build pass. The build used an explicit QA API URL; generated
build output and compiler metadata are not part of the change. Existing build
warnings about bundle size/Browserslist are informational.

Guard lite: pass, no Critical findings. Routes require the existing authenticated
club context and server permission; no token persistence/logging pattern changed.
Leaflet uses the pinned package and visible OSM attribution, with standard caching,
no bulk prefetch, no API key and a manual fallback when tiles are unavailable.

Android has independent evidence in the mobile PR. iOS runtime is expressly
excluded by the user's resource decision; this web evidence does not claim it.
No merge or deploy is performed by this report.
# Initial list loading — 13 November 2026

User decision: show an animated spinner in the disabled initial-list CTA, without visible loading text or plus. This supersedes the older “Cargando…” label in the Figma/Jira initial-loading reference. Reused Button loading with a localized accessible name and busy state; three solid 158px gray skeletons retain the reference geometry. Applies to this initial-list CTA at every web width; existing save-button viewport rules remain unchanged.

Real Edge/API verification at 402×823: three skeletons, disabled/busy CTA, hidden label, no plus, spinner rotation changes between frames, and Nueva sede restored after the real API resolves. Screenshot: [web-initial-loading.png](web-initial-loading.png). TypeScript and focused ESLint pass. This presentation change does not affect the previously verified CRUD, lifecycle, location or refresh flows.
