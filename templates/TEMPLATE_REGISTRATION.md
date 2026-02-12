# Processo de Cadastro de Templates (v2)

## Fluxo (quando você enviar um novo template)

1. **Você envia:**
   - Link do frame Figma (7560×1080) — ex: `https://figma.com/design/XXX/File?node-id=5-38`
   - Imagem PNG/JPG da thumbnail (quadrada)

2. **O assistente faz:**
   - Executa `scripts/fetch-figma-template.js` com o file key e node id extraídos do link
   - O script usa a Figma REST API (requer `FIGMA_ACCESS_TOKEN`) para extrair o template
   - Salva em `templates/carousel_<id>.json` com `version: 2` e `nodeTree`
   - Atualiza `templates/template-index.json`
   - Salva a thumbnail em `images/templates/<id>.png`
   - Executa `npm run build`

3. **Resultado:**
   - Novo template na UI
   - Renderização fiel ao Figma
   - Apenas camadas `photo-*` são trocadas pelas imagens do usuário
   - Frame de instruções de exportação acima do template

## Convenções no Figma

- **Camadas de foto do usuário**: Nome devem começar com `photo-` (ex: `photo-1`, `photo-2`)
- **Camadas Slice**: Definir áreas de exportação para cada slide (efeito de continuidade)
- **Frame do template**: 7560×1080 (7 slides de 1080×1080)

## Schema do JSON (v2)

```json
{
  "id": "string",
  "name": "string",
  "version": 2,
  "width": 7560,
  "height": 1080,
  "slideWidth": 1080,
  "slideHeight": 1080,
  "slides": 7,
  "photoLayerNamePrefix": "photo-",
  "nodeTree": { ... },
  "embeddedImages": { "nodeId": "base64..." }
}
```

O `nodeTree` é gerado automaticamente pelo script `fetch-figma-template.js`.
