// Barra «ImporKiller» (espía de tiendas) sobre la Biblioteca de anuncios de Meta.
// Lee las tarjetas de la página, las agrupa por producto (enlace de destino + título),
// las ordena y filtra, baja los anuncios de un producto y manda lo visto a IMPORCHAT.
// Todo lo que se pinta con datos de los anuncios va por textContent, nunca innerHTML.
(() => {
  if (window.__espiaTiendas) return;
  window.__espiaTiendas = true;

  // ───────────────────────── Estado ─────────────────────────
  const media = {}; // ad_id → { hd, sd, img, imgChica } (lo manda captura.js)
  const tarjetas = new Map(); // ad_id → datos (node puede quedar null en modo liviano)
  const tituloProducto = new Map(); // título normalizado → producto (agrupa enlaces distintos)
  const conocidos = new Set(); // ids que IMPORCHAT ya tenía antes de esta sesión
  const vistosLocal = new Set(); // ids vistos antes en este Chrome (sin sesión)
  const nuevosSesion = new Set(); // ids que esta sesión descubrió (siguen «nuevos» hasta recargar)
  const enviados = new Set();
  const bajados = new Set();
  let sesion = null; // { ok, usuario } del ping
  let cargando = false;
  let bajando = false;
  let cfg = {
    tope: 120, soloNuevos: false, orden: 'ninguno', envioAuto: true, liviano: false,
    // Radar: opciones del panel y modo automático (repite la cola cada N horas rotando países).
    radar: { cantidad: 300, dias: 7, ritmo: 20, auto: 0, paises: ['EC', 'MX', 'CO'] },
  };

  addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.espiaMedia) return;
    for (const [id, m] of Object.entries(e.data.espiaMedia)) media[id] = { ...(media[id] || {}), ...m };
  });

  // ───────────────────────── Utilidades ─────────────────────────
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const mensaje = (tipo, texto) => chrome.runtime.sendMessage({ tipo, ...texto }).catch((e) => ({ ok: false, message: e.message }));

  const RE_ID = /(?:Identificador de la biblioteca|Library ID|ID de la biblioteca)\s*:?\s*(\d{6,})/i;
  const RE_ID_G = new RegExp(RE_ID.source, 'gi');
  const RE_DESDE = /(?:En circulaci[oó]n desde el|Started running on|Se empez[oó] a publicar el)\s+([^\n·|]+)/i;
  const RE_DUPS = /(\d+)\s+(?:anuncios usan este|ads use this)/i;
  const MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, set: 8, oct: 9, nov: 10, dic: 11, jan: 0, apr: 3, aug: 7, dec: 11 };

  // «2 ene 2024», «2 de enero de 2024», «Jan 2, 2024», «January 2, 2024».
  function parsearFecha(txt) {
    if (!txt) return null;
    const t = norm(txt).replace(/\bde\b/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    let m = t.match(/^(\d{1,2}) ([a-z]+) (\d{4})/) || null;
    let d, mes, y;
    if (m) { d = +m[1]; mes = MESES[m[2].slice(0, 4)] ?? MESES[m[2].slice(0, 3)]; y = +m[3]; }
    else if ((m = t.match(/^([a-z]+) (\d{1,2}) (\d{4})/))) { d = +m[2]; mes = MESES[m[1].slice(0, 4)] ?? MESES[m[1].slice(0, 3)]; y = +m[3]; }
    if (mes === undefined || !d || !y) return null;
    const f = new Date(y, mes, d);
    return Number.isNaN(f.getTime()) ? null : f;
  }
  const iso = (f) => (f ? `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}` : null);
  const diasDesde = (f) => (f ? Math.max(0, Math.floor((Date.now() - f.getTime()) / 86400000)) : null);

  function urlDestino(card) {
    for (const a of card.querySelectorAll('a[href]')) {
      try {
        const u = new URL(a.href);
        let real = a.href;
        if (/(^|\.)facebook\.com$/.test(u.hostname)) {
          const p = u.searchParams.get('u');
          if (!p) continue;
          real = p;
        }
        const r = new URL(real);
        if (/facebook\.com|instagram\.com|fb\.me|fb\.com|messenger\.com|whatsapp\.com|wa\.me/i.test(r.hostname)) continue;
        return r;
      } catch { /* enlace raro */ }
    }
    return null;
  }

  const SEGMENTOS_VACIOS = new Set(['products', 'product', 'collections', 'collection', 'pages', 'page', 'index', 'home', 'inicio', 'es', 'en', 'shop', 'tienda', 'p', 'item', 'items', 'lp', 'landing']);
  function nombreDesdeUrl(u) {
    if (!u) return '';
    const partes = u.pathname.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
    for (let i = partes.length - 1; i >= 0; i--) {
      const seg = partes[i].replace(/\.(html?|php|aspx?)$/i, '');
      if (SEGMENTOS_VACIOS.has(seg.toLowerCase())) continue;
      const limpio = seg
        .replace(/[-_+.]+/g, ' ')
        .split(' ')
        .filter((w) => w && !/^\d+$/.test(w) && !/^(utm|ref|fbclid|variant|sku)$/i.test(w))
        .join(' ')
        .trim();
      if (limpio.length >= 3) return limpio.slice(0, 80);
    }
    return u.hostname.replace(/^www\./, '');
  }

  // Plataforma de la TIENDA (no de Meta): a dónde manda el anuncio. WhatsApp si el
  // destino es wa.me/api.whatsapp.com (o el texto pide escribir por WhatsApp),
  // Shopify por /products/ o myshopify, Dropi por su dominio, y «web» para el resto.
  function plataformaTienda(card, u, textos) {
    const hrefs = [...card.querySelectorAll('a[href]')].map((a) => {
      try { const x = new URL(a.href); return (/(^|\.)facebook\.com$/.test(x.hostname) && x.searchParams.get('u')) || a.href; } catch { return a.href; }
    }).join(' ').toLowerCase();
    const texto = (textos || []).join(' ').toLowerCase();
    if (/wa\.me\/|api\.whatsapp\.com|whatsapp\.com\/send|whatsapp\.com\/message/.test(hrefs)) return 'whatsapp';
    if (u) {
      const h = u.hostname.toLowerCase();
      if (/myshopify\.com$/.test(h) || /\/(products|collections)\//.test(u.pathname) || /\/products\/[^/]+/.test(u.pathname)) return 'shopify';
      if (/(^|\.)dropi\.(ec|mx|co|cl|pe|gt|pa|py)$|mydropi|\.dropi\./.test(h) || /dropi/.test(h)) return 'dropi';
      return 'web';
    }
    if (/whatsapp|wasap|escr[ií]benos al|env[ií]a(nos)? (un )?mensaje/.test(texto)) return 'whatsapp';
    return '';
  }
  const PLATAFORMA_TXT = { whatsapp: 'WhatsApp', shopify: 'Shopify', dropi: 'Dropi', web: 'Web' };

  function plataformasDe(card) {
    const set = new Set();
    for (const el of card.querySelectorAll('[aria-label],[title],img[alt]')) {
      const t = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('alt') || ''}`.toLowerCase();
      if (t.includes('instagram')) set.add('instagram');
      if (/\bfacebook\b/.test(t)) set.add('facebook');
      if (t.includes('messenger')) set.add('messenger');
      if (t.includes('audience')) set.add('audience_network');
      if (t.includes('threads')) set.add('threads');
    }
    return [...set];
  }

  const ETIQUETAS = /^(activo|active|inactivo|inactive|patrocinado|sponsored|plataformas|platforms|ver detalles del anuncio|see ad details|ver detalles del resumen|see summary details|identificador de la biblioteca|library id|en circulaci|started running|comprar|shop now|m[aá]s informaci[oó]n|learn more|enviar mensaje|send message|contactarnos|contact us|registrarte|sign up|pedir ahora|order now)/i;
  function textosDe(card) {
    const textos = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 2) continue;
      if (ETIQUETAS.test(t) || RE_ID.test(t) || RE_DESDE.test(t) || RE_DUPS.test(t)) continue;
      if (n.parentElement?.closest('[data-ei-head]')) continue;
      textos.push(t);
    }
    return textos;
  }

  function paginaDe(card) {
    for (const a of card.querySelectorAll('a[href]')) {
      try {
        const u = new URL(a.href);
        if (!/(^|\.)facebook\.com$/.test(u.hostname) || u.pathname.startsWith('/ads/library') || u.pathname === '/l.php') continue;
        const nombre = a.textContent.replace(/\s+/g, ' ').trim();
        if (!nombre || nombre.length > 80) continue;
        const id = u.searchParams.get('id') || (u.pathname.match(/\/(\d{6,})\/?$/) || [])[1] || u.pathname.replace(/^\/|\/$/g, '');
        return { pagina_nombre: nombre, pagina_id: id || '' };
      } catch { /* nada */ }
    }
    return { pagina_nombre: '', pagina_id: '' };
  }

  // Sube desde el nodo del «Identificador» hasta el contenedor de la tarjeta.
  function contenedorDe(nodo) {
    let card = nodo;
    while (card.parentElement && !card.querySelector('video, img[src*="fbcdn"], img[src*="scontent"]')) card = card.parentElement;
    while (card.parentElement) {
      const padre = card.parentElement;
      const ids = (padre.textContent.match(RE_ID_G) || []).length;
      if (ids !== 1) break;
      card = padre;
      if (card.querySelector('a[href*="l.php"], a[target="_blank"]')) break;
    }
    if ((card.textContent.match(RE_ID_G) || []).length > 1) return null;
    return card;
  }

  function leerTarjetas() {
    const hojas = [...document.querySelectorAll('div, span')].filter((n) => !n.children.length && RE_ID.test(n.textContent));
    for (const hoja of hojas) {
      const id = hoja.textContent.match(RE_ID)[1];
      const card = contenedorDe(hoja);
      if (!card) continue;
      const previa = tarjetas.get(id);
      if (previa && previa.node === card) continue;
      card.dataset.eiId = id;
      const video = card.querySelector('video');
      const imgs = [...card.querySelectorAll('img')].filter((i) => (i.naturalWidth || i.width) > 150);
      const u = urlDestino(card);
      const textos = textosDe(card);
      const pagina = paginaDe(card);
      const enlace = card.querySelector('a[href*="l.php"], a[target="_blank"]');
      const titulo = (enlace?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) || textos.find((t) => t.length > 8 && t.length < 120) || '';
      const desdeTxt = card.textContent.match(RE_DESDE)?.[1]?.trim() || '';
      const inicio = parsearFecha(desdeTxt);
      // Producto = último tramo del enlace de destino. Si el enlace es solo el dominio
      // (tiendas que mandan todo a la portada), se agrupa por el título del anuncio
      // para no meter toda la tienda en un solo «producto».
      const desdeUrl = nombreDesdeUrl(u);
      const soloDominio = !u || desdeUrl === u.hostname.replace(/^www\./, '');
      const tituloCorto = titulo.replace(/[¡!¿?]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      let producto = (!soloDominio && desdeUrl) || tituloCorto || desdeUrl || 'Sin enlace';
      const clave = norm(titulo).split(' ').slice(0, 6).join(' ');
      if (clave.length >= 8) {
        if (tituloProducto.has(clave)) producto = tituloProducto.get(clave);
        else tituloProducto.set(clave, producto);
      }
      tarjetas.set(id, {
        id,
        node: card,
        producto,
        dominio: u ? u.hostname.replace(/^www\./, '') : '',
        url_destino: u ? u.href : '',
        titulo,
        texto: textos.filter((t) => t !== pagina.pagina_nombre).join('\n').slice(0, 2000),
        pagina_nombre: pagina.pagina_nombre,
        pagina_id: pagina.pagina_id,
        tipo: video ? 'video' : 'imagen',
        sd: video?.src || video?.querySelector('source')?.src || '',
        img: imgs[0]?.src || video?.poster || '', // en videos, el póster sirve de portada en IMPORCHAT
        inicio,
        dias: diasDesde(inicio),
        n_duplicados: Number(card.textContent.match(RE_DUPS)?.[1] || 1),
        plataformas: plataformasDe(card),
        tienda_plataforma: plataformaTienda(card, u, textos),
      });
      registrarVistoLocal(id);
    }
    return tarjetas;
  }

  const grupos = () => {
    const g = new Map();
    for (const t of tarjetas.values()) (g.get(t.producto) || g.set(t.producto, []).get(t.producto)).push(t);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  // «Nuevo» = IMPORCHAT no lo tenía (o, sin sesión, este Chrome no lo había visto antes de hoy).
  // Lo que diga el backend manda: nuevos_ids quedan nuevos toda la sesión; conocidos_ids dejan de serlo.
  const esNuevo = (id) => nuevosSesion.has(id) || (!conocidos.has(id) && !vistosLocal.has(id));

  // Registro local de ids vistos (para «Solo nuevos» sin sesión). Se guarda con retraso.
  const pendientesLocal = new Set();
  function registrarVistoLocal(id) {
    pendientesLocal.add(id);
    clearTimeout(registrarVistoLocal.t);
    registrarVistoLocal.t = setTimeout(async () => {
      const { vistosLocal: lista = [] } = await chrome.storage.local.get('vistosLocal');
      const set = new Set(lista);
      for (const i of pendientesLocal) set.add(i);
      pendientesLocal.clear();
      await chrome.storage.local.set({ vistosLocal: [...set].slice(-20000) });
    }, 3000);
  }

  function paisDeUrl() {
    const c = (new URLSearchParams(location.search).get('country') || 'ALL').toUpperCase();
    return /^[A-Z]{2}$/.test(c) ? c : 'ALL';
  }
  function dominioBuscado() {
    const q = (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (/^[\w.-]+\.[a-z]{2,}$/i.test(q)) return q;
    const cuenta = {};
    for (const t of tarjetas.values()) if (t.dominio) cuenta[t.dominio] = (cuenta[t.dominio] || 0) + 1;
    return Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0] || q || '';
  }

  // ───────────────────────── UI: barra ─────────────────────────
  const estilo = document.createElement('style');
  estilo.textContent = `
    #ei-barra{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#0b1f3a;color:#fff;font:13px/1.3 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:8px 14px;box-shadow:0 -4px 16px rgba(0,0,0,.35)}
    #ei-barra b{color:#00d4ff}
    #ei-barra select,#ei-barra input[type=number]{background:#132b4d;color:#fff;border:1px solid #1f3f6b;border-radius:6px;padding:5px 8px;font:inherit}
    #ei-barra select{max-width:320px}
    #ei-barra input[type=number]{width:70px}
    #ei-barra button{border:0;border-radius:6px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer;background:#1f3f6b;color:#fff}
    #ei-barra button.ei-acento{background:#00d4ff;color:#0b1f3a}
    #ei-barra button:disabled{opacity:.5;cursor:default}
    #ei-barra label.ei-sw{display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap}
    #ei-barra .ei-sep{width:1px;height:22px;background:#1f3f6b}
    #ei-barra #ei-msg{flex:1 1 220px;min-width:160px;color:#cfe8ff}
    #ei-barra #ei-msg.err{color:#ff8c8c}
    #ei-barra #ei-msg.ok{color:#8cffb0}
    #ei-barra .ei-sesion{font-size:11px;color:#9fb7d6;white-space:nowrap}
    .ei-head{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:4px 8px;background:#0b1f3a;color:#fff;font:11px/1.2 system-ui,sans-serif;border-radius:8px 8px 0 0}
    .ei-head .ei-chip{background:#132b4d;border-radius:10px;padding:2px 7px;white-space:nowrap}
    .ei-head .ei-chip.ei-nuevo{background:#00d4ff;color:#0b1f3a;font-weight:700}
    .ei-head .ei-chip.ei-bajado{background:#1fbf75;color:#06281a;font-weight:700}
    .ei-head .ei-chip.ei-dias{background:#f6b23a;color:#3a2400;font-weight:700}
    .ei-head a.ei-abrir{background:#1f3f6b;color:#fff;text-decoration:none;border-radius:10px;padding:2px 8px;font-weight:700}
    .ei-head a.ei-abrir:hover{background:#2a5390}
    .ei-head button.ei-btn{border:0;border-radius:10px;padding:2px 8px;font:inherit;font-weight:700;cursor:pointer;background:#132b4d;color:#cfe8ff;line-height:1.4}
    .ei-head button.ei-btn:hover{background:#1f3f6b;color:#fff}
    .ei-head button.ei-btn.ei-on{background:#f6b23a;color:#3a2400}
    .ei-head .ei-chip.ei-pl-whatsapp{background:#1fbf75;color:#06281a;font-weight:700}
    .ei-head .ei-chip.ei-pl-shopify{background:#96bf48;color:#1e2b05;font-weight:700}
    .ei-head .ei-chip.ei-pl-dropi{background:#ff7a1a;color:#2b1200;font-weight:700}
    .ei-head .ei-chip.ei-pl-web{background:#2a5390;color:#fff}
    #ei-barra .ei-prodbtn{display:inline-flex;align-items:center;gap:6px;background:#132b4d;border:1px solid #1f3f6b}
    #ei-barra button.ei-radar{background:#7c3aed;color:#fff;display:inline-flex;align-items:center;gap:6px}
    #ei-barra button.ei-radar.ei-activo{background:#f6b23a;color:#3a2400}
    #ei-radarpanel{position:fixed;right:14px;bottom:64px;z-index:2147483002;width:380px;display:none;flex-direction:column;gap:10px;background:#0b1f3a;color:#fff;border:1px solid #1f3f6b;border-radius:12px;box-shadow:0 -8px 30px rgba(0,0,0,.45);font:13px/1.35 system-ui,sans-serif;padding:14px}
    #ei-radarpanel.ei-abierto{display:flex}
    #ei-radarpanel h4{margin:0;font-size:14px;color:#c4b5fd}
    #ei-radarpanel p{margin:0;color:#9fb7d6;font-size:12px}
    #ei-radarpanel .ei-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #ei-radarpanel label.ei-campo{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#9fb7d6}
    #ei-radarpanel select{background:#132b4d;color:#fff;border:1px solid #1f3f6b;border-radius:6px;padding:6px 8px;font:inherit}
    #ei-radarpanel .ei-acciones{display:flex;gap:8px}
    #ei-radarpanel .ei-paises{display:flex;flex-wrap:wrap;gap:6px 10px;padding-top:4px}
    #ei-radarpanel .ei-paises label{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#fff;cursor:pointer}
    #ei-radarpanel .ei-auto{font-size:11px;color:#c4b5fd}
    #ei-radarpanel button{flex:1;border:0;border-radius:8px;padding:8px 10px;font:inherit;font-weight:700;cursor:pointer;background:#1f3f6b;color:#fff}
    #ei-radarpanel button.ei-ir{background:#7c3aed}
    #ei-radarpanel button.ei-parar{background:#ff8c8c;color:#3a0000}
    #ei-radarpanel button:disabled{opacity:.5;cursor:default}
    #ei-radarpanel .ei-prog{height:6px;border-radius:3px;background:#132b4d;overflow:hidden}
    #ei-radarpanel .ei-prog i{display:block;height:100%;background:#7c3aed;width:0}
    #ei-radarpanel .ei-estado{font-size:12px;color:#cfe8ff}
    #ei-radarpanel .ei-estado b{color:#fff}
    #ei-radarpanel .ei-estado.err{color:#ff8c8c}
    #ei-prodpanel{position:fixed;left:14px;bottom:64px;z-index:2147483002;width:360px;max-height:60vh;display:none;flex-direction:column;background:#0b1f3a;color:#fff;border:1px solid #1f3f6b;border-radius:12px;box-shadow:0 -8px 30px rgba(0,0,0,.45);font:13px/1.3 system-ui,sans-serif;overflow:hidden}
    #ei-prodpanel.ei-abierto{display:flex}
    #ei-prodpanel input{margin:10px;padding:7px 10px;border-radius:8px;border:1px solid #1f3f6b;background:#132b4d;color:#fff;font:inherit}
    #ei-prodpanel .ei-lista{overflow:auto;padding:0 6px 6px}
    #ei-prodpanel .ei-fila{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer}
    #ei-prodpanel .ei-fila:hover,#ei-prodpanel .ei-fila.ei-sel{background:#132b4d}
    #ei-prodpanel .ei-fila img,#ei-prodpanel .ei-fila .ei-sinimg{width:34px;height:34px;border-radius:6px;object-fit:cover;background:#1f3f6b;flex:none}
    #ei-prodpanel .ei-fila .ei-nom{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #ei-prodpanel .ei-fila .ei-n{background:#1f3f6b;border-radius:10px;padding:1px 7px;font-size:11px}
    #ei-prodpanel .ei-fila button{border:0;border-radius:6px;padding:3px 7px;background:#00d4ff;color:#0b1f3a;font-weight:700;cursor:pointer}
    .ei-oculta{display:none !important}
    #ei-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:2147483001;background:#132b4d;color:#fff;border:1px solid #00d4ff;border-radius:10px;padding:10px 14px;font:13px system-ui,sans-serif;display:none;gap:10px;align-items:center;max-width:90vw}
    #ei-toast button{border:0;border-radius:6px;padding:4px 10px;background:#ff8c8c;color:#3a0000;font-weight:700;cursor:pointer}
    body{padding-bottom:64px !important}
    /* Marca, país y formato (siempre a la vista) */
    #ei-barra .ei-marca{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:800;letter-spacing:.01em;white-space:nowrap}
    #ei-barra .ei-marca i{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#00d4ff,#38bdf8);color:#0b1f3a;font:800 12px/1 system-ui,sans-serif;font-style:normal}
    #ei-barra .ei-marca b{color:#00d4ff}
    #ei-barra select.ei-pildora{border-radius:999px;padding:6px 12px;background:#132b4d;border:1px solid #2a4d7d;font-weight:600;max-width:190px}
    /* Qué se ve según la sesión: invitado (sin sesión), sinaddon, ok */
    #ei-barra .ei-uso,#ei-barra .ei-invitado{display:contents}
    #ei-barra[data-modo="cargando"] .ei-uso,#ei-barra[data-modo="cargando"] .ei-invitado,
    #ei-barra[data-modo="invitado"] .ei-uso,#ei-barra[data-modo="sinaddon"] .ei-uso,
    #ei-barra[data-modo="ok"] .ei-invitado{display:none}
    #ei-barra .ei-candado{display:inline-flex;align-items:center;gap:6px;border:1px solid #2a4d7d;border-radius:999px;padding:6px 12px;background:#0f2748;color:#9fb7d6;font-weight:600;cursor:pointer;white-space:nowrap}
    #ei-barra .ei-candado:hover{border-color:#00d4ff;color:#fff}
    #ei-barra .ei-candado svg{width:13px;height:13px;flex:none;fill:currentColor;opacity:.85}
    #ei-barra .ei-gancho{flex:1 1 200px;min-width:140px;color:#cfe8ff;font-size:12px}
    #ei-barra a.ei-cta{margin-left:auto;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:9px 18px;background:#00d4ff;color:#0b1f3a;font-weight:800;text-decoration:none;white-space:nowrap;box-shadow:0 6px 18px rgba(0,212,255,.35)}
    #ei-barra a.ei-cta:hover{background:#5ee3ff}
    #ei-barra button.ei-oculto{display:none}
    #ei-ajustes{position:fixed;right:14px;bottom:64px;z-index:2147483002;width:340px;display:none;flex-direction:column;gap:12px;background:#0b1f3a;color:#fff;border:1px solid #1f3f6b;border-radius:12px;box-shadow:0 -8px 30px rgba(0,0,0,.45);font:13px/1.35 system-ui,sans-serif;padding:14px}
    #ei-ajustes.ei-abierto{display:flex}
    #ei-ajustes h4{margin:0;font-size:14px;color:#00d4ff}
    #ei-ajustes .ei-op{display:flex;flex-direction:column;gap:3px}
    #ei-ajustes .ei-op small{color:#9fb7d6;font-size:11.5px}
    #ei-ajustes label.ei-sw{display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:700}
    #ei-ajustes input[type=number]{width:90px;background:#132b4d;color:#fff;border:1px solid #1f3f6b;border-radius:6px;padding:5px 8px;font:inherit}
    #ei-ajustes a{color:#00d4ff;font-weight:700;text-decoration:none}
  `;
  document.documentElement.appendChild(estilo);

  const barra = document.createElement('div');
  barra.id = 'ei-barra';
  const el = (tag, props = {}, hijos = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const h of hijos) n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    return n;
  };
  const sw = (id, texto, checked) => el('label', { class: 'ei-sw' }, [el('input', { type: 'checkbox', id, ...(checked ? { checked: '' } : {}) }), texto]);

  // La barra tiene tres caras según la sesión (barra.dataset.modo):
  //   invitado  → sin sesión de IMPORCHAT: marca, país, formato, lo que se desbloquea y «Iniciar sesión».
  //   sinaddon  → con sesión pero sin el complemento: lo mismo, con «Activar ImporKiller».
  //   ok        → todo: productos, descargar, cargar más, solo nuevos, orden y guardar.
  // Lo técnico (tope, guardado automático, modo liviano) vive en «Ajustes»; el Radar solo
  // lo ve el super administrador (o cualquiera que ya tenga un barrido en curso).
  const PAISES_META = [['ALL', 'Todos los países'], ['EC', 'Ecuador'], ['MX', 'México'], ['CO', 'Colombia'], ['PE', 'Perú'], ['CL', 'Chile'], ['AR', 'Argentina'], ['PA', 'Panamá'], ['CR', 'Costa Rica'], ['GT', 'Guatemala'], ['PY', 'Paraguay'], ['VE', 'Venezuela']];
  const FORMATOS_META = [['all', 'Todos los formatos'], ['video', 'Solo videos'], ['image', 'Solo imágenes']];
  // Candado dibujado (sin emojis ni fuentes de íconos: en la página de Meta no hay ninguna cargada).
  const candado = () => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M17 9V7A5 5 0 0 0 7 7v2H5v13h14V9h-2Zm-8 0V7a3 3 0 0 1 6 0v2H9Z');
    svg.appendChild(p);
    return svg;
  };
  const bloqueado = (texto, title) => el('span', { class: 'ei-candado', title, role: 'button' }, [candado(), texto]);

  const ui = {
    titulo: el('span', { class: 'ei-marca' }, [el('i', { text: 'IK' }), el('span', {}, ['Impor', el('b', { text: 'Killer' })])]),
    pais: el('select', { id: 'ei-pais', class: 'ei-pildora', title: 'País de los anuncios' }, PAISES_META.map(([v, t]) => el('option', { value: v, text: t }))),
    formato: el('select', { id: 'ei-formato', class: 'ei-pildora', title: 'Formato de los anuncios' }, FORMATOS_META.map(([v, t]) => el('option', { value: v, text: t }))),
    total: el('span', { id: 'ei-total', text: '0 anuncios · 0 productos' }),
    prod: el('button', { id: 'ei-prod', class: 'ei-prodbtn', text: 'Productos (0)', title: 'Los anuncios de esta búsqueda agrupados por producto. Elige uno para descargar sus anuncios.' }),
    tope: el('input', { type: 'number', id: 'ei-tope', min: '10', max: '10000', step: '10' }),
    cargar: el('button', { id: 'ei-cargar', text: 'Cargar más', title: 'Baja por la página para traer más anuncios de esta búsqueda' }),
    soloNuevos: sw('ei-nuevos', 'Solo nuevos', false),
    orden: el('select', { id: 'ei-orden', title: 'Orden de los anuncios en la página' }, [
      el('option', { value: 'ninguno', text: 'Orden de Meta' }),
      el('option', { value: 'activos', text: 'Más días activo' }),
      el('option', { value: 'nuevos', text: 'Más recientes' }),
    ]),
    bajar: el('button', { id: 'ei-bajar', class: 'ei-acento', text: 'Descargar anuncios', title: 'Descarga los videos e imágenes del producto elegido' }),
    enviar: el('button', { id: 'ei-enviar', text: 'Guardar en ImporKiller', title: 'Guarda estos anuncios en tu ImporKiller para verlos después en la pestaña Anuncios' }),
    envioAuto: sw('ei-auto', 'Guardar automáticamente', true),
    liviano: sw('ei-liviano', 'Modo liviano', false),
    ajustes: el('button', { id: 'ei-ajustesbtn', text: 'Ajustes', title: 'Ajustes de la extensión' }),
    radar: el('button', { id: 'ei-radar', class: 'ei-radar ei-oculto', text: 'Radar', title: 'Buscar en Meta, uno por uno, los productos de Dropi que más venden y guardar sus anuncios en IMPORCHAT' }),
    msg: el('span', { id: 'ei-msg' }),
    sesion: el('span', { class: 'ei-sesion', text: '' }),
    gancho: el('span', { class: 'ei-gancho', text: 'Inicia sesión para ver cuántos días lleva activo cada anuncio y descargar sus creativos.' }),
    cta: el('a', { class: 'ei-cta', href: 'https://chatcenter.imporfactory.app/imporkiller', target: '_blank', rel: 'noopener', text: 'Iniciar sesión' }),
  };
  const candados = [
    bloqueado('Descargar creativos', 'Descarga los videos e imágenes de cada producto'),
    bloqueado('Agrupar por producto', 'Los anuncios de la búsqueda agrupados por producto'),
    bloqueado('Solo nuevos', 'Muestra solo los anuncios que no habías visto'),
  ];
  for (const c of candados) c.addEventListener('click', () => window.open(ui.cta.href, '_blank', 'noopener'));
  barra.dataset.modo = 'cargando';
  barra.append(
    ui.titulo, ui.pais, ui.formato,
    el('span', { class: 'ei-uso' }, [
      el('span', { class: 'ei-sep' }), ui.total, el('span', { class: 'ei-sep' }),
      ui.prod, ui.bajar, ui.cargar, el('span', { class: 'ei-sep' }),
      ui.soloNuevos, ui.orden, el('span', { class: 'ei-sep' }),
      ui.enviar, ui.ajustes, ui.radar, ui.msg, ui.sesion,
    ]),
    el('span', { class: 'ei-invitado' }, [el('span', { class: 'ei-sep' }), ...candados, ui.gancho, ui.cta]),
  );
  document.body.appendChild(barra);

  // País y formato: cambian la búsqueda de Meta (misma página, otros parámetros).
  const paramMeta = (k, v) => { const u = new URL(location.href); u.searchParams.set(k, v); location.assign(u.toString()); };
  const sincronizarSelectores = () => {
    const p = new URLSearchParams(location.search);
    const pais = (p.get('country') || 'ALL').toUpperCase();
    ui.pais.value = PAISES_META.some(([v]) => v === pais) ? pais : 'ALL';
    const f = p.get('media_type') || 'all';
    ui.formato.value = FORMATOS_META.some(([v]) => v === f) ? f : 'all';
  };
  sincronizarSelectores();
  ui.pais.addEventListener('change', () => paramMeta('country', ui.pais.value));
  ui.formato.addEventListener('change', () => paramMeta('media_type', ui.formato.value));

  // Ajustes: lo que casi nadie necesita tocar, explicado en una línea.
  const ajustesPanel = el('div', { id: 'ei-ajustes' }, [
    el('h4', { text: 'Ajustes' }),
    el('div', { class: 'ei-op' }, [ui.envioAuto, el('small', { text: 'Al usar «Cargar más», los anuncios se guardan solos en tu ImporKiller.' })]),
    el('div', { class: 'ei-op' }, [el('label', { class: 'ei-sw' }, ['Anuncios por carga ', ui.tope]), el('small', { text: 'Hasta cuántos anuncios trae «Cargar más» de una búsqueda.' })]),
    el('div', { class: 'ei-op' }, [ui.liviano, el('small', { text: 'Para búsquedas de más de 500 anuncios: evita que la página se ponga lenta.' })]),
    el('a', { id: 'ei-abrirweb', href: 'https://chatcenter.imporfactory.app/imporkiller', target: '_blank', rel: 'noopener', text: 'Abrir ImporKiller ›' }),
  ]);
  document.body.appendChild(ajustesPanel);
  ui.ajustes.addEventListener('click', () => ajustesPanel.classList.toggle('ei-abierto'));
  document.addEventListener('click', (e) => { if (!ajustesPanel.contains(e.target) && e.target !== ui.ajustes) ajustesPanel.classList.remove('ei-abierto'); });

  // Desplegable de productos: buscador, miniatura, conteo y bajar de un clic (como AdGrab).
  let productoSel = '';
  const prodPanel = el('div', { id: 'ei-prodpanel' }, [
    el('input', { type: 'search', placeholder: 'Buscar producto…', id: 'ei-prodbusca' }),
    el('div', { class: 'ei-lista', id: 'ei-prodlista' }),
  ]);
  document.body.appendChild(prodPanel);
  const prodBusca = $('#ei-prodbusca', prodPanel);
  const prodLista = $('#ei-prodlista', prodPanel);
  ui.prod.addEventListener('click', () => { prodPanel.classList.toggle('ei-abierto'); if (prodPanel.classList.contains('ei-abierto')) { pintarProductos(); prodBusca.focus(); } });
  prodBusca.addEventListener('input', pintarProductos);
  document.addEventListener('click', (e) => { if (!prodPanel.contains(e.target) && e.target !== ui.prod) prodPanel.classList.remove('ei-abierto'); });
  function pintarProductos() {
    const filtro = norm(prodBusca.value);
    const g = grupos().filter(([p]) => !filtro || norm(p).includes(filtro));
    prodLista.replaceChildren(...g.map(([p, l]) => {
      const img = l.find((t) => t.img || media[t.id]?.imgChica);
      const src = img ? (img.img || media[img.id]?.imgChica) : '';
      const fila = el('div', { class: `ei-fila${p === productoSel ? ' ei-sel' : ''}`, title: p }, [
        src ? el('img', { src, alt: '' }) : el('span', { class: 'ei-sinimg' }),
        el('span', { class: 'ei-nom', text: p }),
        el('span', { class: 'ei-n', text: String(l.length) }),
        el('button', { text: 'Bajar', title: `Bajar los ${l.length} anuncios de «${p}»`, onclick: (e) => { e.stopPropagation(); productoSel = p; prodPanel.classList.remove('ei-abierto'); pintarProductoBtn(); bajarProducto(p); } }),
      ]);
      fila.addEventListener('click', () => { productoSel = p; prodPanel.classList.remove('ei-abierto'); pintarProductoBtn(); });
      return fila;
    }));
    if (!g.length) prodLista.appendChild(el('div', { class: 'ei-fila', text: filtro ? 'Nada con ese nombre' : 'Todavía no hay productos' }));
  }
  function pintarProductoBtn() {
    const g = grupos();
    const sel = g.find(([p]) => p === productoSel);
    ui.prod.textContent = sel ? `${sel[0].slice(0, 28)}${sel[0].length > 28 ? '…' : ''} (${sel[1].length})` : `Productos (${g.length})`;
  }

  const toast = el('div', { id: 'ei-toast' }, [el('span', { id: 'ei-toast-txt' }), el('button', { id: 'ei-toast-stop', text: 'Detener' })]);
  document.body.appendChild(toast);
  const toastTxt = $('#ei-toast-txt', toast);
  const mostrarToast = (texto, conStop) => { toastTxt.textContent = texto; $('#ei-toast-stop', toast).style.display = conStop ? '' : 'none'; toast.style.display = 'flex'; };
  const ocultarToast = () => { toast.style.display = 'none'; };

  const decir = (texto, clase = '') => { ui.msg.textContent = texto; ui.msg.className = clase; };

  // ───────────────────────── Config persistida ─────────────────────────
  chrome.storage.local.get('cfgBarra').then(({ cfgBarra }) => {
    cfg = { ...cfg, ...(cfgBarra || {}), radar: { ...cfg.radar, ...((cfgBarra || {}).radar || {}) } };
    if (!Array.isArray(cfg.radar.paises) || !cfg.radar.paises.length) cfg.radar.paises = ['EC', 'MX', 'CO'];
    rSel.cantidad.value = String(cfg.radar.cantidad);
    rSel.dias.value = String(cfg.radar.dias);
    rSel.ritmo.value = String(cfg.radar.ritmo);
    rSel.auto.value = String(cfg.radar.auto || 0);
    for (const c of rPaises) $('input', c).checked = cfg.radar.paises.includes(c.dataset.pais);
    ui.tope.value = cfg.tope;
    $('input', ui.soloNuevos).checked = cfg.soloNuevos;
    ui.orden.value = cfg.orden;
    $('input', ui.envioAuto).checked = cfg.envioAuto;
    $('input', ui.liviano).checked = cfg.liviano;
    aplicarVista();
  });
  const guardarCfg = () => chrome.storage.local.set({ cfgBarra: cfg });
  ui.tope.addEventListener('change', () => { cfg.tope = Math.max(10, Number(ui.tope.value) || 120); ui.tope.value = cfg.tope; guardarCfg(); });
  $('input', ui.soloNuevos).addEventListener('change', (e) => { cfg.soloNuevos = e.target.checked; guardarCfg(); aplicarVista(); });
  ui.orden.addEventListener('change', () => { cfg.orden = ui.orden.value; guardarCfg(); aplicarVista(); });
  $('input', ui.envioAuto).addEventListener('change', (e) => { cfg.envioAuto = e.target.checked; guardarCfg(); });
  $('input', ui.liviano).addEventListener('change', (e) => { cfg.liviano = e.target.checked; guardarCfg(); });

  chrome.storage.local.get('vistosLocal').then(({ vistosLocal: lista = [] }) => { for (const id of lista) vistosLocal.add(String(id)); pintar(); });

  // ───────────────────────── Sesión con IMPORCHAT ─────────────────────────
  let modo = 'cargando'; // 'invitado' | 'sinaddon' | 'ok' (ver la nota sobre barra.dataset.modo)
  async function comprobarSesion() {
    const r = await mensaje('ping');
    sesion = r.ok ? r.data : null;
    const sinAddon = Boolean(sesion?.ok && sesion.addon && !sesion.addon.activo);
    // Un barrido del radar en curso manda: ese equipo es de operación y debe seguir viendo
    // toda la barra (y el motivo del fallo) aunque la sesión se caiga un rato.
    const radar = await leerRadar().catch(() => null);
    const operando = Boolean(radar?.activo);
    const web = sesion?.web || (await mensaje('config'))?.webOrigen || 'https://chatcenter.imporfactory.app';
    modo = sesion?.ok && !sinAddon ? 'ok' : operando ? 'ok' : sinAddon ? 'sinaddon' : 'invitado';
    barra.dataset.modo = modo;
    ui.radar.classList.toggle('ei-oculto', !(sesion?.acceso?.super_admin || operando));
    $('#ei-abrirweb', ajustesPanel).href = `${web}/imporkiller`;
    if (modo === 'sinaddon') {
      // Hay sesión, pero la cuenta no tiene el complemento: se ofrece activarlo.
      const precio = sesion.addon.precio || 10;
      ui.gancho.textContent = `Hola${sesion.usuario?.nombre ? `, ${sesion.usuario.nombre}` : ''}. Activa ImporKiller para ver los días activos de cada anuncio, agruparlos por producto y descargar sus creativos.`;
      ui.cta.textContent = `Activar ImporKiller · $${precio}/mes`;
      ui.cta.href = `${web}/complementos`;
    } else if (modo === 'invitado') {
      ui.gancho.textContent = 'Inicia sesión en ImporChat para ver cuántos días lleva activo cada anuncio, agruparlos por producto y descargar sus creativos.';
      ui.cta.textContent = 'Iniciar sesión';
      ui.cta.href = `${web}/imporkiller`;
    }
    ui.sesion.textContent = sesion?.ok
      ? `Conectado: ${sesion.usuario?.nombre || 'ImporChat'}${sinAddon ? ' · sin complemento' : ''}`
      : `IMPORCHAT: ${r.message || 'sin sesión'}`;
    ui.sesion.title = sesion?.ok
      ? (sinAddon ? 'Tu cuenta no tiene el complemento ImporKiller' : '')
      : 'Abre IMPORCHAT en otra pestaña e inicia sesión';
    pintarCabeceras();
    return Boolean(sesion?.ok);
  }
  comprobarSesion();
  // Al iniciar (o cerrar) sesión en la pestaña de ImporChat, la barra se entera sola.
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area === 'local' && cambios.token) comprobarSesion();
  });

  // ───────────────────────── Pintar ─────────────────────────
  function pintarCabeceras() {
    const porProducto = new Map();
    for (const [p, l] of grupos()) porProducto.set(p, l.length);
    for (const t of tarjetas.values()) {
      if (!t.node || !t.node.isConnected) continue;
      let head = t.node.querySelector(':scope > [data-ei-head]');
      if (!head) {
        head = el('div', { class: 'ei-head', 'data-ei-head': '1' });
        t.node.prepend(head);
      }
      head.replaceChildren();
      if (t.dias !== null) head.appendChild(el('span', { class: 'ei-chip ei-dias', text: `${t.dias} d`, title: `En circulación desde ${iso(t.inicio)}` }));
      if (t.url_destino) head.appendChild(el('a', { class: 'ei-abrir', href: t.url_destino, target: '_blank', rel: 'noopener noreferrer', text: 'ABRIR', title: t.url_destino }));
      if (t.dominio) head.appendChild(el('a', { class: 'ei-abrir', href: urlAnunciosDominio(t.dominio), target: '_blank', rel: 'noopener noreferrer', text: 'Tienda', title: `Todos los anuncios de ${t.dominio} en la Biblioteca` }));
      // Descargar y seguir son de quien tiene sesión con el complemento; sin él queda lo informativo.
      if (modo === 'ok') head.appendChild(el('button', { class: 'ei-btn', text: bajados.has(t.id) ? 'Descargado' : 'Descargar', title: 'Descargar este anuncio', onclick: () => bajarUno(t) }));
      head.appendChild(el('button', { class: 'ei-btn', text: 'Copiar', title: 'Copiar el texto del anuncio', onclick: (e) => copiarTexto(t, e.currentTarget) }));
      if (t.dominio && modo === 'ok') head.appendChild(el('button', { class: `ei-btn${seguidas.has(t.dominio) ? ' ei-on' : ''}`, text: seguidas.has(t.dominio) ? 'Siguiendo' : 'Seguir', title: `Seguir ${t.dominio} en IMPORCHAT`, onclick: (e) => seguirTienda(t, e.currentTarget) }));
      head.appendChild(el('span', { class: 'ei-chip', text: `${porProducto.get(t.producto) || 1} anuncios`, title: t.producto }));
      if (t.tienda_plataforma) head.appendChild(el('span', { class: `ei-chip ei-pl-${t.tienda_plataforma}`, text: PLATAFORMA_TXT[t.tienda_plataforma] || t.tienda_plataforma, title: 'A dónde manda el anuncio' }));
      if (t.tipo === 'video') head.appendChild(el('span', { class: 'ei-chip', text: media[t.id]?.hd ? 'video HD' : 'video' }));
      if (t.n_duplicados > 1) head.appendChild(el('span', { class: 'ei-chip', text: `×${t.n_duplicados}` }));
      if (esNuevo(t.id)) head.appendChild(el('span', { class: 'ei-chip ei-nuevo', text: 'Nuevo' }));
      if (enviados.has(t.id)) head.appendChild(el('span', { class: 'ei-chip', text: 'en IMPORCHAT' }));
    }
  }

  function aplicarVista() {
    // Filtro «Solo nuevos».
    for (const t of tarjetas.values()) {
      if (!t.node) continue;
      t.node.classList.toggle('ei-oculta', cfg.soloNuevos && !esNuevo(t.id));
    }
    // Orden: se mueven los nodos dentro de su propio padre.
    if (cfg.orden !== 'ninguno') {
      const porPadre = new Map();
      for (const t of tarjetas.values()) {
        if (!t.node || !t.node.isConnected) continue;
        const p = t.node.parentElement;
        (porPadre.get(p) || porPadre.set(p, []).get(p)).push(t);
      }
      const val = (t) => (cfg.orden === 'activos' ? (t.dias ?? -1) : (t.inicio ? t.inicio.getTime() : 0));
      for (const [padre, lista] of porPadre) {
        if (lista.length < 2) continue;
        lista.sort((a, b) => val(b) - val(a));
        for (const t of lista) padre.appendChild(t.node);
      }
    }
  }

  function pintar() {
    leerTarjetas();
    const g = grupos();
    const total = [...g.values()].reduce((n, [, l]) => n + l.length, 0);
    const nuevos = [...tarjetas.keys()].filter(esNuevo).length;
    ui.total.textContent = `${total} anuncios · ${g.length} productos · ${nuevos} nuevos`;
    if (productoSel && !g.some(([p]) => p === productoSel)) productoSel = '';
    pintarProductoBtn();
    if (prodPanel.classList.contains('ei-abierto')) pintarProductos();
    pintarCabeceras();
    aplicarVista();
    if (!total && !cargando) {
      const txt = document.body.innerText || '';
      if (/~?0 resultados|no se encontraron|no hay anuncios|sin resultados|no ads match|no ads found|no encontramos|0 results/i.test(txt)) decir('Meta no muestra anuncios para esta búsqueda', 'err');
    }
  }
  // La Biblioteca es una SPA: al cambiar la búsqueda (q, página, país) se empieza de cero,
  // si no los conteos y los productos de la búsqueda anterior se quedan sumando.
  const claveBusqueda = () => {
    const p = new URLSearchParams(location.search);
    return ['q', 'view_all_page_id', 'country', 'search_type', 'active_status'].map((k) => p.get(k) || '').join('|');
  };
  let busquedaPrev = claveBusqueda();
  function reiniciar() {
    tarjetas.clear();
    tituloProducto.clear();
    document.querySelectorAll('[data-ei-head]').forEach((n) => n.remove());
    document.querySelectorAll('[data-ei-id]').forEach((n) => { delete n.dataset.eiId; });
    productoSel = '';
    decir('Nueva búsqueda: leyendo anuncios…');
    pintar();
  }
  setInterval(() => {
    const ahora = claveBusqueda();
    if (ahora !== busquedaPrev) { busquedaPrev = ahora; cargando = false; sincronizarSelectores(); reiniciar(); }
  }, 600);

  let timerPintar = null;
  new MutationObserver((muts) => {
    if (muts.every((m) => m.target.closest?.('#ei-barra,#ei-toast,[data-ei-head]'))) return;
    clearTimeout(timerPintar);
    timerPintar = setTimeout(pintar, 700);
  }).observe(document.body, { childList: true, subtree: true });
  pintar();

  // ───────────────────────── Cargar más ─────────────────────────
  ui.cargar.addEventListener('click', async () => {
    if (cargando) { cargando = false; return; }
    cargando = true;
    ui.cargar.textContent = 'Detener';
    let quietos = 0;
    let antes = tarjetas.size;
    decir(`cargando ${antes}/${cfg.tope}…`);
    while (cargando && quietos < 5 && tarjetas.size < cfg.tope) {
      window.scrollTo(0, document.body.scrollHeight);
      await esperar(2000);
      leerTarjetas();
      const ahora = tarjetas.size;
      quietos = ahora === antes ? quietos + 1 : 0;
      antes = ahora;
      decir(`cargando ${ahora}/${cfg.tope}…${quietos ? ` (esperando a Meta ${quietos}/5)` : ''}`);
      if (cfg.liviano && tarjetas.size > 500) aliviar();
    }
    cargando = false;
    ui.cargar.textContent = 'Cargar más';
    pintar();
    decir(tarjetas.size >= cfg.tope ? `Tope alcanzado: ${tarjetas.size} anuncios` : `Meta no trajo más: ${tarjetas.size} anuncios`, 'ok');
    if (cfg.envioAuto && (sesion?.ok || (await comprobarSesion()))) enviar();
  });

  // Modo liviano: suelta del DOM las tarjetas ya enviadas (y bajadas si se pidió) para no agotar memoria.
  function aliviar() {
    let n = 0;
    for (const t of tarjetas.values()) {
      if (!t.node || !enviados.has(t.id)) continue;
      t.node.remove();
      t.node = null;
      n++;
    }
    if (n) decir(`modo liviano: ${n} tarjetas liberadas de la página (siguen contadas)`);
  }

  // ───────────────────────── Enviar a IMPORCHAT ─────────────────────────
  // opts.productoRadar: id de Dropi cuando la búsqueda la hizo el radar; el backend
  // vincula estos anuncios a ese producto y no se registra «tienda analizada».
  async function enviar(opts = {}) {
    const radarId = Number(opts.productoRadar) || null;
    if (!(sesion?.ok || (await comprobarSesion()))) { decir('No se pudo hablar con IMPORCHAT: revisa la sesión en el icono de la extensión', 'err'); return { ok: false }; }
    const pais = radarId ? (opts.pais || paisDeUrl()) : paisDeUrl();
    const dominio = radarId ? '' : dominioBuscado();
    const pendientes = radarId ? [...tarjetas.values()] : [...tarjetas.values()].filter((t) => !enviados.has(t.id));
    if (!pendientes.length) { decir('Nada nuevo que enviar', 'ok'); return { ok: true, mandados: 0 }; }
    ui.enviar.disabled = true;
    let nuevos = 0, mandados = 0;
    // Los lotes se cortan por cantidad Y por peso: el backend acepta cuerpos de hasta
    // 100 KB y un producto con ~40 anuncios (enlaces de video largos, textos de 2.000
    // caracteres) ya lo pasaba; el envío volvía «El cuerpo de la petición es demasiado
    // grande» y el radar reintentaba el mismo producto. Se mide en bytes (tildes y
    // emojis pesan más que un carácter) y se deja margen para el resto del cuerpo.
    // Los campos que viajan son los mismos de siempre; solo cambia en cuántos envíos.
    const aAnuncio = (t) => ({
      ad_archive_id: t.id,
      pagina_id: t.pagina_id,
      pagina_nombre: t.pagina_nombre,
      dominio: t.dominio,
      url_destino: t.url_destino,
      producto: t.producto,
      texto: t.texto,
      titulo: t.titulo,
      tipo: t.tipo,
      media_url: media[t.id]?.hd || media[t.id]?.sd || t.sd || media[t.id]?.img || t.img || '',
      imagen_url: media[t.id]?.img || t.img || media[t.id]?.imgChica || '',
      inicio: iso(t.inicio),
      n_duplicados: t.n_duplicados,
      plataformas: t.plataformas,
      tienda_plataforma: t.tienda_plataforma || null,
    });
    const LOTE_MAX_ANUNCIOS = 200;
    const LOTE_MAX_BYTES = 60000;
    const codificador = new TextEncoder();
    const lotes = [];
    let loteActual = [], pesoActual = 0;
    for (const t of pendientes) {
      const anuncio = aAnuncio(t);
      const peso = codificador.encode(JSON.stringify(anuncio)).length + 1;
      if (loteActual.length && (loteActual.length >= LOTE_MAX_ANUNCIOS || pesoActual + peso > LOTE_MAX_BYTES)) {
        lotes.push(loteActual);
        loteActual = []; pesoActual = 0;
      }
      loteActual.push({ t, anuncio });
      pesoActual += peso;
    }
    if (loteActual.length) lotes.push(loteActual);
    let avance = 0;
    for (const parte of lotes) {
      const lote = parte.map((x) => x.t);
      const anuncios = parte.map((x) => x.anuncio);
      avance += lote.length;
      decir(`enviando ${avance}/${pendientes.length} a IMPORCHAT…`);
      const r = await mensaje('enviarAnuncios', { body: { pais, dominio_buscado: dominio, fuente: radarId ? 'radar' : 'meta_ad_library', producto_radar: radarId || undefined, anuncios } });
      if (!r.ok) { decir(`No se pudo hablar con IMPORCHAT: ${r.message || 'error'}`, 'err'); ui.enviar.disabled = false; return { ok: false, message: r.message }; }
      for (const t of lote) enviados.add(t.id);
      for (const id of r.data?.conocidos_ids || []) { conocidos.add(String(id)); nuevosSesion.delete(String(id)); }
      for (const id of r.data?.nuevos_ids || []) nuevosSesion.add(String(id));
      nuevos += (r.data?.nuevos_ids || []).length;
      mandados += lote.length;
    }
    ui.enviar.disabled = false;
    decir(`${mandados} anuncios guardados en ImporKiller · ${nuevos} eran nuevos`, 'ok');
    if (dominio) mensaje('tiendaVista', { body: { dominio, pais, anuncios_activos_vistos: tarjetas.size } });
    pintar();
    if (cfg.liviano && tarjetas.size > 500) aliviar();
    return { ok: true, mandados, nuevos };
  }
  ui.enviar.addEventListener('click', () => enviar());

  // ───────────────────────── Radar: barrido automático de productos ─────────────────────────
  // Toma de IMPORCHAT los productos de Dropi que más venden (y los seguidos), busca cada uno
  // por nombre en la Biblioteca, manda lo que sale vinculado al producto y pasa al siguiente.
  // El estado vive en chrome.storage porque cada búsqueda es una carga completa de página.
  const RADAR_TOPE = 60; // anuncios por producto: la primera tanda de Meta más un desplazamiento
  const urlRadar = (pais, termino) =>
    `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${pais}&q=${encodeURIComponent(termino)}&search_type=keyword_unordered&media_type=all`;
  const leerRadar = async () => (await chrome.storage.local.get('radar')).radar || null;
  const guardarRadar = async (radar) => {
    await chrome.storage.local.set({ radar });
    latir(radar).catch(() => {});
  };
  // Latido: le dice a IMPORCHAT cómo va el radar para que la portada (super admin) avise
  // si quedó en pausa por una verificación de Meta o si dejó de dar señales (equipo
  // apagado, Chrome cerrado). Se manda cuando cambia el estado y, si no, cada 10 min;
  // «detenido» se manda una sola vez. La barra se recarga con cada producto, así que el
  // control de «cuándo fue el último» vive en chrome.storage y no en esta pestaña.
  const LATIDO_CADA_MS = 10 * 60 * 1000;
  async function latir(radar) {
    if (!radar) return;
    const ahora = Date.now();
    const esperandoAuto = radar.activo && radar.auto && !radar.cola?.[radar.idx] && radar.auto.siguienteEn > ahora;
    const estado = !radar.activo ? 'detenido'
      : radar.pausado ? 'pausado'
      : radar.descansoHasta > ahora ? 'descanso'
      : esperandoAuto ? 'esperando'
      : 'corriendo';
    const motivo = String(radar.error || '').slice(0, 250);
    const firma = `${estado}|${radar.pais || ''}|${motivo}`;
    const { radarLatido: previo } = await chrome.storage.local.get('radarLatido');
    const cambio = !previo || previo.firma !== firma;
    if (!cambio && (estado === 'detenido' || ahora - (previo.en || 0) < LATIDO_CADA_MS)) return;
    await chrome.storage.local.set({ radarLatido: { firma, en: ahora } });
    const r = await mensaje('radarLatido', {
      body: {
        estado, cambio, motivo, pais: radar.pais || null,
        hecho: Math.min(radar.idx || 0, radar.cola?.length || 0), total: radar.cola?.length || 0, anuncios: radar.anuncios || 0,
        auto: Boolean(radar.auto), version: chrome.runtime.getManifest().version,
        equipo: `${navigator.userAgentData?.platform || navigator.platform || '?'} · Chrome`,
      },
    });
    // Si IMPORCHAT no lo recibió, que el próximo intento no espere 10 min.
    if (!r?.ok) await chrome.storage.local.set({ radarLatido: { firma: '', en: 0 } });
  }
  setInterval(() => leerRadar().then((r) => latir(r)).catch(() => {}), LATIDO_CADA_MS);

  const radarPanel = el('div', { id: 'ei-radarpanel' });
  document.body.appendChild(radarPanel);
  const opcion = (v, t) => el('option', { value: String(v), text: t });
  const rSel = {
    cantidad: el('select', {}, [opcion(50, '50 productos'), opcion(100, '100 productos'), opcion(300, '300 productos'), opcion(600, '600 productos'), opcion(1000, '1.000 productos')]),
    dias: el('select', {}, [opcion(3, 'hace más de 3 días'), opcion(7, 'hace más de 7 días'), opcion(14, 'hace más de 14 días'), opcion(30, 'hace más de 30 días')]),
    ritmo: el('select', {}, [opcion(10, '10 s · rápido'), opcion(15, '15 s'), opcion(20, '20 s · recomendado'), opcion(30, '30 s · tranquilo')]),
    // Modo automático: al terminar la cola sigue con el siguiente país y, hecha la
    // vuelta, espera N horas y repite. Pensado para un Chrome que queda encendido.
    auto: el('select', {}, [opcion(0, 'No: una sola vez'), opcion(6, 'Sí, cada 6 h'), opcion(12, 'Sí, cada 12 h'), opcion(24, 'Sí, cada 24 h')]),
  };
  rSel.cantidad.value = '300'; rSel.dias.value = '7'; rSel.ritmo.value = '20'; rSel.auto.value = '0';
  // Todos los países de Dropi; por defecto solo EC, MX y CO marcados (los demás se
  // marcan cuando IMPORCHAT ya tenga fotos de ese país, si no la cola sale vacía).
  const RADAR_PAISES = ['EC', 'MX', 'CO', 'PE', 'CL', 'AR', 'PA', 'CR', 'GT', 'PY', 'VE'];
  const rPaises = RADAR_PAISES.map((p) => el('label', { 'data-pais': p }, [el('input', ['EC', 'MX', 'CO'].includes(p) ? { type: 'checkbox', checked: '' } : { type: 'checkbox' }), p]));
  const guardarRadarCfg = () => {
    cfg.radar = {
      cantidad: Number(rSel.cantidad.value) || 300,
      dias: Number(rSel.dias.value) || 7,
      ritmo: Number(rSel.ritmo.value) || 20,
      auto: Number(rSel.auto.value) || 0,
      paises: rPaises.filter((c) => $('input', c).checked).map((c) => c.dataset.pais),
    };
    if (!cfg.radar.paises.length) { cfg.radar.paises = [paisDeUrl() === 'ALL' ? 'EC' : paisDeUrl()]; for (const c of rPaises) $('input', c).checked = cfg.radar.paises.includes(c.dataset.pais); }
    chrome.storage.local.set({ cfgBarra: cfg });
  };
  for (const s of [rSel.cantidad, rSel.dias, rSel.ritmo, rSel.auto]) s.addEventListener('change', guardarRadarCfg);
  for (const c of rPaises) $('input', c).addEventListener('change', guardarRadarCfg);
  const rUi = {
    estado: el('div', { class: 'ei-estado', text: 'Sin barrido en curso.' }),
    prog: el('div', { class: 'ei-prog' }, [el('i')]),
    actual: el('p', { text: '' }),
    empezar: el('button', { class: 'ei-ir', text: 'Empezar barrido' }),
    pausar: el('button', { text: 'Pausar' }),
    parar: el('button', { class: 'ei-parar', text: 'Detener' }),
  };
  radarPanel.append(
    el('h4', { text: 'Radar de anuncios' }),
    el('p', { text: 'Busca en Meta, uno por uno, los productos de Dropi que más venden y guarda sus anuncios en IMPORCHAT vinculados al producto. Deja esta pestaña abierta; puedes seguir trabajando en otra.' }),
    el('div', { class: 'ei-grid' }, [
      el('label', { class: 'ei-campo' }, ['Cuántos productos', rSel.cantidad]),
      el('label', { class: 'ei-campo' }, ['Repetir los buscados', rSel.dias]),
      el('label', { class: 'ei-campo' }, ['Pausa entre productos', rSel.ritmo]),
      el('label', { class: 'ei-campo' }, ['País', el('b', { id: 'ei-radar-pais', text: paisDeUrl() === 'ALL' ? 'EC (elige país en Meta)' : paisDeUrl() })]),
    ]),
    el('div', { class: 'ei-grid' }, [
      el('label', { class: 'ei-campo' }, ['Repetir solo', rSel.auto]),
      el('div', { class: 'ei-campo' }, ['Países del automático', el('div', { class: 'ei-paises' }, rPaises)]),
    ]),
    el('p', { class: 'ei-auto', text: 'Con «Repetir solo» el radar termina un país, sigue con el siguiente y, hecha la vuelta, espera las horas elegidas y repite mientras esta pestaña siga abierta. Para un Chrome que queda encendido: desactiva el ahorro de memoria de Chrome y deja IMPORCHAT abierto en otra pestaña. Si IMPORCHAT o Meta dejan de responder, el radar espera y reintenta solo; únicamente se detiene si Meta pide una verificación.' }),
    rUi.prog, rUi.estado, rUi.actual,
    el('div', { class: 'ei-acciones' }, [rUi.empezar, rUi.pausar, rUi.parar]),
  );
  ui.radar.addEventListener('click', async () => { radarPanel.classList.toggle('ei-abierto'); pintarRadar(await leerRadar()); });
  document.addEventListener('click', (e) => { if (!radarPanel.contains(e.target) && e.target !== ui.radar) radarPanel.classList.remove('ei-abierto'); });

  function pintarRadar(radar) {
    const activo = Boolean(radar?.activo);
    const total = radar?.cola?.length || 0;
    const idx = Math.min(radar?.idx || 0, total);
    ui.radar.classList.toggle('ei-activo', activo);
    const esperando = activo && radar.auto && !radar.cola?.[radar.idx] && radar.auto.siguienteEn > Date.now();
    ui.radar.textContent = activo
      ? esperando ? `Radar auto · ${new Date(radar.auto.siguienteEn).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : `Radar${radar.auto ? ' auto' : ''} ${idx}/${total}${radar.pausado ? ' (en pausa)' : ''}`
      : 'Radar';
    rUi.prog.firstChild.style.width = total ? `${Math.round((idx / total) * 100)}%` : '0';
    rUi.empezar.textContent = activo ? (radar.pausado ? 'Reanudar' : 'Barriendo…') : 'Empezar barrido';
    rUi.empezar.disabled = activo && !radar.pausado;
    rUi.pausar.disabled = !activo || radar.pausado;
    rUi.parar.disabled = !activo;
    for (const s of Object.values(rSel)) s.disabled = activo;
    if (!radar) { rUi.estado.textContent = 'Sin barrido en curso.'; rUi.estado.className = 'ei-estado'; rUi.actual.textContent = ''; return; }
    const mins = radar.inicio ? Math.max(1, Math.round((Date.now() - radar.inicio) / 60000)) : 0;
    rUi.estado.className = `ei-estado${radar.error ? ' err' : ''}`;
    const esperaAuto = activo && radar.auto && !radar.cola?.[radar.idx] && radar.auto.siguienteEn > Date.now();
    rUi.estado.textContent = radar.error
      ? radar.error
      : esperaAuto
        ? `Automático: vuelta ${radar.auto.vueltas || 0} hecha (${radar.auto.paises.join(', ')}). Próxima a las ${new Date(radar.auto.siguienteEn).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}; deja esta pestaña abierta.`
        : activo
        ? `${idx} de ${total} productos · ${radar.anuncios || 0} anuncios guardados · ${radar.conAnuncios || 0} productos con anuncios · ${mins} min`
        : `Último barrido: ${radar.hecho || 0} productos · ${radar.anuncios || 0} anuncios guardados · ${radar.conAnuncios || 0} con anuncios`;
    const p = radar.cola?.[radar.idx];
    rUi.actual.textContent = activo && p ? `Ahora: «${p.nombre}» → busca «${p.termino}»` : '';
  }

  rUi.empezar.addEventListener('click', async () => {
    const previo = await leerRadar();
    if (previo?.activo && previo.pausado) {
      previo.pausado = false; previo.error = ''; previo.fallos = 0; previo.descansos = 0; previo.descansoHasta = 0;
      await guardarRadar(previo);
      pintarRadar(previo);
      radarContinuar();
      return;
    }
    if (!(sesion?.ok || (await comprobarSesion()))) { rUi.estado.textContent = 'Abre IMPORCHAT en otra pestaña para tomar la sesión.'; rUi.estado.className = 'ei-estado err'; return; }
    const pais = paisDeUrl() === 'ALL' ? 'EC' : paisDeUrl();
    rUi.empezar.disabled = true;
    if (cfg.radar.auto > 0) {
      // Automático: empieza por el país de la pestaña (si está en la lista) y rota por los demás.
      const paises = cfg.radar.paises.includes(pais) ? [pais, ...cfg.radar.paises.filter((p) => p !== pais)] : [...cfg.radar.paises];
      const radar = {
        activo: true, pausado: false, pais: paises[0], cola: [], idx: 0, hecho: 0, anuncios: 0, conAnuncios: 0, fallos: 0,
        ritmo: Number(rSel.ritmo.value), inicio: Date.now(), error: '',
        auto: { paises, pendientes: [...paises], cadaMs: cfg.radar.auto * 3600 * 1000, siguienteEn: 0, vueltas: 0 },
      };
      await guardarRadar(radar);
      pintarRadar(radar);
      autoSiguiente(radar);
      return;
    }
    rUi.estado.textContent = 'Pidiendo a IMPORCHAT los productos que más venden…';
    const r = await mensaje('radarCola', { pais, limit: Number(rSel.cantidad.value), dias: Number(rSel.dias.value) });
    if (!r.ok) { rUi.estado.textContent = `No se pudo pedir la cola: ${r.message || 'error'}`; rUi.estado.className = 'ei-estado err'; rUi.empezar.disabled = false; return; }
    const cola = (r.data?.items || []).map((p) => ({ dropi_product_id: p.dropi_product_id, nombre: String(p.nombre || '').slice(0, 120), termino: p.termino }));
    if (!cola.length) { rUi.estado.textContent = `Nada pendiente: los ${Number(rSel.cantidad.value)} que más venden ya se buscaron ${rSel.dias.options[rSel.dias.selectedIndex].text}.`; rUi.empezar.disabled = false; return; }
    const radar = { activo: true, pausado: false, pais, cola, idx: 0, hecho: 0, anuncios: 0, conAnuncios: 0, fallos: 0, ritmo: Number(rSel.ritmo.value), inicio: Date.now(), error: '' };
    await guardarRadar(radar);
    pintarRadar(radar);
    location.assign(urlRadar(pais, cola[0].termino));
  });
  rUi.pausar.addEventListener('click', async () => {
    const radar = await leerRadar();
    if (!radar?.activo) return;
    radar.pausado = true;
    await guardarRadar(radar);
    pintarRadar(radar);
  });
  rUi.parar.addEventListener('click', async () => {
    const radar = await leerRadar();
    if (!radar) return;
    radar.activo = false; radar.pausado = false;
    await guardarRadar(radar);
    pintarRadar(radar);
    decir(`Radar detenido: ${radar.hecho} productos · ${radar.anuncios} anuncios guardados`, 'ok');
  });

  // Meta pide verificación (captcha, «confirma que eres humano», inicio de sesión forzado): la resuelve
  // una persona. Es lo único que deja el radar en pausa; todo lo demás se reintenta solo.
  const RE_VERIFICACION = /confirma que eres|no eres un robot|comprobaci[oó]n de seguridad|security check|verifica tu identidad|confirm you.re human|captcha|inicia sesi[oó]n para continuar|log in to continue|suspicious activity|actividad sospechosa/i;
  const metaPideVerificacion = () => RE_VERIFICACION.test((document.body.innerText || '').slice(0, 4000));
  // Descansos crecientes cuando Meta se queda en blanco: 10, 30 y luego 60 min cada vez.
  const minutosDescanso = (n) => (n <= 1 ? 10 : n === 2 ? 30 : 60);
  const horaDe = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  // Espera a que Meta pinte los resultados: tarjetas estables 3 lecturas seguidas, «0 resultados», o 35 s.
  async function esperarResultados() {
    let antes = -1, quietos = 0;
    for (let i = 0; i < 23; i++) {
      await esperar(1500);
      leerTarjetas();
      const n = tarjetas.size;
      if (n > 0 && n === antes) quietos++; else quietos = 0;
      antes = n;
      if (quietos >= 2) return 'ok';
      if (!n && /~?0 resultados|no se encontraron|no hay anuncios|sin resultados|no ads match|no ads found|no encontramos|0 results/i.test(document.body.innerText || '')) return 'vacio';
    }
    return tarjetas.size ? 'ok' : 'sin-respuesta';
  }

  async function radarContinuar() {
    const radar = await leerRadar();
    pintarRadar(radar);
    if (!radar?.activo || radar.pausado) return;
    // Automático sin producto en mano: o toca el siguiente país o está esperando la próxima vuelta.
    if (radar.auto && !radar.cola?.[radar.idx]) { autoSiguiente(radar); return; }
    const actual = radar.cola[radar.idx];
    if (!actual) { radar.activo = false; await guardarRadar(radar); pintarRadar(radar); return; }
    if (radar.descansoHasta && radar.descansoHasta > Date.now()) {
      // La pestaña se recargó en medio de un descanso: se respeta lo que falta.
      decir(`Radar descansando hasta las ${new Date(radar.descansoHasta).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`);
      await esperar(radar.descansoHasta - Date.now());
      const sigue = await leerRadar();
      if (!sigue?.activo || sigue.pausado) { pintarRadar(sigue); return; }
      sigue.descansoHasta = 0; sigue.error = '';
      await guardarRadar(sigue);
      location.assign(urlRadar(sigue.pais, sigue.cola[sigue.idx].termino));
      return;
    }
    const q = new URLSearchParams(location.search).get('q') || '';
    if (norm(q) !== norm(actual.termino) || paisDeUrl() !== radar.pais) { location.assign(urlRadar(radar.pais, actual.termino)); return; }

    decir(`Radar ${radar.idx + 1}/${radar.cola.length}: «${actual.nombre}»…`);
    let estado = await esperarResultados();
    if (estado === 'sin-respuesta' && !radar.reintento) {
      // Meta a veces se queda en blanco en la primera carga: una recarga antes de contarlo como fallo.
      radar.reintento = 1;
      await guardarRadar(radar);
      decir('Meta no pintó resultados: recargando una vez…');
      location.reload();
      return;
    }
    if (estado === 'ok' && tarjetas.size < RADAR_TOPE) {
      window.scrollTo(0, document.body.scrollHeight);
      await esperar(2500);
      leerTarjetas();
    }
    pintar();
    // Dos fallos distintos: Meta no pintó nada (se descansa) o IMPORCHAT no recibió lo
    // que se le mandó (sesión caída, API mal apuntada, servidor reiniciando: se espera
    // 2 min y se vuelve a intentar el mismo producto, sin contarlo como fallo de Meta).
    let ok = false;
    let fallaImporchat = '';
    if (estado === 'sin-respuesta') {
      ok = false;
    } else if (tarjetas.size) {
      const ids = [...tarjetas.keys()].slice(0, RADAR_TOPE);
      for (const id of [...tarjetas.keys()].slice(RADAR_TOPE)) tarjetas.delete(id);
      const r = await enviar({ productoRadar: actual.dropi_product_id, pais: radar.pais });
      ok = Boolean(r?.ok);
      if (ok) { radar.anuncios += ids.length; radar.conAnuncios += 1; }
      else fallaImporchat = r?.message || (sesion?.ok ? 'sin respuesta' : 'sin sesión');
    } else {
      const r = await mensaje('radarMarcar', { body: { pais: radar.pais, dropi_product_id: actual.dropi_product_id, ad_ids: [] } });
      ok = Boolean(r.ok);
      if (!ok) fallaImporchat = r.message || 'sin respuesta';
    }
    if (!ok && fallaImporchat) {
      sesion = null; // que el siguiente intento vuelva a preguntar por la sesión
      radar.descansoHasta = Date.now() + 2 * 60 * 1000;
      radar.error = `IMPORCHAT no respondió (${fallaImporchat}). Meta sí responde. Reintento el mismo producto a las ${horaDe(radar.descansoHasta)}; si es la sesión, abre o recarga la pestaña de IMPORCHAT.`;
      await guardarRadar(radar);
      pintarRadar(radar);
      decir('Radar: IMPORCHAT no respondió, reintento en 2 min', 'err');
      await esperar(radar.descansoHasta - Date.now());
      const sigue = await leerRadar();
      if (!sigue?.activo || sigue.pausado) { pintarRadar(sigue); return; }
      sigue.descansoHasta = 0;
      await guardarRadar(sigue);
      location.assign(urlRadar(sigue.pais, sigue.cola[sigue.idx].termino));
      return;
    }
    if (!ok) {
      radar.fallos = (radar.fallos || 0) + 1;
      if (radar.fallos >= 3) {
        // Tres productos seguidos sin respuesta: Meta limita las búsquedas (el 31-10 aguantó ~60 seguidas).
        // Descansa 10, 30 y luego 60 min cada vez, y sigue solo sin límite de descansos.
        // Nunca se intenta saltar una verificación: si Meta la pide, se pausa y la resuelve la persona.
        radar.fallos = 0;
        radar.descansos = (radar.descansos || 0) + 1;
        if (metaPideVerificacion()) {
          radar.pausado = true;
          radar.error = 'Meta pide una verificación en esta pestaña. Resuélvela y pulsa Reanudar; el radar no la salta solo.';
          await guardarRadar(radar);
          pintarRadar(radar);
          radarPanel.classList.add('ei-abierto');
          decir('Radar en pausa: Meta pide verificación', 'err');
          return;
        }
        const min = minutosDescanso(radar.descansos);
        radar.descansoHasta = Date.now() + min * 60 * 1000;
        radar.error = `Meta no pintó resultados en 3 búsquedas seguidas (descanso ${radar.descansos}). El radar descansa ${min} min y sigue solo a las ${horaDe(radar.descansoHasta)}.`;
        await guardarRadar(radar);
        pintarRadar(radar);
        decir(`Radar descansando ${min} min: Meta no responde`, 'err');
        await esperar(radar.descansoHasta - Date.now());
        const sigue = await leerRadar();
        if (!sigue?.activo || sigue.pausado) { pintarRadar(sigue); return; }
        sigue.error = '';
        sigue.descansoHasta = 0;
        await guardarRadar(sigue);
        location.assign(urlRadar(sigue.pais, sigue.cola[sigue.idx].termino));
        return;
      }
    } else {
      radar.fallos = 0;
      radar.descansos = 0;
      radar.error = '';
      radar.hecho += 1;
    }
    radar.idx += 1;
    radar.reintento = 0;
    if (radar.idx >= radar.cola.length) {
      if (radar.auto) {
        // Terminó este país: acumula y pasa al siguiente (o a esperar la próxima vuelta).
        const t = radar.auto.totales || { hecho: 0, anuncios: 0, conAnuncios: 0 };
        radar.auto.totales = { hecho: t.hecho + radar.hecho, anuncios: t.anuncios + radar.anuncios, conAnuncios: t.conAnuncios + radar.conAnuncios };
        await guardarRadar(radar);
        pintarRadar(radar);
        decir(`Radar ${radar.pais} terminado: ${radar.hecho} productos · ${radar.anuncios} anuncios. Sigo con el siguiente país…`, 'ok');
        autoSiguiente(radar);
        return;
      }
      radar.activo = false;
      await guardarRadar(radar);
      pintarRadar(radar);
      mostrarToast(`Radar terminado: ${radar.hecho} productos · ${radar.anuncios} anuncios guardados · ${radar.conAnuncios} con anuncios`, false);
      setTimeout(ocultarToast, 15000);
      return;
    }
    await guardarRadar(radar);
    pintarRadar(radar);
    // Pausa con algo de variación para no parecer una ráfaga; se vuelve a leer por si pulsaron Pausar/Detener.
    await esperar(radar.ritmo * 1000 + Math.round(Math.random() * 3000));
    const ahora = await leerRadar();
    if (!ahora?.activo || ahora.pausado) { pintarRadar(ahora); return; }
    location.assign(urlRadar(ahora.pais, ahora.cola[ahora.idx].termino));
  }
  // Modo automático: pide la cola del siguiente país pendiente y la arranca; cuando
  // no queda ninguno, programa la próxima vuelta (cadaMs) y espera con la pestaña
  // abierta. Si la pestaña se recarga a mitad de la espera, radarContinuar vuelve
  // a entrar aquí y respeta la hora guardada. Nunca salta una verificación de Meta:
  // si la pide, se pausa igual que en el modo manual; todo lo demás se reintenta solo.
  async function autoSiguiente(radar) {
    const a = radar.auto;
    if (!a) return;
    const hora = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (a.siguienteEn && a.siguienteEn > Date.now()) {
      radar.cola = []; radar.idx = 0; radar.error = '';
      await guardarRadar(radar);
      pintarRadar(radar);
      decir(`Radar automático: próxima vuelta a las ${hora(a.siguienteEn)}`);
      await esperar(a.siguienteEn - Date.now());
      const sigue = await leerRadar();
      if (!sigue?.activo || sigue.pausado || !sigue.auto) { pintarRadar(sigue); return; }
      sigue.auto.siguienteEn = 0;
      sigue.auto.pendientes = [...sigue.auto.paises];
      await guardarRadar(sigue);
      autoSiguiente(sigue);
      return;
    }
    while (a.pendientes.length) {
      const pais = a.pendientes.shift();
      await guardarRadar(radar);
      decir(`Radar automático: pidiendo a IMPORCHAT los productos de ${pais}…`);
      const r = await mensaje('radarCola', { pais, limit: cfg.radar.cantidad, dias: cfg.radar.dias });
      if (!r.ok) {
        // IMPORCHAT no contestó (sesión vencida, servidor reiniciando, API mal apuntada):
        // el país vuelve a la cola, se espera 2 min y se reintenta; nunca se pausa solo.
        a.pendientes.unshift(pais);
        radar.error = `No se pudo pedir la cola de ${pais}: ${r.message || 'error'}. Reintento en 2 min; si es la sesión, abre o recarga la pestaña de IMPORCHAT.`;
        await guardarRadar(radar);
        pintarRadar(radar);
        sesion = null;
        await esperar(2 * 60 * 1000);
        const sigue = await leerRadar();
        if (!sigue?.activo || sigue.pausado || !sigue.auto) { pintarRadar(sigue); return; }
        continue;
      }
      const cola = (r.data?.items || []).map((p) => ({ dropi_product_id: p.dropi_product_id, nombre: String(p.nombre || '').slice(0, 120), termino: p.termino }));
      if (!cola.length) continue; // nada pendiente en este país: al siguiente
      Object.assign(radar, { pais, cola, idx: 0, hecho: 0, anuncios: 0, conAnuncios: 0, fallos: 0, descansos: 0, descansoHasta: 0, reintento: 0, error: '', inicio: Date.now(), ritmo: cfg.radar.ritmo });
      await guardarRadar(radar);
      pintarRadar(radar);
      location.assign(urlRadar(pais, cola[0].termino));
      return;
    }
    // Vuelta completa: a esperar.
    a.vueltas = (a.vueltas || 0) + 1;
    a.siguienteEn = Date.now() + a.cadaMs;
    a.pendientes = [];
    radar.cola = []; radar.idx = 0; radar.error = '';
    await guardarRadar(radar);
    pintarRadar(radar);
    const t = a.totales || { hecho: 0, anuncios: 0 };
    mostrarToast(`Radar automático: vuelta ${a.vueltas} terminada (${t.hecho} productos · ${t.anuncios} anuncios en total). Próxima a las ${hora(a.siguienteEn)}.`, false);
    setTimeout(ocultarToast, 20000);
    autoSiguiente(radar);
  }

  // Al cargar cada página de la Biblioteca: si hay un barrido en curso, sigue solo.
  setTimeout(radarContinuar, 1200);

  // ───────────────────────── Bajar anuncios ─────────────────────────
  $('#ei-toast-stop', toast).addEventListener('click', () => { bajando = false; });
  // Baja una lista de anuncios a Descargas/Espia/<dominio>/<producto>/. La usan el botón
  // de la barra (todo un producto), el desplegable y el botón Bajar de cada tarjeta (uno solo).
  async function bajarLista(lista, producto) {
    if (bajando || !lista.length) return;
    const dominio = lista.find((t) => t.dominio)?.dominio || dominioBuscado() || 'sin-dominio';
    bajando = true;
    ui.bajar.disabled = true;
    let ok = 0, sinHd = 0;
    const fallos = [];
    for (let i = 0; i < lista.length && bajando; i++) {
      const t = lista[i];
      mostrarToast(`Bajando ${i + 1}/${lista.length} de «${producto}»`, lista.length > 1);
      const m = media[t.id] || {};
      const url = m.hd || m.sd || t.sd || m.img || t.img;
      if (!url) { fallos.push(t.id); continue; }
      const esVideo = Boolean(m.hd || m.sd || t.sd);
      if (esVideo && !m.hd) sinHd++;
      const r = await mensaje('bajar', { url, dominio, producto, nombre: `${t.id}${esVideo ? (m.hd ? '_HD.mp4' : '.mp4') : '.jpg'}` });
      if (r.ok) { ok++; bajados.add(t.id); } else fallos.push(t.id);
    }
    const detenido = !bajando;
    bajando = false;
    ui.bajar.disabled = false;
    const resumen = `${detenido ? 'Detenido' : 'Listo'}: ${ok} de ${lista.length}` + (sinHd ? ` · ${sinHd} sin HD` : '') + (fallos.length ? ` · fallaron: ${fallos.join(', ')}` : '');
    mostrarToast(resumen, false);
    setTimeout(ocultarToast, 8000);
    decir(resumen, fallos.length ? 'err' : 'ok');
    pintar();
  }
  function bajarProducto(producto) {
    const lista = (grupos().find(([p]) => p === producto) || [])[1] || [];
    if (!lista.length) { decir('Elige un producto con anuncios', 'err'); return; }
    bajarLista(lista, producto);
  }
  ui.bajar.addEventListener('click', () => {
    if (!productoSel) { prodPanel.classList.add('ei-abierto'); pintarProductos(); prodBusca.focus(); decir('Elige el producto que quieres bajar', ''); return; }
    bajarProducto(productoSel);
  });

  // ───────────────────────── Acciones por anuncio ─────────────────────────
  function bajarUno(t) { bajarLista([t], t.producto || 'anuncio'); }
  async function copiarTexto(t, btn) {
    const texto = [t.titulo, t.texto].filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(texto); btn.textContent = 'Copiado'; } catch { btn.textContent = 'No se pudo'; }
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1800);
  }
  const urlAnunciosDominio = (dominio) =>
    `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${paisDeUrl() === 'ALL' ? 'ALL' : paisDeUrl()}&q=${encodeURIComponent(dominio)}&search_type=keyword_unordered&media_type=all`;
  // Seguir la tienda del anuncio en IMPORCHAT (pestaña Tiendas → «Solo seguidas»).
  const seguidas = new Set();
  async function seguirTienda(t, btn) {
    if (!t.dominio) return;
    if (!(sesion?.ok || (await comprobarSesion()))) { decir('Abre IMPORCHAT en otra pestaña para seguir tiendas', 'err'); return; }
    btn.disabled = true;
    const r = await mensaje('seguir', { body: { tipo: 'tienda', ref: t.dominio } });
    btn.disabled = false;
    if (!r.ok) { decir(`No se pudo seguir: ${r.message || 'error'}`, 'err'); return; }
    if (r.data?.seguida) seguidas.add(t.dominio); else seguidas.delete(t.dominio);
    decir(r.data?.seguida ? `Siguiendo ${t.dominio} en IMPORCHAT` : `Dejaste de seguir ${t.dominio}`, 'ok');
    pintarCabeceras();
  }
})();
