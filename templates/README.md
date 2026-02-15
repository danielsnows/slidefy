# Templates Slidefy

Templates de carrossel embutidos no plugin. A partir da **versão 2**, os templates são renderizados de forma fiel ao design do Figma.

## Regras de renderização (v2)

1. **Estrutura**: O template é um frame 7560×1080 (7 slides de 1080×1080) exportado do Figma.
2. **Fidelidade**: Todas as camadas são recriadas — posições, texto, shapes, background, fills, etc.
3. **Fotos do usuário**: Apenas camadas cujo nome começa com `photo-` são substituídas pelas imagens enviadas pelo usuário. As demais imagens são decorativas e permanecem.
4. **Slices**: Camadas Slice definem as áreas de exportação para o efeito de continuidade. O plugin cria um frame de instruções acima do template explicando como exportar.

## Como cadastrar um novo template (v2)

1. **No Figma**: Crie um frame 7560×1080 com o design completo.
   - Nomeie as camadas de foto do usuário como `photo-1`, `photo-2`, etc.
   - Adicione camadas Slice para cada slide (áreas de exportação).

2. **Extrair o template** (requer token de acesso Figma):
   ```bash
   FIGMA_ACCESS_TOKEN=seu_token node scripts/fetch-figma-template.js FILE_KEY NODE_ID
   ```
   Exemplo:
   ```bash
   FIGMA_ACCESS_TOKEN=xxx node scripts/fetch-figma-template.js 9rxGzx3Vkv16GwxGYs5xPq 33:52
   ```
   O token pode ser obtido em: Figma → Settings → Personal access tokens

3. **Thumbnail**: Salve uma imagem quadrada em `images/templates/<id>.png`.

4. **Índice**: Adicione a entrada em `template-index.json`.

5. **Build**: Execute `npm run build`.

## Instruções de exportação (exibidas no plugin)

O plugin cria um frame de texto acima do template com:

1. Selecione as camadas Slice no painel de camadas
2. No painel direito, clique em Export
3. Escolha o formato (PNG ou JPG) e a escala (1x, 2x, etc.)
4. Clique em Exportar para baixar as imagens
