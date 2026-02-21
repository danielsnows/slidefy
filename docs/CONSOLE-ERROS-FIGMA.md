# Erros no console do Figma (plugin Slidefy)

## O que você pode ignorar

Estas mensagens vêm do **próprio Figma** ou do navegador ao abrir o plugin. **Não são bugs do Slidefy** e não podem ser corrigidas no código do plugin.

### 1. `Unrecognized feature: 'local-network-access'`

- **Origem:** Figma ao criar o iframe da UI do plugin (`createInnerIframe`).
- **Motivo:** O Figma define permissões no iframe; o navegador não reconhece o recurso `local-network-access`.
- **Impacto:** Nenhum. O plugin funciona normalmente.

### 2. `[Violation] Potential permissions policy violation: camera / microphone / clipboard-write / display-capture`

- **Origem:** Política de permissões do documento/iframe.
- **Impacto:** Nenhum. O Slidefy não usa câmera, microfone nem clipboard.

### 3. `Canvas2D: Multiple readback operations using getImageData... willReadFrequently`

- **Origem:** Uso de canvas no Figma (ex.: thumbnails).
- **Impacto:** Aviso de performance do navegador, não quebra o plugin.

### 4. `[Local fonts] using agent` e `✅ Fonte carregada: ...`

- **Origem:** Carregamento de fontes no **canvas** (frame de instruções e textos dos templates).
- **Significado:** As fontes do canvas estão sendo carregadas com sucesso.

---

## Garantir que o plugin está atualizado

1. **Sempre rode o build após mudar templates ou UI:**
   ```bash
   npm run build
   ```

2. **Recarregar o plugin no Figma:**
   - Em **Plugins** → **Development** → remova o Slidefy se estiver listado.
   - **Import plugin from manifest...** e selecione a pasta do projeto (onde está o `manifest.json`).

Assim o Figma passa a usar o `code.js` e a UI embutida gerados pelo build (incluindo a UI sem link externo para fontes).
