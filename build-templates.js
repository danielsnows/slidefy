/**
 * Build script: lê templates JSON e embute no plugin.
 * - Gera EMBEDDED_TEMPLATES em code.js
 * - Gera lista de templates com thumbnails em ui.html
 *
 * Execute: node build-templates.js (ou npm run build)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const IMAGES_DIR = path.join(ROOT, 'images');
const TEMPLATES_IMAGES = path.join(IMAGES_DIR, 'templates');
const CODE_JS = path.join(ROOT, 'code.js');
const UI_HTML = path.join(ROOT, 'ui.html');

// Garantir que pasta de thumbnails existe
if (!fs.existsSync(TEMPLATES_IMAGES)) {
  fs.mkdirSync(TEMPLATES_IMAGES, { recursive: true });
}

const indexPath = path.join(TEMPLATES_DIR, 'template-index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

const embeddedTemplates = {};
const uiTemplates = [];

for (const entry of index) {
  const templatePath = path.join(TEMPLATES_DIR, entry.file);
  if (!fs.existsSync(templatePath)) {
    console.warn(`Template não encontrado: ${entry.file}`);
    continue;
  }

  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  embeddedTemplates[template.id] = template;

  // Thumbnail: data URL se existir
  let thumbnailDataUrl = '';
  const thumbPath = path.join(ROOT, entry.thumbnail);
  if (fs.existsSync(thumbPath)) {
    const buf = fs.readFileSync(thumbPath);
    const ext = path.extname(thumbPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    thumbnailDataUrl = 'data:' + mime + ';base64,' + buf.toString('base64');
  }

  uiTemplates.push({
    id: entry.id,
    name: entry.name,
    slides: entry.slides,
    thumbnail: thumbnailDataUrl
  });
}

// 1. Atualizar code.js - substituir EMBEDDED_TEMPLATES
let codeJs = fs.readFileSync(CODE_JS, 'utf8');
const templatesJson = JSON.stringify(embeddedTemplates, null, 2);
const templatesBlock = 'const EMBEDDED_TEMPLATES = ' + templatesJson + ';';

const startMarker = '// __BUILD_TEMPLATES_START__';
const startIdx = codeJs.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Marcador __BUILD_TEMPLATES_START__ não encontrado em code.js');
  process.exit(1);
}

// Encontrar o fim do bloco (próximo "};" que fecha EMBEDDED_TEMPLATES)
const searchStart = codeJs.indexOf('const EMBEDDED_TEMPLATES = {', startIdx);
let depth = 0;
let endIdx = searchStart;
for (let i = codeJs.indexOf('{', searchStart); i < codeJs.length; i++) {
  if (codeJs[i] === '{') depth++;
  if (codeJs[i] === '}') {
    depth--;
    if (depth === 0) {
      endIdx = i + 1;
      if (codeJs[i + 1] === ';') endIdx++;
      break;
    }
  }
}

const headerComment = '// ========== TEMPLATES EMBUTIDOS ==========';
const headerStart = codeJs.lastIndexOf(headerComment, startIdx);
const replaceStart = headerStart >= 0 ? headerStart : startIdx;
codeJs = codeJs.slice(0, replaceStart) + headerComment + '\n' + startMarker + '\n' + templatesBlock + '\n' + codeJs.slice(endIdx);
fs.writeFileSync(CODE_JS, codeJs);

// 2. Atualizar ui.html - substituir array de templates
let uiHtml = fs.readFileSync(UI_HTML, 'utf8');
const uiTemplatesJson = JSON.stringify(uiTemplates);
const uiTemplatesStr = 'const templates = ' + uiTemplatesJson + ';';

// Substituir "const templates = [...]"
const uiMatch = uiHtml.match(/const templates = \[[\s\S]*?\];/);
if (uiMatch) {
  uiHtml = uiHtml.replace(uiMatch[0], uiTemplatesStr);
}

fs.writeFileSync(UI_HTML, uiHtml);

console.log(`Build concluído: ${Object.keys(embeddedTemplates).length} templates embutidos.`);
