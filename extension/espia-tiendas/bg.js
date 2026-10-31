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
