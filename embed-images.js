/**
 * Script que embute as imagens como data URLs no ui.html.
 * Necessário porque plugins do Figma não carregam arquivos locais.
 * Execute: node embed-images.js (ou npm run build)
 */
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const htmlPath = path.join(__dirname, 'ui.html');

const files = ['photo-icon.png', 'check-final.png', 'figma-logo.png', 'logo.svg', 'ArrowLeft.svg', 'ArrowRight.svg', 'ig-card-icons.png'];
const data = {};
files.forEach((f) => {
  const filePath = path.join(imagesDir, f);
  if (!fs.existsSync(filePath)) return;
  const buf = fs.readFileSync(filePath);
  const mime = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  data[f] = 'data:' + mime + ';base64,' + buf.toString('base64');
});

let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/src="images\/photo-icon\.png"/g, `src="${data['photo-icon.png']}"`);
html = html.replace(/src="images\/check-final\.png"/g, `src="${data['check-final.png']}"`);
html = html.replace(/src="images\/figma-logo\.png"/g, `src="${data['figma-logo.png']}"`);
html = html.replace(/src="images\/logo\.svg"/g, `src="${data['logo.svg']}"`);
html = html.replace(/src="images\/ArrowLeft\.svg"/g, `src="${data['ArrowLeft.svg']}"`);
html = html.replace(/src="images\/ArrowRight\.svg"/g, `src="${data['ArrowRight.svg']}"`);
html = html.replace(/src="images\/ig-card-icons\.png"/g, `src="${data['ig-card-icons.png']}"`);

fs.writeFileSync(htmlPath, html);
console.log('Imagens embutidas em ui.html');
