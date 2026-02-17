# Criação de novos templates – Slidefy

Esta é a regra oficial para adicionar um novo template ao plugin. O criador do template deve fornecer três itens.

## O que você precisa enviar

1. **Link do Figma**  
   URL do arquivo (e, se possível, do frame/componente) do template no Figma.

2. **Descrição detalhada do template**  
   Incluir:
   - Nome do template
   - Número de slides
   - Breve descrição do uso (ex.: “Template para eventos de domingo”, “Carrossel memórias”)
   - Qualquer particularidade (texto em blend mode, fotos em P&B, etc.)

3. **Imagem do template inteiro**  
   Uma única imagem que mostre o template completo (todas as telas em sequência horizontal), no mesmo estilo das atuais:
   - `images/Template-5 slides.jpg` (Memórias)
   - `images/Template-7 slides.jpg` (Domingo)

## O que será feito com isso

- **Link do Figma** → extração do file key e do node id para gerar o JSON do carrossel via `scripts/fetch-figma-template.js`.
- **Descrição** → definição do `id` (slug), `name` (nome de exibição) e `slides` no índice e no script.
- **Imagem** → salva em `images/` e referenciada como `thumbnail` no `templates/template-index.json`.

Depois disso, o novo template aparece como card na tela de seleção de temas e pode ser usado no fluxo normal do plugin (incluindo animação em pixels por quantidade de slides).

## Referência técnica

- Índice: `templates/template-index.json`
- JSON do carrossel: `templates/carousel_<id>.json` (gerado pelo script do Figma)
- Build: `node build-templates.js`
- Regra para o agente: `.cursor/rules/create-template.mdc`
