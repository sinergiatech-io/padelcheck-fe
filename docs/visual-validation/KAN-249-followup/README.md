# KAN-249 — final web verification, 12/11/2026

Verified the integrated registration form against the approved Figma frame
`3290:23621` in file `6ChpVD5gKDoC3kRXoGdVdK`. The form keeps País, Provincia and
Localidad after Categoría; Argentina is fixed, and the dependent fields use the
same selector pattern as Sexo. There are no method buttons or extra location banner.

## Real local services

Microsoft Edge was controlled through Playwright against Vite on port 5189 and
the real Spring API on port 8080. The API used an isolated, freshly migrated
PostgreSQL schema and a loopback SMTP receiver. No catalog, resolver or successful
registration response was fulfilled or replaced by the browser test.

Device coordinates and browser permission states were controlled fixtures, not a
claim about a physical GPS or a manually operated system permission dialog.
The automatic Tandil case did call the real API and official GeoRef reverse
service, which returned RESOLVED; an outside-Argentina coordinate returned
OUTSIDE_COVERAGE. Both used the deployed code path of the local API.

Manual CABA and automatic Tandil accounts completed start (201), actual local
email delivery, verify-email (200) and activation (201). Database checks by the
backend verifier confirmed AR-CABA / LOCALITY_REPRESENTATIVE for the manual
account and 06791050 / DEVICE_REPORTED for the automatic account. Manual changes
after automatic detection sent no device coordinates.

Two explicit browser network failures covered province-catalog retry and start
retry. These requests were aborted to exercise UI errors; their successful
retries used the real API. The catalog returned 24 provinces and 889 Buenos Aires
localities. Failed requests preserved the draft. The initial API-unavailable
capture was also taken before the local API was started.

## Dependent-selector defect corrected

Selecting Buenos Aires/Tandil, then changing province to CABA, cleared the model
but left the Radix locality trigger blank instead of showing its placeholder.
The two selectors now stay controlled with an empty string for an absent value.
The same browser sequence now shows `Seleccioná una localidad`, requires a new
selection, and submits the newly selected locality without old coordinates.

See `web-province-change-before-fix.png` and
`web-province-change-fixed.png`. The correction changes no layout, assets,
API contract, permissions or validation rules.

## Visual and behavioral evidence

`results.json` records 13 browser checks. At 402×789 CSS pixels the web matches the
402×874 design after omitting its illustrative 51/34-pixel system areas, following
the established KAN-116 comparison. The loaded local logo/court/icons, Inter,
20px title, 56px controls, 370px field width, colors, spacing, border/radius and
field order were reviewed. `figma-approved.png` is reference evidence only and is
not used as application UI.

`web-approved-top-402.png` and `web-approved-location-402.png` show the final
form. `web-manual-compact-360-720.png` verifies no horizontal overflow, 328px
fields and a CTA reachable by scrolling at 360×720. Other captures cover
required-locality validation, catalog and start recovery, outside-Argentina
fallback, pending email, verification and active-account screens.

Checks after the correction: 11 location unit tests, TypeScript no-emit build and
ESLint on the changed component all passed. Guard: pass; this diff introduces no
API, authentication, tenant, secret or logging changes.

Android belongs to the separately delegated verification. iOS runtime is excluded
by the user's agreement because no Mac/resources are available. Neither is
credited by these web results. Temporary SMTP proof files were consumed privately
and removed; no proof/token URL is in these artifacts. Local browser and Vite were
stopped after verification. No merge or deploy was performed.
