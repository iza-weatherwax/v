// Embute o reconhecimento de texto em imagens (OCR) dentro de iss-construcao.html, em base64,
// para ler PDFs sem camada de texto (ex.: "Microsoft Print to PDF" com letras desenhadas, ou escaneados)
// sem internet e com o arquivo aberto direto do disco.
//   - tesseract.js-core (Tesseract OCR compilado para WebAssembly, versão SIMD/LSTM) — licença Apache 2.0
//   - @tesseract.js-data/por (modelo de português "best_int") — licença MIT; dados do projeto tessdata (Apache 2.0)
// Uso: node ferramentas/embutir-ocr.mjs <pasta do pacote tesseract.js-core> <pasta do pacote @tesseract.js-data/por>
//   ex.: npm pack tesseract.js-core @tesseract.js-data/por, extrair cada .tgz e passar as pastas "package".
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const [core, dados] = process.argv.slice(2);
if (!core || !dados) { console.error("Informe as pastas dos pacotes tesseract.js-core e @tesseract.js-data/por."); process.exit(1); }
const versao = d => JSON.parse(readFileSync(join(d, "package.json"), "utf8")).version;
const b64 = f => readFileSync(f).toString("base64");
const alvo = new URL("../iss-construcao.html", import.meta.url);
const html = readFileSync(alvo, "utf8");
const INI = "<!-- OCR-INICIO -->", FIM = "<!-- OCR-FIM -->";
const bloco = `${INI}
<!-- OCR: tesseract.js-core ${versao(core)} (Apache 2.0) e modelo de português @tesseract.js-data/por ${versao(dados)} (MIT; dados tessdata, Apache 2.0) — ver licencas/. Embutido em base64. Não editar à mão. -->
<script type="application/octet-stream" id="ocr-core">${b64(join(core, "tesseract-core-simd-lstm.js"))}</script>
<script type="application/octet-stream" id="ocr-wasm">${b64(join(core, "tesseract-core-simd-lstm.wasm"))}</script>
<script type="application/octet-stream" id="ocr-por">${b64(join(dados, "4.0.0_best_int", "por.traineddata.gz"))}</script>
${FIM}`;
let novo;
if (html.includes(INI)) novo = html.slice(0, html.indexOf(INI)) + bloco + html.slice(html.indexOf(FIM) + FIM.length);
else novo = html.replace("</body>", bloco + "\n</body>");
writeFileSync(alvo, novo);
copyFileSync(join(core, "LICENSE"), new URL("../licencas/tesseract-core-LICENSE.txt", import.meta.url));
writeFileSync(new URL("../licencas/tesseract-por-LICENSE.txt", import.meta.url),
  "Modelo de português (por.traineddata, versão best_int) distribuído pelo pacote @tesseract.js-data/por (licença MIT),\n" +
  "derivado do projeto tesseract-ocr/tessdata_best, licenciado sob a Apache License 2.0\n" +
  "(texto da licença em licencas/tesseract-core-LICENSE.txt).\n");
console.log(`OCR embutido (${(novo.length / 1048576).toFixed(1)} MB no total).`);
