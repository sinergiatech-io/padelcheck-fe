# KAN-234 — verificación web mobile

Verificado el 01/11/2026 sobre build de producción local, Chrome headless. Referencia: [handoff KAN-233](https://sinergiatech.atlassian.net/browse/KAN-233), incluido el ajuste aprobado de acciones al pie. Alcance: [KAN-234](https://sinergiatech.atlassian.net/browse/KAN-234); aceptación conjunta: [KAN-232](https://sinergiatech.atlassian.net/browse/KAN-232).

## Referencia y capturas

Comparación lado a lado con los frames vigentes consultados mediante MCP: marca `3151:18432`, técnica `3158:18441`, repetición `3158:18490`, reintento `3158:18541`, sesión `3158:18591` y sin JavaScript `3158:18633`. PNG originales, sin estirar ejes. La captura 402×789 corresponde al contenido de un frame 402×874 excluyendo las ilustraciones superior 51/inferior 34. La compacta 360×635 aplica la misma exclusión al frame 360×720.

- [Marca 141×139](brand-402.png), [recuperación técnica](technical-402.png), [foco de teclado](technical-keyboard-402.png).
- [Fallo repetido](repeated-402.png), [compacta](repeated-360.png), [reintentando](retrying-402.png).
- [Sesión no verificable](session-unverified-402.png), [recursos degradados](degraded-402.png), [JavaScript deshabilitado](no-javascript-402.png).
- [Texto ampliado al 200%](repeated-text-200.png), [contenido superior desplazado](repeated-text-200-scrolled.png). El footer permanece fuera de esa región desplazable.
- [Login](login-402.png), [pública](public-402.png), [jugador](player-402.png), [club](club-402.png), [continuación](continuation-402.png). Se reutilizan los destinos actuales; estas capturas no acreditan el dashboard futuro.

Revisados logo/alpha, proporciones, fondo, icono exacto del diseño, banners, radios, tipografía, espaciado, controles de 48 px y footer con inset real +24 px. Inter se sirve desde una caché de QA de la misma fuente de Google Fonts porque el navegador de pruebas no accede a esa red. No se añade una fuente nueva al producto. Sin JS o con fuentes fallidas se usa el sistema: el ajuste de líneas puede variar, conforme al fallback aprobado. No se dibujan las barras ilustrativas. La captura de reintento cancela únicamente la confirmación de recarga del navegador de QA para poder observar ese estado transitorio.

## Comprobaciones

- `npm run build`: pasa; avisos existentes de tamaño de bundle/Browserslist.
- `npm run test:session`: 11 pruebas pasan. `npm run test:startup`: 9 pruebas pasan, sin dependencia nueva.
- `scripts/verify-startup.cjs`: resultados en [results.json](results.json); bundle demorado/fallido, watchdog, logo/fuentes fallidos, sin JS, sesión ausente/válida/vencida/401/503/offline/timeout, almacenamiento fallido, reintento y salida; query/hash, destinos, navegación, foreground y cortes 360/402/767/768/1024. Incluye descarga lenta de 6 s seguida del plazo completo de sesión de 10 s.
- Teclado: foco en título, Tab hacia la primaria, foco visible y acciones alcanzables. [Árbol accesible de recuperación](recovery-accessibility.txt), nombres y busy/disabled comprobados. Brillo de 700 ms, una sola pasada con máscara alpha; reduced-motion estático. No se acredita escucha manual con Narrator/VoiceOver ni Safari físico.
- Lint del diff: 0 errores, warning de Fast Refresh ya existente en AuthContext. `npm run lint` completo conserva el error previo `_props` en `src/features/app/events/components/CategoryEnrollFab.tsx:14` y cinco warnings. Se reprodujo idéntico sobre `origin/development` limpio.
- Guard lite y revisión del diff: sin Critical. Sin endpoints, permisos, persistencia de credenciales nueva ni cambios de transporte. `/auth/me`, su plazo y generación de intentos se conservan; el error de almacenamiento no concede acceso y la salida es explícita. No se incluyeron cambios ajenos.

[Medición comparativa](performance.json): cinco contextos nuevos alternados por revisión, /login sin sesión, bundle demorado 500 ms y mismas condiciones de fuentes. Medianas: primera pintura de contenido 584 → 32 ms (marca); formulario montado 563,9 → 565,8 ms. Es una medición local y el montaje se registra antes de la siguiente pintura, no un benchmark de producción ni evidencia de mejora en el tiempo de login.

## Reproducción

Construir con `VITE_API_BASE_URL` explícita y servir con `npm run preview -- --host 127.0.0.1 --port 4174`. Playwright es tooling opcional externo: suministrarlo vía `NODE_PATH` o instalación local sin guardar dependencias. Definir `CHROME_PATH` si se usa Chrome instalado. Ejecutar `node scripts/verify-startup.cjs`; para Inter en una red restringida, `STARTUP_FONT_DIR` apunta a una caché QA con `Inter-400.ttf`, `Inter-500.ttf`, `Inter-600.ttf` e `Inter-700.ttf` de Google Fonts. Sin esa opción usa la fuente/fallback normal del navegador.

Para comparar, construir `origin/development` por separado y servirlo en 4175; ejecutar `node scripts/measure-startup.cjs`. Las URLs son configurables con `STARTUP_BASE_URL` y `STARTUP_BASELINE_URL`. Los datos y credenciales de prueba son sintéticos.

La spec canónica del workspace `docs/functional-spec/02-funcionalidades/acceso-a-plataforma.md` incorpora el contrato transversal. Esa raíz no es un repositorio Git; su edición queda en el workspace. Las adaptaciones y evidencia release Android/iOS siguen en KAN-235, actualmente por hacer. KAN-232 permanece pendiente de aceptación conjunta; esta PR no implica merge, deploy ni publicación.
