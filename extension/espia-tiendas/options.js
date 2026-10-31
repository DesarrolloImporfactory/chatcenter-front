(async () => {
  const $ = (s) => document.querySelector(s);
  const estado = (txt, cls = '') => { $('#estado').textContent = txt; $('#estado').className = `estado ${cls}`; };

  const cfg = await chrome.runtime.sendMessage({ tipo: 'config' });
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

  const pintarSesion = () => {
    if (!cfg.token) return estado('Sin sesión. Abre IMPORCHAT en otra pestaña (con tu usuario super administrador) o pega el token.', 'err');
    estado(`Hay un token guardado (${cfg.tokenOrigen || 'origen desconocido'}, ${cfg.tokenFecha ? new Date(cfg.tokenFecha).toLocaleString() : ''}). Pulsa «Probar sesión».`);
  };
  pintarSesion();

  $('#guardar').addEventListener('click', async () => {
    const apiBase = $('#apiBase').value.trim();
    const token = $('#token').value.trim();
    await chrome.runtime.sendMessage({ tipo: 'guardarConfig', apiBase, ...(token ? { token } : {}) });
    $('#token').value = '';
    Object.assign(cfg, await chrome.runtime.sendMessage({ tipo: 'config' }));
    estado('Guardado. Pulsa «Probar sesión».', 'ok');
  });
  $('#probar').addEventListener('click', async () => {
    estado('Probando…');
    const r = await chrome.runtime.sendMessage({ tipo: 'ping' });
    if (r.ok) estado(`Sesión OK: ${r.data?.usuario?.nombre || ''} (${r.data?.usuario?.rol || ''})`, 'ok');
    else estado(`Falló: ${r.message || 'sin detalle'}${r.status ? ` (HTTP ${r.status})` : ''}`, 'err');
  });
  $('#salir').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ tipo: 'cerrarSesion' });
    Object.assign(cfg, await chrome.runtime.sendMessage({ tipo: 'config' }));
    pintarSesion();
  });
})();
