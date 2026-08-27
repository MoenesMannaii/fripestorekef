// convert-icon.js — convert jpg to ico using sharp
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:\\Users\\7ALAZOUN\\.gemini\\antigravity-ide\\brain\\fb073954-ddb8-4bdd-a8aa-0da487b220cb\\fripestore_icon_1787841155977.jpg';
const destPng = 'C:\\Users\\7ALAZOUN\\Desktop\\fripestorekef\\electron-app\\assets\\icon.png';
const destIco = 'C:\\Users\\7ALAZOUN\\Desktop\\fripestorekef\\electron-app\\assets\\icon.ico';

(async () => {
  // Save as 256x256 PNG first
  await sharp(src).resize(256, 256).toFile(destPng);
  // For Windows .ico, we copy the PNG and rename (electron-builder handles ico from png)
  fs.copyFileSync(destPng, destIco);
  console.log('Icon created at:', destIco);
})();
