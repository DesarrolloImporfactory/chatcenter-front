// Corre dentro de la página (world MAIN): Meta trae el video HD y las imágenes grandes en sus
// respuestas graphql, no en la tarjeta. Se interceptan fetch y XHR y se avisa a barra.js por postMessage.
(() => {
  const RE = /"ad_archive_id":"(\d+)"|"video_hd_url":"([^"]+)"|"video_sd_url":"([^"]+)"|"original_image_url":"([^"]+)"|"resized_image_url":"([^"]+)"/g;
  const des = (s) => { try { return JSON.parse(`"${s}"`); } catch { return s.replace(/\\\//g, '/'); } };
  const leer = (texto) => {
    let id = null;
    const media = {};
    for (const m of String(texto).matchAll(RE)) {
      if (m[1]) { id = m[1]; continue; }
      if (!id) continue;
      const e = (media[id] ||= {});
      if (m[2] && !e.hd) e.hd = des(m[2]);
      else if (m[3] && !e.sd) e.sd = des(m[3]);
      else if (m[4] && !e.img) e.img = des(m[4]);
      else if (m[5] && !e.imgChica) e.imgChica = des(m[5]);
    }
    if (Object.keys(media).length) window.postMessage({ espiaMedia: media }, location.origin);
  };
  const f = window.fetch;
  window.fetch = async (...a) => {
    const r = await f(...a);
    try {
      const u = String(a[0]?.url || a[0]);
      if (u.includes('graphql') || u.includes('/ads/library/async/')) r.clone().text().then(leer).catch(() => {});
    } catch { /* nada */ }
    return r;
  };
  const s = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...a) {
    this.addEventListener('load', () => {
      try {
        const u = String(this.responseURL);
        if ((u.includes('graphql') || u.includes('/ads/library/async/')) && (this.responseType === '' || this.responseType === 'text')) leer(this.responseText);
      } catch { /* nada */ }
    });
    return s.apply(this, a);
  };
  const inicial = () => document.querySelectorAll('script[type="application/json"]').forEach((x) => leer(x.textContent));
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', inicial);
  else inicial();
})();
