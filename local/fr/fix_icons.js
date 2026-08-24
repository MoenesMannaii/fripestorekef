const fs = require('fs');
const path = require('path');

// 1. Fix Facture.tsx missing tag replacements
let facturePath = path.join(__dirname, 'app/gestion/Facture.tsx');
let content = fs.readFileSync(facturePath, 'utf8');
content = content.replace(/<BsFileEarmarkText/g, '<FileText');
content = content.replace(/<\/BsFileEarmarkText>/g, '</FileText>');
content = content.replace(/<BsClock/g, '<Clock');
content = content.replace(/<\/BsClock>/g, '</Clock>');
content = content.replace(/<BsCheckCircle/g, '<CheckCircle');
content = content.replace(/<\/BsCheckCircle>/g, '</CheckCircle>');
content = content.replace(/<BsXCircle/g, '<XCircle');
content = content.replace(/<\/BsXCircle>/g, '</XCircle>');
fs.writeFileSync(facturePath, content, 'utf8');
console.log('Fixed Facture.tsx');

// 2. Fix Produit.tsx duplicate Image
let produitPath = path.join(__dirname, 'app/gestion/Produit.tsx');
content = fs.readFileSync(produitPath, 'utf8');
content = content.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
  return `import {${p1.replace(/\bImage\b/g, 'Image as ImageIcon')}} from 'lucide-react';`;
});
content = content.replace(/<Image className=/g, '<ImageIcon className=');
// But leave Next.js Image alone: <Image src=
content = content.replace(/<Image([^>]*?)className=["'][^"']*?w-4 h-4[^"']*?["']/g, '<ImageIcon$1className="w-4 h-4"');
fs.writeFileSync(produitPath, content, 'utf8');
console.log('Fixed Produit.tsx');

// Helper to replace imports and tags
function fixIcons(filePath, mapping) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  for (const [oldName, newName] of Object.entries(mapping)) {
    // Fix imports
    const importRegex = new RegExp(`\\b${oldName}\\b`, 'g');
    fileContent = fileContent.replace(importRegex, newName);
    
    // Fix tags
    const tagRegex = new RegExp(`<${oldName}`, 'g');
    fileContent = fileContent.replace(tagRegex, `<${newName}`);
    const closeTagRegex = new RegExp(`<\/${oldName}>`, 'g');
    fileContent = fileContent.replace(closeTagRegex, `<\/${newName}>`);
  }
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log('Fixed ' + filePath);
}

// 3. Fix parametres/page.tsx
fixIcons(path.join(__dirname, 'app/parametres/page.tsx'), {
  'Box2': 'Box',
  'DatabaseAdd': 'Database',
  'DatabaseDown': 'Database',
  'PersonGear': 'UserCog',
  'Translate': 'Languages'
});

// 4. Fix rapports/components/MetricsCards.tsx
fixIcons(path.join(__dirname, 'app/rapports/components/MetricsCards.tsx'), {
  'Cart3': 'ShoppingCart',
  'CashCoin': 'Coins',
  'FileEarmark': 'File'
});

// 5. Fix setup/page.tsx
fixIcons(path.join(__dirname, 'app/setup/page.tsx'), {
  'CupHot': 'Coffee'
});

// 6. Fix components/Products/OrderPanel.tsx
fixIcons(path.join(__dirname, 'components/Products/OrderPanel.tsx'), {
  'Trash3': 'Trash2',
  'Upc': 'Barcode'
});
