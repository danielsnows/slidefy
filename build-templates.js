/**
 * Build script: lê templates JSON e embute no plugin.
 * - Se existir code-source.js: usa como FONTE ÚNICA e gera code.js (substitui EMBEDDED_TEMPLATES).
 * - Se não existir: usa code.js + code-tail.js (comportamento legado).
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
const CODE_SOURCE = path.join(ROOT, 'code-source.js');
const CODE_TAIL = path.join(ROOT, 'code-tail.js');
const UI_HTML = path.join(ROOT, 'ui.html');

const useCodeSource = fs.existsSync(CODE_SOURCE);

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

// 1. Atualizar code.js - substituir EMBEDDED_TEMPLATES (fonte: code-source.js ou code.js)
let codeJs = useCodeSource ? fs.readFileSync(CODE_SOURCE, 'utf8') : fs.readFileSync(CODE_JS, 'utf8');
let templatesJson = JSON.stringify(embeddedTemplates, null, 2);

// Quebrar strings base64 muito longas em concatenação de literais para evitar
// "Syntax error: Unexpected token ILLEGAL" no parser do Figma (linhas longas demais)
const MAX_LINE_CHARS = 120;
const MIN_LENGTH_TO_CHUNK = 5000;
templatesJson = templatesJson.split('\n').map(function (line) {
  if (line.length < MIN_LENGTH_TO_CHUNK) return line;
  const keyPrefixMatch = line.match(/^(\s*"[^"]+": )"(.*)"\s*$/);
  if (!keyPrefixMatch) return line;
  const keyPrefix = keyPrefixMatch[1];
  const value = keyPrefixMatch[2];
  if (value.length < MIN_LENGTH_TO_CHUNK) return line;
  // Só quebrar se for base64 puro (evita cortar escapes como \n no meio)
  if (!/^[A-Za-z0-9+/=]*$/.test(value)) return line;
  const chunks = [];
  for (let i = 0; i < value.length; i += MAX_LINE_CHARS) {
    const chunk = value.slice(i, i + MAX_LINE_CHARS);
    chunks.push('"' + chunk + '"');
  }
  const indent = keyPrefix.match(/^(\s*)/)[1];
  return keyPrefix + '(' + chunks.join(' +\n' + indent + ' ') + ')';
}).join('\n');

const templatesBlock = 'const EMBEDDED_TEMPLATES = ' + templatesJson + ';';

const startMarker = '// __BUILD_TEMPLATES_START__';
const startIdx = codeJs.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Marcador __BUILD_TEMPLATES_START__ não encontrado em ' + (useCodeSource ? 'code-source.js' : 'code.js'));
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

// 2. Atualizar ui.html PRIMEIRO (array de templates)
let uiHtml = fs.readFileSync(UI_HTML, 'utf8');
const uiTemplatesJson = JSON.stringify(uiTemplates);
const uiTemplatesStr = 'const templates = ' + uiTemplatesJson + ';';
const uiMatch = uiHtml.match(/const templates = \[[\s\S]*?\];/);
if (uiMatch) {
  uiHtml = uiHtml.replace(uiMatch[0], uiTemplatesStr);
}
fs.writeFileSync(UI_HTML, uiHtml);

// 3. Montar code.js final
let newCodeJs;
if (useCodeSource) {
  newCodeJs = codeJs.slice(0, searchStart) + templatesBlock + codeJs.slice(replaceEnd);
} else {
  const headerComment = '// ========== TEMPLATES EMBUTIDOS ==========';
  const headerStart = codeJs.lastIndexOf(headerComment, startIdx);
  const replaceStart = headerStart >= 0 ? headerStart : startIdx;
  let headerPart = codeJs.slice(0, replaceStart);
  const showUIPos = headerPart.indexOf('figma.showUI(');
  if (showUIPos !== -1) {
    let idx = headerPart.indexOf('(', showUIPos) + 1;
    while (idx < headerPart.length && /\s/.test(headerPart[idx])) idx++;
    const firstChar = idx;
    const isAlreadyHtml = headerPart.slice(firstChar, firstChar + 8) === '__html__';
    if (isAlreadyHtml) {
      let commaPos = headerPart.indexOf(', {', firstChar);
      if (commaPos < 0) commaPos = headerPart.indexOf(',{', firstChar);
      if (commaPos >= 0 && commaPos > firstChar + 8) {
        headerPart = headerPart.slice(0, firstChar) + '__html__' + headerPart.slice(commaPos);
      }
    } else if (headerPart[firstChar] === '"' || headerPart[firstChar] === '`') {
      const openQuote = headerPart[firstChar];
      let pos = firstChar + 1;
      while (pos < headerPart.length) {
        if (headerPart[pos] === '\\') { pos += 2; continue; }
        if (headerPart[pos] === openQuote) break;
        pos++;
      }
      headerPart = headerPart.slice(0, firstChar) + '__html__' + headerPart.slice(pos + 1);
    }
  }
  let codeAfterTemplate = (replaceEnd > replaceStart) ? codeJs.slice(replaceEnd) : '';
  const hasHandler = codeAfterTemplate.trim().length > 50 && /onmessage|createCarousel|loadTemplate/.test(codeAfterTemplate);
  newCodeJs = headerPart + headerComment + '\n' + startMarker + '\n' + templatesBlock;
  if (fs.existsSync(CODE_TAIL)) {
    newCodeJs += '\n' + fs.readFileSync(CODE_TAIL, 'utf8');
  } else if (hasHandler) {
    newCodeJs += codeAfterTemplate;
  }
}
try {
  fs.writeFileSync(CODE_JS, newCodeJs);
} catch (err) {
  console.error('Erro ao escrever code.js:', err.code || err.name, (err.message || '').slice(0, 200));
  process.exit(1);
}

console.log('Build concluído: ' + Object.keys(embeddedTemplates).length + ' templates embutidos' + (useCodeSource ? ' (fonte: code-source.js)' : '') + '.');
} // run()