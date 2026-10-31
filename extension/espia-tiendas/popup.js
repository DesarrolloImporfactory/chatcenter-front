(async () => {
  const $ = (s) => document.querySelector(s);
  const cfg = await chrome.runtime.sendMessage({ tipo: 'config' });
  $('#hoy').textContent = cfg.enviadosHoy?.total || 0;
  // La pantalla vive en la web de IMPORCHAT, no en la API: se deduce del origen de la sesión.
  const web = cfg.tokenOrigen && cfg.tokenOrigen !== 'manual' ? cfg.tokenOrigen : 'https://chatcenter.imporfactory.app';
  $('#pantalla').href = `${web}/espia-mercado`;
  $('#origen').textContent = cfg.tokenOrigen ? `sesión tomada de ${cfg.tokenOrigen}` : 'abre IMPORCHAT en una pestaña para tomar la sesión';
  $('#opciones').addEventListener('click', () => chrome.runtime.openOptionsPage());
  const r = await chrome.runtime.sendMessage({ tipo: 'ping' });
  const s = $('#sesion');
  if (r.ok) { s.textContent = r.data?.usuario?.nombre || 'conectado'; s.className = 'ok'; }
  else { s.textContent = r.message || 'sin sesión'; s.className = 'err'; }
})();
