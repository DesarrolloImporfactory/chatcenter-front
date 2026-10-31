// Capa «Espía de mercado» sobre el catálogo de Dropi (app.dropi.ec / app.dropi.mx).
// Debajo de cada producto que el usuario tiene a la vista pinta las ventas
// estimadas por IMPORCHAT (1 d / 7 d / 30 d), la tendencia, el stock y cuántos
// proveedores venden lo mismo; en la ficha de un producto abre un panel con el
// histórico de 14 días. No toca nada de Dropi ni manda datos de la cuenta del
// usuario: solo lee los ids de producto que ya están en la página y pide sus
// métricas al backend de IMPORCHAT (POST /espia/productos/lote, vía bg.js).
(() => {
  const PAIS = { 'app.dropi.ec': 'EC', 'app.dropi.mx': 'MX' }[location.hostname];
  if (!PAIS) return;

  const RE_ID = [/product-details\/(\d+)/i, /\/products?\/(\d+)(?:[/?#]|$)/i, /[?&]product_id=(\d+)/i, /\/producto\/(\d+)/i];
  const idDe = (href) => {
    for (const re of RE_ID) {
      const m = String(href || '').match(re);
      if (m) return Number(m[1]);
    }
    return null;
  };

  const cache = new Map(); // id → métricas | null (no lo conocemos)
  const pendientes = new Set();
  const esperando = new Map(); // id → [elementos a pintar]
  let temporizador = null;
  let sinSesion = false;
  let diasMedidos = null;
  let webImporchat = 'https://chatcenter.imporfactory.app';

  chrome.runtime.sendMessage({ tipo: 'config' }, (cfg) => {
    if (chrome.runtime.lastError) return;
    if (cfg?.tokenOrigen && cfg.tokenOrigen !== 'manual') webImporchat = cfg.tokenOrigen;
  });

  const fmt = (n) => Number(n || 0).toLocaleString('es-EC');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function sparkline(serie, ancho = 64, alto = 22) {
    const v = (serie || []).map((x) => Number(x) || 0);
    if (!v.length) return '';
    const max = Math.max(1, ...v);
    const paso = ancho / Math.max(1, v.length - 1);
    const pts = v.map((y, i) => `${(i * paso).toFixed(1)},${(alto - 2 - (y / max) * (alto - 4)).toFixed(1)}`).join(' ');
    return `<svg class="imp-espia-spark" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>
    </svg>`;
  }

  function tendencia(m) {
    const d = m.ventas_7d - m.ventas_7d_prev;
    if (!m.ventas_7d_prev && !m.ventas_7d) return { clase: '', texto: '—' };
    if (!m.ventas_7d_prev) return { clase: 'imp-espia-sube', texto: 'nuevo' };
    const pct = Math.round((d / m.ventas_7d_prev) * 100);
    return { clase: d > 0 ? 'imp-espia-sube' : d < 0 ? 'imp-espia-baja' : '', texto: `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(pct)}%` };
  }

  // Tarjeta compacta al estilo Dropkiller: cabe en los 212 px útiles de la tarjeta de Dropi.
  // Dropi ya muestra proveedor, precio y stock, así que aquí van solo las ventas estimadas.
  function htmlBadge(id, m) {
    const url = esc((m && m.url_imporchat) || `${webImporchat}/espia-mercado?pais=${PAIS}&tab=productos&producto=${id}`);
    if (m === null) {
      return `
        <div class="imp-espia-cab"><span class="imp-espia-logo">IMPORCHAT</span><span class="imp-espia-sub">Espía de mercado</span></div>
        <div class="imp-espia-nota">Sin datos todavía: entra al catálogo público en la próxima pasada.</div>`;
    }
    const t = tendencia(m);
    const pocosDias = diasMedidos != null && diasMedidos < 7;
    return `
      <div class="imp-espia-cab">
        <span class="imp-espia-logo">IMPORCHAT</span>
        <span class="imp-espia-sub">${pocosDias ? `${diasMedidos} día${diasMedidos === 1 ? '' : 's'} medido${diasMedidos === 1 ? '' : 's'}` : 'Ventas estimadas'}</span>
      </div>
      <div class="imp-espia-fila">
        <span class="imp-espia-k"><small>Ventas 30 días</small><b>${fmt(m.ventas_30d)}</b></span>
        ${sparkline(m.serie_14d, 72, 26)}
      </div>
      <div class="imp-espia-fila imp-espia-tres">
        <span class="imp-espia-k"><small>24 h</small><b>${fmt(m.ventas_1d)}</b></span>
        <span class="imp-espia-k"><small>7 días</small><b>${fmt(m.ventas_7d)}</b></span>
        <span class="imp-espia-k"><small>Tendencia</small><b class="${t.clase}">${t.texto}</b></span>
      </div>
      <a class="imp-espia-btn" href="${url}" target="_blank" rel="noopener">Ver análisis completo ›</a>
      ${m.n_iguales ? `<div class="imp-espia-nota">${m.n_iguales} proveedor${m.n_iguales === 1 ? '' : 'es'} más con este producto</div>` : ''}`;
  }

  function pintar(id) {
    const nodos = esperando.get(id) || [];
    esperando.delete(id);
    const m = cache.has(id) ? cache.get(id) : undefined;
    for (const el of nodos) {
      if (!el.isConnected) continue;
      if (sinSesion) {
        el.dataset.estado = 'sin-sesion';
        el.innerHTML = `<div class="imp-espia-cab"><span class="imp-espia-logo">IMPORCHAT</span></div><div class="imp-espia-nota">Abre IMPORCHAT en otra pestaña para ver las ventas estimadas.</div>`;
        continue;
      }
      if (m === undefined) continue;
      el.dataset.estado = m === null ? 'sin-datos' : 'ok';
      el.innerHTML = htmlBadge(id, m);
    }
  }

  async function vaciar() {
    temporizador = null;
    const ids = [...pendientes].slice(0, 200);
    ids.forEach((i) => pendientes.delete(i));
    if (!ids.length) return;
    let r;
    try {
      r = await chrome.runtime.sendMessage({ tipo: 'metricasLote', body: { pais: PAIS, ids } });
    } catch {
      r = { ok: false, status: 0 };
    }
    if (!r?.ok) {
      if (r?.status === 401 || r?.status === 0 || r?.status === 403) {
        sinSesion = true;
        avisar(r?.status === 403
          ? 'Tu usuario de IMPORCHAT no tiene acceso al <b>Espía de mercado</b>.'
          : 'Abre <b>IMPORCHAT</b> en otra pestaña con tu sesión para ver las ventas estimadas debajo de cada producto.');
      }
      ids.forEach(pintar);
      if (pendientes.size) programar();
      return;
    }
    sinSesion = false;
    diasMedidos = r.data?.dias_medidos ?? diasMedidos;
    const porId = new Map((r.data?.items || []).map((m) => [Number(m.dropi_product_id), m]));
    for (const id of ids) cache.set(id, porId.get(id) || null);
    ids.forEach(pintar);
    if (pendientes.size) programar();
  }

  function programar() {
    if (!temporizador) temporizador = setTimeout(vaciar, 350);
  }

  function pedir(id, el) {
    if (!esperando.has(id)) esperando.set(id, []);
    esperando.get(id).push(el);
    if (cache.has(id)) return pintar(id);
    pendientes.add(id);
    programar();
  }

  // Dónde colgar la etiqueta: la tarjeta que contiene el enlace (o el enlace mismo).
  function tarjetaDe(a) {
    let el = a;
    for (let i = 0; i < 6 && el.parentElement; i += 1) {
      const p = el.parentElement;
      const r = p.getBoundingClientRect();
      if (r.width >= 160 && r.height >= 120 && p.querySelectorAll('a[href]').length <= 6) el = p;
      else break;
    }
    return el;
  }

  function etiquetar(card, id) {
    if (card.dataset.impEspia) return;
    card.dataset.impEspia = String(id);
    const badge = document.createElement('div');
    badge.className = 'imp-espia-badge';
    badge.dataset.estado = 'cargando';
    badge.innerHTML = `<div class="imp-espia-cab"><span class="imp-espia-logo">IMPORCHAT</span><span class="imp-espia-sub">Calculando ventas…</span></div>`;
    // En el catálogo de Dropi la tarjeta tiene .card-content con el botón «Enviar a
    // cliente» (.card-actions) al final: la etiqueta va justo antes de ese botón.
    const contenido = card.querySelector('.card-content') || card;
    const acciones = contenido.querySelector('.card-actions');
    if (acciones) contenido.insertBefore(badge, acciones);
    else contenido.appendChild(badge);
    pedir(id, badge);
  }

  // Productos que la propia API de Dropi devolvió en esta página (dropi-captura.js):
  // nombre normalizado → id. Sirve cuando las tarjetas no llevan el id en un enlace.
  const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const porNombre = new Map();
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.data?.tipo !== 'imp-espia-productos') return;
    let nuevos = 0;
    for (const it of ev.data.items || []) {
      const k = normalizar(it.nombre);
      if (k.length < 4 || porNombre.has(k)) continue;
      porNombre.set(k, it.id);
      nuevos += 1;
    }
    if (nuevos) setTimeout(revisar, 300);
  });

  function porTexto() {
    if (!porNombre.size) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.trim().length >= 4 && !n.parentElement.closest('.imp-espia-badge, .imp-espia-panel, script, style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let n;
    while ((n = walker.nextNode())) {
      const id = porNombre.get(normalizar(n.nodeValue));
      if (!id) continue;
      const el = n.parentElement;
      if (el.closest('[data-imp-espia]')) continue;
      etiquetar(tarjetaDe(el), id);
    }
  }

  // Catálogo de Dropi (/dashboard/search): <app-card-product data-cy="catalog-product-card-<id>">.
  // Es el camino principal; los otros dos (href y nombre) quedan de respaldo.
  function porDataCy() {
    for (const card of document.querySelectorAll('[data-cy^="catalog-product-card-"]')) {
      const m = /^catalog-product-card-(\d+)$/.exec(card.getAttribute('data-cy') || '');
      if (!m) continue;
      if (card.dataset.impEspia) continue;
      etiquetar(card, Number(m[1]));
    }
  }

  function revisar() {
    porDataCy();
    for (const a of document.querySelectorAll('a[href]')) {
      const id = idDe(a.getAttribute('href'));
      if (!id) continue;
      const card = tarjetaDe(a);
      if (card.closest('[data-imp-espia]')) continue;
      etiquetar(card, id);
    }
    porTexto();
    panelFicha();
  }

  // Ficha de un producto (la URL trae el id): panel flotante con más detalle.
  let panelId = null;
  function panelFicha() {
    const id = idDe(location.href);
    if (!id) {
      if (panelId) { document.querySelector('.imp-espia-panel')?.remove(); panelId = null; }
      return;
    }
    if (panelId === id) return;
    panelId = id;
    document.querySelector('.imp-espia-panel')?.remove();
    const panel = document.createElement('div');
    panel.className = 'imp-espia-panel';
    panel.innerHTML = `<button class="imp-espia-cerrar" aria-label="Cerrar">✕</button><h4>Espía de mercado · IMPORCHAT</h4><div class="imp-espia-nombre">Calculando…</div>`;
    panel.querySelector('.imp-espia-cerrar').addEventListener('click', () => panel.remove());
    document.body.appendChild(panel);
    const render = () => {
      if (!cache.has(id)) return;
      const m = cache.get(id);
      if (m === null) {
        panel.querySelector('.imp-espia-nombre').textContent = 'Este producto todavía no está en el catálogo que vigila IMPORCHAT.';
        return;
      }
      const t = tendencia(m);
      panel.innerHTML = `
        <button class="imp-espia-cerrar" aria-label="Cerrar">✕</button>
        <h4>Espía de mercado · IMPORCHAT</h4>
        <div class="imp-espia-nombre">${esc(m.nombre)}</div>
        <div class="imp-espia-grid">
          <span class="imp-espia-k"><small>24 h</small><b>${fmt(m.ventas_1d)}</b></span>
          <span class="imp-espia-k"><small>7 días</small><b>${fmt(m.ventas_7d)}</b></span>
          <span class="imp-espia-k"><small>30 días</small><b>${fmt(m.ventas_30d)}</b></span>
          <span class="imp-espia-k"><small>Tendencia</small><b class="${t.clase}">${t.texto}</b></span>
          <span class="imp-espia-k"><small>Stock</small><b>${fmt(m.stock_actual)}</b></span>
          <span class="imp-espia-k"><small>Iguales</small><b>${fmt(m.n_iguales)}</b></span>
        </div>
        ${sparkline(m.serie_14d, 288, 40)}
        <div class="imp-espia-pie">
          <span>${diasMedidos != null ? `${diasMedidos} día${diasMedidos === 1 ? '' : 's'} medido${diasMedidos === 1 ? '' : 's'}` : 'Ventas estimadas por baja de stock'}</span>
          <span>Últimos 14 días</span>
        </div>
        <a class="imp-espia-btn" href="${esc(m.url_imporchat)}" target="_blank" rel="noopener">Ver análisis completo en IMPORCHAT ›</a>`;
      panel.querySelector('.imp-espia-cerrar').addEventListener('click', () => panel.remove());
    };
    // Se encola el id con un nodo suelto (pintar lo ignora) y se renderiza cuando llega al caché.
    pedir(id, document.createElement('div'));
    const esperar = setInterval(() => {
      if (cache.has(id) || sinSesion) {
        clearInterval(esperar);
        if (sinSesion) panel.querySelector('.imp-espia-nombre').textContent = 'Abre IMPORCHAT en otra pestaña para ver las ventas estimadas.';
        else render();
      }
    }, 200);
    setTimeout(() => clearInterval(esperar), 20000);
  }

  let avisado = false;
  function avisar(html) {
    if (avisado) return;
    avisado = true;
    const n = document.createElement('div');
    n.className = 'imp-espia-aviso';
    n.innerHTML = `<button aria-label="Cerrar">✕</button>${html} <a href="${webImporchat}/espia-mercado" target="_blank" rel="noopener">Abrir IMPORCHAT</a>`;
    n.querySelector('button').addEventListener('click', () => n.remove());
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 15000);
  }

  // Dropi es una SPA: se vigila el DOM y la URL.
  let marca = null;
  const obs = new MutationObserver(() => {
    if (marca) return;
    marca = setTimeout(() => { marca = null; revisar(); }, 400);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  let urlPrev = location.href;
  setInterval(() => {
    if (location.href !== urlPrev) { urlPrev = location.href; panelId = null; revisar(); }
  }, 600);
  revisar();
})();
