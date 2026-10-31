// Barra del «Espía de tiendas» sobre la Biblioteca de anuncios de Meta.
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
  let cfg = { tope: 120, soloNuevos: false, orden: 'ninguno', envioAuto: true, liviano: false };

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
      let producto = nombreDesdeUrl(u) || 'Sin enlace';
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
        img: imgs[0]?.src || '',
        inicio,
        dias: diasDesde(inicio),
        n_duplicados: Number(card.textContent.match(RE_DUPS)?.[1] || 1),
        plataformas: plataformasDe(card),
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
    .ei-oculta{display:none !important}
    #ei-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:2147483001;background:#132b4d;color:#fff;border:1px solid #00d4ff;border-radius:10px;padding:10px 14px;font:13px system-ui,sans-serif;display:none;gap:10px;align-items:center;max-width:90vw}
    #ei-toast button{border:0;border-radius:6px;padding:4px 10px;background:#ff8c8c;color:#3a0000;font-weight:700;cursor:pointer}
    body{padding-bottom:64px !important}
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

  const ui = {
    titulo: el('b', { text: 'Espía de tiendas' }),
    total: el('span', { id: 'ei-total', text: '0 anuncios · 0 productos' }),
    prod: el('select', { id: 'ei-prod' }),
    tope: el('input', { type: 'number', id: 'ei-tope', min: '10', max: '10000', step: '10', title: 'Tope de anuncios a cargar' }),
    cargar: el('button', { id: 'ei-cargar', text: 'Cargar más' }),
    soloNuevos: sw('ei-nuevos', 'Solo nuevos', false),
    orden: el('select', { id: 'ei-orden' }, [
      el('option', { value: 'ninguno', text: 'Orden de Meta' }),
      el('option', { value: 'activos', text: 'Más activos' }),
      el('option', { value: 'nuevos', text: 'Más nuevos' }),
    ]),
    bajar: el('button', { id: 'ei-bajar', class: 'ei-acento', text: 'Bajar anuncios' }),
    enviar: el('button', { id: 'ei-enviar', text: 'Enviar a IMPORCHAT' }),
    envioAuto: sw('ei-auto', 'Envío automático', true),
    liviano: sw('ei-liviano', 'Modo liviano', false),
    msg: el('span', { id: 'ei-msg' }),
    sesion: el('span', { class: 'ei-sesion', text: 'sin sesión' }),
  };
  barra.append(
    ui.titulo, ui.total, el('span', { class: 'ei-sep' }),
    ui.prod, ui.bajar, el('span', { class: 'ei-sep' }),
    el('span', { text: 'Tope' }), ui.tope, ui.cargar, el('span', { class: 'ei-sep' }),
    ui.soloNuevos, ui.orden, el('span', { class: 'ei-sep' }),
    ui.enviar, ui.envioAuto, ui.liviano, ui.msg, ui.sesion,
  );
  document.body.appendChild(barra);

  const toast = el('div', { id: 'ei-toast' }, [el('span', { id: 'ei-toast-txt' }), el('button', { id: 'ei-toast-stop', text: 'Detener' })]);
  document.body.appendChild(toast);
  const toastTxt = $('#ei-toast-txt', toast);
  const mostrarToast = (texto, conStop) => { toastTxt.textContent = texto; $('#ei-toast-stop', toast).style.display = conStop ? '' : 'none'; toast.style.display = 'flex'; };
  const ocultarToast = () => { toast.style.display = 'none'; };

  const decir = (texto, clase = '') => { ui.msg.textContent = texto; ui.msg.className = clase; };

  // ───────────────────────── Config persistida ─────────────────────────
  chrome.storage.local.get('cfgBarra').then(({ cfgBarra }) => {
    cfg = { ...cfg, ...(cfgBarra || {}) };
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
  async function comprobarSesion() {
    const r = await mensaje('ping');
    sesion = r.ok ? r.data : null;
    ui.sesion.textContent = sesion?.ok ? `IMPORCHAT: ${sesion.usuario?.nombre || 'conectado'}` : `IMPORCHAT: ${r.message || 'sin sesión'}`;
    ui.sesion.title = sesion?.ok ? '' : 'Abre IMPORCHAT en otra pestaña o pega el token en las opciones de la extensión';
    return Boolean(sesion?.ok);
  }
  comprobarSesion();

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
      if (t.url_destino) head.appendChild(el('a', { class: 'ei-abrir', href: t.url_destino, target: '_blank', rel: 'noopener noreferrer', text: 'ABRIR' }));
      head.appendChild(el('span', { class: 'ei-chip', text: `${porProducto.get(t.producto) || 1} anuncios`, title: t.producto }));
      if (t.tipo === 'video') head.appendChild(el('span', { class: 'ei-chip', text: media[t.id]?.hd ? 'video HD' : 'video' }));
      if (t.n_duplicados > 1) head.appendChild(el('span', { class: 'ei-chip', text: `×${t.n_duplicados}` }));
      if (esNuevo(t.id)) head.appendChild(el('span', { class: 'ei-chip ei-nuevo', text: 'Nuevo' }));
      if (bajados.has(t.id)) head.appendChild(el('span', { class: 'ei-chip ei-bajado', text: 'Bajado' }));
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
    const antes = ui.prod.value;
    ui.prod.replaceChildren(...g.map(([p, l]) => el('option', { value: p, text: `${p} (${l.length})` })));
    if (antes && g.some(([p]) => p === antes)) ui.prod.value = antes;
    pintarCabeceras();
    aplicarVista();
    if (!total && !cargando) {
      const txt = document.body.innerText || '';
      if (/~?0 resultados|no se encontraron anuncios|no ads match|no encontramos|0 results/i.test(txt)) decir('Meta no muestra anuncios para esta búsqueda', 'err');
    }
  }
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
  async function enviar() {
    if (!(sesion?.ok || (await comprobarSesion()))) { decir('No se pudo hablar con IMPORCHAT: revisa la sesión en el icono de la extensión', 'err'); return; }
    const pais = paisDeUrl();
    const dominio = dominioBuscado();
    const pendientes = [...tarjetas.values()].filter((t) => !enviados.has(t.id));
    if (!pendientes.length) { decir('Nada nuevo que enviar', 'ok'); return; }
    ui.enviar.disabled = true;
    let nuevos = 0, mandados = 0;
    for (let i = 0; i < pendientes.length; i += 200) {
      const lote = pendientes.slice(i, i + 200);
      const anuncios = lote.map((t) => ({
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
      }));
      decir(`enviando ${Math.min(i + 200, pendientes.length)}/${pendientes.length} a IMPORCHAT…`);
      const r = await mensaje('enviarAnuncios', { body: { pais, dominio_buscado: dominio, fuente: 'meta_ad_library', anuncios } });
      if (!r.ok) { decir(`No se pudo hablar con IMPORCHAT: ${r.message || 'error'}`, 'err'); ui.enviar.disabled = false; return; }
      for (const t of lote) enviados.add(t.id);
      for (const id of r.data?.conocidos_ids || []) { conocidos.add(String(id)); nuevosSesion.delete(String(id)); }
      for (const id of r.data?.nuevos_ids || []) nuevosSesion.add(String(id));
      nuevos += (r.data?.nuevos_ids || []).length;
      mandados += lote.length;
    }
    ui.enviar.disabled = false;
    decir(`IMPORCHAT recibió ${mandados} anuncios · ${nuevos} eran nuevos`, 'ok');
    if (dominio) mensaje('tiendaVista', { body: { dominio, pais, anuncios_activos_vistos: tarjetas.size } });
    pintar();
    if (cfg.liviano && tarjetas.size > 500) aliviar();
  }
  ui.enviar.addEventListener('click', enviar);

  // ───────────────────────── Bajar anuncios ─────────────────────────
  $('#ei-toast-stop', toast).addEventListener('click', () => { bajando = false; });
  ui.bajar.addEventListener('click', async () => {
    if (bajando) return;
    const producto = ui.prod.value;
    const lista = (grupos().find(([p]) => p === producto) || [])[1] || [];
    if (!lista.length) { decir('Elige un producto con anuncios', 'err'); return; }
    const dominio = lista.find((t) => t.dominio)?.dominio || dominioBuscado() || 'sin-dominio';
    bajando = true;
    ui.bajar.disabled = true;
    let ok = 0, sinHd = 0;
    const fallos = [];
    for (let i = 0; i < lista.length && bajando; i++) {
      const t = lista[i];
      mostrarToast(`Bajando ${i + 1}/${lista.length} de «${producto}»`, true);
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
  });
})();
