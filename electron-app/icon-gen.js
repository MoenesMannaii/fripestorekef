// icon-gen.js — run with: node icon-gen.js
const path = require('path');
const fs = require('fs');

const src = 'C:\\Users\\7ALAZOUN\\.gemini\\antigravity-ide\\brain\\fb073954-ddb8-4bdd-a8aa-0da487b220cb\\fripestore_icon_1787841155977.jpg';
const assetsDir = path.join(__dirname, 'assets');
const destPng = path.join(assetsDir, 'icon.png');
const destIco = path.join(assetsDir, 'icon.ico');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

try {
  const sharp = require('./backend/node_modules/sharp');
  sharp(src).resize(256, 256).toFile(destPng).then(() => {
    fs.copyFileSync(destPng, destIco);
    console.log('Icon created successfully.');
  }).catch(e => {
    console.warn('Sharp error, using placeholder:', e.message);
    fs.writeFileSync(destIco, Buffer.alloc(0));
  });
} catch(e) {
  console.warn('Sharp not available, using placeholder:', e.message);
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
  fs.writeFileSync(destIco, Buffer.alloc(0));
}
