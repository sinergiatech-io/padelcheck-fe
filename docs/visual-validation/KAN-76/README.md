# KAN-76 · Validación web

El flujo se recorrió en Chromium a 402 CSS px contra Spring Boot y PostgreSQL locales con datos de prueba. Incluyó búsqueda, creación hasta el paso 3, regreso con selecciones conservadas, edición de borrador, calendario Personalizado y cancelación con reintento ante un error. El botón Guardar se comprobó a 767, 768 y 1024 CSS px durante una respuesta demorada.

- Wizard de KAN-79. [Personalizado](web/03-wizard-personalizado.png) y [sedes y canchas](web/04-wizard-sedes.png).
- Hub según KAN-254. [Borrador](web/05-hub-borrador.png), [menú de acciones](web/06-hub-acciones.png) y [confirmación](web/08-hub-confirmacion.png). La comparación usa los frames [3439:41828](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3439-41828), [3441:43134](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3441-43134) y [3441:44142](https://www.figma.com/design/6ChpVD5gKDoC3kRXoGdVdK/?node-id=3441-44142). Las capturas web empiezan debajo de la barra del sistema nativa del diseño.
- Guardado. [767 px](web/10-guardado-767.png) y [768 px](web/10-guardado-768.png). La altura se mantiene en ambos tamaños. Web mobile reemplaza la etiqueta visible por el spinner durante la solicitud.

Las categorías y la confirmación del alta pertenecen a [KAN-78](https://sinergiatech.atlassian.net/browse/KAN-78). [KAN-255](https://sinergiatech.atlassian.net/browse/KAN-255) conserva las acciones y variantes del hub que dependen de categorías, inscripción, generación y publicación.
