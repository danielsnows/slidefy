// code.ts — Lógica principal do plugin Figma
// Mantém separação clara entre:
// - UI (ui.html + ui.css + ui.js)
// - Lógica de criação no canvas (aqui)

// Exibe a UI definida em `manifest.json` (ui.html)
figma.showUI(__html__, {
  width: 600,
  height: 650,
  themeColors: true
});

type CreateCarouselMessage = {
  type: "create-carousel";
  templateId: string;
  imagesMetadata: { name: string; size: number }[];
};

type PluginMessage = CreateCarouselMessage;

/**
 * Interface para nós do template JSON
 */
interface TemplateNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  rotation?: number;
  blendMode: string;
  constraints?: {
    vertical: string;
    horizontal: string;
  };
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  clipsContent?: boolean;
  children?: TemplateNode[];
  characters?: string;
  fontSize?: number;
  fontName?: {
    family: string;
    style: string;
  };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: any;
  lineHeight?: any;
  textCase?: string;
  effects?: any[];
}

interface TemplateData {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  slideWidth: number;
  slideHeight: number;
  slides: number;
  photoLayerNamePrefix: string;
  nodeTree: TemplateNode;
}

/**
 * Carrega o template JSON embutido
 */
async function loadTemplate(templateId: string): Promise<TemplateData | null> {
  try {
    // @ts-ignore - templates serão injetados pelo build-templates.js
    const templates = globalThis.__SLIDEFY_TEMPLATES__;
    if (!templates || !templates[templateId]) {
      figma.notify(`❌ Template "${templateId}" não encontrado`, { error: true });
      return null;
    }
    return templates[templateId];
  } catch (error) {
    console.error('Erro ao carregar template:', error);
    figma.notify('❌ Erro ao carregar template', { error: true });
    return null;
  }
}

/**
 * Carrega uma fonte antes de usar
 */
async function loadFont(fontName: { family: string; style: string }) {
  try {
    await figma.loadFontAsync(fontName);
  } catch (error) {
    console.warn(`Fonte não encontrada: ${fontName.family} ${fontName.style}, usando padrão`);
    // Fallback para fonte padrão
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  }
}

/**
 * Converte cor do formato 0-1 para 0-255
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Cria um nó do Figma a partir da definição do template
 */
async function createNodeFromTemplate(
  nodeData: TemplateNode, 
  userImages: Uint8Array[],
  photoLayerPrefix: string
): Promise<SceneNode | null> {
  let node: SceneNode | null = null;

  // Cria o nó baseado no tipo
  switch (nodeData.type) {
    case 'FRAME':
      node = figma.createFrame();
      node.name = nodeData.name;
      if (nodeData.width !== undefined && nodeData.height !== undefined) {
        node.resize(nodeData.width, nodeData.height);
      }
      if (nodeData.clipsContent !== undefined) {
        (node as FrameNode).clipsContent = nodeData.clipsContent;
      }
      break;

    case 'GROUP':
      node = figma.group([], figma.currentPage);
      node.name = nodeData.name;
      break;

    case 'RECTANGLE':
      node = figma.createRectangle();
      node.name = nodeData.name;
      if (nodeData.width !== undefined && nodeData.height !== undefined) {
        node.resize(nodeData.width, nodeData.height);
      }
      if (nodeData.cornerRadius !== undefined) {
        (node as RectangleNode).cornerRadius = nodeData.cornerRadius;
      }
      break;

    case 'TEXT':
      const textNode = figma.createText();
      node = textNode;
      node.name = nodeData.name;
      
      // Carrega a fonte antes de definir o texto
      if (nodeData.fontName) {
        await loadFont(nodeData.fontName);
        textNode.fontName = nodeData.fontName;
      } else {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      }
      
      if (nodeData.characters) {
        textNode.characters = nodeData.characters;
      }
      if (nodeData.fontSize) {
        textNode.fontSize = nodeData.fontSize;
      }
      if (nodeData.textAlignHorizontal) {
        textNode.textAlignHorizontal = nodeData.textAlignHorizontal as any;
      }
      if (nodeData.textAlignVertical) {
        textNode.textAlignVertical = nodeData.textAlignVertical as any;
      }
      // letterSpacing: número (px) ou { unit: "PERCENT"|"PIXELS", value: number }
      if (nodeData.letterSpacing !== undefined && nodeData.letterSpacing !== null) {
        textNode.letterSpacing = nodeData.letterSpacing as LetterSpacing;
      }
      if (nodeData.lineHeight) {
        textNode.lineHeight = nodeData.lineHeight;
      }
      if (nodeData.textCase) {
        textNode.textCase = nodeData.textCase as any;
      }
      // Redimensiona o quadro de texto para que textAlignHorizontal CENTER tenha efeito visual
      if (nodeData.width !== undefined && nodeData.height !== undefined) {
        textNode.resize(nodeData.width, nodeData.height);
      }
      // Vertical trim: "Cap height to baseline" (remove espaço vertical acima/abaixo dos glifos)
      if ('leadingTrim' in textNode) {
        (textNode as any).leadingTrim = { type: 'CAP_HEIGHT' };
      }
      break;

    case 'SLICE':
      // Slices do JSON são ignorados; o plugin cria os slices após criar o frame
      return null;

    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'LINE':
    case 'ELLIPSE':
    case 'POLYGON':
      // Formas vetoriais não suportadas na recriação; pular sem quebrar a árvore
      return null;

    default:
      console.warn(`Tipo de nó não suportado: ${nodeData.type}`);
      return null;
  }

  if (!node) return null;

  // Aplica propriedades comuns
  node.x = nodeData.x;
  node.y = nodeData.y;
  node.visible = nodeData.visible;
  node.locked = nodeData.locked;
  
  if ('opacity' in node) {
    node.opacity = nodeData.opacity;
  }
  
  if (nodeData.rotation && 'rotation' in node) {
    node.rotation = nodeData.rotation;
  }
  
  if (nodeData.blendMode && 'blendMode' in node) {
    node.blendMode = nodeData.blendMode as any;
  }

  // Aplica fills
  if (nodeData.fills && 'fills' in node) {
    const fills: Paint[] = [];
    
    for (const fill of nodeData.fills) {
      if (fill.type === 'SOLID') {
        fills.push({
          type: 'SOLID',
          color: {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b
          },
          opacity: fill.opacity ?? 1
        });
      } else if (fill.type === 'IMAGE') {
        // Verifica se é uma camada de foto do usuário
        if (nodeData.name.startsWith(photoLayerPrefix)) {
          const photoIndex = parseInt(nodeData.name.replace(photoLayerPrefix, '')) - 1;
          if (photoIndex >= 0 && photoIndex < userImages.length) {
            try {
              const image = figma.createImage(userImages[photoIndex]);
              fills.push({
                type: 'IMAGE',
                scaleMode: 'FILL',
                imageHash: image.hash
              });
            } catch (error) {
              console.warn(`Erro ao carregar imagem ${photoIndex}:`, error);
            }
          }
        }
        // Se não for foto do usuário ou falhar, mantém sem imagem
      }
    }
    
    if (fills.length > 0) {
      (node as any).fills = fills;
    }
  }

  // Aplica strokes
  if (nodeData.strokes && 'strokes' in node) {
    const strokes: Paint[] = [];
    for (const stroke of nodeData.strokes) {
      if (stroke.type === 'SOLID') {
        strokes.push({
          type: 'SOLID',
          color: {
            r: stroke.color.r,
            g: stroke.color.g,
            b: stroke.color.b
          },
          opacity: stroke.opacity ?? 1
        });
      }
    }
    if (strokes.length > 0) {
      (node as any).strokes = strokes;
    }
  }

  if (nodeData.strokeWeight !== undefined && 'strokeWeight' in node) {
    (node as any).strokeWeight = nodeData.strokeWeight;
  }

  // Aplica effects
  if (nodeData.effects && 'effects' in node) {
    const effects: Effect[] = [];
    for (const effect of nodeData.effects) {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        effects.push({
          type: effect.type,
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread,
          visible: effect.visible ?? true,
          blendMode: effect.blendMode ?? 'NORMAL'
        });
      } else if (effect.type === 'LAYER_BLUR') {
        effects.push({
          type: 'LAYER_BLUR',
          radius: effect.radius,
          visible: effect.visible ?? true
        });
      }
    }
    if (effects.length > 0) {
      (node as any).effects = effects;
    }
  }

  // Processa filhos recursivamente
  if (nodeData.children && ('children' in node || nodeData.type === 'GROUP')) {
    const childNodes: SceneNode[] = [];
    
    for (const childData of nodeData.children) {
      const childNode = await createNodeFromTemplate(childData, userImages, photoLayerPrefix);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    if (nodeData.type === 'GROUP' && childNodes.length > 0) {
      // Para grupos, precisamos criar o grupo com os filhos
      const group = figma.group(childNodes, figma.currentPage);
      group.name = nodeData.name;
      group.x = nodeData.x;
      group.y = nodeData.y;
      return group;
    } else if ('appendChild' in node) {
      // Para frames, adiciona os filhos
      for (const childNode of childNodes) {
        (node as FrameNode).appendChild(childNode);
      }
    }
  }

  return node;
}

/** Posições tipográficas fixas para o template Culto Jovem (dentro do frame principal) */
const CULTO_JOVEM_MAIN_TEXT_POSITIONS: Record<string, { x: number; y: number }> = {
  'Culto': { x: 70, y: 68 },
  'Jo': { x: 20, y: 198 },
  'VEM': { x: 189, y: 533 },
};
const CULTO_JOVEM_DATE_POSITION = { x: 812, y: 296 };
/** Posições dos 7 textos JUVENTUDE (relativas ao grupo Container em 2176, -114): rotation -90° */
const CULTO_JOVEM_JUVENTUDE_POSITIONS = [
  { x: 0, y: 0 },
  { x: 336, y: 176 },
  { x: 672, y: 352 },
  { x: 1008, y: 528 },
  { x: 1344, y: 704 },
  { x: 1680, y: 880 },
  { x: 2016, y: 1057 },
];
const JUVENTUDE_ROTATION_RAD = -Math.PI / 2; // -90°

function applyCultoJovemTypography(root: FrameNode): void {
  const collectTexts = (node: SceneNode, out: TextNode[]): void => {
    if (node.type === 'TEXT') out.push(node);
    if ('children' in node) {
      for (const c of node.children) collectTexts(c, out);
    }
  };
  const allTexts: TextNode[] = [];
  collectTexts(root, allTexts);

  // Frame "Main" está como filho do root
  const mainFrame = root.findOne((n) => n.type === 'FRAME' && n.name === 'Main') as FrameNode | null;
  if (mainFrame) {
    for (const child of mainFrame.children) {
      if (child.type !== 'TEXT') continue;
      const chars = (child as TextNode).characters.trim();
      const pos = CULTO_JOVEM_MAIN_TEXT_POSITIONS[chars];
      if (pos) {
        child.x = pos.x;
        child.y = pos.y;
      }
      // VEM com apenas stroke (border): sem fill
      if (chars === 'VEM' && (child as TextNode).strokes && (child as TextNode).strokes.length > 0) {
        (child as TextNode).fills = [];
      }
    }
  }

  // Date é filho direto do root
  const dateNode = root.findOne((n) => n.type === 'TEXT' && n.name === 'Date') as TextNode | null;
  if (dateNode) {
    dateNode.x = CULTO_JOVEM_DATE_POSITION.x;
    dateNode.y = CULTO_JOVEM_DATE_POSITION.y;
  }

  // Container com 7 JUVENTUDE: rotation -90° e posições fixas
  const container = root.findOne((n) => n.type === 'GROUP' && n.name === 'Container');
  if (container && 'children' in container) {
    const juventudeTexts = container.children.filter(
      (c): c is TextNode => c.type === 'TEXT' && (c as TextNode).characters === 'JUVENTUDE'
    );
    juventudeTexts.sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < juventudeTexts.length && i < CULTO_JOVEM_JUVENTUDE_POSITIONS.length; i++) {
      const t = juventudeTexts[i];
      const pos = CULTO_JOVEM_JUVENTUDE_POSITIONS[i];
      t.x = pos.x;
      t.y = pos.y;
      t.rotation = JUVENTUDE_ROTATION_RAD;
    }
    container.x = 2176;
    container.y = -114;
  }
}

/** Texto exibido no frame de instruções de exportação */
const EXPORT_INSTRUCTIONS_TEXT =
  "Como exportar os slides:\n\n" +
  "1. Selecione as camadas Slice (slice-1 a slice-7) no painel de camadas\n" +
  "2. No painel direito, clique em Export\n" +
  "3. Escolha o formato (PNG ou JPG) e a escala (1x, 2x, etc.)\n" +
  "4. Clique em Exportar para baixar as imagens";

/**
 * Cria o frame com instruções de exportação (acima do template)
 */
async function createExportInstructionsFrame(templateWidth: number): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = "Instruções de exportação";
  frame.fills = [{ type: "SOLID", color: { r: 0.97, g: 0.97, b: 0.98 }, opacity: 1 }];
  frame.resize(templateWidth, 1); // altura ajustada após o texto

  const text = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  text.characters = EXPORT_INSTRUCTIONS_TEXT;
  text.fontSize = 14;
  text.x = 16;
  text.y = 16;
  text.resize(templateWidth - 32, 400);
  text.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.25 }, opacity: 1 }];

  frame.appendChild(text);
  frame.clipsContent = false;
  // Ajusta altura do frame ao conteúdo do texto
  const textHeight = text.height + 32;
  frame.resize(templateWidth, textHeight);
  return frame;
}

/**
 * Cria as camadas Slice de exportação (uma por slide) dentro do frame do template
 */
function createExportSlices(
  parentFrame: FrameNode,
  slides: number,
  slideWidth: number,
  slideHeight: number
): void {
  for (let i = 0; i < slides; i++) {
    const slice = figma.createSlice();
    slice.name = `slice-${i + 1}`;
    slice.x = i * slideWidth;
    slice.y = 0;
    slice.resize(slideWidth, slideHeight);
    parentFrame.appendChild(slice);
  }
}

/**
 * Função principal que cria o carrossel no canvas
 */
function sendProgress(percent: number, log: string) {
  figma.ui.postMessage({ type: 'progress', percent, log });
}

async function createCarouselOnCanvas(message: CreateCarouselMessage) {
  const { templateId, imagesMetadata } = message;

  sendProgress(5, 'Carregando template...');

  const template = await loadTemplate(templateId);
  if (!template) {
    return;
  }

  sendProgress(20, 'Solicitando imagens...');

  figma.ui.postMessage({ 
    type: 'request-images',
    count: imagesMetadata.length 
  });

  const images = await new Promise<Uint8Array[]>((resolve) => {
    const handler = (msg: any) => {
      if (msg.type === 'images-data') {
        figma.ui.onmessage = originalHandler;
        resolve(msg.images.map((img: any) => new Uint8Array(img)));
      }
    };
    const originalHandler = figma.ui.onmessage;
    figma.ui.onmessage = handler;
  });

  sendProgress(45, 'Processando imagens...');

  // Cria o frame principal recursivamente
  sendProgress(55, 'Criando slides...');

  const mainFrame = await createNodeFromTemplate(
    template.nodeTree, 
    images,
    template.photoLayerNamePrefix
  );

  if (!mainFrame) {
    figma.notify('❌ Erro ao criar carrossel', { error: true });
    return;
  }

  if (templateId === 'culto-jovem' && mainFrame.type === 'FRAME') {
    applyCultoJovemTypography(mainFrame);
  }

  sendProgress(75, 'Adicionando instruções de exportação...');

  const gap = 24;
  let instructionsFrame: FrameNode | null = null;

  try {
    instructionsFrame = await createExportInstructionsFrame(template.width);
    instructionsFrame.x = 0;
    instructionsFrame.y = 0;
  } catch (e) {
    console.error('Erro ao criar frame de instruções:', e);
    figma.notify('⚠️ Frame de instruções não criado', { error: true });
  }

  // Posiciona o template: abaixo das instruções (se existir) ou em 0
  mainFrame.x = 0;
  mainFrame.y = instructionsFrame ? instructionsFrame.height + gap : 0;

  sendProgress(90, 'Criando slices de exportação...');

  try {
    createExportSlices(
      mainFrame as FrameNode,
      template.slides,
      template.slideWidth,
      template.slideHeight
    );
  } catch (e) {
    console.error('Erro ao criar slices:', e);
    figma.notify('⚠️ Slices de exportação não criados', { error: true });
  }

  // Adiciona ao canvas: primeiro instruções (se existir), depois template
  if (instructionsFrame) {
    figma.currentPage.appendChild(instructionsFrame);
  }
  figma.currentPage.appendChild(mainFrame);

  const toSelect = instructionsFrame ? [instructionsFrame, mainFrame] : [mainFrame];
  figma.currentPage.selection = toSelect;
  figma.viewport.scrollAndZoomIntoView(toSelect);

  sendProgress(100, 'Carrossel criado com sucesso!');
  figma.ui.postMessage({ type: 'carousel-complete' });
  figma.notify(`✅ Carrossel "${template.name}" criado com sucesso!`);
}

// Recebe mensagens vindas da UI (ui.js → parent.postMessage)
figma.ui.onmessage = (msg: PluginMessage) => {
  switch (msg.type) {
    case "create-carousel":
      createCarouselOnCanvas(msg);
      break;
    default:
      // Garante exaustividade se novos tipos forem adicionados
      const _exhaustive: never = msg;
      console.warn("Slidefy: mensagem não tratada", _exhaustive);
  }
};

