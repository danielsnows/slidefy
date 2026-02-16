// ========== HANDLER E LÓGICA DE CRIAÇÃO (anexado após EMBEDDED_TEMPLATES) ==========
// Frame de instruções conforme design Figma: Slidefy - UI Design, node 57-94

var INSTRUCTION_STEPS = [
  { num: '01', title: 'Selecionar Slices', desc: 'Selecione as camadas Slice (slice-1 a slice-7) no painel de camadas', gradient: true },
  { num: '02', title: 'Painel Exportar', desc: 'No painel direito, clique em Export', gradient: true },
  { num: '03', title: 'Formato', desc: 'Escolha o formato (PNG ou JPG) e a escala (1x, 2x, etc.)', gradient: true },
  { num: '04', title: 'Exportar', desc: 'Clique em Exportar para baixar as imagens', gradient: false }
];

// Seta SVG: path em formato absoluto com espaços (H/V convertidos para L)
var ARROW_PATH = 'M 44.4775 0.439279 C 45.0633 -0.146386 46.0129 -0.146467 46.5986 0.439279 L 56.1445 9.98518 C 56.7302 10.5709 56.7302 11.5205 56.1445 12.1063 L 46.5986 21.6522 C 46.0129 22.2379 45.0633 22.2378 44.4775 21.6522 C 43.8918 21.0664 43.8918 20.1169 44.4775 19.5311 L 51.4629 12.5457 L 0 12.5457 L 0 9.54572 L 51.4629 9.54572 L 44.4775 2.56037 C 43.8918 1.97459 43.8918 1.02507 44.4775 0.439279 Z';

function createArrowVector() {
  var arrow = figma.createVector();
  arrow.name = 'arrow';
  arrow.vectorPaths = [{ windingRule: 'NONZERO', data: ARROW_PATH }];
  arrow.fills = [{ type: 'SOLID', color: { r: 118/255, g: 127/255, b: 159/255 }, opacity: 1 }];
  arrow.resize(57, 23);
  return arrow;
}

async function createExportInstructionsFrame(templateWidth) {
  var instrumentSans = { family: 'Instrument Sans', style: 'Medium' };
  try {
    await figma.loadFontAsync(instrumentSans);
  } catch (e) {
    instrumentSans = { family: 'Inter', style: 'Medium' };
    await figma.loadFontAsync(instrumentSans);
  }
  var fontSemiBold = { family: instrumentSans.family, style: 'SemiBold' };
  var fontBold = { family: instrumentSans.family, style: 'Bold' };
  var fontRegular = { family: instrumentSans.family, style: 'Regular' };
  try {
    await figma.loadFontAsync(fontSemiBold);
  } catch (e) {
    fontSemiBold = instrumentSans;
  }
  try {
    await figma.loadFontAsync(fontBold);
  } catch (e) {
    fontBold = instrumentSans;
  }
  try {
    await figma.loadFontAsync(fontRegular);
  } catch (e) {
    fontRegular = instrumentSans;
  }

  var frameWidth = 1100;

  var frame = figma.createFrame();
  frame.name = 'Instruções de exportação';
  frame.fills = [{ type: 'SOLID', color: { r: 9/255, g: 10/255, b: 15/255 }, opacity: 1 }];
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisAlignItems = 'MIN';
  frame.counterAxisAlignItems = 'MIN';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.itemSpacing = 40;
  frame.paddingLeft = 40;
  frame.paddingRight = 40;
  frame.paddingTop = 40;
  frame.paddingBottom = 40;
  frame.resize(frameWidth, 1);
  frame.clipsContent = false;

  var titleText = figma.createText();
  await figma.loadFontAsync(instrumentSans);
  titleText.fontName = instrumentSans;
  titleText.fontSize = 60;
  titleText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  titleText.characters = 'Como exportar os slides';
  titleText.layoutAlign = 'STRETCH';
  titleText.resize(frameWidth - 80, 80);
  frame.appendChild(titleText);

  // Steps: horizontal, Fill container (width), Hug contents (height), itemSpacing 0
  var stepsContainer = figma.createFrame();
  stepsContainer.name = 'Steps';
  stepsContainer.layoutMode = 'HORIZONTAL';
  stepsContainer.primaryAxisAlignItems = 'MIN';
  stepsContainer.counterAxisAlignItems = 'CENTER';
  stepsContainer.itemSpacing = 0;
  stepsContainer.fills = [];
  stepsContainer.primaryAxisSizingMode = 'FIXED';
  stepsContainer.counterAxisSizingMode = 'AUTO';
  stepsContainer.layoutAlign = 'STRETCH';
  frame.appendChild(stepsContainer);

  for (var s = 0; s < INSTRUCTION_STEPS.length; s++) {
    if (s > 0) {
      try {
        stepsContainer.appendChild(createArrowVector());
      } catch (e) {
        var fallback = figma.createRectangle();
        fallback.name = 'arrow';
        fallback.fills = [{ type: 'SOLID', color: { r: 118/255, g: 127/255, b: 159/255 }, opacity: 1 }];
        fallback.resize(57, 23);
        stepsContainer.appendChild(fallback);
      }
    }
    var step = INSTRUCTION_STEPS[s];
    var card = figma.createFrame();
    card.name = 'Step ' + (s + 1);
    card.fills = [{ type: 'SOLID', color: { r: 16/255, g: 18/255, b: 26/255 }, opacity: 1 }];
    card.cornerRadius = 20;
    card.layoutMode = 'VERTICAL';
    card.primaryAxisAlignItems = 'MIN';
    card.counterAxisAlignItems = 'CENTER';
    card.itemSpacing = 20;
    card.paddingLeft = 20;
    card.paddingRight = 20;
    card.paddingTop = 32;
    card.paddingBottom = 32;
    card.primaryAxisSizingMode = 'AUTO';
    card.counterAxisSizingMode = 'FIXED';
    card.layoutAlign = 'STRETCH';
    card.layoutGrow = 1;

    var pill = figma.createFrame();
    pill.name = 'btn';
    if (step.gradient) {
      pill.fills = [{
        type: 'GRADIENT_LINEAR',
        gradientTransform: [[1, 0, 0], [0, 1, 0]],
        gradientStops: [
          { position: 0, color: { r: 248/255, g: 56/255, b: 139/255, a: 1 } },
          { position: 1, color: { r: 255/255, g: 168/255, b: 75/255, a: 1 } }
        ]
      }];
    } else {
      pill.fills = [{ type: 'SOLID', color: { r: 64/255, g: 1, b: 182/255 }, opacity: 1 }];
    }
    pill.cornerRadius = 9999;
    pill.layoutMode = 'HORIZONTAL';
    pill.primaryAxisAlignItems = 'CENTER';
    pill.counterAxisAlignItems = 'CENTER';
    pill.paddingLeft = 40;
    pill.paddingRight = 40;
    pill.paddingTop = 24;
    pill.paddingBottom = 24;
    pill.primaryAxisSizingMode = 'FIXED';
    pill.counterAxisSizingMode = 'AUTO';
    pill.resize(72, 56);

    var numText = figma.createText();
    await figma.loadFontAsync(fontBold);
    numText.fontName = fontBold;
    numText.fontSize = 20;
    numText.textAlignHorizontal = 'CENTER';
    numText.fills = step.gradient
      ? [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }]
      : [{ type: 'SOLID', color: { r: 9/255, g: 10/255, b: 15/255 }, opacity: 1 }];
    numText.characters = step.num;
    pill.appendChild(numText);
    card.appendChild(pill);

    var textCol = figma.createFrame();
    textCol.name = 'TextCol';
    textCol.layoutMode = 'VERTICAL';
    textCol.primaryAxisAlignItems = 'MIN';
    textCol.counterAxisAlignItems = 'CENTER';
    textCol.itemSpacing = 12;
    textCol.fills = [];
    textCol.primaryAxisSizingMode = 'AUTO';
    textCol.counterAxisSizingMode = 'AUTO';
    textCol.layoutAlign = 'STRETCH';
    textCol.layoutGrow = 0;

    var titleT = figma.createText();
    await figma.loadFontAsync(fontSemiBold);
    titleT.fontName = fontSemiBold;
    titleT.fontSize = 22;
    titleT.textAlignHorizontal = 'CENTER';
    titleT.fills = [{ type: 'SOLID', color: { r: 243/255, g: 244/255, b: 247/255 }, opacity: 1 }];
    titleT.characters = step.title;
    titleT.layoutAlign = 'STRETCH';
    textCol.appendChild(titleT);

    var descT = figma.createText();
    await figma.loadFontAsync(fontRegular);
    descT.fontName = fontRegular;
    descT.fontSize = 16;
    descT.textAlignHorizontal = 'CENTER';
    descT.fills = [{ type: 'SOLID', color: { r: 186/255, g: 191/255, b: 207/255 }, opacity: 1 }];
    descT.characters = step.desc;
    descT.layoutAlign = 'STRETCH';
    textCol.appendChild(descT);

    card.appendChild(textCol);
    stepsContainer.appendChild(card);
  }

  var stepsH = stepsContainer.height > 0 ? stepsContainer.height : 220;
  for (var i = 0; i < stepsContainer.children.length; i++) {
    var child = stepsContainer.children[i];
    if (child.type === 'FRAME' && /^Step \d+$/.test(child.name)) {
      child.resize(child.width, stepsH);
    }
  }

  var totalHeight = frame.paddingTop + frame.paddingBottom + titleText.height + frame.itemSpacing + stepsH;
  frame.resize(frameWidth, Math.ceil(totalHeight));

  return frame;
}

function createExportSlices(parentFrame, slides, slideWidth, slideHeight) {
  for (var i = 0; i < slides; i++) {
    var slice = figma.createSlice();
    slice.name = 'slice-' + (i + 1);
    slice.x = i * slideWidth;
    slice.y = 0;
    slice.resize(slideWidth, slideHeight);
    parentFrame.appendChild(slice);
  }
}

// Carrega template pelo ID
async function loadTemplate(templateId) {
  try {
    if (!EMBEDDED_TEMPLATES || !EMBEDDED_TEMPLATES[templateId]) {
      figma.notify('Template "' + templateId + '" não encontrado', { error: true });
      return null;
    }
    return EMBEDDED_TEMPLATES[templateId];
  } catch (e) {
    console.error('Erro ao carregar template:', e);
    figma.notify('Erro ao carregar template', { error: true });
    return null;
  }
}

async function loadFont(fontName) {
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch (e) {}
  if (fontName.family === 'Krona One') {
    try {
      var alt = { family: 'Krona One', style: '' };
      await figma.loadFontAsync(alt);
      return alt;
    } catch (e2) {}
  }
  console.warn('Fonte não encontrada: ' + fontName.family + ' ' + fontName.style + ', usando padrão');
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  return { family: 'Inter', style: 'Regular' };
}

async function createNodeFromTemplate(nodeData, userImages, photoLayerPrefix, embeddedImages, photoGrayscale) {
  photoGrayscale = !!photoGrayscale;
  var node = null;
  switch (nodeData.type) {
    case 'FRAME':
      node = figma.createFrame();
      node.name = nodeData.name;
      if (nodeData.width !== undefined && nodeData.height !== undefined) node.resize(nodeData.width, nodeData.height);
      if (nodeData.clipsContent !== undefined) node.clipsContent = nodeData.clipsContent;
      break;
    case 'GROUP':
      node = null;
      break;
    case 'RECTANGLE':
      node = figma.createRectangle();
      node.name = nodeData.name;
      if (nodeData.width !== undefined && nodeData.height !== undefined) node.resize(nodeData.width, nodeData.height);
      if (nodeData.cornerRadius !== undefined) node.cornerRadius = nodeData.cornerRadius;
      break;
    case 'TEXT':
      var textNode = figma.createText();
      node = textNode;
      node.name = nodeData.name;
      try {
        if (nodeData.fontName && typeof nodeData.fontName === 'object' && nodeData.fontName.family) {
          var loadedFont = await loadFont(nodeData.fontName);
          var fontToUse = (loadedFont && loadedFont.family) ? loadedFont : nodeData.fontName;
          textNode.fontName = { family: fontToUse.family, style: fontToUse.style || 'Regular' };
        } else {
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          textNode.fontName = { family: 'Inter', style: 'Regular' };
        }
        if (nodeData.characters) textNode.characters = String(nodeData.characters);
        if (nodeData.fontSize != null) textNode.fontSize = Number(nodeData.fontSize);
        if (nodeData.textAlignHorizontal) textNode.textAlignHorizontal = nodeData.textAlignHorizontal;
        if (nodeData.textAlignVertical) textNode.textAlignVertical = nodeData.textAlignVertical;
        if (nodeData.letterSpacing !== undefined && nodeData.letterSpacing !== null) {
          var ls = nodeData.letterSpacing;
          if (typeof ls === 'number') {
            textNode.letterSpacing = { unit: 'PIXELS', value: ls };
          } else if (ls && typeof ls === 'object' && ls.unit && typeof ls.value === 'number') {
            textNode.letterSpacing = { unit: ls.unit === 'PERCENT' ? 'PERCENT' : 'PIXELS', value: ls.value };
          }
        }
        if (nodeData.lineHeight != null) {
          var lh = nodeData.lineHeight;
          if (typeof lh === 'number') {
            textNode.lineHeight = lh;
          } else if (lh && typeof lh === 'object' && typeof lh.value === 'number' && (lh.unit === 'PIXELS' || lh.unit === 'PERCENT')) {
            textNode.lineHeight = { unit: lh.unit, value: lh.value };
          } else if (lh && typeof lh === 'object' && lh.unit === 'AUTO') {
            textNode.lineHeight = { unit: 'AUTO' };
          }
        }
        if (nodeData.textCase) textNode.textCase = nodeData.textCase;
      } catch (textErr) {
        console.warn('Erro ao aplicar estilo de texto em "' + (nodeData.name || '') + '":', textErr);
      }
      break;
    case 'SLICE':
    case 'VECTOR':
    case 'ELLIPSE':
    case 'LINE':
      return null;
    default:
      console.warn('Tipo de nó não suportado: ' + nodeData.type);
      return null;
  }
  if (!node && nodeData.type !== 'GROUP') return null;

  if (node) {
    node.x = nodeData.x;
    node.y = nodeData.y;
    node.visible = nodeData.visible;
    node.locked = nodeData.locked;
    if (node.opacity !== undefined) node.opacity = nodeData.opacity;
    if (nodeData.rotation && node.rotation !== undefined) node.rotation = nodeData.rotation;
    if (nodeData.blendMode && node.blendMode !== undefined) node.blendMode = nodeData.blendMode;
  }

  if (node && nodeData.fills && node.fills !== undefined) {
    var fills = [];
    for (var i = 0; i < nodeData.fills.length; i++) {
      var fill = nodeData.fills[i];
      if (fill.type === 'SOLID') {
        fills.push({ type: 'SOLID', color: { r: fill.color.r, g: fill.color.g, b: fill.color.b }, opacity: fill.opacity != null ? fill.opacity : 1 });
      } else if (fill.type === 'IMAGE') {
        if (String(nodeData.name || '').startsWith(photoLayerPrefix)) {
          var photoIndex = parseInt(String(nodeData.name || '').replace(photoLayerPrefix, ''), 10) - 1;
          if (photoIndex >= 0 && photoIndex < userImages.length) {
            try {
              var img = figma.createImage(userImages[photoIndex]);
              fills.push({ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash });
            } catch (err) { console.warn('Erro ao carregar imagem ' + photoIndex, err); }
          }
        } else if (embeddedImages && nodeData.id && embeddedImages[nodeData.id]) {
          try {
            var b64 = embeddedImages[nodeData.id];
            var bytes = base64ToUint8Array(b64);
            var decImg = figma.createImage(bytes);
            var rawMode = fill.scaleMode || 'FILL';
            var scaleMode = (rawMode === 'STRETCH') ? 'FILL' : (['FILL', 'FIT', 'CROP', 'TILE'].indexOf(rawMode) >= 0 ? rawMode : 'FILL');
            fills.push({ type: 'IMAGE', scaleMode: scaleMode, imageHash: decImg.hash });
          } catch (err) {
            if (err && err.message && err.message.indexOf('too large') >= 0) {
              console.warn('Imagem decorativa ' + nodeData.name + ' ignorada (tamanho excede limite do Figma)');
            } else {
              console.warn('Erro ao carregar imagem decorativa ' + nodeData.name, err);
            }
          }
        }
      }
    }
    if (fills.length > 0) node.fills = fills;
    if (photoGrayscale && node && String(nodeData.name || '').startsWith(photoLayerPrefix)) {
      var overlay = figma.createRectangle();
      overlay.name = '.grayscale-overlay';
      overlay.resize(node.width, node.height);
      overlay.x = 0;
      overlay.y = 0;
      overlay.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 1 }];
      overlay.blendMode = 'COLOR';
      var wrapper = figma.createFrame();
      wrapper.name = nodeData.name;
      wrapper.x = nodeData.x;
      wrapper.y = nodeData.y;
      wrapper.resize(node.width, node.height);
      wrapper.clipsContent = false;
      wrapper.fills = [];
      wrapper.visible = nodeData.visible !== false;
      wrapper.locked = !!nodeData.locked;
      node.x = 0;
      node.y = 0;
      wrapper.appendChild(node);
      wrapper.appendChild(overlay);
      node = wrapper;
    }
  }

  if (node && nodeData.strokes && node.strokes !== undefined) {
    var strokes = [];
    for (var s = 0; s < nodeData.strokes.length; s++) {
      var st = nodeData.strokes[s];
      if (st.type === 'SOLID') strokes.push({ type: 'SOLID', color: { r: st.color.r, g: st.color.g, b: st.color.b }, opacity: st.opacity != null ? st.opacity : 1 });
    }
    if (strokes.length > 0) node.strokes = strokes;
  }
  if (node && nodeData.strokeWeight !== undefined && node.strokeWeight !== undefined) node.strokeWeight = nodeData.strokeWeight;

  if (node && nodeData.effects && node.effects !== undefined) {
    var effects = [];
    for (var e = 0; e < nodeData.effects.length; e++) {
      var ef = nodeData.effects[e];
      if (ef.type === 'DROP_SHADOW' || ef.type === 'INNER_SHADOW') effects.push({ type: ef.type, color: ef.color, offset: ef.offset, radius: ef.radius, spread: ef.spread != null ? ef.spread : 0, visible: ef.visible !== false, blendMode: ef.blendMode || 'NORMAL' });
      else if (ef.type === 'LAYER_BLUR') effects.push({ type: 'LAYER_BLUR', radius: ef.radius, visible: ef.visible !== false });
    }
    if (effects.length > 0) node.effects = effects;
  }

  if (nodeData.children && nodeData.children.length > 0 && (nodeData.type === 'GROUP' || nodeData.type === 'FRAME')) {
    var childNodes = [];
    for (var c = 0; c < nodeData.children.length; c++) {
      var child = await createNodeFromTemplate(nodeData.children[c], userImages, photoLayerPrefix, embeddedImages, photoGrayscale);
      if (child) childNodes.push(child);
    }
    if (nodeData.type === 'GROUP') {
      if (childNodes.length === 0) {
        var placeholder = figma.createRectangle();
        placeholder.resize(1, 1);
        placeholder.visible = false;
        placeholder.name = '.placeholder';
        childNodes.push(placeholder);
      }
      var group = figma.group(childNodes, figma.currentPage);
      group.name = nodeData.name;
      group.x = nodeData.x;
      group.y = nodeData.y;
      group.visible = nodeData.visible;
      group.locked = nodeData.locked;
      return group;
    }
    if (nodeData.type === 'FRAME' && typeof node.appendChild === 'function') {
      for (var j = 0; j < childNodes.length; j++) node.appendChild(childNodes[j]);
    }
  }
  return node;
}

function base64ToUint8Array(base64) {
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var len = base64.length;
  var pad = base64.charAt(len - 2) === '=' ? 2 : base64.charAt(len - 1) === '=' ? 1 : 0;
  var byteLen = (len * 3) / 4 - pad;
  var bytes = new Uint8Array(byteLen);
  var j = 0;
  for (var i = 0; i < len; i += 4) {
    var a = B64.indexOf(base64.charAt(i));
    var b = B64.indexOf(base64.charAt(i + 1));
    var c = B64.indexOf(base64.charAt(i + 2));
    var d = B64.indexOf(base64.charAt(i + 3));
    bytes[j++] = (a << 2) | (b >> 4);
    if (j < byteLen) bytes[j++] = ((b & 15) << 4) | (c >> 2);
    if (j < byteLen) bytes[j++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

function sendProgress(percent, log) {
  figma.ui.postMessage({ type: 'progress', percent: percent, log: log });
}

async function createCarouselOnCanvas(msg) {
  var templateId = msg.templateId;
  var imagesMetadata = msg.imagesMetadata || [];
  var imagesBase64 = msg.imagesBase64;

  sendProgress(5, 'Carregando template...');
  var template = await loadTemplate(templateId);
  if (!template) return;

  var images;
  if (imagesBase64 && imagesBase64.length > 0) {
    sendProgress(20, 'Processando imagens...');
    images = imagesBase64.map(function (b64) { return base64ToUint8Array(b64); });
  } else {
    sendProgress(15, 'Solicitando imagens...');
    figma.ui.postMessage({ type: 'request-images', count: imagesMetadata.length });
    images = await new Promise(function (resolve) {
      var handler = function (m) {
        if (m.type === 'images-data') {
          figma.ui.onmessage = originalHandler;
          resolve(m.images.map(function (arr) { return new Uint8Array(arr); }));
        }
      };
      var originalHandler = figma.ui.onmessage;
      figma.ui.onmessage = handler;
    });
  }

  sendProgress(45, 'Processando imagens...');
  try {
    if (typeof preloadGoogleFonts === 'function') await preloadGoogleFonts();
  } catch (fontErr) {
    console.warn('Preload de fontes:', fontErr);
  }

  sendProgress(55, 'Criando slides...');
  var mainFrame;
  try {
    mainFrame = await createNodeFromTemplate(template.nodeTree, images, template.photoLayerNamePrefix || 'photo-', template.embeddedImages || null, template.photoGrayscale || false);
  } catch (templateErr) {
    console.error('Erro ao criar template:', templateErr);
    figma.notify('Erro ao criar slides: ' + (templateErr && templateErr.message ? templateErr.message : 'erro desconhecido'), { error: true });
    sendProgress(0, '');
    return;
  }
  if (!mainFrame) {
    figma.notify('Erro ao criar carrossel', { error: true });
    return;
  }

  sendProgress(75, 'Adicionando instruções de exportação...');
  var templateWidth = mainFrame.width;
  var slideWidth = template.slideWidth || 1080;
  var slideHeight = template.slideHeight || 1080;
  var slides = template.slides || 7;
  try {
    var instructionsFrame = await createExportInstructionsFrame(templateWidth);
    instructionsFrame.x = 0;
    instructionsFrame.y = 0;
    mainFrame.x = 0;
    mainFrame.y = instructionsFrame.height + 24;
    sendProgress(90, 'Criando slices de exportação...');
    createExportSlices(mainFrame, slides, slideWidth, slideHeight);
    figma.currentPage.appendChild(instructionsFrame);
    figma.currentPage.appendChild(mainFrame);
    figma.currentPage.selection = [instructionsFrame, mainFrame];
    figma.viewport.scrollAndZoomIntoView([instructionsFrame, mainFrame]);
  } catch (e) {
    console.warn('Instruções/slices falharam', e);
    figma.currentPage.appendChild(mainFrame);
    figma.currentPage.selection = [mainFrame];
    figma.viewport.scrollAndZoomIntoView([mainFrame]);
  }

  sendProgress(100, 'Carrossel criado com sucesso!');
  figma.ui.postMessage({ type: 'carousel-complete' });
  figma.notify('Carrossel "' + template.name + '" criado com sucesso!');
}

figma.ui.onmessage = function (msg) {
  if (msg.type === 'create-carousel') {
    createCarouselOnCanvas(msg);
  } else {
    console.warn('Slidefy: mensagem não tratada', msg);
  }
};
