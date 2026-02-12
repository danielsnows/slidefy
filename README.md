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

## Próximos passos

- Integrar `createCarousel(templateId, images)` com a Figma Plugin API em `code.ts` ou arquivo equivalente.
- Substituir templates mockados por templates vindos de uma fonte dinâmica (ex.: MCP ou API própria).

