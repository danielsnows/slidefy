/**
 * Build script: lê templates JSON e embute no plugin.
 * - Gera EMBEDDED_TEMPLATES em code.js
 * - Gera lista de templates com thumbnails em ui.html
 *
 * Execute: node build-templates.js (ou npm run build)
 */
const fs = require('fs');
const path = require('path');

try {
  run();
} catch (e) {
  console.error('ERRO:', e.message ? e.message.slice(0, 500) : String(e).slice(0, 500));
  process.exit(1);
}

function run() {
const ROOT = __dirname;
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const IMAGES_DIR = path.join(ROOT, 'images');
const TEMPLATES_IMAGES = path.join(IMAGES_DIR, 'templates');
const CODE_JS = path.join(ROOT, 'code.js');
const CODE_TAIL = path.join(ROOT, 'code-tail.js');
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

// Onde começa o bloco const EMBEDDED_TEMPLATES = {
const searchStart = codeJs.indexOf('const EMBEDDED_TEMPLATES = {', startIdx);
if (searchStart === -1) {
  console.error('Bloco const EMBEDDED_TEMPLATES = { não encontrado em code.js após o marcador');
  process.exit(1);
}

const openBraceIdx = codeJs.indexOf('{', searchStart);
let replaceEnd = -1;
let depth = 0;
let inString = false;
let i = openBraceIdx;
while (i < codeJs.length) {
  const c = codeJs[i];
  if (inString) {
    if (c === '\\') { i += 2; continue; }
    if (c === '"') { inString = false; }
    i++;
    continue;
  }
  if (c === '"') { inString = true; i++; continue; }
  if (c === '{') { depth++; i++; continue; }
  if (c === '}') {
    depth--;
    if (depth === 0 && codeJs[i + 1] === ';') {
      replaceEnd = i + 2;
      break;
    }
    i++;
    continue;
  }
  i++;
}

const headerComment = '// ========== TEMPLATES EMBUTIDOS ==========';
const headerStart = codeJs.lastIndexOf(headerComment, startIdx);
const replaceStart = headerStart >= 0 ? headerStart : startIdx;

let codeAfterTemplate = (replaceEnd > replaceStart) ? codeJs.slice(replaceEnd) : '';
const hasHandler = codeAfterTemplate.trim().length > 50 && /onmessage|createCarousel|loadTemplate/.test(codeAfterTemplate);
let newCodeJs = codeJs.slice(0, replaceStart) + headerComment + '\n' + startMarker + '\n' + templatesBlock;
if (fs.existsSync(CODE_TAIL)) {
  newCodeJs += '\n' + fs.readFileSync(CODE_TAIL, 'utf8');
} else if (hasHandler) {
  newCodeJs += codeAfterTemplate;
}
try {
  fs.writeFileSync(CODE_JS, newCodeJs);
} catch (err) {
  console.error('Erro ao escrever code.js:', err.code || err.name, (err.message || '').slice(0, 200));
  process.exit(1);
}

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
} // run()