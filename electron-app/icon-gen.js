// icon-gen.js — run with: node icon-gen.js
const path = require('path');
const fs = require('fs');

const pngToIco = require('png-to-ico');

// Use the local logo file in the electron-app folder
const src = path.join(__dirname, 'aeve_logo.png');
const assetsDir = path.join(__dirname, 'assets');
const destPng = path.join(assetsDir, 'icon.png');
const destIco = path.join(assetsDir, 'icon.ico');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

try {
  const sharp = require('./backend/node_modules/sharp');
  sharp(src).resize(256, 256).png().toBuffer().then(async buf => {
    fs.writeFileSync(destPng, buf);
    const icoBuf = await pngToIco(destPng);
    fs.writeFileSync(destIco, icoBuf);
    console.log('Icon created successfully, size:', fs.statSync(destIco).size);
  }).catch(e => {
    console.error('Sharp error:', e.message);
    process.exit(1);
  });
} catch(e) {
  console.error('Sharp not available:', e.message);
  process.exit(1);
}
