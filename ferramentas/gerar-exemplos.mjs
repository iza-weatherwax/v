// Gera a pasta exemplos/lote-exemplo com processos FICTÍCIOS para testar a leitura em lote.
// Uso: node ferramentas/gerar-exemplos.mjs   (requer o Playwright com Chromium)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { deflateRawSync, crc32 } from "node:zlib";

const RAIZ = new URL("../exemplos/lote-exemplo/", import.meta.url).pathname;
rmSync(RAIZ, { recursive: true, force: true });
const pasta = p => { mkdirSync(RAIZ + p, { recursive: true }); return RAIZ + p + "/"; };

const CAB = `<div style="text-align:center;font-weight:bold">PREFEITURA MUNICIPAL DE ARAGUARI<br>SECRETARIA MUNICIPAL DE FAZENDA</div><hr>`;
const pagina = corpo => `<html><body style="font:12pt Arial;margin:40px">${CAB}${corpo}</body></html>`;
const requerimento = ({ proc, nome, cpf, cci, end, rotuloEnd = "Endereço da obra", extra = "" }) => pagina(`
  <h3 style="text-align:center">REQUERIMENTO DE HABITE-SE</h3>
  <p>Processo nº ${proc}</p><p>Requerente: ${nome}</p><p>CPF: ${cpf}</p><p>CCI: ${cci}</p>
  <p>${rotuloEnd}: ${end}</p><p>Vem requerer a expedição do habite-se do imóvel acima identificado.</p>${extra}
  <p>Araguari, 10 de outubro de 2026.</p>`);
// Alvará de Habite-se e Baixa de Construção: o documento principal.
const habite = ({ titulo = "ALVARÁ DE HABITE-SE E BAIXA DE CONSTRUÇÃO RESIDENCIAL", nome, cpf, cci, end, areas }) => pagina(`
  <h3 style="text-align:center">${titulo}</h3>
  <p>Proprietário: ${nome}</p><p>CPF: ${cpf}</p><p>CCI: ${cci}</p><p>Endereço: ${end}</p>
  ${areas.map(a => `<p>${a}</p>`).join("")}
  <p>Responsável técnico: Carlos Exemplo Engenheiro — CREA-MG 000000 — CPF 987.654.321-00</p>
  <p>Certidão válida até 31/12/2026.</p>`);
// Alvará de Construção: usado para comparação (costuma ser de outro processo, mais antigo).
const alvara = ({ titulo = "ALVARÁ DE CONSTRUÇÃO", nome, cpf = "", cci = "", end = "", areas }) => pagina(`
  <h3 style="text-align:center">${titulo} Nº 512/2024</h3>
  <p>Processo nº 4321/2024</p><p>Proprietário: ${nome}</p>${cpf ? `<p>CPF: ${cpf}</p>` : ""}${cci ? `<p>CCI: ${cci}</p>` : ""}${end ? `<p>Endereço: ${end}</p>` : ""}
  <p>Responsável técnico: Carlos Exemplo Engenheiro — CREA-MG 000000 — CPF 987.654.321-00</p>
  <p>Área do terreno: 360,00 m²</p>${areas.map(a => `<p>${a}</p>`).join("")}`);
// Linha digitável de arrecadação (prefeitura) válida, com o valor embutido.
function mod10(s) { let soma = 0, peso = 2; for (let i = s.length - 1; i >= 0; i--) { let x = Number(s[i]) * peso; if (x > 9) x = Math.floor(x / 10) + (x % 10); soma += x; peso = peso === 2 ? 1 : 2; } return (10 - (soma % 10)) % 10; }
function linhaDigitavel(valor, seq) {
  const corpo = "816" + "X" + String(Math.round(valor * 100)).padStart(11, "0") + "0001" + "20261001" + String(seq).padStart(17, "0");
  const barras = corpo.replace("X", String(mod10(corpo.replace("X", ""))));
  return [0, 1, 2, 3].map(i => { const b = barras.slice(i * 11, i * 11 + 11); return b + " " + mod10(b); }).join(" ");
}
const cobranca = ({ titulo, tributo, parcelas }) => pagina(`<h3>${titulo}</h3><p>Tributo: ${tributo}</p>
  ${parcelas.map(([rot, venc, valor], i) => `<div style="border:1px dashed #999;padding:8px;margin:8px 0"><p>${rot} — Vencimento: ${venc} — Valor do documento: R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
    <p>Autenticação mecânica</p><p>${linhaDigitavel(valor, i + 1)}</p></div>`).join("")}`);

const b = await chromium.launch();
const pg = await b.newPage();
async function pdf(destino, ...htmls) {
  const partes = htmls.map(h => h.replace(/<\/?(html|body)[^>]*>/g, ""));
  await pg.setContent(`<html><body style="font:12pt Arial;margin:0">${partes.map(h => `<div style="page-break-after:always;padding:40px">${h}</div>`).join("")}</body></html>`);
  await pg.pdf({ path: destino, format: "A4" });
}
// PDF "escaneado": o texto vira imagem (sem camada de texto)
async function pdfEscaneado(destino, texto) {
  await pg.setContent(`<canvas id="c" width="800" height="300"></canvas><img id="i">`);
  await pg.evaluate(t => {
    const c = document.getElementById("c"), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 800, 300); x.fillStyle = "#222"; x.font = "28px serif";
    t.split("\n").forEach((l, i) => x.fillText(l, 30, 60 + i * 44));
    document.getElementById("i").src = c.toDataURL(); c.remove();
  }, texto);
  await pg.pdf({ path: destino, format: "A4" });
}
// .docx mínimo
function docx(destino, linhas) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const arquivos = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${linhas.map(l => `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`
  };
  const locais = [], central = []; let off = 0;
  for (const [nome, txt] of Object.entries(arquivos)) {
    const dados = Buffer.from(txt), comp = deflateRawSync(dados), n = Buffer.from(nome), crc = crc32(dados);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(dados.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(dados.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locais.push(h, n, comp); central.push(c, n); off += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(central.length / 2, 8); e.writeUInt16LE(central.length / 2, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  writeFileSync(destino, Buffer.concat([...locais, cd, e]));
}

// 1) Simples (verde): requerimento + habite-se + alvará de construção + foto + boleto de taxa (sem ISS: só aviso)
let d = pasta("1500-2026");
const p1 = { nome: "MARIA APARECIDA DE SOUZA", cpf: "123.456.789-09", cci: "61234" };
await pdf(d + "requerimento.pdf", requerimento({ proc: "1500/2026", ...p1, end: "Rua das Flores, 100 - Jardim Central" }));
await pdf(d + "habite-se.pdf", habite({ ...p1, end: "100 - RUA DAS FLORES (R. DOZE - JARDIM CENTRAL) Número", areas: ["Área construída: 182,50 m²"] }));
await pdf(d + "alvara-construcao.pdf", alvara({ ...p1, cci: "61.234", end: "RUA DAS FLORES (R. DOZE.", areas: ["Área a construir: 182,50 m²"] }));
await pdf(d + "Boleto Alvara Construcao.pdf", cobranca({ titulo: "DOCUMENTO DE ARRECADAÇÃO MUNICIPAL", tributo: "TAXA DE LICENÇA PARA EXECUÇÃO DE OBRAS", parcelas: [["Parcela única", "30/04/2024", 250]] }));
await pg.setContent(`<div style="width:300px;height:200px;background:#9bb">foto da fachada</div>`);
await pg.screenshot({ path: d + "foto-fachada.png" });

// 2) Demolição (verde): requerimento em Word + alvará de baixa de demolição
d = pasta("3057-2026");
const p2 = { nome: "JOSÉ CARLOS PEREIRA", cpf: "111.444.777-35", cci: "49999" };
docx(d + "requerimento.docx", ["REQUERIMENTO DE BAIXA DE DEMOLIÇÃO", "Processo nº 3057/2026", "Requerente: JOSÉ CARLOS PEREIRA", "Endereço da obra: Rua Exemplo, 1901, Jardim Teste"]);
await pdf(d + "baixa-demolicao.pdf", habite({ titulo: "ALVARÁ DE BAIXA DE DEMOLIÇÃO", ...p2, end: "Rua Exemplo, 1901, Jardim Teste", areas: ["Área demolida: 282,87 m²"] }));
await pdf(d + "alvara-demolicao.pdf", alvara({ titulo: "ALVARÁ DE DEMOLIÇÃO", ...p2, end: "Rua Exemplo, 1901", areas: ["Área a demolir: 282,87 m²"] }));

// 3) Com nota fiscal (vermelho)
d = pasta("1600-2026");
const p3 = { nome: "ANTÔNIO DOS SANTOS LIMA", cpf: "529.982.247-25", cci: "70001" };
await pdf(d + "habite-se.pdf", habite({ ...p3, end: "Avenida Teste, 55 - Bairro Novo", areas: ["Área construída: 120,00 m²"] }));
await pdf(d + "nota-servico.pdf", pagina(`<h3>NOTA FISCAL DE SERVIÇOS ELETRÔNICA — NFS-e nº 1234</h3><p>Código de Verificação: ABCD-1234</p>
  <p>PRESTADOR DE SERVIÇOS: Construtora Exemplo Ltda — CNPJ 11.222.333/0001-81</p><p>TOMADOR DE SERVIÇOS: Antônio dos Santos Lima</p><p>Valor dos serviços: R$ 15.000,00</p>`));

// 4) Atenção (amarelo): área do habite-se diferente da do alvará de construção e um PDF escaneado
d = pasta("1700-2026");
const p4 = { nome: "BEATRIZ GOMES ARAÚJO", cpf: "390.533.447-05", cci: "80002" };
await pdf(d + "habite-se.pdf", habite({ ...p4, end: "Rua Residencial, 9 - Bairro Sul", areas: ["Área construída: 150,00 m²"] }));
await pdf(d + "alvara-construcao.pdf", alvara({ ...p4, end: "Rua Residencial, 9", areas: ["Área a construir: 152,00 m²"] }));
await pdfEscaneado(d + "documento-escaneado.pdf", "DECLARAÇÃO\nObra concluída em 2026.");

// 5) Processo num único PDF: ampliação (amarelo)
d = pasta("1800-2026");
const p5 = { nome: "CARLA MENDES ROCHA", cpf: "153.509.460-56", cci: "90003" };
await pdf(d + "processo-completo.pdf",
  requerimento({ proc: "1800/2026", ...p5, end: "Rua da Ampliação, 300 - Centro" }),
  habite({ ...p5, end: "Rua da Ampliação, 300 - Centro", areas: ["Área construída existente: 100,00 m²", "Área a ampliar: 40,00 m²"] }),
  alvara({ titulo: "ALVARÁ DE AMPLIAÇÃO", ...p5, areas: ["Área construída existente: 100,00 m²", "Área a ampliar: 40,00 m²"] }));

// 6) Já tem guia de ISS (amarelo): nome neutro; identificada pelo conteúdo (I.S.S.) e lida da linha digitável
d = pasta("1900-2026");
const p6 = { nome: "PAULO ROBERTO NUNES", cpf: "714.602.380-01", cci: "91004" };
await pdf(d + "habite-se.pdf", habite({ ...p6, end: "Rua do Comércio, 45 - Centro", areas: ["Área construída: 95,00 m²"] }));
await pdf(d + "documento-3.pdf", cobranca({ titulo: "DOCUMENTO DE ARRECADAÇÃO MUNICIPAL — DAM", tributo: "I.S.S. — Construção civil — Processo 1900/2026", parcelas: [["Parcela única", "30/10/2026", 1460.48]] }));

// 7) Duas casas a averbar (amarelo: avaliar decadência): cálculo por unidade
d = pasta("2000-2026");
const p7 = { nome: "LUCIANA MARTINS COSTA", cpf: "862.436.920-78", cci: "92005" };
await pdf(d + "habite-se.pdf", habite({ ...p7, end: "Rua das Palmeiras, 77 e 87 - Bairro Jardim", areas: [
  "Área a Averbar: CASA 01 - 111,94m² = 41,44% - N° 77", "Área a Averbar: CASA 02 - 158,17m² = 58,56% - N° 87",
  "Área a Legalizar: 270,11 m²", "Área total Construída: 270,11 m²"] }));

// 8) Carnê de ISS em 3 parcelas que não fecha com o ISS devido (amarelo)
d = pasta("2100-2026");
const p8 = { nome: "RENATO ALVES DIAS", cpf: "529.982.247-25", cci: "93006" };
await pdf(d + "habite-se.pdf", habite({ ...p8, end: "Rua dos Ipês, 12 - Centro", areas: ["Área construída: 182,50 m²"] }));
await pdf(d + "carne.pdf", cobranca({ titulo: "CARNÊ — IMPOSTO SOBRE SERVIÇOS", tributo: "ISS — Construção civil", parcelas: [
  ["Parcela 1/3", "10/11/2026", 1500], ["Parcela 2/3", "10/12/2026", 1500], ["Parcela 3/3", "10/01/2027", 1500]] }));

// 9) Guia de ISS sem texto (letras como imagem, como no "Microsoft Print to PDF"): lida por OCR
d = pasta("2200-2026");
const p9 = { nome: "SÉRGIO LIMA PRADO", cpf: "294.618.370-03", cci: "94007" };
await pdf(d + "habite-se.pdf", habite({ ...p9, end: "Rua das Acácias, 300 - Centro", areas: ["Área construída: 90,00 m²"] }));
const linhaBanco = (valor) => {
  const dvg = b => { let soma = 0, p = 2; for (let i = b.length - 1; i >= 0; i--) { soma += +b[i] * p; p = p === 9 ? 2 : p + 1; } const x = 11 - soma % 11; return x === 0 || x === 10 || x === 11 ? 1 : x; };
  const banco = "7569", fv = "1600" + String(Math.round(valor * 100)).padStart(10, "0"), livre = "1426440100087291928300001";
  const c1 = banco + livre.slice(0, 5), c2 = livre.slice(5, 15), c3 = livre.slice(15, 25);
  return c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + dvg(banco + fv + livre) + fv;
};
const dam = `<div style="font:15px Arial;width:760px;padding:20px;background:#fff">
  <div style="text-align:center;font-weight:bold;font-size:20px">PREFEITURA MUNICIPAL DE ARAGUARI</div>
  <div style="text-align:center">SECRETARIA MUNICIPAL DE FAZENDA</div><hr>
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:18px"><span>GUIA DE RECEITA</span><span>RECIBO DO PAGADOR</span></div>
  <p>Local de Pagamento: PAGÁVEL PREFERENCIALMENTE NAS AGÊNCIAS DO BANCO</p>
  <p>Vencimento: 30/11/2026 &nbsp;&nbsp; Nosso Número: 12834999</p>
  <p>LANCAMENTO: ID: 5600001 [ Imposto Sobre Serviços ] - Vencimento: 30/11/2026 - Valor: R$ 1.383,62</p>
  <p>(=) Valor do Documento: 1.383,62</p>
  <p>Pagador: SÉRGIO LIMA PRADO</p><p>Autenticação Mecânica</p><hr>
  <p style="font-size:17px;font-weight:bold;letter-spacing:1px">${linhaBanco(1383.62)}</p></div>`;
const pgImg = await b.newPage({ deviceScaleFactor: 2 });
await pgImg.setContent(dam);
const png = await pgImg.locator("div").first().screenshot();
await pgImg.close();
await pg.setContent(`<img src="data:image/png;base64,${png.toString("base64")}" style="width:100%">`);
await pg.pdf({ path: d + "DAM_ISSQN.pdf", format: "A4" });

await b.close();
writeFileSync(RAIZ + "LEIA-ME.txt", "Processos FICTÍCIOS para testar a leitura em lote do assistente.\n" +
  "1500-2026: simples (com boleto de taxa, só aviso) | 3057-2026: demolição (Word) | 1600-2026: com nota fiscal (pulado) | 1700-2026: atenção | 1800-2026: ampliação (um único PDF) | 1900-2026: já tem guia de ISS | 2000-2026: duas casas (cálculo por unidade) | 2100-2026: carnê de ISS que não fecha | 2200-2026: guia de ISS sem texto (lida por OCR).\n");
console.log("Exemplos gerados em", RAIZ);
