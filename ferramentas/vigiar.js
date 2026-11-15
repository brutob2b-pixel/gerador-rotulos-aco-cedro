// Avisa (uma linha por pedido) quando chega pedido novo em fila/. Usado pelo Claude para saber na hora.
const fs = require('fs'), path = require('path');
const FILA = path.join(__dirname, '..', 'fila'), vistos = new Set();
setInterval(() => {
  if (!fs.existsSync(FILA)) return;
  for (const id of fs.readdirSync(FILA)) {
    if (vistos.has(id)) continue;
    try {
      const s = JSON.parse(fs.readFileSync(path.join(FILA, id, 'status.json'), 'utf8'));
      vistos.add(id);
      if (s.estado === 'na_fila') { const p = JSON.parse(fs.readFileSync(path.join(FILA, id, 'pedido.json'), 'utf8')); console.log(`NOVO PEDIDO ${id} | ${p.marca} | ${p.produto}`); }
    } catch { /* ainda sendo gravado: tenta no próximo ciclo */ }
  }
}, 2000);
