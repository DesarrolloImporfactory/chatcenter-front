// Genera los íconos PNG (16, 48, 128) sin librerías: fondo azul marino y un «ojo» celeste.
// Uso: node extension/espia-tiendas/icons/generar.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crc32 = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return (buf) => { let c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
const chunk = (tipo, datos) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size) {
  const fila = size * 4 + 1;
  const raw = Buffer.alloc(fila * size);
  const c = size / 2, r = size / 2 - Math.max(1, size * 0.06);
  for (let y = 0; y < size; y++) {
    raw[y * fila] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      let col = [11, 31, 58, 255]; // #0b1f3a
      if (d > r) col = [0, 0, 0, 0]; // esquinas transparentes (círculo)
      // ojo: elipse celeste con pupila azul marino y brillo blanco
      const ex = dx / (size * 0.36), ey = dy / (size * 0.2);
      if (ex * ex + ey * ey <= 1) col = [0, 212, 255, 255];
      if (d <= size * 0.11) col = [11, 31, 58, 255];
      if (Math.hypot(dx - size * 0.04, dy - size * 0.04) <= size * 0.035) col = [255, 255, 255, 255];
      raw.set(col, y * fila + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const s of [16, 48, 128]) fs.writeFileSync(path.join(__dirname, `${s}.png`), png(s));
console.log('íconos generados: 16, 48, 128');
