// Service worker: guarda la sesión de IMPORCHAT, habla con el backend y baja los anuncios.
// Los content scripts no llaman al backend directo (CORS desde facebook.com): todo pasa por aquí.

const API_POR_DEFECTO = 'https://chatcenter.imporfactory.app/api/v1';

const limpio = (t) =>
  String(t || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'sin-nombre';

const hoy = () => new Date().toISOString().slice(0, 10);

async function leerConfig() {
  const c = await chrome.storage.local.get(['token', 'tokenOrigen', 'tokenFecha', 'apiBase', 'enviadosHoy']);
  return {
    token: c.token || '',
    tokenOrigen: c.tokenOrigen || '',
    tokenFecha: c.tokenFecha || '',
    apiBase: (c.apiBase || API_POR_DEFECTO).replace(/\/+$/, ''),
    enviadosHoy: c.enviadosHoy && c.enviadosHoy.fecha === hoy() ? c.enviadosHoy : { fecha: hoy(), total: 0 },
  };
}

async function sumarEnviados(n) {
  const { enviadosHoy } = await leerConfig();
  enviadosHoy.total += n;
  await chrome.storage.local.set({ enviadosHoy });
}

// Llama al backend. Devuelve { ok, status, data, message }.
async function api(method, path, body) {
  const { token, apiBase } = await leerConfig();
  if (!token) return { ok: false, status: 0, message: 'Sin sesión de IMPORCHAT' };
  let r;
  try {
    r = await fetch(`${apiBase}/espia${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { ok: false, status: 0, message: `No se pudo hablar con IMPORCHAT (${e.message})` };
  }
  let json = null;
  try { json = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) {
    const message = json?.message || (r.status === 401 ? 'La sesión de IMPORCHAT venció' : r.status === 403 ? 'Tu usuario no tiene permiso (solo super administrador)' : `Error ${r.status}`);
    return { ok: false, status: r.status, message, data: json?.data };
  }
  return { ok: true, status: r.status, data: json?.data ?? json };
}

// ───────────── Herramientas de página (como AdGrab): se inyectan en la pestaña activa ─────────────
// Solo corren cuando el usuario las pide desde el popup (permiso activeTab), nunca solas.

// Desbloquea clic derecho, copiar y seleccionar en tiendas que lo bloquean.
function desbloquearPagina() {
  const parar = (e) => e.stopImmediatePropagation();
  for (const ev of ['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart', 'mousedown', 'keydown']) {
    window.addEventListener(ev, parar, true);
    document.addEventListener(ev, parar, true);
  }
  for (const ev of ['oncontextmenu', 'onselectstart', 'oncopy', 'oncut', 'ondragstart']) { document[ev] = null; document.body[ev] = null; }
  const css = document.createElement('style');
  css.textContent = '*{-webkit-user-select:text !important;user-select:text !important;pointer-events:auto !important}';
  document.documentElement.appendChild(css);
  return { ok: true, host: location.hostname };
}

// Lista las imágenes y videos grandes de la página (para bajarlos todos).
function detectarMultimedia() {
  const vistos = new Set();
  const lista = [];
  const agregar = (url, tipo) => {
    if (!url || !/^https?:/.test(url) || vistos.has(url)) return;
    vistos.add(url);
    lista.push({ url, tipo });
  };
  for (const img of document.images) {
    const w = img.naturalWidth || img.width;
    if (w >= 300) agregar(img.currentSrc || img.src, 'imagen');
  }
  for (const v of document.querySelectorAll('video')) {
    agregar(v.currentSrc || v.src, 'video');
    for (const s of v.querySelectorAll('source')) agregar(s.src, 'video');
    if (v.poster) agregar(v.poster, 'imagen');
  }
  for (const m of document.querySelectorAll('meta[property="og:image"], meta[property="og:video"]')) agregar(m.content, m.getAttribute('property').includes('video') ? 'video' : 'imagen');
  return { ok: true, host: location.hostname, titulo: document.title.slice(0, 80), lista: lista.slice(0, 300) };
}

async function herramienta(accion, tabId) {
  if (!tabId) return { ok: false, message: 'Sin pestaña activa' };
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url || !/^https?:/.test(tab.url)) return { ok: false, message: 'Abre primero la tienda en una pestaña normal' };
  if (accion === 'celular') {
    // Vista celular: la misma página en una ventana angosta (como el emulador del móvil).
    await chrome.windows.create({ url: tab.url, type: 'popup', width: 412, height: 900 });
    return { ok: true };
  }
  if (accion === 'desbloquear') {
    const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: desbloquearPagina });
    return r?.result || { ok: false, message: 'No se pudo inyectar' };
  }
  if (accion === 'multimedia') {
    const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: detectarMultimedia });
    const res = r?.result;
    if (!res?.ok) return { ok: false, message: 'No se pudo leer la página' };
    let ok = 0;
    for (let i = 0; i < res.lista.length; i++) {
      const it = res.lista[i];
      const ext = it.tipo === 'video' ? '.mp4' : (it.url.match(/\.(png|webp|gif|jpe?g)(\?|$)/i)?.[1] ? `.${it.url.match(/\.(png|webp|gif|jpe?g)(\?|$)/i)[1]}` : '.jpg');
      const id = await new Promise((resolve) =>
        chrome.downloads.download(
          { url: it.url, filename: `Espia/${limpio(res.host)}/pagina/${String(i + 1).padStart(3, '0')}${ext}`, conflictAction: 'uniquify', saveAs: false },
          (d) => resolve(d),
        ),
      );
      if (id) ok++;
    }
    return { ok: true, total: res.lista.length, bajados: ok, host: res.host };
  }
  return { ok: false, message: 'acción desconocida' };
}

chrome.runtime.onMessage.addListener((m, _s, responder) => {
  (async () => {
    switch (m?.tipo) {
      case 'sesion': {
        // Viene de sesion.js (la web de IMPORCHAT abierta en este Chrome).
        if (!m.token) return { ok: false };
        const actual = await chrome.storage.local.get(['token']);
        if (actual.token !== m.token) {
          await chrome.storage.local.set({ token: m.token, tokenOrigen: m.origen || '', tokenFecha: new Date().toISOString() });
        }
        return { ok: true };
      }
      case 'config':
        return leerConfig();
      case 'guardarConfig': {
        const cambios = {};
        if (typeof m.apiBase === 'string') cambios.apiBase = m.apiBase.trim().replace(/\/+$/, '') || API_POR_DEFECTO;
        if (typeof m.token === 'string') {
          cambios.token = m.token.trim();
          cambios.tokenOrigen = 'manual';
          cambios.tokenFecha = new Date().toISOString();
        }
        await chrome.storage.local.set(cambios);
        return { ok: true };
      }
      case 'cerrarSesion':
        await chrome.storage.local.remove(['token', 'tokenOrigen', 'tokenFecha']);
        return { ok: true };
      case 'ping':
        return api('GET', '/extension/ping');
      case 'enviarAnuncios': {
        const r = await api('POST', '/anuncios', m.body);
        if (r.ok) await sumarEnviados((m.body?.anuncios || []).length);
        return r;
      }
      case 'tiendaVista':
        return api('POST', '/tiendas/vista', m.body);
      case 'seguir':
        // barra.js → seguir/dejar de seguir una tienda (o producto) en IMPORCHAT.
        return api('POST', '/seguir', m.body);
      case 'radarCola': {
        // barra.js → productos que más venden y todavía no se buscaron en Meta (con su término de búsqueda).
        const p = new URLSearchParams({ pais: m.pais || 'EC', limit: String(m.limit || 300), dias: String(m.dias || 7) });
        return api('GET', `/radar/cola?${p}`);
      }
      case 'radarMarcar':
        // barra.js → «ya busqué este producto; estos son los anuncios que salieron» (puede ser ninguno).
        return api('POST', '/radar/marcar', m.body);
      case 'herramienta':
        // popup.js → herramientas sobre la pestaña activa (la tienda abierta).
        return herramienta(m.accion, m.tabId);
      case 'metricasLote':
        // dropi.js → ventas estimadas de los productos a la vista en Dropi (máx. 200 ids).
        return api('POST', '/productos/lote', m.body);
      case 'bajar':
        return new Promise((resolve) => {
          chrome.downloads.download(
            {
              url: m.url,
              filename: `Espia/${limpio(m.dominio)}/${limpio(m.producto)}/${limpio(m.nombre)}`,
              conflictAction: 'uniquify',
              saveAs: false,
            },
            (id) => resolve({ ok: Boolean(id), error: chrome.runtime.lastError?.message || null }),
          );
        });
      default:
        return { ok: false, message: 'mensaje desconocido' };
    }
  })().then(responder, (e) => responder({ ok: false, message: e.message }));
  return true; // respuesta asíncrona
});
