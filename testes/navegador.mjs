// Teste de regressão no navegador (Chromium, via Playwright): lote de exemplos, OCR, cálculo manual,
// notas fiscais em ordem de emissão, ordenação da lista, arquivamento e impressão.
// Uso: node testes/navegador.mjs   (ou PLAYWRIGHT=/caminho/do/playwright/index.mjs node testes/navegador.mjs)
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const raiz = fileURLToPath(new URL("..", import.meta.url));
const ARQ = new URL("../iss-construcao.html", import.meta.url).href;
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const erros = [], externas = [];
pg.on("pageerror", e => erros.push(e.message)); pg.on("console", m => m.type() === "error" && erros.push(m.text()));
pg.on("request", r => { if (!/^(file|data|blob):/.test(r.url())) externas.push(r.url()); });
pg.on("dialog", d => d.accept());
let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas++; console.log((cond ? "OK   " : "FALHA") + " " + msg); };
await pg.goto(ARQ);

// 1) Lote de exemplos (processos fictícios)
await pg.click('[data-nav="lote"]');
await pg.setInputFiles("#pastaLote", raiz + "exemplos/lote-exemplo");
await pg.waitForSelector("table.dados.lote", { timeout: 180000 });
const lote = await pg.evaluate(() => Object.fromEntries(db.lote.itens.map(it => { const p = db.processos[it.processoId]; return [it.pasta, [it.semaforo, p ? resultado(p).iss : null, it.guias.map(g => g.total)]]; })));
const esperado = { "1500-2026": ["verde", 4645.72], "1600-2026": ["vermelho", null], "1700-2026": ["amarelo", 3818.4], "1800-2026": ["amarelo", 614.94],
  "1900-2026": ["amarelo", 1460.48], "2000-2026": ["amarelo", 6875.92], "2100-2026": ["amarelo", 4645.72], "2200-2026": ["amarelo", 1383.62], "3057-2026": ["verde", 1590.46] };
for (const [k, [sem, iss]] of Object.entries(esperado)) ok(lote[k] && lote[k][0] === sem && lote[k][1] === iss, `lote ${k}: ${JSON.stringify(lote[k])}`);
ok(JSON.stringify(lote["2100-2026"][2]) === "[4500]", "carnê anexado duas vezes contado uma vez (4500)");
ok(JSON.stringify(lote["2200-2026"][2]) === "[1383.62]", "guia sem texto lida por OCR (1383,62)");

// 2) Cálculo manual: demolição 282,87 m² em 2026 = R$ 1.590,46
await pg.click('[data-nav="lista"]'); await pg.click('[data-acao="novo"]');
await pg.fill('[data-f="processo"]', "9999/2026"); await pg.selectOption('[data-f="tipoObra"]', "demolicao"); await pg.fill('[data-f="area"]', "282,87");
await pg.check('[data-radio="temMaoDeObra"][value="nao"]');
ok((await pg.textContent(".resumo .total")).includes("1.590,46"), "cálculo manual de demolição (1.590,46)");

// 3) Notas fiscais lançadas fora de ordem ficam em ordem de emissão
await pg.check('[data-radio="temMaoDeObra"][value="sim"]'); await pg.check('[data-f="usaTerceiros"]');
for (const [d, nf] of [["2026-03-15", "30"], ["2025-11-02", "12"], ["2026-01-20", "2"]]) {
  await pg.click('[data-acao="addLinha"][data-l="terceiros"]');
  const k = (await pg.$$('[data-l="terceiros"][data-c="data"]')).length - 1;
  await pg.fill(`[data-l="terceiros"][data-i="${k}"][data-c="data"]`, d);
  await pg.fill(`[data-l="terceiros"][data-i="${k}"][data-c="nf"]`, nf);
  await pg.fill(`[data-l="terceiros"][data-i="${k}"][data-c="valor"]`, "100");
}
await pg.click('[data-acao="ordenarNotas"]');
ok((await pg.$$eval('[data-l="terceiros"][data-c="nf"]', xs => xs.map(x => x.value).join(","))) === "12,2,30", "notas fiscais em ordem de emissão (12, 2, 30)");

// 4) Ordenação da lista por requerente
await pg.click('[data-nav="lista"]');
await pg.click('th[data-ordem="requerente"]');
const nomes = await pg.$$eval("table.dados tbody tr", trs => trs.map(t => t.cells[2].innerText.trim()).filter(Boolean));
ok(nomes.join("|") === [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })).join("|"), "lista em ordem alfabética: " + nomes.slice(0, 3).join(", ") + "…");

// 5) Arquivar e restaurar
const antes = await pg.evaluate(() => Object.keys(db.processos).length);
await pg.locator("[data-sel]").first().click();
await pg.click('[data-acao="arquivarSel"]'); await pg.waitForTimeout(400);
ok(await pg.evaluate(() => Object.keys(db.processos).length) === antes - 1, "arquivar tira da lista de uso");
await pg.click('[data-lista="arquivados"]'); await pg.waitForTimeout(300);
await pg.click('[data-acao="restaurarUm"] >> nth=0'); await pg.waitForTimeout(400);
ok(await pg.evaluate(() => Object.keys(db.processos).length) === antes, "restaurar devolve à lista de uso");

// 6) Impressão em lote dos simples (2 memórias + 2 decisões)
await pg.click('[data-nav="lote"]');
await pg.evaluate(() => { window.print = () => {}; });
await pg.click('[data-acao="imprimirVerdes"]'); await pg.waitForTimeout(100);
ok(await pg.$$eval("#impressao .folha", f => f.length) === 4, "impressão dos simples: 4 folhas");

ok(!erros.length, "sem erros na página " + JSON.stringify(erros));
ok(!externas.length, "sem acesso à internet " + JSON.stringify(externas));
await b.close();
if (falhas) { console.log(`\n${falhas} falha(s).`); process.exit(1); }
