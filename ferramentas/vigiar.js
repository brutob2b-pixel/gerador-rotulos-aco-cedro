// Avisa (uma linha por pedido) quando chega pedido novo em fila/. Usado pelo Claude para saber na hora.
const fs = require('fs'), path = require('path');
const FILA = path.join(__dirname, '..', 'fila'), VIGIA = path.join(__dirname, '..', 'vigia'), vistos = new Set();
fs.mkdirSync(VIGIA, { recursive: true });
setInterval(() => {
  // batimento: a página de controle sabe que o vigia está vivo quando este arquivo é recente
  fs.writeFileSync(path.join(VIGIA, 'estado.json'), JSON.stringify({ pid: process.pid, em: Date.now() }));
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
