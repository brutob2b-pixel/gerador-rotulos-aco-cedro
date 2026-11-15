// Gerador de rótulos Aço & Cedro: servidor local. node servidor.js → http://127.0.0.1:8765
// Simula uma API externa de IA generativa: o pedido entra na fila (fila/<id>/) e o resultado volta por GET /api/pedidos/:id.
const http = require('http'), fs = require('fs'), path = require('path');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.ttf': 'font/ttf' };
const PORTA = Number(process.env.PORTA) || 8765, SITE = path.join(__dirname, 'site'), FILA = path.join(__dirname, 'fila'), RES = path.join(__dirname, 'resultados');
const PRODUTOS = ['pomada', 'cera', 'gel'], LIMITE = 30 * 1024 * 1024, EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const ID_OK = /^[a-z0-9-]{3,60}$/;
const json = (res, cod, obj) => { res.writeHead(cod, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

// Resultado mostrado na página: o último pedido "pronto"; sem nenhum, a demonstração.
function atual() {
  const feitos = fs.existsSync(FILA) ? fs.readdirSync(FILA).filter((id) => lerStatus(id).estado === 'pronto').sort((a, b) => lerStatus(b).atualizado.localeCompare(lerStatus(a).atualizado)) : [];
  return feitos[0] || 'demo';
}
function lerStatus(id) { try { return JSON.parse(fs.readFileSync(path.join(FILA, id, 'status.json'), 'utf8')); } catch { return { estado: 'desconhecido', atualizado: '' }; } }

// Vigia: processo que avisa de pedido novo. Está vivo se o batimento em vigia/estado.json tem menos de 6 s.
const VIGIA = path.join(__dirname, 'vigia');
function vigiaViva() {
  try { const v = JSON.parse(fs.readFileSync(path.join(VIGIA, 'estado.json'), 'utf8')); return Date.now() - v.em < 6000 ? v : null; } catch { return null; }
}
function ligarVigia() {
  if (vigiaViva()) return true;
  fs.mkdirSync(VIGIA, { recursive: true });
  const log = fs.openSync(path.join(VIGIA, 'vigia.log'), 'a');
  require('child_process').spawn(process.execPath, [path.join(__dirname, 'ferramentas', 'vigiar.js')], { detached: true, stdio: ['ignore', log, log], windowsHide: true }).unref();
  return true;
}
function listarFila() {
  if (!fs.existsSync(FILA)) return [];
  return fs.readdirSync(FILA).filter((id) => ID_OK.test(id)).map((id) => {
    let p = {}; try { p = JSON.parse(fs.readFileSync(path.join(FILA, id, 'pedido.json'), 'utf8')); } catch { /* pedido ainda sendo gravado */ }
    return { id, marca: p.marca || '', produto: p.produto || '', ...lerStatus(id) };
  }).sort((a, b) => b.atualizado.localeCompare(a.atualizado));
}

function receber(req, res) {
  const partes = []; let tam = 0;
  req.on('data', (c) => { tam += c.length; if (tam > LIMITE) { json(res, 413, { erro: 'arquivo grande demais' }); req.destroy(); } else partes.push(c); });
  req.on('end', () => {
    try {
      const d = JSON.parse(Buffer.concat(partes).toString('utf8'));
      const marca = String(d.marca || '').trim().slice(0, 60);
      if (!marca || !PRODUTOS.includes(d.produto)) throw new Error('informe a marca e o tipo de produto');
      const id = (marca.normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 30) || 'pedido') + '-' + Date.now().toString(36);
      const dir = path.join(FILA, id); fs.mkdirSync(dir, { recursive: true });
      for (const campo of ['referencia', 'logo']) {
        const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(d[campo] || '');
        if (!m) throw new Error(`envie a imagem de ${campo === 'logo' ? 'logotipo' : 'referência'} (PNG, JPG ou WebP)`);
        fs.writeFileSync(path.join(dir, `${campo}.${EXT[m[1]]}`), Buffer.from(m[2], 'base64'));
      }
      const agora = new Date().toISOString();
      fs.writeFileSync(path.join(dir, 'pedido.json'), JSON.stringify({ marca, produto: d.produto, recebido: agora }, null, 2));
      fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({ estado: 'na_fila', atualizado: agora }));
      json(res, 200, { id });
    } catch (e) { json(res, 400, { erro: e.message }); }
  });
}

function arquivo(res, base, rel, reserva) {
  let arq = path.join(base, path.normalize(rel));
  if (reserva && !fs.existsSync(arq)) { base = reserva; arq = path.join(reserva, path.normalize(rel)); } // sem resultado: usa o exemplo do site
  if (!arq.startsWith(base) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('não encontrado'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(arq).pipe(res);
}

http.createServer((req, res) => {
  const rota = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && rota === '/api/pedidos') return receber(req, res);
  const st = /^\/api\/pedidos\/([a-z0-9-]+)$/.exec(rota);
  if (req.method === 'GET' && st && ID_OK.test(st[1])) return json(res, 200, lerStatus(st[1]));
  if (req.method === 'GET' && rota === '/api/atual') return json(res, 200, { id: atual() });
  if (rota === '/api/vigia' && req.method === 'GET') return json(res, 200, { ligado: !!vigiaViva() });
  if (rota === '/api/vigia' && req.method === 'POST') return json(res, 200, { ligado: ligarVigia() });
  if (rota === '/api/vigia' && req.method === 'DELETE') { const v = vigiaViva(); if (v) try { process.kill(v.pid); } catch { /* já encerrou */ } return json(res, 200, { ligado: false }); }
  if (req.method === 'GET' && rota === '/api/fila') return json(res, 200, listarFila());
  // Imagens das opções, PDFs e artes do simulador vêm do resultado atual.
  if (/^\/(opcao-[a-c]-(tampa|tarja)\.webp|opcao-[a-c]-impressao\.pdf|simulador\/artes\/.*)$/.test(rota)) return arquivo(res, path.join(RES, atual()), rota.replace(/^\/simulador\//, '').replace(/^\//, ''), SITE);
  arquivo(res, SITE, rota.endsWith('/') ? rota + 'index.html' : rota);
}).listen(PORTA, '127.0.0.1', () => console.log(`Gerador em http://127.0.0.1:${PORTA}/  (feche esta janela para parar)`));
