# Mobile button loading

Approved scope: web viewports below 768 CSS px. Desktop keeps its existing progress labels and presentation. Native Android/iOS has a separate PR in padelcheck-mobile.

During a pending action, show only a centered 20px spinner (2px arc, 800ms linear rotation). Preserve the button geometry and existing background/radius. The label remains available to assistive technology through aria-label and aria-busy; reduced motion keeps the arc static. Validation/permission disabled states do not imply loading.

Login and new/edit enrollment use the shared ButtonLoadingContent inside their existing buttons to preserve their styles. The shared Button also supports opt-in loading, with mobile-only presentation by default. Enrollment handlers use an immediate ref lock as well as disabled state to prevent duplicate submissions.

## References

- Jira: [KAN-126](https://sinergiatech.atlassian.net/browse/KAN-126), [KAN-53](https://sinergiatech.atlassian.net/browse/KAN-53). This change does not close all acceptance criteria of either ticket.
- Figma [Button Loading](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-51741), [login](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=1815-6549), [new enrollment](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-51975), [edit enrollment](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=3140-52030).
- Workspace design contract: docs/design/button-loading.md. Future club/event/access forms adopt the pattern when implemented; this PR does not implement those screens.

## Verification — 2026-10-30

Chrome headless, DPR1, height874 CSS px. Real /login with a controlled fake 401 response: 360/390/402/767/768/1024 widths. Checked spinner/text visibility, exact dimensions, disabled/busy/name, duplicate activation, reduced motion and error restoration. [Results](login-results.json), [mobile](login-mobile.png), [desktop](login-desktop.png).

Real enrollment component/provider mounted through Vite with the existing mock service and a deferred promise only in the test harness. Both create/edit at 402px and 1024px: stable size, correct responsive content, one submission and successful closure. [Results](enrollment-results.json), [mobile capture](enrollment-mobile.png). This does not verify backend integration.

Build passes with VITE_API_BASE_URL=http://localhost:8080/api supplied for validation only. test:session passes (10 tests). ESLint on changed files passes with the existing react-refresh export warning in Button; global lint has the existing unused _props error in CategoryEnrollFab.tsx. Guard lite: pass, no new secrets, dependencies, endpoints, session storage or authorization changes.
