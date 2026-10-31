// Corre en el MUNDO PRINCIPAL de app.dropi.* desde document_start: envuelve fetch y
// XMLHttpRequest para ver las respuestas de la API de Dropi que lista productos
// ({ objects: [{ id, name, sku, ... }] }) y pasarle a dropi.js solo { id, nombre, sku }.
// Así la capa funciona aunque las tarjetas no tengan enlaces con el id (Angular
// navega por código). No modifica ninguna petición ni respuesta.
(() => {
  const CANAL = 'imp-espia-productos';
  const pareceProducto = (o) => o && typeof o === 'object' && Number.isInteger(Number(o.id)) && typeof o.name === 'string';

  function extraer(json) {
    const listas = [];
    if (Array.isArray(json?.objects)) listas.push(json.objects);
    if (Array.isArray(json?.data?.objects)) listas.push(json.data.objects);
    if (Array.isArray(json?.data)) listas.push(json.data);
    if (Array.isArray(json)) listas.push(json);
    if (pareceProducto(json?.objects)) listas.push([json.objects]); // ficha de un producto
    if (pareceProducto(json?.data)) listas.push([json.data]);
    const items = [];
    for (const l of listas) {
      for (const o of l) {
        if (!pareceProducto(o)) continue;
        items.push({ id: Number(o.id), nombre: String(o.name), sku: o.sku ? String(o.sku) : '' });
      }
    }
    return items;
  }

  function publicar(url, texto) {
    if (!texto || texto[0] !== '{' && texto[0] !== '[') return;
    if (!/product/i.test(String(url))) return;
    let json;
    try { json = JSON.parse(texto); } catch { return; }
    const items = extraer(json);
    if (items.length) window.postMessage({ tipo: CANAL, items }, location.origin);
  }

  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const resp = await fetchOriginal.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (/product/i.test(String(url))) {
        resp.clone().text().then((t) => publicar(url, t)).catch(() => {});
      }
    } catch { /* nunca estorbar a Dropi */ }
    return resp;
  };

  const abrir = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (metodo, url, ...resto) {
    try {
      if (/product/i.test(String(url))) {
        this.addEventListener('load', () => {
          try { if (this.responseType === '' || this.responseType === 'text') publicar(url, this.responseText); } catch { /* nada */ }
        });
      }
    } catch { /* nada */ }
    return abrir.call(this, metodo, url, ...resto);
  };
})();
