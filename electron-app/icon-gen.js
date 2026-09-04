// icon-gen.js — run with: node icon-gen.js
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, 'aeve_logo.png');
const assetsDir = path.join(__dirname, 'assets');
const destPng = path.join(assetsDir, 'icon.png');
const destIco = path.join(assetsDir, 'icon.ico');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

async function run() {
  try {
    // png-to-ico v3+ is ESM-only — must use dynamic import
    const { default: pngToIco } = await import('png-to-ico');

    const sharp = require('./backend/node_modules/sharp');
    const buf = await sharp(src).resize(256, 256).png().toBuffer();
    fs.writeFileSync(destPng, buf);

    const icoBuf = await pngToIco(destPng);
    fs.writeFileSync(destIco, icoBuf);
    console.log('✅ Icon created successfully, size:', fs.statSync(destIco).size, 'bytes');
  } catch (e) {
    console.error('❌ Icon generation failed:', e.message);
    process.exit(1);
  }
}

run();
