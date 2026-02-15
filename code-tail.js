// ========== HANDLER E LÓGICA DE CRIAÇÃO (anexado após EMBEDDED_TEMPLATES) ==========
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
  } catch (e) {
    console.warn('Fonte não encontrada: ' + fontName.family + ' ' + fontName.style + ', usando padrão');
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  }
}

async function createNodeFromTemplate(nodeData, userImages, photoLayerPrefix, embeddedImages) {
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
      if (nodeData.fontName) {
        await loadFont(nodeData.fontName);
        textNode.fontName = nodeData.fontName;
      } else {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      }
      if (nodeData.characters) textNode.characters = nodeData.characters;
      if (nodeData.fontSize) textNode.fontSize = nodeData.fontSize;
      if (nodeData.textAlignHorizontal) textNode.textAlignHorizontal = nodeData.textAlignHorizontal;
      if (nodeData.textAlignVertical) textNode.textAlignVertical = nodeData.textAlignVertical;
      if (nodeData.letterSpacing !== undefined && nodeData.letterSpacing !== null) {
        var ls = nodeData.letterSpacing;
        textNode.letterSpacing = typeof ls === 'number' ? { unit: 'PIXELS', value: ls } : ls;
      }
      if (nodeData.lineHeight) textNode.lineHeight = nodeData.lineHeight;
      if (nodeData.textCase) textNode.textCase = nodeData.textCase;
      break;
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
        if (nodeData.name.startsWith(photoLayerPrefix)) {
          var photoIndex = parseInt(nodeData.name.replace(photoLayerPrefix, ''), 10) - 1;
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
          } catch (err) { console.warn('Erro ao carregar imagem decorativa ' + nodeData.name, err); }
        }
      }
    }
    if (fills.length > 0) node.fills = fills;
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

  if (nodeData.children && (nodeData.type === 'GROUP' || (node && node.appendChild))) {
    var childNodes = [];
    for (var c = 0; c < nodeData.children.length; c++) {
      var child = await createNodeFromTemplate(nodeData.children[c], userImages, photoLayerPrefix, embeddedImages);
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
    for (var j = 0; j < childNodes.length; j++) node.appendChild(childNodes[j]);
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

async function createCarouselOnCanvas(msg) {
  var templateId = msg.templateId;
  var imagesMetadata = msg.imagesMetadata || [];
  var imagesBase64 = msg.imagesBase64;

  figma.notify('Carregando template...', { timeout: 2000 });
  var template = await loadTemplate(templateId);
  if (!template) return;

  var images;
  if (imagesBase64 && imagesBase64.length > 0) {
    figma.notify('Processando imagens...', { timeout: 2000 });
    images = imagesBase64.map(function (b64) { return base64ToUint8Array(b64); });
  } else {
    figma.notify('Processando imagens...', { timeout: 2000 });
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

  figma.notify('Criando carrossel...', { timeout: 2000 });
  if (typeof preloadGoogleFonts === 'function') await preloadGoogleFonts();

  var mainFrame = await createNodeFromTemplate(template.nodeTree, images, template.photoLayerNamePrefix || 'photo-', template.embeddedImages || null);
  if (!mainFrame) {
    figma.notify('Erro ao criar carrossel', { error: true });
    return;
  }

  figma.currentPage.appendChild(mainFrame);
  figma.currentPage.selection = [mainFrame];
  figma.viewport.scrollAndZoomIntoView([mainFrame]);
  figma.notify('Carrossel "' + template.name + '" criado com sucesso!');
}

figma.ui.onmessage = function (msg) {
  if (msg.type === 'create-carousel') {
    createCarouselOnCanvas(msg);
  } else {
    console.warn('Slidefy: mensagem não tratada', msg);
  }
};
