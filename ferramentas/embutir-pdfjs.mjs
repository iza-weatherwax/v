// Embute o pdf.js (leitor de PDF, licença Apache 2.0) dentro de iss-construcao.html, em base64,
// para que a leitura em lote funcione sem internet e com o arquivo aberto direto do disco.
// Uso: node ferramentas/embutir-pdfjs.mjs <pasta do pacote pdfjs-dist>
//   ex.: npm pack pdfjs-dist && tar xzf pdfjs-dist-*.tgz && node ferramentas/embutir-pdfjs.mjs package
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const pacote = process.argv[2];
if (!pacote) { console.error("Informe a pasta do pacote pdfjs-dist."); process.exit(1); }
const versao = JSON.parse(readFileSync(join(pacote, "package.json"), "utf8")).version;
const b64 = f => readFileSync(join(pacote, "legacy", "build", f)).toString("base64");
const alvo = new URL("../iss-construcao.html", import.meta.url);
const html = readFileSync(alvo, "utf8");
const INI = "<!-- PDFJS-INICIO -->", FIM = "<!-- PDFJS-FIM -->";
const bloco = `${INI}
<!-- pdf.js ${versao} (Mozilla, licença Apache 2.0 — ver licencas/pdfjs-LICENSE.txt), embutido em base64. Não editar à mão. -->
<script type="application/octet-stream" id="pdfjs-lib">${b64("pdf.min.mjs")}</script>
<script type="application/octet-stream" id="pdfjs-worker">${b64("pdf.worker.min.mjs")}</script>
${FIM}`;
let novo;
if (html.includes(INI)) novo = html.slice(0, html.indexOf(INI)) + bloco + html.slice(html.indexOf(FIM) + FIM.length);
else novo = html.replace("</body>", bloco + "\n</body>");
writeFileSync(alvo, novo);
copyFileSync(join(pacote, "LICENSE"), new URL("../licencas/pdfjs-LICENSE.txt", import.meta.url));
console.log(`pdf.js ${versao} embutido (${(novo.length / 1048576).toFixed(1)} MB).`);
