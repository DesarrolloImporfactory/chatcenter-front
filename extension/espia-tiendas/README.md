# Espía de mercado IMPORCHAT (extensión de Chrome)

Hace dos cosas:

1. **Capa sobre Dropi** (`app.dropi.ec`, `app.dropi.mx`): debajo de cada producto que tengas a la vista en el catálogo pinta las ventas estimadas por IMPORCHAT (24 h / 7 d / 30 d), la tendencia contra la semana anterior, el stock, una mini-gráfica de 14 días y cuántos proveedores venden lo mismo, con enlace al detalle en IMPORCHAT. En la ficha de un producto abre un panel flotante con lo mismo en grande. Es lo que Dropkiller muestra «debajo de cada producto», pero con nuestros datos. Solo lee los ids de producto de la página y los consulta en IMPORCHAT (`POST /espia/productos/lote`, hasta 200 por llamada); no toca la cuenta de Dropi del usuario ni manda nada de ella. Si no hay sesión de IMPORCHAT, lo dice una sola vez y no estorba.
2. **Espía de tiendas** en la Biblioteca de anuncios de Meta (lo que sigue).

Agrupa por producto los anuncios activos de una tienda en la **Biblioteca de anuncios de Meta**, los ordena y filtra, baja todos los anuncios de un producto a una carpeta y manda lo visto a IMPORCHAT para las pestañas **Anuncios** y **Tiendas** de la pantalla *Espía de mercado*.

Es la versión propia de lo que muestra el Loom de referencia (AdGrab): no depende de Dropkiller ni de ninguna API de Meta; lee la pantalla de la Biblioteca en el Chrome del equipo.

## Instalar

1. `chrome://extensions` → activar **Modo de desarrollador**.
2. **Cargar descomprimida** → elegir esta carpeta (`extension/espia-tiendas`).
3. Si faltan los íconos: `node extension/espia-tiendas/icons/generar.cjs` (los crea en `icons/`).
4. Abrir IMPORCHAT en una pestaña con un usuario **super administrador**: la extensión toma la sesión sola (no pide usuario ni clave). Si no la toma, en **Opciones** se puede pegar el token y elegir el backend (producción, desarrollo o local).

## Usar

1. Abrir la Biblioteca de anuncios de Meta, elegir país (EC o MX) y buscar el **dominio** de la tienda (p. ej. `tiendamultimarca.com.co`).
2. Abajo aparece la barra **Espía de tiendas** con el total de anuncios cargados y los productos (agrupados por enlace de destino y título).
3. **Cargar más**: baja la página sola hasta el **Tope** (por defecto 120, se recuerda). Muestra el avance y se puede detener. Al terminar, si hay sesión y «Envío automático» está activo, manda lo cargado a IMPORCHAT.
4. **Solo nuevos**: oculta los anuncios que IMPORCHAT ya conocía (si no hay sesión, los que ya se vieron en este Chrome).
5. **Más activos / Más nuevos**: reordena las tarjetas por días en circulación o por fecha de inicio.
6. Elegir un producto y **Bajar anuncios**: descarga todos sus anuncios a `Descargas/Espia/<dominio>/<producto>/<ad_id>_HD.mp4|.mp4|.jpg`, con avance («Bajando 6/9 de «producto»»), botón **Detener** y resumen final (cuántos bajaron, cuántos sin HD y cuáles fallaron).
7. **Enviar a IMPORCHAT**: manda lo cargado en lotes de 200; la barra dice cuántos eran nuevos.

Cada tarjeta recibe un encabezado: días activos, **ABRIR** (la página de destino), cuántos anuncios tiene el producto, si es video (y si hay HD), **Nuevo** y **Bajado**.

**Modo liviano** (apagado por defecto): en tiendas grandes (más de 500 anuncios) suelta de la página las tarjetas ya enviadas para no agotar memoria; siguen contadas y en IMPORCHAT.

### Radar (barrido automático por producto)

El botón **Radar** de la barra alimenta los anuncios de los productos de Dropi sin buscar uno por uno:

1. Pide a IMPORCHAT la cola: los productos que más venden en el país (7 d, luego 30 d) más los que sigues, saltando los buscados hace menos de N días (`GET /radar/cola`).
2. Para cada producto abre la Biblioteca con un término corto sacado del nombre (3 palabras con peso, sin medidas ni relleno: «masajeador cervical electrico»), espera a que Meta pinte, se desplaza una vez (tope 60 anuncios) y manda lo que salió con `producto_radar`, así el backend deja el vínculo exacto anuncio ↔ producto. Si no sale nada, igual marca el producto como buscado (`POST /radar/marcar`).
3. Espera la pausa elegida (10–30 s, con variación) y pasa al siguiente. El estado vive en `chrome.storage.local.radar`: cada búsqueda es una carga completa de página y la barra retoma sola al cargar.
4. **Pausar / Reanudar / Detener** desde el panel; el botón de la barra muestra `Radar 37/300`. Si Meta deja de responder tres veces seguidas (verificación, límite de búsquedas) el radar se pausa y avisa; nunca intenta saltar un bloqueo.

Ritmo real: unos 25 s por producto con la pausa recomendada → 300 productos ≈ 2 h. Dejar la pestaña abierta (puede ir en segundo plano). En IMPORCHAT los productos muestran la columna **Anuncios**, el chip «Con anuncios» y en la ficha la etiqueta **Exacto** (vino del radar) o **Por nombre** (coincidencia aproximada).

## Qué manda al backend

Base: `<API>/api/v1/espia` con el token de la sesión (`Authorization: Bearer`). Solo super administrador.

- `GET /extension/ping` → comprueba la sesión.
- `POST /anuncios` → `{ pais, dominio_buscado, fuente: 'meta_ad_library', anuncios: [{ ad_archive_id, pagina_id, pagina_nombre, dominio, url_destino, producto, texto, titulo, tipo, media_url, imagen_url, inicio, n_duplicados, plataformas }] }` (máx. 200 por envío). Responde `nuevos_ids` y `conocidos_ids`.
- `POST /tiendas/vista` → `{ dominio, pais, anuncios_activos_vistos }` tras cada envío.
- `POST /seguir` → `{ tipo: 'tienda', ref: dominio }` desde el botón ☆ de cada tarjeta.
- `GET /radar/cola?pais&limit&dias` → `{ items: [{ dropi_product_id, nombre, termino, … }], pendientes }`.
- `POST /radar/marcar` → `{ pais, dropi_product_id, ad_ids: [] }` cuando una búsqueda del radar no trae anuncios (si trae, van en `POST /anuncios` con `producto_radar`).

Las llamadas salen del service worker (no de la página de Meta), por eso el backend debe estar en `host_permissions` del `manifest.json` (ya están los dominios de Imporfactory, Imporsuit y localhost).

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `dropi-captura.js` | Mundo principal de Dropi: envuelve fetch/XHR para ver las respuestas de la API de productos (id + nombre) y pasárselas a dropi.js por postMessage. No cambia ninguna petición. |
| `dropi.js`, `dropi.css` | Capa sobre el catálogo de Dropi: toma los ids de los enlaces (`product-details/<id>`) o empata las tarjetas por nombre con lo capturado, pide las métricas por lote y pinta la etiqueta bajo cada tarjeta; panel flotante en la ficha. |
| `manifest.json` | Manifest V3, permisos `downloads` y `storage`. |
| `bg.js` | Service worker: guarda la sesión, habla con el backend, baja archivos. |
| `sesion.js` | En la web de IMPORCHAT: toma el token de `localStorage` y lo guarda en la extensión. |
| `captura.js` | En la Biblioteca (world MAIN): intercepta las respuestas graphql para sacar el video HD y la imagen grande por `ad_archive_id`. |
| `barra.js` | La barra, la lectura de tarjetas, agrupado, orden, filtro, descarga y envío. |
| `popup.*` | Estado de sesión, anuncios enviados hoy, accesos directos. |
| `options.*` | Backend, token manual, probar sesión. |
| `icons/generar.cjs` | Genera los PNG de los íconos. |

## Limitaciones

- Lee la **pantalla** de Meta: si Meta cambia textos o diseño puede dejar de reconocer tarjetas. Reconoce español e inglés («Identificador de la biblioteca» / «Library ID», «En circulación desde el» / «Started running on»).
- El video «HD» que entrega Meta es 720p, no Full HD.
- No quita metadatos a los archivos (desde el navegador no se puede; sería un paso en servidor).
- El nombre del producto sale del enlace de destino y del título: un mismo producto con dos enlaces y títulos distintos puede quedar separado.
- Las plataformas (Facebook/Instagram) se leen de los iconos de la tarjeta; si Meta no los etiqueta, van vacías.
- Tiendas de más de 4.000 anuncios: cargar todo tarda varios minutos (Meta trae de a pocos); usar tope y modo liviano.
