#!/usr/bin/env node
/**
 * Extrai um template do Figma via REST API e gera o JSON para o plugin.
 *
 * Uso:
 *   FIGMA_ACCESS_TOKEN=xxx node scripts/fetch-figma-template.js [fileKey] [nodeId]
 *
 * Exemplo:
 *   FIGMA_ACCESS_TOKEN=xxx node scripts/fetch-figma-template.js 9rxGzx3Vkv16GwxGYs5xPq 33:52
 *
 * O token pode ser obtido em: Figma → Settings → Personal access tokens
 * O arquivo precisa estar acessível à sua conta (ou ser público).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FILE_KEY = process.argv[2] || "9rxGzx3Vkv16GwxGYs5xPq";
const NODE_ID_RAW = process.argv[3] || "33:52";
const NODE_ID = String(NODE_ID_RAW).replace(/-/g, ":"); // "106-8" -> "106:8"
const TEMPLATE_ID = process.argv[4] || "domingo";
const TEMPLATE_NAME = process.argv[5] || "Domingo";

if (!TOKEN) {
  console.error("Erro: FIGMA_ACCESS_TOKEN não definido.");
  console.error("Uso: FIGMA_ACCESS_TOKEN=xxx node scripts/fetch-figma-template.js [fileKey] [nodeId] [templateId] [templateName]");
  process.exit(1);
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "X-Figma-Token": TOKEN } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Resposta inválida: " + data.slice(0, 200)));
        }
      });
    });
    req.on("error", reject);
  });
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    }).on("error", reject);
  });
}

/**
 * Converte node do Figma API para formato serializável do plugin.
 * Posições são relativas ao pai.
 */
function serializeNode(node, parentBox = null) {
  const box = node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 };
  const relX = parentBox ? box.x - parentBox.x : box.x;
  const relY = parentBox ? box.y - parentBox.y : box.y;

  const out = {
    id: node.id,
    type: node.type,
    name: node.name || "Layer",
    x: Math.round(relX),
    y: Math.round(relY),
    width: Math.round(box.width || 0),
    height: Math.round(box.height || 0),
    visible: node.visible !== false,
    locked: node.locked === true,
    opacity: node.opacity ?? 1,
    rotation: node.rotation || 0,
    blendMode: node.blendMode || "PASS_THROUGH",
    layoutAlign: node.layoutAlign,
    layoutGrow: node.layoutGrow,
    constraints: node.constraints,
  };

  // Fills
  if (node.fills && node.fills.length > 0) {
    out.fills = node.fills.map((f) => {
      if (f.type === "SOLID") {
        return { type: "SOLID", color: f.color, opacity: f.opacity ?? 1 };
      }
      if (f.type === "IMAGE" && f.imageRef) {
        return { type: "IMAGE", imageRef: f.imageRef, scaleMode: f.scaleMode || "FILL" };
      }
      return f;
    });
  } else if (node.fills === undefined && (node.type === "FRAME" || node.type === "RECTANGLE")) {
    out.fills = [];
  }

  // Strokes
  if (node.strokes && node.strokes.length > 0) {
    out.strokes = node.strokes;
    out.strokeWeight = node.strokeWeight ?? 1;
    out.strokeAlign = node.strokeAlign || "INSIDE";
  }

  // Corner radius
  if (node.cornerRadius !== undefined) out.cornerRadius = node.cornerRadius;
  if (node.topLeftRadius !== undefined) out.topLeftRadius = node.topLeftRadius;
  if (node.topRightRadius !== undefined) out.topRightRadius = node.topRightRadius;
  if (node.bottomLeftRadius !== undefined) out.bottomLeftRadius = node.bottomLeftRadius;
  if (node.bottomRightRadius !== undefined) out.bottomRightRadius = node.bottomRightRadius;

  // Effects
  if (node.effects && node.effects.length > 0) out.effects = node.effects;

  // Clips
  if (node.clipsContent !== undefined) out.clipsContent = node.clipsContent;

  // Layout (FRAME)
  if (node.type === "FRAME") {
    if (node.layoutMode) out.layoutMode = node.layoutMode;
    if (node.primaryAxisSizingMode) out.primaryAxisSizingMode = node.primaryAxisSizingMode;
    if (node.counterAxisSizingMode) out.counterAxisSizingMode = node.counterAxisSizingMode;
    if (node.primaryAxisAlignItems) out.primaryAxisAlignItems = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) out.counterAxisAlignItems = node.counterAxisAlignItems;
    if (node.itemSpacing !== undefined) out.itemSpacing = node.itemSpacing;
    if (node.paddingLeft !== undefined) out.paddingLeft = node.paddingLeft;
    if (node.paddingRight !== undefined) out.paddingRight = node.paddingRight;
    if (node.paddingTop !== undefined) out.paddingTop = node.paddingTop;
    if (node.paddingBottom !== undefined) out.paddingBottom = node.paddingBottom;
  }

  // Text
  if (node.type === "TEXT") {
    out.characters = node.characters || "";
    out.fontSize = node.style?.fontSize ?? 16;
    out.fontName = node.style?.fontName || { family: "Inter", style: "Regular" };
    out.fontWeight = node.style?.fontWeight;
    out.textAlignHorizontal = node.style?.textAlignHorizontal || "LEFT";
    out.textAlignVertical = node.style?.textAlignVertical || "TOP";
    out.lineHeight = node.style?.lineHeight;
    out.letterSpacing = node.style?.letterSpacing;
  }

  // Slice
  if (node.type === "SLICE") {
    out.exportSettings = node.exportSettings;
  }

  // Children
  if (node.children && node.children.length > 0) {
    out.children = node.children.map((c) => serializeNode(c, box));
  }

  return out;
}

/**
 * Coleta todos os imageRef usados na árvore
 */
function collectImageRefs(node, refs = new Set(), photoPrefix = "photo-") {
  const name = (node.name || "").toString();
  const isPhoto = name.toLowerCase().startsWith(photoPrefix);

  if (node.fills) {
    for (const f of node.fills) {
      if (f.type === "IMAGE" && f.imageRef && !isPhoto) {
        refs.add(f.imageRef);
      }
    }
  }

  if (node.children) {
    for (const c of node.children) collectImageRefs(c, refs, photoPrefix);
  }

  return refs;
}

const DECORATIVE_FRAME_NAMES = ["decorative-1", "decorative-2"];

/**
 * Coleta ids de nós que têm fill IMAGE (para export).
 * Se options.skipFrameNames estiver definido, não recursa em FRAMEs com esse nome (exporta o frame inteiro à parte).
 */
function collectImageNodeIds(node, ids = [], photoPrefix = "photo-", options = {}) {
  const name = (node.name || "").toString();
  const isPhoto = name.toLowerCase().startsWith(photoPrefix);
  const skipFrameNames = options.skipFrameNames || [];

  if (node.type === "FRAME" && skipFrameNames.includes(name)) {
    return ids;
  }

  if (node.fills) {
    for (const f of node.fills) {
      if (f.type === "IMAGE" && !isPhoto) {
        ids.push(node.id);
        break;
      }
    }
  }

  if (node.children) {
    for (const c of node.children) collectImageNodeIds(c, ids, photoPrefix, options);
  }

  return ids;
}

/**
 * Encontra nós na árvore (API) cujo name está em names.
 */
function findNodesByName(node, names, out = []) {
  if (names.includes((node.name || "").toString())) out.push(node);
  if (node.children) {
    for (const c of node.children) findNodesByName(c, names, out);
  }
  return out;
}

/**
 * Substitui no nodeTree (serializado) os FRAMEs decorative-1 e decorative-2 por RECTANGLEs com fill IMAGE.
 * Os TEXT filhos de decorative-2 (ex.: FOI, POR, VOCÊ) são extraídos e adicionados ao root para não se perderem.
 */
function replaceDecorativeFramesInTree(node, root) {
  if (!node.children) return;
  const targetRoot = root || node;
  for (let i = 0; i < node.children.length; i++) {
    const c = node.children[i];
    if (c.type === "FRAME" && DECORATIVE_FRAME_NAMES.includes(c.name)) {
      const isDec2 = c.name === "decorative-2";
      const textChildren = (c.children || []).filter((ch) => ch.type === "TEXT");
      const x = c.name === "decorative-1" ? 0 : 3381;
      const y = 0;
      node.children[i] = {
        id: c.id,
        type: "RECTANGLE",
        name: c.name,
        x,
        y,
        width: c.width,
        height: c.height,
        visible: true,
        locked: false,
        opacity: 1,
        rotation: 0,
        blendMode: "PASS_THROUGH",
        fills: [{ type: "IMAGE", scaleMode: "FILL" }],
      };
      if (isDec2 && textChildren.length > 0 && targetRoot.children) {
        for (const textNode of textChildren) {
          targetRoot.children.push(textNode);
        }
      }
    } else if (c.children && c.children.length > 0) {
      replaceDecorativeFramesInTree(c, targetRoot);
    }
  }
}

/** Converte #hex para { r, g, b } em 0..1 */
function hexToFigmaColor(hex) {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
    a: 1,
  };
}

/**
 * Patch do template Páscoa: posições e tipografia conforme spec.
 */
function applyPascoaPatch(node) {
  const color824133 = hexToFigmaColor("#824133");
  const colorDA7A66 = hexToFigmaColor("#DA7A66");
  const photoPositions = {
    "photo-1": { x: 1116, y: 130 },
    "photo-2": { x: 1809, y: 90 },
    "photo-3": { x: 2080, y: 450 },
    "photo-4": { x: 2585, y: 30 },
    "photo-5": { x: 3310, y: 30 },
  };
  const fraseText = "Ele decidiu morrer por você para não viver sem você!";

  function walk(n) {
    if (!n) return;
    const name = (n.name || "").toString();
    const chars = (n.characters || "").toString().trim();

    if (photoPositions[name]) {
      n.x = photoPositions[name].x;
      n.y = photoPositions[name].y;
    }

    if (n.type === "TEXT") {
      if (chars.includes("Ele decidiu morrer") || chars === fraseText) {
        n.x = 1623;
        n.y = 428;
        n.width = 385;
        n.fontName = { family: "Nothing You Could Do", style: "Regular" };
        n.fontSize = 81;
        n.lineHeight = 81;
        n.letterSpacing = { unit: "PERCENT", value: -8 };
        n.textAutoResize = "HEIGHT";
        n.fills = [{ type: "SOLID", color: color824133, opacity: 1 }];
      } else if (chars.trim().toUpperCase() === "FOI") {
        n.x = 4528;
        n.y = 166;
        n.fontName = { family: "Metamorphous", style: "Regular" };
        n.fontSize = 320;
        n.letterSpacing = { unit: "PERCENT", value: -12 };
        n.textCase = "UPPER";
        n.fills = [{ type: "SOLID", color: color824133, opacity: 1 }];
      } else if (chars.trim().toUpperCase() === "POR") {
        n.x = 4528;
        n.y = 419;
        n.fontName = { family: "Metamorphous", style: "Regular" };
        n.fontSize = 320;
        n.letterSpacing = { unit: "PERCENT", value: -12 };
        n.textCase = "UPPER";
        n.fills = [{ type: "SOLID", color: color824133, opacity: 1 }];
      } else if (chars.trim().toUpperCase() === "VOCÊ" || (chars.trim().toUpperCase().indexOf("VOC") >= 0 && chars.trim().length <= 6)) {
        n.x = 4481;
        n.y = 500;
        n.fontName = { family: "Nothing You Could Do", style: "Regular" };
        n.fontSize = 480;
        n.letterSpacing = { unit: "PERCENT", value: -10 };
        n.fills = [{ type: "SOLID", color: colorDA7A66, opacity: 1 }];
      }
    }

    if (n.children) for (const c of n.children) walk(c);
  }

  walk(node);
}

function findNodeById(obj, id) {
  if (obj.id === id) return obj;
  if (obj.children) {
    for (const c of obj.children) {
      const found = findNodeById(c, id);
      if (found) return found;
    }
  }
  return null;
}

async function main() {
  console.log(`Buscando template: file=${FILE_KEY} node=${NODE_ID} id=${TEMPLATE_ID} name=${TEMPLATE_NAME}`);

  const fileUrl = `https://api.figma.com/v1/files/${FILE_KEY}?ids=${encodeURIComponent(NODE_ID)}&depth=10`;
  const fileData = await fetch(fileUrl);

  if (fileData.err) {
    console.error("Erro Figma API:", fileData.err);
    process.exit(1);
  }

  const doc = fileData.document;
  if (!doc) {
    console.error("Documento não encontrado.");
    process.exit(1);
  }

  const node = findNodeById(doc, NODE_ID);
  if (!node) {
    console.error(`Nó ${NODE_ID} não encontrado. Verifique o node-id.`);
    process.exit(1);
  }

  const box = node.absoluteBoundingBox || {};
  const width = Math.round(box.width || 1080);
  const height = Math.round(box.height || 1080);
  const slideWidth = 1080;
  const slides = Math.round(width / slideWidth) || 1;

  console.log(`Frame: ${width}x${height} (~${slides} slides)`);

  let nodeTree = serializeNode(node);
  const photoPrefix = "photo-";

  // Para template "memoria": texto por cima de tudo (blend DIFFERENCE)
  if (TEMPLATE_ID === "memoria" && nodeTree.children && nodeTree.children.length > 0) {
    const textNodes = nodeTree.children.filter((c) => c.type === "TEXT");
    const others = nodeTree.children.filter((c) => c.type !== "TEXT");
    if (textNodes.length > 0) {
      textNodes.forEach((t) => {
        t.blendMode = "DIFFERENCE";
      });
      nodeTree.children = [...others, ...textNodes];
    }
  }

  // Contar camadas photo- e Slice
  const countByNamePrefix = (n, prefix) => {
    let c = 0;
    if ((n.name || "").toString().toLowerCase().startsWith(prefix)) c++;
    if (n.children) n.children.forEach((ch) => (c += countByNamePrefix(ch, prefix)));
    return c;
  };
  const photoCount = countByNamePrefix(nodeTree, photoPrefix);
  const sliceCount = countByNamePrefix(nodeTree, "slice");

  console.log(`Camadas photo-*: ${photoCount}`);
  console.log(`Camadas Slice: ${sliceCount}`);

  // Frames decorative-1 e decorative-2: exportar cada um como uma única imagem (não exportar filhos)
  const decorativeFrames = findNodesByName(node, DECORATIVE_FRAME_NAMES);
  const decorativeFrameIds = decorativeFrames.map((n) => n.id);
  const imageNodeIds = [
    ...new Set(
      collectImageNodeIds(node, [], photoPrefix, { skipFrameNames: DECORATIVE_FRAME_NAMES })
    ),
  ];

  const embeddedImages = {};
  const BATCH_SIZE = 50;
  const scale = TEMPLATE_ID === "memoria" ? 0.5 : 1;

  // Exportar imagens decorativas (nós com fill IMAGE, exceto dentro de decorative-1/2)
  for (let i = 0; i < imageNodeIds.length; i += BATCH_SIZE) {
    const batch = imageNodeIds.slice(i, i + BATCH_SIZE);
    const idsParam = batch.join(",");
    const imgUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(idsParam)}&format=png&scale=${scale}`;
    const imgData = await fetch(imgUrl);

    if (imgData.images) {
      for (const [nodeId, url] of Object.entries(imgData.images)) {
        if (url) {
          try {
            const b64 = await fetchImage(url);
            embeddedImages[nodeId] = b64;
          } catch (e) {
            console.warn("Falha ao baixar imagem " + nodeId + ":", e.message);
          }
        }
      }
    }
  }

  // Exportar cada frame decorative-1 e decorative-2 como uma única imagem.
  // A API do Figma exporta o frame como renderizado; "Clip content" ativado no frame é respeitado na exportação.
  for (const frameId of decorativeFrameIds) {
    try {
      const imgUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(frameId)}&format=png&scale=${scale}`;
      const imgData = await fetch(imgUrl);
      if (imgData.images && imgData.images[frameId]) {
        const b64 = await fetchImage(imgData.images[frameId]);
        embeddedImages[frameId] = b64;
      }
    } catch (e) {
      console.warn("Falha ao baixar frame decorativo " + frameId + ":", e.message);
    }
  }

  console.log("Imagens decorativas embutidas: " + Object.keys(embeddedImages).length);

  // Substituir no nodeTree os FRAMEs decorative-1/2 por RECTANGLEs com fill IMAGE
  replaceDecorativeFramesInTree(nodeTree, nodeTree);

  if (TEMPLATE_ID === "pascoa") {
    applyPascoaPatch(nodeTree);
  }

  const template = {
    id: TEMPLATE_ID,
    name: TEMPLATE_NAME,
    version: 2,
    width,
    height,
    slideWidth,
    slideHeight: height,
    slides,
    photoLayerNamePrefix: photoPrefix,
    sliceLayerHint: "Camadas Slice definem as áreas de exportação para o efeito de continuidade.",
    nodeTree,
    embeddedImages: Object.keys(embeddedImages).length > 0 ? embeddedImages : undefined,
  };
  if (TEMPLATE_ID === "memoria") template.photoGrayscale = true;

  const outPath = path.join(__dirname, "..", "templates", `carousel_${TEMPLATE_ID}.json`);
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2), "utf8");

  console.log(`Template salvo em: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
