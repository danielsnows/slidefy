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
const NODE_ID = process.argv[3] || "33:52";

if (!TOKEN) {
  console.error("Erro: FIGMA_ACCESS_TOKEN não definido.");
  console.error("Uso: FIGMA_ACCESS_TOKEN=xxx node scripts/fetch-figma-template.js [fileKey] [nodeId]");
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

/**
 * Coleta ids de nós que têm fill IMAGE (para export)
 */
function collectImageNodeIds(node, ids = [], photoPrefix = "photo-") {
  const name = (node.name || "").toString();
  const isPhoto = name.toLowerCase().startsWith(photoPrefix);

  if (node.fills) {
    for (const f of node.fills) {
      if (f.type === "IMAGE" && !isPhoto) {
        ids.push(node.id);
        break;
      }
    }
  }

  if (node.children) {
    for (const c of node.children) collectImageNodeIds(c, ids, photoPrefix);
  }

  return ids;
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
  console.log(`Buscando template: file=${FILE_KEY} node=${NODE_ID}`);

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

  const nodeTree = serializeNode(node);
  const photoPrefix = "photo-";

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

  // Exportar imagens decorativas via Figma Images API (em lotes de 50)
  const imageNodeIds = [...new Set(collectImageNodeIds(node))];
  const embeddedImages = {};
  const BATCH_SIZE = 50;

  for (let i = 0; i < imageNodeIds.length; i += BATCH_SIZE) {
    const batch = imageNodeIds.slice(i, i + BATCH_SIZE);
    const idsParam = batch.join(",");
    const imgUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(idsParam)}&format=png`;
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

  console.log("Imagens decorativas embutidas: " + Object.keys(embeddedImages).length);

  const template = {
    id: "domingo",
    name: "Domingo",
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

  const outPath = path.join(__dirname, "..", "templates", "carousel_domingo.json");
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2), "utf8");

  console.log(`Template salvo em: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
