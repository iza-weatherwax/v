# ISS Construção — Apuração para Habite-se

Assistente para o cálculo do ISS sobre construção civil e demolição (Araguari/MG), com checklist, memória de cálculo, decisão e relatório CSV.

## Como usar

1. Baixe o arquivo **`iss-construcao.html`** (é o único arquivo necessário, cerca de 8 MB).
2. Abra com dois cliques no navegador (Chrome ou Edge recomendados).
3. Não precisa de internet nem de instalação: nada é enviado para servidores.

Os processos ficam salvos **no próprio navegador do computador** em que foram feitos. Use **Processos → Exportar backup** com frequência; o backup também serve para levar os processos para outro computador (**Importar backup**).

### Um arquivo .json por processo

Em **Processos → Um arquivo .json por processo → Escolher pasta…** (Chrome ou Edge), cada processo passa a ser gravado nessa pasta num arquivo próprio — `processo-6184-2025.json`, ou `processo-sem-numero-….json` enquanto não tiver número — **atualizado automaticamente a cada alteração**.

- O arquivo traz um **resumo** (as mesmas colunas do relatório CSV: requerente, área, ISS, decadência…) e o **processo completo**, que pode ser importado de volta (**Importar backup ou .json de processos** aceita vários arquivos de uma vez).
- Se o número do processo mudar, o arquivo é renomeado. Dois processos com o mesmo número recebem o início do código interno no nome, para um não sobrescrever o outro — inclusive se a pasta for compartilhada entre computadores.
- Arquivar marca o arquivo como arquivado; **excluir não apaga o arquivo** (ele fica como cópia).
- O navegador pede permissão para gravar na pasta cada vez que o assistente é aberto: aparece um aviso com o botão **Permitir gravação**. Enquanto não for permitido, os arquivos não são atualizados (os processos continuam salvos no navegador).
- Em outros navegadores, use **Baixar .json** dentro de cada processo.

### Arquivar e excluir

Na lista de **Processos**, marque um ou vários processos (ou use “Arquivar todos os concluídos”):

- **Arquivar** tira o processo da lista de uso e da memória principal — o assistente continua rápido mesmo com muitos processos. Os arquivados ficam na aba **Arquivados**, de onde podem ser restaurados, e continuam no relatório CSV e no backup.
- **Excluir** remove o processo definitivamente (linhas já gravadas no relatório CSV e arquivos .json já gravados na pasta não são apagados).

Para **ordenar a lista** (por exemplo, em ordem alfabética pelo requerente), clique no título da coluna — Processo, Requerente, Obra, Área, ISS, Situação ou Data; clique de novo para inverter. Acentos e maiúsculas não atrapalham a ordem alfabética, números de processo ficam em ordem numérica e a ordem escolhida fica salva.

## Fluxo

1. **Identificação** — nº do processo (o ano do número define a linha da tabela: processo 6184/2025 → valores de 2025), requerente, CPF/CNPJ, CCI e endereço.
2. **Obra** — construção ou demolição, área e faixa da tabela (automática pela área ou escolhida).
3. **Decadência** (opcional) — informe a data de conclusão da obra, o fundamento (art. 173, I, ou art. 150, § 4º, do CTN) e as provas da data de conclusão. Se não for possível identificar a data exata (casas antigas), marque “informar só o ano” e digite o ano da conclusão: no art. 173, I, só o ano importa; no art. 150, § 4º, o prazo é contado de 31/12 desse ano, a data mais tardia possível. O assistente calcula o prazo final para o lançamento e, se decaído, zera o ISS a pagar (o valor apurado continua registrado) e gera o **parecer de decadência**.
4. **Mão de obra** — pergunta obrigatória (dispensada se a decadência for reconhecida): houve comprovação?
   - **Não** → cálculo somente pela área, sem deduções.
   - **Sim** → Anexo I (folha de pagamento e rescisões: salário + INSS + FGTS) e/ou Anexo II (notas fiscais de terceiros). Cada lançamento pode ser aceito ou glosado, com motivo.
5. **Fiscal** — o auditor é preenchido uma vez e fica **fixo** para todos os processos (alterável em Configurações). Para um caso específico, marque “Usar outro fiscal só neste processo”. A assinatura é feita no documento impresso ou eletronicamente.
6. **Checklist** — mostra pendências obrigatórias e as conferências documentais; o processo só pode ser concluído sem pendências.
7. **Documentos** — memória de cálculo, decisão e, quando analisada, parecer de decadência (os textos da decisão e do parecer podem ser editados). Imprima ou salve em PDF pelo próprio navegador.

## Leitura em lote (preenchimento automático)

Para os casos calculados **somente pela área** (sem notas fiscais nem folha de pagamento):

1. Baixe os processos para uma pasta, **uma pasta para cada processo**. Todos os arquivos de uma mesma pasta são lidos juntos; se você escolher a pasta de um único processo, ela mesma é o processo. Pastas sem PDF/Word (só fotos, por exemplo) são ignoradas.
2. No assistente, abra **Leitura em lote → Escolher pasta dos processos…**.
3. O programa lê PDFs (inclusive escaneados, por OCR — veja abaixo), Word (.docx), .odt e .txt e encontra: nº do processo, requerente, CPF/CNPJ (confere os dígitos), CCI, endereço da obra, área construída e tipo de obra (construção ou demolição).
   - **Fonte principal:** o **Alvará de Habite-se e Baixa de Construção**. Os dados dele são **comparados com o Alvará de Construção**; valores de outros documentos (certidões, requerimento etc.) só são usados se o dado não estiver nos alvarás e não geram divergência. Sem o habite-se, o processo fica 🟡 — salvo se houver Alvará de Legalização, que passa a ser a fonte principal.
   - **Conclusão da obra (fato gerador):** o Alvará de Habite-se marca o fim da obra. Vale a **data da assinatura digital** do habite-se, se houver (a do arquivo PDF ou a estampada na página, como “assinado digitalmente por … em 15/03/2026”; com várias, a mais recente); sem ela, a **data do alvará** (“Data de emissão: …”, a linha “Araguari, 15 de março de 2026” ou “Data: …”). A data vai para o campo “Conclusão da obra” do rascunho. Se tiver mais de 5 anos, a decadência fica marcada para análise e o processo fica 🟡. Sem data, fica só um aviso “para conhecimento”.
   - **Alvará de Legalização** (ex.: “Alvará de Legalização Residencial Unifamiliar”): em geral indica **construção antiga**, e o ISS provavelmente decaiu. A análise da decadência fica marcada no rascunho, **sem** data de conclusão — a data do alvará não é a do fim da obra; o fiscal informa a data (ou só o ano) e as provas. O processo fica 🟡.
   - O **nº do processo vem do nome da pasta**: uma pasta `5555` é o processo 5555 (também vale `5555-2026`). O ano de referência da tabela vem do nome da pasta ou dos documentos (ex.: “Nº DO PROCESSO: 5555/2026”); se não aparecer, usa o ano atual e avisa para conferir. O Alvará de Construção costuma ser de outro processo, mais antigo, e não interfere.
   - Reconhece o formato dos alvarás da prefeitura: requerente em “Concedido a: …” (com CPF/CNPJ) e endereço em “Local da construção: …”, inclusive quando continua na linha de baixo.
   - CCI: só o que vem rotulado como CCI (a “inscrição imobiliária/cadastral” é outro código). Endereços escritos de formas diferentes são reconhecidos como o mesmo.
4. Cada processo recebe uma situação:
   - 🟢 **Simples** — tudo encontrado e coerente: o rascunho é criado com memória e decisão prontas; o fiscal só confere e conclui.
   - 🟡 **Atenção** — dado faltando ou divergente, ampliação, endereço genérico, PDF escaneado etc.: o rascunho é criado com os alertas.
   - 💲 **Guia ou carnê de ISS** — um boleto/guia só conta como ISS se trouxer o tipo do imposto (ISS, I.S.S., ISSQN ou “imposto sobre serviços”); boletos de outras taxas geram apenas um aviso “para conhecimento”. O valor é lido da **linha digitável** (com os dígitos conferidos), parcela a parcela; o programa soma as parcelas do carnê, **compara com o ISS que deveria ser pago** e aponta a diferença. O processo fica 🟡.
   - 🔴 **Com nota fiscal ou folha de pagamento** — o processo é **pulado** e fica para o fiscal (há um botão para criar o rascunho mesmo assim).
5. **“O que o programa fez”**: para cada dado, o arquivo, a página e o trecho original de onde ele saiu. Também sai como documento imprimível (“Relatório de leitura”).
   **“Ver texto lido”** mostra o texto exatamente como o programa leu cada arquivo (só logo após a leitura do lote; não fica salvo) — útil para conferir ou relatar erros de leitura.
6. **Imprimir memória + decisão dos simples** gera, numa só impressão, os documentos de todos os casos simples.

**PDFs sem texto** (por exemplo, guias geradas pelo “Microsoft Print to PDF”, em que as letras viram desenho, ou documentos escaneados) são lidos por **reconhecimento de texto em imagem (OCR)**, sem internet — alguns segundos por página, sem travar a tela. Vale para todos os PDFs, qualquer que seja o nome do arquivo; páginas que já têm texto são lidas direto, sem OCR. O relatório indica o que foi lido por OCR; se for o Alvará de Habite-se ou o de Construção, o processo fica 🟡 para conferência. Valores de guias lidos por OCR são confirmados pelos dígitos verificadores da linha digitável. O OCR pode ser desligado na tela da leitura em lote (aí os PDFs sem texto ficam apontados para conferência).

**Documentos anexados mais de uma vez** não são contados em dobro: arquivos idênticos são reconhecidos pelo conteúdo e ignorados (fica um aviso “para conhecimento”), e o mesmo carnê/guia em arquivos diferentes (outra digitalização, outro nome) é reconhecido pela linha digitável de cada parcela — cada parcela entra uma vez só. Guias sem linha digitável legível são comparadas por valor e vencimento.

Com várias unidades, cada guia de ISS é comparada com o ISS da unidade correspondente, e a soma das guias com o ISS total (avisando se faltar guia para alguma unidade).

Nada é enviado para a internet e nenhum processo é concluído automaticamente. Processos com número já existente no assistente são ignorados.

A pasta `exemplos/lote-exemplo` tem 10 processos **fictícios** para experimentar (um de cada situação).

## Regras de cálculo

| | Construção | Demolição |
|---|---|---|
| Valor do imóvel | área × valor do m² | área × valor do m² |
| Base de cálculo | valor − deduções | (valor − deduções) × 30% |
| ISS | BC × 5% | BC × 3% |

- Deduções aceitas: mão de obra própria (folha + rescisões, com INSS e FGTS) e mão de obra de terceiros (NFS-e de serviços tributados em Araguari — art. 10 do Decreto 77/2020).
- **Várias unidades** (casas, salas…): cada unidade é calculada na **sua própria faixa** da tabela e os valores são somados (ex.: casas de 111,94 m² e 158,17 m² entram ambas na faixa “101 a 250 m²”, e não na faixa “acima de 250 m²” da área total). No processo, use “Dividir em unidades”; a leitura em lote faz isso sozinha quando o alvará lista as unidades.
- Se as deduções superarem o valor do imóvel, a base de cálculo é zero.
- Decadência: art. 173, I — prazo de 5 anos a partir de 1º de janeiro do ano seguinte à conclusão da obra; art. 150, § 4º — 5 anos a partir da conclusão. A data de referência é a do lançamento (por padrão, a data do cálculo).
- Valores arredondados em centavos em cada etapa.
- Valor do m², alíquotas e percentual da demolição ficam na aba **Tabela de valores**, por ano, e podem ser editados. Processos concluídos guardam os valores usados no momento da conclusão.

## Relatório CSV

Cada processo concluído vira uma linha do relatório (separador `;`, abre direto no Excel/LibreOffice).

- **Chrome/Edge:** em **Relatório CSV → Criar novo arquivo** (ou **Vincular arquivo existente**), o arquivo é atualizado automaticamente a cada conclusão. Linhas de processos já existentes são substituídas, e as dos demais são preservadas — o mesmo arquivo pode reunir processos de vários computadores.
- **Outros navegadores:** **Baixar relatório (.csv)** gera o arquivo com todos os processos concluídos.

## Testes

```
node --test testes/*.test.mjs
```

Os testes reproduzem os processos 6184/2025 (R$ 1.477,08) e 3057/2026 — demolição (R$ 1.590,46).

## Componentes de terceiros

- [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla, licença Apache 2.0 — `licencas/pdfjs-LICENSE.txt`), embutido no arquivo para ler PDFs sem internet. Para atualizar: `node ferramentas/embutir-pdfjs.mjs <pasta do pacote pdfjs-dist>`.
- [Tesseract OCR](https://github.com/naptha/tesseract.js-core) compilado para WebAssembly (`tesseract.js-core`, licença Apache 2.0 — `licencas/tesseract-core-LICENSE.txt`) e modelo de português (`@tesseract.js-data/por`, licença MIT; dados tessdata, Apache 2.0 — `licencas/tesseract-por-LICENSE.txt`), embutidos para o OCR sem internet. Para atualizar: `node ferramentas/embutir-ocr.mjs <pasta do pacote tesseract.js-core> <pasta do pacote @tesseract.js-data/por>`.

Por causa desses componentes, o arquivo tem cerca de 8 MB.

## Base normativa

- Lei Complementar nº 071/2010, art. 105.
- Decreto nº 77/2020 (Araguari) — apuração do ISS nos itens 7.02 e 7.05.
