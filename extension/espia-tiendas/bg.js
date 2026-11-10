// Service worker: guarda la sesión de IMPORCHAT, habla con el backend y baja los anuncios.
// Los content scripts no llaman al backend directo (CORS desde facebook.com): todo pasa por aquí.

// La API de producción vive en chat.imporfactory.app; chatcenter.imporfactory.app es la
// pantalla (devuelve el HTML de la app para cualquier ruta, también /api/v1/...).
const API_POR_DEFECTO = 'https://chat.imporfactory.app/api/v1';
// Valor que traían las versiones hasta la 0.6.2: era la web, no la API. Se corrige solo.
const API_VIEJA = 'https://chatcenter.imporfactory.app/api/v1';

const limpio = (t) =>
  String(t || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'sin-nombre';

const hoy = () => new Date().toISOString().slice(0, 10);

async function leerConfig() {
  const c = await chrome.storage.local.get(['token', 'tokenOrigen', 'tokenFecha', 'tokenVence', 'tokenWeb', 'webOrigen', 'apiBase', 'apiOrigen', 'enviadosHoy']);
  return {
    token: c.token || '',
    tokenOrigen: c.tokenOrigen || '',
    tokenFecha: c.tokenFecha || '',
    tokenVence: c.tokenVence || '', // solo con sesión larga ('larga' en tokenOrigen): cuándo caduca
    tokenWeb: c.tokenWeb || '', // último token que mandó la web, para no volver a cambiarlo
    webOrigen: c.webOrigen || '', // de qué web de IMPORCHAT vino la sesión (para armar enlaces)
    apiBase: ((!c.apiBase || c.apiBase.replace(/\/+$/, '') === API_VIEJA) ? API_POR_DEFECTO : c.apiBase).replace(/\/+$/, ''),
    apiOrigen: c.apiOrigen || '', // 'sesion' (la mandó la web de IMPORCHAT) o 'manual' (Opciones)
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
  if (json === null || typeof json !== 'object') {
    // Una página HTML en vez de JSON: la URL apunta a la web y no a la API (o un proxy
    // devolvió otra cosa). Antes esto pasaba por «ok» con datos vacíos y la barra decía
    // «sin sesión» sin explicar nada.
    return { ok: false, status: r.status, code: 'NO_JSON', message: `La URL del backend no responde como API (${apiBase}): revisa las opciones de la extensión` };
  }
  if (!r.ok) {
    // ADDON_REQUIRED (403): la cuenta no tiene el complemento ImporKiller.
    // El mensaje del backend ya explica qué es y dónde se activa.
    const message = json?.message || (r.status === 401 ? 'La sesión de IMPORCHAT venció' : r.status === 403 ? 'Tu usuario de IMPORCHAT no tiene permiso para esto' : `Error ${r.status}`);
    return { ok: false, status: r.status, code: json?.code || null, message, data: json?.data, redirectTo: json?.redirectTo || null };
  }
  return { ok: true, status: r.status, data: json?.data ?? json };
}

// Dónde vive la pantalla (la web de IMPORCHAT, no la API): se deduce del origen de la sesión.
async function webImporchat() {
  const { tokenOrigen, webOrigen } = await leerConfig();
  if (webOrigen) return webOrigen;
  return tokenOrigen && !['manual', 'larga'].includes(tokenOrigen) ? tokenOrigen : 'https://chatcenter.imporfactory.app';
}

// Sesión larga (solo super administradores): la sesión de la web dura 7 días y en un
// Chrome que queda barriendo solo (la Mac mini del radar) a la semana todo quedaba
// «sin sesión». Se cambia el token de la web por uno de 90 días del backend y, cuando
// le quedan menos de RENOVAR_ANTES_DIAS, se renueva solo con ese mismo token. Si la
// cuenta no es super admin el backend responde 403 y se sigue con el token de la web.
const RENOVAR_ANTES_DIAS = 30;
async function pedirSesionLarga() {
  const r = await api('POST', '/extension/sesion-larga');
  if (!r.ok || !r.data?.token) return r;
  await chrome.storage.local.set({ token: r.data.token, tokenOrigen: 'larga', tokenFecha: new Date().toISOString(), tokenVence: r.data.vence || '' });
  return r;
}
async function renovarSiToca() {
  const { tokenOrigen, tokenVence } = await leerConfig();
  if (tokenOrigen !== 'larga' || !tokenVence) return;
  const quedan = (new Date(tokenVence).getTime() - Date.now()) / 86400000;
  if (quedan < RENOVAR_ANTES_DIAS) await pedirSesionLarga().catch(() => {});
}

chrome.runtime.onMessage.addListener((m, _s, responder) => {
  (async () => {
    switch (m?.tipo) {
      case 'sesion': {
        // Viene de sesion.js (la web de IMPORCHAT abierta en este Chrome).
        if (!m.token) return { ok: false };
        const actual = await chrome.storage.local.get(['token', 'tokenWeb', 'tokenOrigen', 'apiBase', 'apiOrigen']);
        const cambios = {};
        // La web repite el mismo token cada rato (y al volver a esa pestaña): solo cuenta
        // como sesión nueva si cambió respecto al último que mandó.
        const tokenNuevo = m.token !== actual.tokenWeb && m.token !== actual.token;
        if (tokenNuevo) Object.assign(cambios, { token: m.token, tokenWeb: m.token, webOrigen: m.origen || '', tokenOrigen: m.origen || '', tokenFecha: new Date().toISOString(), tokenVence: '' });
        // La web dice en qué API vive: se toma tal cual salvo que alguien haya escrito
        // una URL a mano en Opciones (apiOrigen 'manual'), que manda sobre la de la sesión.
        const api = typeof m.api === 'string' && /^https?:\/\//.test(m.api) ? m.api.trim().replace(/\/+$/, '') : '';
        if (api && actual.apiOrigen !== 'manual' && actual.apiBase !== api) Object.assign(cambios, { apiBase: api, apiOrigen: 'sesion' });
        if (Object.keys(cambios).length) await chrome.storage.local.set(cambios);
        // Con sesión nueva de la web se intenta la larga (super admin); si no, queda la de 7 días.
        if (tokenNuevo) await pedirSesionLarga().catch(() => {});
        return { ok: true };
      }
      case 'config':
        return leerConfig();
      case 'guardarConfig': {
        const cambios = {};
        if (typeof m.apiBase === 'string') {
          cambios.apiBase = m.apiBase.trim().replace(/\/+$/, '') || API_POR_DEFECTO;
          // Vacío = volver a tomar la de la sesión; escrito = manda sobre la de la sesión.
          cambios.apiOrigen = m.apiBase.trim() ? 'manual' : '';
        }
        if (typeof m.token === 'string') {
          cambios.token = m.token.trim();
          cambios.tokenOrigen = 'manual';
          cambios.tokenFecha = new Date().toISOString();
          cambios.tokenVence = '';
        }
        await chrome.storage.local.set(cambios);
        return { ok: true };
      }
      case 'cerrarSesion':
        await chrome.storage.local.remove(['token', 'tokenOrigen', 'tokenFecha', 'tokenVence', 'tokenWeb', 'webOrigen']);
        return { ok: true };
      case 'ping': {
        // Devuelve también `web` (para armar enlaces a la pantalla) y `addon`
        // ({ activo, precio, nombre }: sin él, Dropi y la Biblioteca lo dicen).
        const r = await api('GET', '/extension/ping');
        if (r.ok && r.data) {
          r.data.web = await webImporchat();
          await renovarSiToca(); // la sesión larga se renueva sola cuando le quedan menos de 30 días
        }
        return r;
      }
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
      case 'radarLatido':
        // barra.js → «el radar está así» (corriendo, en pausa, descansando…); la portada avisa al super admin.
        return api('POST', '/radar/latido', m.body);
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
