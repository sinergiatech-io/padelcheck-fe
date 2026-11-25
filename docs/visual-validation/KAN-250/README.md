# KAN-250 · Verificación web

El 25/11/2026 se probó Chromium a 402 × 874 con Vite, la API local y PostgreSQL. El aviso se comparó con el [frame de Figma](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/Padel-check?node-id=2334-10494) en estado PRO activo.

- [Factura pendiente](web-pending-final.png). Coinciden el texto, el reloj, la tipografía, los colores y la posición debajo del plan. La web conserva la navegación de Mi Club y la fecha del período. El club de prueba tiene cero torneos.
- [Backoffice](web-owner-final.png). Se simuló un fallo HTTP al guardar. El motivo quedó en el formulario, el reintento registró la factura como emitida y el motivo apareció en el historial.
- [Factura emitida](web-issued-final.png). Al recargar, el aviso desapareció y el plan siguió activo. También se simuló un fallo de lectura y se recuperó con Reintentar.
- [Pago histórico](web-absent-final.png). El pago sin estado fiscal conservó el plan activo sin mostrar el aviso.
