// Ventana del icono de la extensión: dice si la cuenta está lista y qué hacer.
// Tres estados: sin sesión (iniciar sesión), sin complemento (activarlo) y lista.
(async () => {
  const $ = (s) => document.querySelector(s);
  $('#version').textContent = `Versión ${chrome.runtime.getManifest().version}`;
  $('#opciones').addEventListener('click', () => chrome.runtime.openOptionsPage());

  const cfg = await chrome.runtime.sendMessage({ tipo: 'config' });
  // La pantalla vive en la web de IMPORCHAT, no en la API: se deduce del origen de la sesión.
  const web = cfg.webOrigen || (cfg.tokenOrigen && !['manual', 'larga'].includes(cfg.tokenOrigen) ? cfg.tokenOrigen : 'https://chatcenter.imporfactory.app');
  const principal = $('#principal');
  principal.href = `${web}/imporkiller`;

  const pintar = (clase, titulo, texto) => {
    $('#estado').className = `estado ${clase}`;
    $('#estadoTitulo').textContent = titulo;
    $('#estadoTexto').textContent = texto;
  };

  const r = await chrome.runtime.sendMessage({ tipo: 'ping' });
  if (!r.ok) {
    // Sin token es «todavía no inició sesión»; con token, la sesión venció o el servidor no respondió.
    const sinSesion = !cfg.token || r.status === 401;
    pintar('falta', sinSesion ? 'Inicia sesión en ImporChat' : 'No pudimos conectar con ImporChat', sinSesion ? 'Abre ImporChat con tu usuario en este navegador y la extensión se conecta sola.' : 'Revisa tu conexión e inténtalo de nuevo en un momento.');
    principal.textContent = sinSesion ? 'Iniciar sesión' : 'Abrir ImporChat';
    return;
  }
  const nombre = r.data?.usuario?.nombre || '';
  const a = r.data?.addon;
  if (a && !a.activo) {
    pintar('falta', `Hola${nombre ? `, ${nombre}` : ''}`, 'Tu cuenta todavía no tiene ImporKiller: actívalo para ver las ventas en Dropi y los anuncios de Meta.');
    principal.textContent = `Activar ImporKiller · $${a.precio || 10}/mes`;
    principal.href = `${r.data?.web || web}/complementos`;
    return;
  }
  pintar('ok', `Hola${nombre ? `, ${nombre}` : ''}`, 'Tu extensión está lista. Úsala en Dropi y en la Biblioteca de anuncios de Meta.');
  $('#hoy').textContent = Number(cfg.enviadosHoy?.total || 0).toLocaleString('es');
  $('#cifra').classList.add('ver');
})();
