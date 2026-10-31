// Corre en la web de IMPORCHAT: toma el token de la sesión abierta y se lo pasa a la extensión.
// No pide usuario ni clave: solo reutiliza la sesión que ya existe en este Chrome.
(() => {
  let ultimo = null;
  const mandar = () => {
    let token = null;
    try {
      token = localStorage.getItem('token') || localStorage.getItem('chatcenter_token') || null;
    } catch { /* sin acceso a localStorage */ }
    if (!token || token === ultimo) return;
    ultimo = token;
    try {
      chrome.runtime.sendMessage({ tipo: 'sesion', token, origen: location.origin }, () => void chrome.runtime.lastError);
    } catch { /* la extensión se recargó */ }
  };
  mandar();
  // La app guarda el token después de loguearse: se vuelve a mirar un rato.
  const t = setInterval(mandar, 5000);
  setTimeout(() => clearInterval(t), 10 * 60 * 1000);
  addEventListener('storage', mandar);
  addEventListener('focus', mandar);
})();
