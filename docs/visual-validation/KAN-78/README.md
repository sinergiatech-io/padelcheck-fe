# KAN-78 — divisiones del evento (wizard pasos 4–6 + hub «Categorías»)

Verificado el 26/11/2026 contra la **API real**: `padelcheck-service` en la rama del PR #34
(`KAN-78-divisiones`) corriendo como jar con perfil `local` y PostgreSQL local descartable, más
el dev server de este repo (`VITE_API_BASE_URL=http://localhost:8178/api`). Chromium headless
(Playwright 1.49), 402×874 CSS px, `es-AR`, zona America/Argentina/Buenos_Aires.

Datos: `e2e/seed.sql` crea un club FREE (límite `MAX_DIVISIONS_PER_EVENT = 2`, catálogo 1ra..8va
de V13) con un CLUB_ADMIN y un CLUB_STAFF de prueba, una sede con dos canchas. Solo local; la
contraseña es un fixture local y el hash es bcrypt.

## Journeys (todos pasan)

| Script | Qué verifica |
|---|---|
| `e2e/admin.mjs` | 1→6 con Simple 6ta+7ma; lote Simple de 3 rechazado entero (FREE, «Podés agregar 2 categorías más», «Ver plan»); OPEN, Suma inválida (2–16), Combinado incompleto; cupo 0/-1/2.5 inválido y suplentes sin default; atrás/adelante conserva datos y no duplica; **respuesta perdida** (el server responde 201, el browser recibe error de red) → banner de error con datos intactos → reintento con la misma Idempotency-Key → `200` replay y **1 solo evento / 2 divisiones en la DB**; spinner `aria-busy` + «Creando evento» y doble clic ignorado; éxito → «Ver evento» reemplaza el historial; hub con 2 categorías, límite admin con «Ver plan» → `/club/plan`. |
| `e2e/staff.mjs` | Staff: Suma 13 Damas, quitar la única división bloquea «Crear evento»; hub: agregar Combinado; al límite, explicación sin compra ni «Ver plan» y «Agregar categoría» deshabilitado; editar (error de red conserva datos → reintento con «Guardando división» → «Cambios guardados»); cancelar (confirmación, error, «Cancelando categoría», historial «Canceladas», las demás no cambian y se libera cupo); carga y error + Reintentar del hub (no se muestra como vacío); evento fuera de DRAFT: sin editar/cancelar, «Consultar» con suplentes fijos. |
| `e2e/limits.mjs` | Límite desactualizado en el cliente → `403 PLAN_DIVISION_LIMIT_EXCEEDED` real del server muestra el banner y conserva datos; otro `403` muestra el error genérico y nunca el banner de plan; `prefers-reduced-motion` sin animación y sin cambio de alto del botón; regresión 767/768/1024. |
| `e2e/extra.mjs` | Hub vacío en DRAFT con historial y acción de agregar; catálogo cargando / error + Reintentar. |

## Comparación con Figma (402 px, archivo `6ChpVD5gKDoC3kRXoGdVdK`)

Referencias en `figma/` (nombre = node id), capturas runtime en `web/`. La referencia mide
402×874 con barra de sistema ilustrativa de 51 px que la web no dibuja; el contenido arranca 51 px
más arriba. Las capturas «full» agrandan el viewport para mostrar todo el scroll.

| Estado | Figma | Web |
|---|---|---|
| Paso 4 Simple multi | `3090-33561` | `01` |
| Límite lote paso 4 (KAN-149) | `2309-9274` | `02` |
| OPEN / Suma inválida / Combinado incompleto | `3088-32374` / `3088-32497` / `3088-32245` | `03` / `04` / `05` |
| Paso 5 elegir / inválido / sin / con suplentes | `3088-32612` / `3088-32948` / `3088-32836` / `3088-32724` | `06` / `07` / `08` / `21` |
| Paso 6 multi / una / bloqueado | `3088-33626` / `3088-33532` / `3088-33878` | `09` / `22` / `23` |
| Creando / error | `3088-33952` / `3088-34054` | `11` / `10` |
| Éxito | `3090-33794` | `12` |
| Hub multi / una / límite | `3089-32762` / `3089-33033` / `2309-9285` | `13`, `26` / `24` / `13`, `26` |
| Editar configuración / cupo / error | `3090-33678` / `3088-33060` / `3088-33410` | `28` / `30` / `29` |
| Guardado / cancelar / error / cancelando / cancelada | `3089-33758` / `3089-33014` / `3089-34246` / `3089-34272` / `3089-33962` | `31` / `32` / `33` / `34` / `35` |
| Hub vacío / cargando / error | `3089-33229` / `3089-33404` / `3089-33580` | `42` / `36` / `37` |
| Suplentes fijos | `3094-33750` | `39` |
| Catálogo cargando / error | `3089-34298` / `3089-34383` | `43` / `44` |

Inspeccionado: tipografía Inter (12/14/16/20 px, pesos), segmentados de 48 px y radios 8 px,
grilla 3×3 8va→1ra + OPEN, tarjeta con trofeo, filas «Cupo máximo / Tipo / Suplentes», banners
(info, loading, error, success, blocked) con sus íconos exportados, botones de 48 px, colores
`#c9cf38`, `#f8f8e9`, `#605e64`, `#120f18`.

Diferencias intencionales / notas:
- La cabecera y la tarjeta del evento del hub son las de KAN-76 (ya en `development`); el frame de
  KAN-77 con banner de imagen y «Abrir inscripción» no es parte de este alcance.
- Vocabulario del hub: «categoría/categorías» (KAN-254) en lugar de «división/Nueva división» de los
  frames KAN-149; el wizard mantiene «división» como en KAN-77.
- `12-success`: «Ver evento» se ve en estado hover porque el puntero quedó sobre el botón tras el clic
  en «Crear evento»; el título envuelve porque el nombre de prueba es más largo.
- El subtítulo del resumen de Suma/Combinado sigue el patrón de Simple («Suma 14 · Damas»,
  «Combinado · Mixto 6ta + 7ma»).
- Desde 768 px solo es regresión (`50-hub-*`, `51-edit-*`, `52-step4-*`): columna centrada sin roturas.

## Reproducir

1. Service: `mvn -DskipTests package` en la rama del PR #34 y
   `java -jar target/padelcheck-service-0.1.0-SNAPSHOT.jar --spring.profiles.active=local --server.port=8178 --spring.datasource.url=<postgres local> --app.cors.allowed-origin-patterns=http://127.0.0.1:5178 --app.google.enabled=false`;
   aplicar `e2e/seed.sql`.
2. FE: `VITE_APP_ENV=local VITE_API_BASE_URL=http://localhost:8178/api npx vite --port 5178`.
3. `node e2e/admin.mjs && node e2e/staff.mjs && node e2e/limits.mjs && node e2e/extra.mjs`
   (ajustar `SHOTS` y la conexión en `e2e/lib.mjs`).
