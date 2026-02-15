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
      break;

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

/**
 * Função principal que cria o carrossel no canvas
 */
async function createCarouselOnCanvas(message: CreateCarouselMessage) {
  const { templateId, imagesMetadata } = message;

  figma.notify('⏳ Carregando template...', { timeout: 2000 });

  // Carrega o template
  const template = await loadTemplate(templateId);
  if (!template) {
    return;
  }

  figma.notify('⏳ Processando imagens...', { timeout: 2000 });

  // Solicita as imagens da UI
  figma.ui.postMessage({ 
    type: 'request-images',
    count: imagesMetadata.length 
  });

  // Aguarda as imagens
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

  figma.notify('⏳ Criando carrossel...', { timeout: 2000 });

  // Cria o frame principal recursivamente
  const mainFrame = await createNodeFromTemplate(
    template.nodeTree, 
    images,
    template.photoLayerNamePrefix
  );

  if (!mainFrame) {
    figma.notify('❌ Erro ao criar carrossel', { error: true });
    return;
  }

  // Adiciona ao canvas
  figma.currentPage.appendChild(mainFrame);
  figma.currentPage.selection = [mainFrame];
  figma.viewport.scrollAndZoomIntoView([mainFrame]);

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

