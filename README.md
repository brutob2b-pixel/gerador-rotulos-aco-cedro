# Gerador de rótulos · Aço & Cedro

Página para o cliente enviar a referência e o logotipo, receber 3 opções de tarja e tampa, ver o pote girando em 3D e baixar o arquivo de impressão.

## Como usar (ao vivo com o cliente)
1. Dê dois cliques em `Abrir gerador.bat` (precisa do Node.js). A página abre em http://127.0.0.1:8765/.
2. O cliente preenche e envia. O pedido cai em `fila/<id>/` (referência, logotipo, `pedido.json`, `status.json`).
3. Quem gera as opções (hoje o Claude, no lugar de uma API de IA) vê o aviso do `ferramentas/vigiar.js`, gera as artes e publica: `node ferramentas/resultado.js <id> pronto <pasta-do-painel>`.
4. A página consulta o pedido a cada 3 s e troca as imagens de exemplo pelas reais quando o estado vira `pronto`.

## Contrato da "API" (trocável por GPT/Gemini depois)
| Chamada | Resposta |
|---|---|
| `POST /api/pedidos` `{marca, produto: pomada\|cera\|gel, referencia, logo}` (imagens em data URL, até 30 MB) | `{id}` |
| `GET /api/pedidos/:id` | `{estado: na_fila\|gerando\|pronto\|erro, atualizado}` |
| `GET /opcao-{a,b,c}-{tampa,tarja}.webp`, `/opcao-{a,b,c}-impressao.pdf`, `/simulador/artes/*` | arquivos do último pedido `pronto` (sem nenhum, o exemplo do site) |

Para ligar uma IA externa, basta quem hoje roda `ferramentas/resultado.js` chamar a API e gravar o resultado em `resultados/<id>/`.

## Pastas
- `site/`: página, simulador 3D e fontes (Cinzel).
- `fila/` e `resultados/`: dados dos pedidos; ficam fora do GitHub (`.gitignore`), pois têm imagens de clientes.
- O motor que cria tarja e tampa (`processar-pedido.js`, ampliação por IA) fica no projeto `rotulo-vetorizador`, fora deste repositório.
