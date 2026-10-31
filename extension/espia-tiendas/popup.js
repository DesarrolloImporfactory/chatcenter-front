(async () => {
  const $ = (s) => document.querySelector(s);
  const cfg = await chrome.runtime.sendMessage({ tipo: 'config' });
  $('#hoy').textContent = cfg.enviadosHoy?.total || 0;
  // La pantalla vive en la web de IMPORCHAT, no en la API: se deduce del origen de la sesión.
  const web = cfg.tokenOrigen && cfg.tokenOrigen !== 'manual' ? cfg.tokenOrigen : 'https://chatcenter.imporfactory.app';
  $('#pantalla').href = `${web}/espia-mercado`;
  $('#origen').textContent = cfg.tokenOrigen ? `sesión tomada de ${cfg.tokenOrigen}` : 'abre IMPORCHAT en una pestaña para tomar la sesión';
  $('#opciones').addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Herramientas sobre la pestaña activa (la tienda que el usuario tiene abierta).
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const esWeb = Boolean(tab?.url && /^https?:/.test(tab.url));
  let host = '';
  try { host = esWeb ? new URL(tab.url).hostname : ''; } catch { host = ''; }
  $('#pagina').textContent = esWeb ? `Actuando sobre ${host}` : 'Abre una tienda en una pestaña normal para usar estas herramientas';
  const msg = $('#herrMsg');
  for (const accion of ['desbloquear', 'multimedia', 'celular']) {
    const btn = $(`#${accion}`);
    btn.disabled = !esWeb;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      msg.className = 'suave';
      msg.textContent = accion === 'multimedia' ? 'Buscando imágenes y videos…' : 'Un momento…';
      const r = await chrome.runtime.sendMessage({ tipo: 'herramienta', accion, tabId: tab.id }).catch((e) => ({ ok: false, message: e.message }));
      btn.disabled = false;
      if (!r?.ok) { msg.className = 'err'; msg.textContent = r?.message || 'No se pudo'; return; }
      msg.className = 'ok';
      msg.textContent = accion === 'desbloquear'
        ? `Clic derecho y copiar habilitados en ${r.host}`
        : accion === 'multimedia'
          ? `${r.bajados} de ${r.total} archivos en Descargas/Espia/${r.host}/pagina`
          : 'Abierta en ventana de celular';
    });
  }

  const r = await chrome.runtime.sendMessage({ tipo: 'ping' });
  const s = $('#sesion');
  if (r.ok) { s.textContent = r.data?.usuario?.nombre || 'conectado'; s.className = 'ok'; }
  else { s.textContent = r.message || 'sin sesión'; s.className = 'err'; }
})();
