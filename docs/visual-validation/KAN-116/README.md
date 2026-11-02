# KAN-116 — web mobile verification

02/11/2026. Reference: KAN-115 handoff including mandatory Sexo, Figma file
`6ChpVD5gKDoC3kRXoGdVdK`, base `2114:9463`, form `2125:8665`, pending
`2125:9752`, verified `2125:10459`, active `2125:10759` and error states.

Chrome at 402×789 CSS px, scale 1: this is the 402×874 design after excluding
the illustrative 51/34 px system areas. Browser/system insets are real; no
illustrative status or home bar is drawn. Reviewed typography, original logo,
court, exact exported icons, 56 px fields, 8 px radii, 12/16 px gaps, colors,
scroll, 48 px actions and 32 px bottom content padding. Inter is bundled locally
using the same licensed assets as native. No screenshot is used as UI content.

`web-results.json` records the real local API + PostgreSQL + SMTP receiver flow:
login entry, mandatory Sexo, catalog, resend/replaced link, verification,
activation and login. Password/proof are not persisted. Catalog 503 recovery
preserves other inputs. CTA/overflow checked at widths 360, 390, 402, 767, 768,
1024; desktop design remains owned by KAN-194/195.

Additional captures verify send/resend/activation errors and recovery. For those
three UI error cases only, Playwright injects 503 responses; successful retries
use the real API. Busy controls show a centered spinner, remain stable and block
repeat activation. Native verification is documented in the mobile repository.

Checks: production build with explicit API base; changed auth files pass ESLint;
HTTP/session suites pass. Full lint has a pre-existing unused `_props` error in
`src/features/app/events/components/CategoryEnrollFab.tsx` plus existing Fast
Refresh warnings. No unrelated source fix was included.

Remaining acceptance: iOS runtime and standalone native verification-link opening
are not proven by web evidence. Google Workspace accepted a real send and resend
to the user-authorized personal test mailbox. On 02/11/2026 the recipient confirmed
both messages arrived in the inbox. SMTP credentials remain only in local/runtime
configuration.

The recipient also opened the real mailbox link and confirmed the screen shows
**Email verificado** and the separate **Completar registro** action. The recipient
then pressed completion, reported that the in-progress state looked correct
(not captured), and supplied a screen showing **Tu cuenta está lista / Registro
completado**. This confirms real-mail verification and activation in the local web
test; it does not certify native standalone handling. Only textual confirmation
is published. This SMTP test account used a discarded random password. Since it
is now active, a new registration with the same email will conflict; manual login
with this particular account remains unverified. The earlier automated real-login
checks used separate synthetic accounts with known test passwords.

After catchAll was enabled locally, the user confirmed a separate complete
manual web journey using a new arbitrary account email and a personally chosen
password: registration, delivery to the configured test inbox, email verification,
activation, login with the arbitrary account email/password, and arrival at
**Eventos** in the player portal. This validates the manual login and catchAll
flow for that new account; it does not change the iOS/standalone-native pending
checks. No user screenshot, email identity or password is published here.
