# KAN-141 — /pricing web (402 / 360 / 768)

Referencia: frames aprobados de KAN-140 (dirección F), `docs/design/prompts/kan-140/evidence/` del workspace.
Las hojas `web-cmp-*` muestran el frame aprobado a la izquierda y la implementación a la derecha, al mismo ancho lógico.
El frame incluye la barra de estado de 51 px de presentación, excluida de web.

| Captura | Estado |
| --- | --- |
| web-cmp-402-free / web-cmp-360-free / web-cmp-768-free | FREE en foco por ancho |
| web-cmp-402-elite | ELITE en foco tras activar el segmento |
| web-768-seg-PRO / web-768-seg-ELITE | Tablet: PRO y ELITE comparten el offset final; el segmento elegido se conserva |
| web-402-loading | Cargando: skeletons, segmentos y CTA deshabilitados |
| web-402-error | Error de catálogo con Reintentar |
| web-402-empty | Catálogo vacío con Reintentar |
| web-402-incomplete / web-360-incomplete | ELITE ausente: Sin datos y CTA deshabilitado solo en ELITE |
| web-402-price | Precio disponible formateado desde el catálogo (datos de prueba, no comerciales) |
| web-402-menu | Menú público abierto (Inicio / Planes / Iniciar sesión, sin FAQ) |

`web-results.json` lista los recorridos automatizados (teclado, swipe/snap, menú, reintento sin duplicados, destinos).
Los datos de catálogo son un mock local de `GET /plans` con la forma de `padelcheck-service/docs/plans-catalog-api.md`.

Adaptaciones: iconos de límites dibujados como SVG lineales equivalentes (sin acceso a Figma MCP en esta entrega);
la línea de acento y los marcadores del footer usan los tokens del frame. Sin pruebas con lector de pantalla real.
