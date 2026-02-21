# SLIDEFY — Figma Plugin

Plugin para criação de carrosséis contínuos para Instagram a partir de upload de fotos e escolha de templates.

## Arquivos principais

- **`code-source.js`**: **fonte única do código do plugin** — edite apenas este arquivo para alterar a lógica (criação de slides, tipografia, etc.). O build gera `code.js` a partir daqui.
- `code.js`: código que o Figma executa; **gerado pelo build** (não editar manualmente).
- `ui.html` / `ui.css` / `ui.js`: UI do plugin (painel do Figma).
- `package.json`: metadados e scripts de desenvolvimento.

## Build e código do plugin

- **Comando**: `npm run build` (ou `node embed-images.js && node build-templates.js`).
- Se existir **`code-source.js`**, o build usa ele como fonte única: substitui o bloco `EMBEDDED_TEMPLATES` pelos JSON dos templates e escreve o resultado em **`code.js`**. O Figma carrega `code.js` (definido em `manifest.json`).
- Para que mudanças na lógica do plugin tenham efeito: edite **`code-source.js`** e rode o build. Não é necessário editar `code-tail.js` nem `code.js` manualmente.

## Estado base da UI

A UI mantém o seguinte estado:

```js
const state = {
  step: 1, // 1 | 2 | 3
  uploadedImages: /** @type {File[]} */ ([]),
  selectedTemplateId: /** @type {string | null} */ (null)
};
```

## Criação de novos templates

Para adicionar um novo template ao plugin, use o fluxo oficial:

1. **Envie**: link do Figma + descrição detalhada do template + imagem do template inteiro (horizontal, todas as telas).
2. O agente (ou você) segue a regra em `.cursor/rules/create-template.mdc` e o guia em `docs/CRIACAO-DE-TEMPLATES.md`.

Resumo técnico: registrar em `templates/template-index.json`, gerar `templates/carousel_<id>.json` (via `scripts/fetch-figma-template.js` com token do Figma), salvar a imagem em `images/`, rodar `npm run build`.

## Próximos passos

- Integrar `createCarousel(templateId, images)` com a Figma Plugin API em `code-source.js` (fonte única do plugin).
- Substituir templates mockados por templates vindos de uma fonte dinâmica (ex.: MCP ou API própria).

