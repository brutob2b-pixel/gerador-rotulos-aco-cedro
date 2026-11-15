// node ferramentas/resultado.js <id> gerando|erro   ou   <id> pronto <pasta-do-painel>
// "pronto" copia opcao-*-(tampa|tarja).webp, opcao-*-impressao.pdf e simulador/artes do painel para resultados/<id>/.
const fs = require('fs'), path = require('path');
const [id, estado, painel] = process.argv.slice(2), raiz = path.join(__dirname, '..');
if (!id || !['gerando', 'erro', 'pronto'].includes(estado)) { console.error('uso: resultado.js <id> gerando|erro|pronto [pasta-do-painel]'); process.exit(1); }
if (estado === 'pronto') {
  if (!painel || !fs.existsSync(painel)) { console.error('informe a pasta do painel'); process.exit(1); }
  const dest = path.join(raiz, 'resultados', id); fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(painel)) if (/^opcao-[a-c]-(tampa|tarja)\.webp$|^opcao-[a-c]-impressao\.pdf$/.test(f)) fs.copyFileSync(path.join(painel, f), path.join(dest, f));
  fs.cpSync(path.join(painel, 'simulador', 'artes'), path.join(dest, 'artes'), { recursive: true });
}
fs.writeFileSync(path.join(raiz, 'fila', id, 'status.json'), JSON.stringify({ estado, atualizado: new Date().toISOString() }));
console.log(`${id}: ${estado}`);
