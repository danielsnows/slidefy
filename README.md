# SLIDEFY — Figma Plugin

Plugin para criação de carrosséis contínuos para Instagram a partir de upload de fotos e escolha de templates.

## Arquivos principais

- `ui.html`: UI do plugin (painel do Figma).
- `ui.css`: estilos da interface, seguindo o visual dark do design.
- `ui.js`: lógica de estado e interação da UI.
- `package.json`: metadados e scripts de desenvolvimento.

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

Resumo técnico: registrar em `templates/template-index.json`, gerar `templates/carousel_<id>.json` (via `scripts/fetch-figma-template.js` com token do Figma), salvar a imagem em `images/`, rodar `node build-templates.js`.

## Próximos passos

- Integrar `createCarousel(templateId, images)` com a Figma Plugin API em `code.ts` ou arquivo equivalente.
- Substituir templates mockados por templates vindos de uma fonte dinâmica (ex.: MCP ou API própria).

