// Página «Mi cuenta» de la extensión. Arriba, lo que cualquier usuario entiende:
// si está conectado, con qué cuenta y si tiene el complemento. Lo técnico (servidor
// y llave de sesión) queda plegado en «Opciones avanzadas», para soporte.
(async () => {
  const $ = (s) => document.querySelector(s);
  const pintar = (clase, titulo, texto) => {
    $('#estado').className = `estado ${clase}`;
    $('#estadoTitulo').textContent = titulo;
    $('#estadoTexto').textContent = texto;
  };

  const cfg = await chrome.runtime.sendMessage({ tipo: 'config' });
  const web = () => cfg.webOrigen || (cfg.tokenOrigen && !['manual', 'larga'].includes(cfg.tokenOrigen) ? cfg.tokenOrigen : 'https://chatcenter.imporfactory.app');

  const pintarDetalle = () => {
    // Dato para soporte: de dónde salió la sesión y a qué servidor habla. Nunca la llave.
    const sesion = !cfg.token
      ? 'sin sesión guardada'
      : cfg.tokenOrigen === 'larga'
        ? `sesión larga, vence el ${cfg.tokenVence ? new Date(cfg.tokenVence).toLocaleDateString() : '?'} y se renueva sola`
        : cfg.tokenOrigen === 'manual' ? 'llave escrita a mano' : `sesión tomada de ${cfg.tokenOrigen || 'origen desconocido'}`;
    $('#detalle').textContent = `Sesión: ${sesion}${cfg.tokenFecha ? ` (${new Date(cfg.tokenFecha).toLocaleString()})` : ''}. Servidor: ${cfg.apiBase}${cfg.apiOrigen === 'manual' ? ' (escrito a mano)' : cfg.apiOrigen === 'sesion' ? ' (el de tu ImporChat)' : ' (por defecto)'}.`;
  };

  const comprobar = async () => {
    $('#abrir').href = `${web()}/imporkiller`;
    $('#abrir').textContent = 'Abrir ImporKiller';
    if (!cfg.token) {
      pintar('err', 'Todavía no has iniciado sesión', 'Entra a ImporChat con tu usuario en este navegador y vuelve aquí: la extensión se conecta sola.');
      $('#abrir').textContent = 'Iniciar sesión en ImporChat';
      return;
    }
    pintar('', 'Comprobando…', '');
    const r = await chrome.runtime.sendMessage({ tipo: 'ping' });
    if (!r.ok) {
      const vencida = r.status === 401;
      pintar('err', vencida ? 'Tu sesión venció' : 'No pudimos conectar con ImporChat', vencida ? 'Vuelve a entrar a ImporChat con tu usuario y la extensión se conecta sola.' : `${r.message || 'Sin respuesta del servidor'}${r.status ? ` (código ${r.status})` : ''}`);
      if (vencida) $('#abrir').textContent = 'Iniciar sesión en ImporChat';
      return;
    }
    const nombre = r.data?.usuario?.nombre || 'tu cuenta';
    const a = r.data?.addon;
    if (a && !a.activo) {
      pintar('err', `Conectado como ${nombre}`, `Tu cuenta todavía no tiene el complemento ImporKiller ($${a.precio || 10}/mes). Actívalo para usar la extensión.`);
      $('#abrir').href = `${r.data?.web || web()}/complementos`;
      $('#abrir').textContent = `Activar ImporKiller · $${a.precio || 10}/mes`;
      return;
    }
    pintar('ok', `Conectado como ${nombre}`, 'Complemento ImporKiller activo. La extensión está lista.');
  };

  // ── Opciones avanzadas ──
  const preset = $('#preset');
  const enLista = [...preset.options].some((o) => o.value === cfg.apiBase);
  preset.value = enLista ? cfg.apiBase : 'otro';
  $('#apiBase').value = cfg.apiBase;
  $('#apiBase').style.display = enLista ? 'none' : '';
  preset.addEventListener('change', () => {
    if (preset.value === 'otro') { $('#apiBase').style.display = ''; return; }
    $('#apiBase').style.display = 'none';
    $('#apiBase').value = preset.value;
  });

  $('#guardar').addEventListener('click', async () => {
    const apiBase = $('#apiBase').value.trim();
    const token = $('#token').value.trim();
    await chrome.runtime.sendMessage({ tipo: 'guardarConfig', apiBase, ...(token ? { token } : {}) });
    $('#token').value = '';
    Object.assign(cfg, await chrome.runtime.sendMessage({ tipo: 'config' }));
    pintarDetalle();
    comprobar();
  });
  $('#probar').addEventListener('click', comprobar);
  $('#salir').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ tipo: 'cerrarSesion' });
    Object.assign(cfg, await chrome.runtime.sendMessage({ tipo: 'config' }));
    pintarDetalle();
    comprobar();
  });

  pintarDetalle();
  comprobar();
})();
