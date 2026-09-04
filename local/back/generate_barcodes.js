const fs = require('fs');
const path = require('path');
const bwipjs = require('bwip-js');
const secrets = require('./container/config/secrets');

const outputDir = path.join(__dirname, '../../secrets');

// Ensure secrets directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const barcodes = secrets.DELETION_BARCODES || [];

console.log(`Generating PNG barcodes for ${barcodes.length} items in: ${outputDir}`);

async function generateBarcodes() {
  const htmlItems = [];

  for (let i = 0; i < barcodes.length; i++) {
    const code = barcodes[i];
    if (!code) continue;

    const fileName = `barcode_${i + 1}_${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const filePath = path.join(outputDir, fileName);

    try {
      // Generate CODE128 PNG buffer
      const pngBuffer = await bwipjs.toBuffer({
        bcid: 'code128',       // Barcode type
        text: code,            // Text to encode
        scale: 3,              // 3x scaling factor
        height: 12,            // Bar height, in millimeters
        includetext: true,     // Include human-readable text
        textxalign: 'center',  // Text alignment
        backgroundcolor: 'FFFFFF' // White background
      });

      fs.writeFileSync(filePath, pngBuffer);
      console.log(`✅ Saved: ${fileName}`);

      // Add to HTML preview
      const base64Img = pngBuffer.toString('base64');
      htmlItems.push(`
        <div style="border: 2px border-gray-300; border-radius: 8px; padding: 16px; margin: 12px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; display: inline-block; width: 280px;">
          <h3 style="margin: 0 0 10px 0; font-family: sans-serif; color: #333;">Code ${i + 1}</h3>
          <img src="data:image/png;base64,${base64Img}" alt="${code}" style="max-width: 100%; height: auto;" />
          <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #666;">${code}</p>
        </div>
      `);
    } catch (err) {
      console.error(`❌ Failed to generate barcode for ${code}:`, err);
    }
  }

  // Create an HTML gallery page in secrets/
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Deletion Barcodes</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; padding: 20px; text-align: center; }
    h1 { color: #1e293b; }
    p { color: #64748b; margin-bottom: 30px; }
    .grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
  </style>
</head>
<body>
  <h1>🔑 Codes-Barres de Suppression Administrateur</h1>
  <p>Scannez l'un de ces codes-barres avec votre téléphone ou douchette pour autoriser les suppressions.</p>
  <div class="grid">
    ${htmlItems.join('')}
  </div>
</body>
</html>
  `;

  const htmlPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`🎉 HTML Gallery saved to: ${htmlPath}`);
}

generateBarcodes();
