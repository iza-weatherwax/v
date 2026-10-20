// Testes da leitura automática. Executar: node --test testes/*.test.mjs
// Todos os nomes, CPFs, CCIs e endereços são fictícios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../iss-construcao.html", import.meta.url), "utf8");
const bloco = id => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`))[1];
const M = vm.createContext({});
vm.runInContext(bloco("motor") + "\n" + bloco("leitura") +
  "\n;this.api={analisarProcesso,dobrar,parseArea,nomeValido,enderecosIguais,lerLinhaDigitavel,compararGuiaComIss,compararGuiasComIss,_mod10};", M);
const { analisarProcesso, dobrar, parseArea, nomeValido, enderecosIguais, lerLinhaDigitavel, compararGuiaComIss, compararGuiasComIss, _mod10 } = M.api;
const pdf = (nome, ...paginas) => ({ nome, situacao: "lido", paginas });

const HABITE = `PREFEITURA MUNICIPAL DE ARAGUARI
SECRETARIA MUNICIPAL DE PLANEJAMENTO
ALVARÁ DE HABITE-SE E BAIXA DE CONSTRUÇÃO RESIDENCIAL
Proprietário: MARIA APARECIDA DE SOUZA
CPF: 123.456.789-09
CCI: 61234
Endereço: 100 - RUA DAS FLORES (R. DOZE - JARDIM CENTRAL) Número
Área construída: 182,50 m²
Responsável técnico: João Engenheiro Silva - CREA 12345 - CPF 987.654.321-00`;
const ALVARA = `PREFEITURA MUNICIPAL DE ARAGUARI
ALVARÁ DE CONSTRUÇÃO Nº 321/2023
Processo nº 777/2023
Proprietário: MARIA APARECIDA DE SOUZA
CPF: 123.456.789-09
CCI: 61.234
Endereço: RUA DAS FLORES (R. DOZE.
Área do terreno: 360,00 m²
Área a construir: 182,50 m²`;
const REQ = `REQUERIMENTO
Processo nº 1500/2026
Requerente: MARIA APARECIDA DE SOUZA
Endereço da obra: Rua das Flores, 100 - Jardim Central
Solicito a expedição do habite-se do imóvel acima.`;

// Linha digitável de arrecadação (prefeitura) válida para um valor.
function linhaArrecadacao(valor, seq = 1) {
  const corpo = "816" + "X" + String(Math.round(valor * 100)).padStart(11, "0") + "0001" + "20261001" + String(seq).padStart(17, "0");
  const semDv = corpo.replace("X", "");
  const barras = corpo.replace("X", String(_mod10(semDv)));
  return [0, 1, 2, 3].map(i => { const b = barras.slice(i * 11, i * 11 + 11); return b + " " + _mod10(b); }).join(" ");
}

test("utilitários: dobrar, parseArea, nome e endereço", () => {
  const s = "Área Construída ÇÃO nº";
  assert.equal(dobrar(s).length, s.length);
  assert.equal(dobrar(s), "area construida cao nº");
  assert.equal(parseArea("1.250"), 1250);
  assert.equal(parseArea("1.250,75"), 1250.75);
  assert.equal(nomeValido("MARIA APARECIDA DE SOUZA"), true);
  assert.equal(nomeValido("Maria Aparecida de Souza"), true);
  assert.equal(nomeValido("Certidão válida até"), false);
  assert.equal(nomeValido("Prefeitura Municipal"), false);
  assert.equal(nomeValido("RUA DAS FLORES"), false);
  assert.equal(enderecosIguais("1067 - RUA BENJAMIM ALVES (R. QUINZE - PARQUE DOS VERDES) Número", "RUA BENJAMIM ALVES (R. QUINZE."), true);
  assert.equal(enderecosIguais("Rua A, 10", "Rua B, 10"), false);
  assert.equal(enderecosIguais("Rua das Flores, 77", "Rua das Flores, 87"), false);
  assert.equal(enderecosIguais("Rua das Flores, 100 - Jardim Central", "100 - RUA DAS FLORES (R. DOZE - JARDIM CENTRAL)"), true);
});

test("caso simples: habite-se como fonte principal, conferido com o alvará de construção", () => {
  const r = analisarProcesso("1500-2026", [pdf("requerimento.pdf", REQ), pdf("habite-se.pdf", HABITE), pdf("alvara.pdf", ALVARA), { nome: "foto.jpg", situacao: "imagem" }]);
  assert.equal(r.semaforo, "verde", r.alertas.join(" | "));
  assert.equal(r.dados.processo, "1500/2026");           // da pasta, não do alvará de construção (777/2023)
  assert.equal(r.dados.requerente, "MARIA APARECIDA DE SOUZA");
  assert.equal(r.dados.documento, "123.456.789-09");      // não o CPF do engenheiro
  assert.equal(r.dados.cci, "61234");                     // 61.234 no alvará de construção é o mesmo
  assert.equal(r.dados.area, 182.5);                      // não a área do terreno
  assert.match(r.dados.endereco, /RUA DAS FLORES/);
  assert.ok(!/Número$/.test(r.dados.endereco));
  assert.ok(r.narrativa.some(n => /Documento principal — Alvará de Habite-se: habite-se\.pdf/.test(n.msg)));
  assert.ok(r.narrativa.some(n => /CCI confere com o Alvará de Construção/.test(n.msg)));
  assert.ok(r.narrativa.some(n => /Endereço da obra confere com o Alvará de Construção/.test(n.msg)));
  assert.ok(r.narrativa.some(n => /A área confere com o Alvará de Construção/.test(n.msg)));
});

test("CCIs de outros documentos e inscrição imobiliária não geram divergência", () => {
  const outros = `CERTIDÃO NEGATIVA
Confrontantes: lote CCI 82.008 e lote CCI 82.011; imóvel vizinho CCI: 84.864
Inscrição Imobiliária: 01.22215.00006.00028.0`;
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE.replace("61234", "84860")), pdf("alvara.pdf", ALVARA.replace("61.234", "84.860")), pdf("certidao.pdf", outros)]);
  assert.equal(r.dados.cci, "84860");
  assert.ok(!r.alertas.some(a => /CCI/.test(a)), r.alertas.join(" | "));
  // dentro do próprio habite-se, a inscrição longa não é lida como CCI
  const r2 = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE + "\nInscrição Cadastral: 01.22215.00006.00028.0")]);
  assert.equal(r2.dados.cci, "61234");
  assert.ok(!r2.alertas.some(a => /CCI/.test(a)));
});

test("CCI diferente no alvará de construção é apontado", () => {
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("alvara.pdf", ALVARA.replace("61.234", "61.999"))]);
  assert.equal(r.dados.cci, "61234");
  assert.ok(r.alertas.some(a => /CCI diferente no Alvará de Construção \(61999\)/.test(a)));
});

test("rótulo sem valor não captura a linha seguinte como nome", () => {
  const t = HABITE.replace("Proprietário: MARIA APARECIDA DE SOUZA", "Requerente:\nCertidão válida até 10/10/2026\nProprietário: MARIA APARECIDA DE SOUZA");
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", t)]);
  assert.equal(r.dados.requerente, "MARIA APARECIDA DE SOUZA");
  assert.ok(!r.narrativa.some(n => /Certidão válida/.test(n.msg)));
});

test("sem habite-se: avisa e usa os demais documentos", () => {
  const r = analisarProcesso("1500-2026", [pdf("requerimento.pdf", REQ), pdf("alvara.pdf", ALVARA)]);
  assert.equal(r.semaforo, "amarelo");
  assert.ok(r.alertas.some(a => /Não encontrei o Alvará de Habite-se/.test(a)));
  assert.equal(r.dados.area, 182.5);
  assert.equal(r.dados.processo, "1500/2026");
});

test("habite-se e alvará de construção no mesmo PDF (páginas diferentes)", () => {
  const r = analisarProcesso("1500-2026", [pdf("processo-completo.pdf", REQ, HABITE, ALVARA.replace("Área a construir: 182,50", "Área a construir: 170,00"))]);
  assert.equal(r.dados.area, 182.5);
  assert.ok(r.alertas.some(a => /área do Alvará de Construção \(170,00 m²\) é diferente/.test(a)));
});

test("nota fiscal: vermelho (pulado)", () => {
  const nf = `NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e
Código de Verificação: AB12CD
PRESTADOR DE SERVIÇOS: Construtora Exemplo Ltda
TOMADOR DE SERVIÇOS: Maria Aparecida de Souza`;
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("nota.pdf", nf)]);
  assert.equal(r.semaforo, "vermelho");
});

test("mera menção a nota fiscal: amarelo e pergunta sem resposta", () => {
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("req.pdf", REQ + "\nAnexar notas fiscais de mão de obra, se houver.")]);
  assert.equal(r.semaforo, "amarelo");
  assert.equal(r.dados.temMaoDeObra, null);
});

test("demolição e ampliação", () => {
  const dem = analisarProcesso("3057-2026", [pdf("baixa.pdf", "ALVARÁ DE BAIXA DE DEMOLIÇÃO\nProprietário: JOSÉ CARLOS PEREIRA\nCPF: 111.444.777-35\nCCI: 49999\nEndereço: Rua Exemplo, 1901\nÁrea demolida: 282,87 m²")]);
  assert.equal(dem.dados.tipoObra, "demolicao");
  assert.equal(dem.dados.area, 282.87);
  assert.equal(dem.semaforo, "verde", dem.alertas.join(" | "));
  const amp = analisarProcesso("1500-2026", [pdf("h.pdf", HABITE.replace("Área construída: 182,50 m²", "Área construída existente: 100,00 m²\nÁrea a ampliar: 40,00 m²"))]);
  assert.equal(amp.dados.area, 40);
  assert.equal(amp.semaforo, "amarelo");
});

test("várias unidades a averbar no habite-se: cálculo por unidade", () => {
  const h = HABITE.replace("Área construída: 182,50 m²", `Área a Averbar: CASA 01 - 111,94m² = 41,44% -  N° 77
Área a Averbar: CASA 02 - 158,17m² = 58,56% -  N° 87
Área a Legalizar: 270,11 m²
Área total Construída: 270,11 m²`);
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", h)]);
  assert.equal(r.dados.area, 270.11);
  assert.equal(r.dados.unidades.length, 2);
  assert.equal(r.dados.unidades[1].area, 158.17);
  assert.ok(r.alertas.some(a => /decadência/.test(a)));
});

test("dados faltando e CPF inválido", () => {
  const r = analisarProcesso("pasta sem numero", [pdf("r.pdf", "ALVARÁ DE HABITE-SE\nProprietário: JOSÉ DA SILVA\nCPF: 123.456.789-00")]);
  assert.equal(r.semaforo, "amarelo");
  assert.deepEqual([...r.faltando], ["número do processo (com o ano)", "CPF/CNPJ válido do requerente", "CCI", "endereço da obra", "área construída"]);
  assert.ok(r.alertas.some(a => /dígitos verificadores inválidos/.test(a)));
});

test("linha digitável: valor lido e dígitos conferidos", () => {
  const l = linhaArrecadacao(1460.48);
  assert.equal(lerLinhaDigitavel(l).valor, 1460.48);
  assert.equal(lerLinhaDigitavel(l.replace(/^8/, "9")), null);                  // não é arrecadação
  assert.equal(lerLinhaDigitavel(l.slice(0, -1) + ((Number(l.slice(-1)) + 1) % 10)), null); // dígito errado
});

test("boleto sem ISS (taxa de alvará): só aviso, sem guia e sem 'pago'", () => {
  const boleto = `PREFEITURA MUNICIPAL DE ARAGUARI
DOCUMENTO DE ARRECADAÇÃO MUNICIPAL
Receita: TAXA DE LICENÇA PARA EXECUÇÃO DE OBRAS
Vencimento: 30/10/2026   Valor do documento: R$ 250,00
Autenticação mecânica
${linhaArrecadacao(250)}`;
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("Boleto Alvara Construção.pdf", boleto)]);
  assert.equal(r.guias.length, 0);
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0], /não indica ISS/);
  assert.equal(r.semaforo, "verde", r.alertas.join(" | "));
});

test("guia de ISS (I.S.S.) pela linha digitável e comparação com o ISS devido", () => {
  const guia = `DOCUMENTO DE ARRECADAÇÃO MUNICIPAL
Tributo: I.S.S. - CONSTRUÇÃO CIVIL
Vencimento: 30/10/2026
Autenticação mecânica
${linhaArrecadacao(4645.72)}`;
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("documento3.pdf", guia)]);
  assert.equal(r.guias.length, 1);
  assert.equal(r.guias[0].total, 4645.72);
  assert.equal(r.guias[0].pago, false);
  assert.equal(r.guias[0].carne, false);
  assert.equal(r.semaforo, "amarelo");
  assert.equal(compararGuiaComIss(r.guias[0], 4645.72).t, "ok");
  const c = compararGuiaComIss(r.guias[0], 4000);
  assert.equal(c.t, "alerta");
  assert.match(c.msg, /diferença de R\$ 645,72 a mais/);
});

test("carnê de ISS com parcelas: soma comparada com o ISS devido", () => {
  const carne = `CARNÊ DE ISS - IMPOSTO SOBRE SERVIÇOS
Parcela 1/3  Vencimento: 10/11/2026
${linhaArrecadacao(1548.57)}
Parcela 2/3  Vencimento: 10/12/2026
${linhaArrecadacao(1548.57, 2)}
Parcela 3/3  Vencimento: 10/01/2027
${linhaArrecadacao(1548.58, 3)}`;
  const r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("carne.pdf", carne)]);
  const g = r.guias[0];
  assert.equal(g.carne, true);
  assert.equal(g.valores.length, 3);
  assert.equal(g.valores[2].rotulo, "parcela 3/3");
  assert.equal(g.total, 4645.72);
  assert.equal(compararGuiaComIss(g, 4645.72).t, "ok");
  assert.equal(compararGuiaComIss(g, 5000).t, "alerta");
  // comprovante de pagamento
  const r2 = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("c.pdf", carne + "\nComprovante de pagamento")]);
  assert.equal(r2.guias[0].pago, true);
});

test("guia pelo nome, escaneada, e requerimento que só menciona a guia", () => {
  let r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), { nome: "iss_pago.pdf", situacao: "escaneado", paginas: [] }]);
  assert.ok(r.alertas.some(a => /parece ser uma guia de ISS \(pelo nome\)/.test(a)));
  r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("comissao.pdf", REQ + "\nApós o pagamento da guia de recolhimento do ISS será expedido o habite-se.")]);
  assert.equal(r.guias.length, 0);
  assert.equal(r.semaforo, "verde", r.alertas.join(" | "));
});

test("linha digitável de boleto bancário com ruído de OCR", () => {
  // linha fictícia válida (banco 756), valor 4.026,40, gerada com os dígitos corretos
  const mod10 = s => { let soma = 0, p = 2; for (let i = s.length - 1; i >= 0; i--) { let x = +s[i] * p; if (x > 9) x = Math.floor(x / 10) + x % 10; soma += x; p = p === 2 ? 1 : 2; } return (10 - soma % 10) % 10; };
  const dvg = b => { let soma = 0, p = 2; for (let i = b.length - 1; i >= 0; i--) { soma += +b[i] * p; p = p === 9 ? 2 : p + 1; } const d = 11 - soma % 11; return d === 0 || d === 10 || d === 11 ? 1 : d; };
  const banco = "7569", fatorValor = "1582" + "0000402640", livre = "1234567890123456789012345";
  const geral = dvg(banco + fatorValor + livre);
  const c1 = banco + livre.slice(0, 5), c2 = livre.slice(5, 15), c3 = livre.slice(15, 25);
  const linha = c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + geral + fatorValor;
  assert.equal(linha.length, 47);
  assert.equal(lerLinhaDigitavel(linha).valor, 4026.4);
  // dígito geral errado é rejeitado
  assert.equal(lerLinhaDigitavel(linha.slice(0, 32) + ((+linha[32] + 1) % 10) + linha.slice(33)), null);
  // "7T56-0 7T569..." (OCR) com o código do banco colado antes
  const ocr = "WsICOOB -\n7T56-0 7T" + linha.slice(1);
  const M2 = vm.createContext({}); vm.runInContext(bloco("motor") + bloco("leitura") + ";this.f=extrairLinhasDigitaveis;", M2);
  const achadas = M2.f(ocr);
  assert.equal(achadas.length, 1);
  assert.equal(achadas[0].valor, 4026.4);
});

test("página lida por OCR: aviso na narração e alerta se for o habite-se", () => {
  const r = analisarProcesso("1500-2026", [{ nome: "habite-se.pdf", situacao: "lido", paginas: [HABITE], paginasOcr: [1] }]);
  assert.ok(r.narrativa.some(n => /lido por reconhecimento de imagem \(OCR\)/.test(n.msg)));
  assert.ok(r.alertas.some(a => /Alvará de Habite-se foi lido por reconhecimento de imagem/.test(a)));
});

test("várias guias: uma por unidade e a soma com o ISS total", () => {
  const g = (arquivo, valor) => ({ arquivo, carne: false, valores: [{ valor }], total: valor });
  const unid = [{ rotulo: "CASA 01", iss: 2849.54 }, { rotulo: "CASA 02", iss: 4026.38 }];
  // uma guia por unidade
  let r = compararGuiasComIss([g("dam1.pdf", 2849.54), g("dam2.pdf", 4026.38)], 6875.92, unid);
  assert.ok(r.every(c => c.t !== "alerta"), JSON.stringify(r));
  // só a guia da 2ª unidade: confere com a unidade, mas a soma não cobre o total
  r = compararGuiasComIss([g("dam2.pdf", 4026.38)], 6875.92, unid);
  assert.equal(r[0].t, "ok");
  assert.match(r[0].msg, /unidade CASA 02/);
  assert.ok(r.some(c => c.t === "alerta" && /Sem guia: CASA 01 \(ISS de R\$ 2\.849,54\)/.test(c.msg)), JSON.stringify(r));
  // guia com valor errado
  r = compararGuiasComIss([g("dam.pdf", 4026.40)], 4645.72, []);
  assert.equal(r[0].t, "alerta");
  assert.match(r[0].msg, /^A guia de ISS \(dam\.pdf\) cobra R\$ 4\.026,40/);
});

test("documentos anexados várias vezes: arquivo idêntico e o mesmo carnê não contam duas vezes", () => {
  const carne = `CARNÊ DE ISS - IMPOSTO SOBRE SERVIÇOS
Parcela 1/2  Vencimento: 10/11/2026
${linhaArrecadacao(2322.86, 1)}
Parcela 2/2  Vencimento: 10/12/2026
${linhaArrecadacao(2322.86, 2)}`;
  // 1) o mesmo arquivo anexado duas vezes (mesmo hash)
  let r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), { ...pdf("carne.pdf", carne), hash: "abc" }, { ...pdf("carne (1).pdf", carne), hash: "abc" }]);
  assert.equal(r.guias.length, 1);
  assert.equal(r.guias[0].total, 4645.72);
  assert.ok(r.avisos.some(a => /“carne \(1\)\.pdf” é idêntico a “carne\.pdf”/.test(a)));
  assert.equal(compararGuiasComIss(r.guias, 4645.72).every(c => c.t !== "alerta"), true);
  // 2) o mesmo carnê digitalizado de novo (texto diferente, mesmas linhas digitáveis)
  r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("carne.pdf", carne), pdf("scan carne ISS.pdf", "Digitalizado em 01/10/2026\n" + carne)]);
  assert.equal(r.guias.length, 1);
  assert.ok(r.avisos.some(a => /repete o carnê de ISS de “carne\.pdf”/.test(a)));
  // 3) arquivo com uma parcela repetida e uma nova: só a nova entra
  const parcela2e3 = `CARNÊ DE ISS\nParcela 2/2\n${linhaArrecadacao(2322.86, 2)}\nParcela extra 3/3\n${linhaArrecadacao(100, 3)}`;
  r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("carne.pdf", carne), pdf("outro.pdf", parcela2e3)]);
  assert.equal(r.guias.length, 2);
  assert.equal(r.guias[1].total, 100);
  assert.ok(r.narrativa.some(n => /1 parcela\(s\) de “outro\.pdf” já estavam em “carne\.pdf”/.test(n.msg)));
  // 4) guia sem linha digitável repetida: mesmo valor e vencimento
  const guiaTexto = "GUIA DE RECOLHIMENTO - ISSQN\nVencimento: 30/10/2026\nValor total: R$ 4.645,72\nCódigo de barras";
  r = analisarProcesso("1500-2026", [pdf("habite-se.pdf", HABITE), pdf("guia iss.pdf", guiaTexto), pdf("guia iss 2.pdf", guiaTexto + "\nCópia")]);
  assert.equal(r.guias.length, 1);
  assert.ok(r.avisos.some(a => /mesmo valor e vencimento/.test(a)));
});

test("o tipo do imposto: ISS sozinho, ISSQN, I.S.S. e imposto sobre serviços", () => {
  const M3 = vm.createContext({}); vm.runInContext(bloco("motor") + bloco("leitura") + ";this.re=RE_MENCAO_ISS;", M3);
  for (const t of ["carne de iss", "tributo: issqn", "i.s.s. construcao", "imposto sobre servicos"]) assert.ok(M3.re.test(t), t);
  for (const t of ["comissao", "permissao", "taxa de licenca"]) assert.ok(!M3.re.test(t), t);
});
