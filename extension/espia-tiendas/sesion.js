// Corre en la web de IMPORCHAT: toma el token de la sesión abierta y la URL de la API
// que usa esa web (localStorage.imporchat_api, la deja src/api/chatcenter.js) y se los
// pasa a la extensión. No pide usuario ni clave ni hay que configurar el backend:
// la extensión apunta al mismo servidor que la pantalla de la que tomó la sesión.
(() => {
  let ultimo = null;
  const mandar = () => {
    let token = null;
    let api = '';
    try {
      token = localStorage.getItem('token') || localStorage.getItem('chatcenter_token') || null;
      api = localStorage.getItem('imporchat_api') || '';
    } catch { /* sin acceso a localStorage */ }
    if (!token) return;
    const clave = `${token}|${api}`;
    if (clave === ultimo) return;
    ultimo = clave;
    try {
      chrome.runtime.sendMessage({ tipo: 'sesion', token, origen: location.origin, api }, () => void chrome.runtime.lastError);
    } catch { /* la extensión se recargó */ }
  };
  mandar();
  // La app guarda el token después de loguearse: se vuelve a mirar un rato.
  const t = setInterval(mandar, 5000);
  setTimeout(() => clearInterval(t), 10 * 60 * 1000);
  addEventListener('storage', mandar);
  addEventListener('focus', mandar);
})();
