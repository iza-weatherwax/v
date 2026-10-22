// Testes do motor de cálculo. Executar: node --test testes/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../iss-construcao.html", import.meta.url), "utf8");
const codigo = html.match(/<script id="motor">([\s\S]*?)<\/script>/)[1];
const M = vm.createContext({});
vm.runInContext(codigo + "\n;this.api={calcular,TABELA_PADRAO,extensoReais,parseNum,anoDoProcesso,categoriaPorArea,parseCSV,montarCSV,mesclarCSV,csvLinhaProcesso,cpfValido,cnpjValido,r2,calcularDecadencia,somarAnos,CSV_COLUNAS,nomeArquivoJson};", M);
const A = M.api;
const base = (x) => ({ processo: "", anoManual: "", tipoObra: "construcao", categoria: "auto", area: 0, temMaoDeObra: false,
  usaPropria: false, usaTerceiros: false, propria: [], terceiros: [], ...x });
const calc = (p) => A.calcular(p, A.TABELA_PADRAO[A.anoDoProcesso(p.processo)]);

test("processo 6184/2025 — construção, 99 m², sem mão de obra", () => {
  const r = calc(base({ processo: "6184/2025", area: 99 }));
  assert.equal(r.categoria, "ate100");
  assert.equal(r.valorM2, 298.4);
  assert.equal(r.valorImovel, 29541.6);
  assert.equal(r.base, 29541.6);
  assert.equal(r.iss, 1477.08);
});

test("processo 3057/2026 — demolição, 282,87 m²", () => {
  const r = calc(base({ processo: "3057/2026", area: 282.87, tipoObra: "demolicao" }));
  assert.equal(r.categoria, "acima250");
  assert.equal(r.valorM2, 624.73);
  assert.equal(r.valorImovel, 176717.38);
  assert.equal(r.base, 53015.21);
  assert.equal(r.aliquota, 3);
  assert.equal(r.iss, 1590.46);
});

test("deduções aceitas e glosadas", () => {
  const r = calc(base({ processo: "1/2025", area: 99, temMaoDeObra: true, usaPropria: true, usaTerceiros: true,
    propria: [{ salario: 1000, inss: 200, fgts: 80 }, { salario: 500, inss: 0, fgts: 0, aceita: false, motivo: "x" }],
    terceiros: [{ valor: "2.000,50" }, { valor: 300, aceita: false }] }));
  assert.equal(r.propriaAceita, 1280);
  assert.equal(r.terceirosAceita, 2000.5);
  assert.equal(r.glosado, 800);
  assert.equal(r.base, 29541.6 - 3280.5);
  assert.equal(r.iss, A.r2((29541.6 - 3280.5) * 0.05));
});

test("sem mão de obra ignora lançamentos existentes", () => {
  const r = calc(base({ processo: "1/2025", area: 99, temMaoDeObra: false, usaPropria: true, propria: [{ salario: 9999 }] }));
  assert.equal(r.deducoes, 0);
  assert.equal(r.iss, 1477.08);
});

test("deduções maiores que o valor zeram a base", () => {
  const r = calc(base({ processo: "1/2025", area: 10, temMaoDeObra: true, usaTerceiros: true, terceiros: [{ valor: 100000 }] }));
  assert.equal(r.base, 0);
  assert.equal(r.iss, 0);
  assert.equal(r.deducoesExcedem, true);
});

test("ano do processo, faixas e ano inexistente", () => {
  assert.equal(A.anoDoProcesso("6184/2025"), 2025);
  assert.equal(A.anoDoProcesso("2026-123"), 2026);
  assert.equal(A.anoDoProcesso("123"), null);
  assert.equal(A.categoriaPorArea(100), "ate100");
  assert.equal(A.categoriaPorArea(100.01), "de101a250");
  assert.equal(A.categoriaPorArea(250), "de101a250");
  assert.equal(A.categoriaPorArea(250.01), "acima250");
  assert.equal(A.calcular(base({ processo: "1/2001", area: 50 }), undefined).erros.length, 1);
});

test("valor por extenso", () => {
  assert.equal(A.extensoReais(1477.08), "mil quatrocentos e setenta e sete reais e oito centavos");
  assert.equal(A.extensoReais(1590.46), "mil quinhentos e noventa reais e quarenta e seis centavos");
  assert.equal(A.extensoReais(100), "cem reais");
  assert.equal(A.extensoReais(1), "um real");
  assert.equal(A.extensoReais(0.01), "um centavo");
  assert.equal(A.extensoReais(2000000), "dois milhões de reais");
  assert.equal(A.extensoReais(176717.38), "cento e setenta e seis mil setecentos e dezessete reais e trinta e oito centavos");
  assert.equal(A.extensoReais(1100), "mil e cem reais");
});

test("CSV: montagem, leitura e mescla por ID", () => {
  const p = { ...base({ processo: "6184/2025", area: 99 }), id: "a1", requerente: 'Fulano "X"; Silva', status: "concluido", fiscal: {}, data: "2026-08-13" };
  const l1 = A.csvLinhaProcesso(p, calc(p));
  const csv = A.montarCSV([l1]);
  const lido = A.parseCSV(csv);
  assert.equal(lido.length, 2);
  assert.equal(lido[1][5], 'Fulano "X"; Silva');
  assert.equal(lido[1][22], "1477,08");
  const p2 = { ...p, id: "b2", processo: "3057/2026" };
  let m = A.mesclarCSV(csv, [A.csvLinhaProcesso(p2, calc(p2))]);
  assert.equal(A.parseCSV(m).length, 3);
  m = A.mesclarCSV(m, [A.csvLinhaProcesso({ ...p, area: 50 }, calc({ ...p, area: 50 }))]);
  assert.equal(A.parseCSV(m).length, 3);
  m = A.mesclarCSV(m, [], ["a1"]);
  assert.equal(A.parseCSV(m).length, 2);
});

test("validação de CPF/CNPJ", () => {
  assert.equal(A.cpfValido("123.456.789-09"), true);
  assert.equal(A.cpfValido("111.111.111-11"), false);
  assert.equal(A.cnpjValido("11.222.333/0001-81"), true);
  assert.equal(A.cnpjValido("11.222.333/0001-80"), false);
});

test("decadência — art. 173, I: conta de 1º/jan do ano seguinte", () => {
  const d = A.calcularDecadencia({ decAnalisar: true, decFundamento: "173", fimObra: "2020-06-15", data: "2025-12-31" });
  assert.equal(d.inicio, "2021-01-01");
  assert.equal(d.limite, "2025-12-31");
  assert.equal(d.decaido, false);
  assert.equal(A.calcularDecadencia({ decAnalisar: true, fimObra: "2020-06-15", data: "2026-01-01" }).decaido, true);
});

test("decadência — art. 150, § 4º: conta da conclusão da obra", () => {
  const d = A.calcularDecadencia({ decAnalisar: true, decFundamento: "150", fimObra: "2021-03-10", data: "2026-03-11" });
  assert.equal(d.limite, "2026-03-10");
  assert.equal(d.decaido, true);
  assert.equal(A.somarAnos("2020-02-29", 5), "2025-02-28");
});

test("decadência — data de referência própria e erros", () => {
  const d = A.calcularDecadencia({ decAnalisar: true, fimObra: "2019-01-01", data: "2030-01-01", decRef: "2024-06-01" });
  assert.equal(d.referencia, "2024-06-01");
  assert.equal(d.decaido, false);
  assert.ok(A.calcularDecadencia({ decAnalisar: true, fimObra: "", data: "2026-01-01" }).erros.length);
  assert.ok(A.calcularDecadencia({ decAnalisar: true, fimObra: "2027-01-01", data: "2026-01-01" }).erros.length);
  assert.equal(A.calcularDecadencia({ decAnalisar: false, fimObra: "2000-01-01" }).decaido, false);
});

test("decadência — só o ano da conclusão (data exata desconhecida)", () => {
  // art. 173, I: só o ano importa
  let d = A.calcularDecadencia({ decAnalisar: true, decFundamento: "173", fimObraSoAno: true, fimObraAno: "2020", fimObra: "2024-05-01", data: "2025-12-31" });
  assert.equal(d.soAno, true);
  assert.equal(d.inicio, "2021-01-01");
  assert.equal(d.limite, "2025-12-31");
  assert.equal(d.decaido, false);
  assert.equal(A.calcularDecadencia({ decAnalisar: true, fimObraSoAno: true, fimObraAno: " 2020 ", data: "2026-01-01" }).decaido, true);
  // art. 150, § 4º: conta de 31/12 do ano (a data mais tardia possível)
  d = A.calcularDecadencia({ decAnalisar: true, decFundamento: "150", fimObraSoAno: true, fimObraAno: "2020", data: "2025-12-31" });
  assert.equal(d.inicio, "2020-12-31");
  assert.equal(d.limite, "2025-12-31");
  assert.equal(d.decaido, false);
  // obra concluída no mesmo ano do lançamento não é erro; ano posterior, ano inválido ou vazio, sim
  assert.equal(A.calcularDecadencia({ decAnalisar: true, fimObraSoAno: true, fimObraAno: "2026", data: "2026-03-01" }).erros.length, 0);
  assert.match(A.calcularDecadencia({ decAnalisar: true, fimObraSoAno: true, fimObraAno: "2027", data: "2026-03-01" }).erros.join(), /ano de conclusão da obra é posterior/);
  for (const ano of ["", "12", "1850", "20a0"])
    assert.match(A.calcularDecadencia({ decAnalisar: true, fimObraSoAno: true, fimObraAno: ano, data: "2026-03-01" }).erros.join(), /Informe o ano de conclusão/, ano);
  // relatório CSV: só o ano na coluna da conclusão
  const p = base({ processo: "6184/2025", area: 99, decAnalisar: true, fimObraSoAno: true, fimObraAno: "2012", data: "2026-08-13" });
  const r = calc(p);
  assert.equal(r.iss, 0);
  const l = A.csvLinhaProcesso({ ...p, id: "x", fiscal: {} }, r);
  assert.equal(l[A.CSV_COLUNAS.indexOf("Conclusão da obra")], "2012");
  assert.equal(l[A.CSV_COLUNAS.indexOf("Prazo final para lançamento")], "31/12/2017");
});

test("decadência reconhecida zera o ISS a pagar e mantém o apurado", () => {
  const p = base({ processo: "6184/2025", area: 99, decAnalisar: true, decFundamento: "173", fimObra: "2018-05-01", data: "2026-08-13" });
  const r = calc(p);
  assert.equal(r.issApurado, 1477.08);
  assert.equal(r.iss, 0);
  assert.equal(r.decaido, true);
  const l = A.csvLinhaProcesso({ ...p, id: "x", fiscal: {} }, r, { nome: "Auditor Fixo", matricula: "1" });
  const col = n => l[A.CSV_COLUNAS.indexOf(n)];
  assert.equal(col("ISS devido (R$)"), "0,00");
  assert.equal(col("ISS apurado (R$)"), "1477,08");
  assert.equal(col("Decadência reconhecida"), "Sim");
  assert.equal(col("Prazo final para lançamento"), "31/12/2023");
  assert.equal(col("Fiscal"), "Auditor Fixo");
  assert.equal(l.length, A.CSV_COLUNAS.length);
});

test("várias unidades: cada uma na sua faixa e soma dos valores", () => {
  const p = base({ processo: "1500/2026", unidades: [{ rotulo: "CASA 01", area: 111.94 }, { rotulo: "CASA 02", area: 158.17 }] });
  const r = calc(p);
  assert.equal(r.unidades.length, 2);
  assert.equal(r.unidades[0].categoria, "de101a250");
  assert.equal(r.unidades[0].valor, 56990.89);
  assert.equal(r.unidades[1].valor, 80527.51);
  assert.equal(r.area, 270.11);
  assert.equal(r.valorImovel, 137518.4);
  assert.equal(r.iss, 6875.92);
  // faixas diferentes entre as unidades
  const r2 = calc(base({ processo: "1500/2026", unidades: [{ area: 90 }, { area: 300 }] }));
  assert.equal(r2.categoriaNome, "Por unidade");
  assert.equal(r2.valorImovel, A.r2(90 * 307.47) + A.r2(300 * 624.73));
  // faixa escolhida para uma unidade
  const r3 = calc(base({ processo: "1500/2026", unidades: [{ area: 90, categoria: "galpao" }, { area: 90 }] }));
  assert.equal(r3.unidades[0].valorM2, 270.07);
  assert.equal(r3.unidades[1].valorM2, 307.47);
});

test("nome do .json de cada processo", () => {
  const p = { id: "a1b2c3d4-0000", processo: "6184/2025" };
  assert.equal(A.nomeArquivoJson(p), "processo-6184-2025.json");
  assert.equal(A.nomeArquivoJson({ id: "a1b2c3d4-0000", processo: "" }), "processo-sem-numero-a1b2c3d4.json");
  assert.equal(A.nomeArquivoJson({ id: "x", processo: " 12/2026 (cópia) " }), "processo-12-2026 (cópia).json");
  assert.equal(A.nomeArquivoJson({ id: "x", processo: 'a:b*c?"<>|\\d.' }), "processo-abc-d.json");
  // mesmo número em outro processo: o início do ID entra no nome
  assert.equal(A.nomeArquivoJson(p, [p, { id: "ffff9999-1", processo: "6184/2025" }]), "processo-6184-2025-a1b2c3d4.json");
  assert.equal(A.nomeArquivoJson(p, [p, { id: "ffff9999-1", processo: "6185/2025" }]), "processo-6184-2025.json");
});
