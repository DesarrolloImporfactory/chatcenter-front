# Espía de tiendas IMPORCHAT (extensión de Chrome)

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

## Qué manda al backend

Base: `<API>/api/v1/espia` con el token de la sesión (`Authorization: Bearer`). Solo super administrador.

- `GET /extension/ping` → comprueba la sesión.
- `POST /anuncios` → `{ pais, dominio_buscado, fuente: 'meta_ad_library', anuncios: [{ ad_archive_id, pagina_id, pagina_nombre, dominio, url_destino, producto, texto, titulo, tipo, media_url, imagen_url, inicio, n_duplicados, plataformas }] }` (máx. 200 por envío). Responde `nuevos_ids` y `conocidos_ids`.
- `POST /tiendas/vista` → `{ dominio, pais, anuncios_activos_vistos }` tras cada envío.

Las llamadas salen del service worker (no de la página de Meta), por eso el backend debe estar en `host_permissions` del `manifest.json` (ya están los dominios de Imporfactory, Imporsuit y localhost).

## Archivos

| Archivo | Qué hace |
| --- | --- |
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
