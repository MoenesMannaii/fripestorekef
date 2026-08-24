const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'app');
const componentsPath = path.join(__dirname, 'components');
const constantsPath = path.join(__dirname, 'constants');

const iconMap = {
  'BsPlus': 'Plus',
  'BsPencil': 'Pencil',
  'BsTrash': 'Trash2',
  'BsPerson': 'User',
  'BsTelephone': 'Phone',
  'BsEnvelope': 'Mail',
  'BsSearch': 'Search',
  'BsX': 'X',
  'BsCheckCircle': 'CheckCircle',
  'BsAward': 'Award',
  'BsInfoCircle': 'Info',
  'BsEye': 'Eye',
  'BsXCircle': 'XCircle',
  'BsDownload': 'Download',
  'BsFileEarmarkText': 'FileText',
  'BsCalendar': 'Calendar',
  'BsGeoAlt': 'MapPin',
  'BsBox': 'Package',
  'BsClock': 'Clock',
  'BsArrowRepeat': 'RefreshCw',
  'BsChevronDown': 'ChevronDown',
  'BsChevronUp': 'ChevronUp',
  'BsExclamationTriangle': 'TriangleAlert',
  'BsBoxSeam': 'Package',
  'BsFileText': 'FileText',
  'BsTruck': 'Truck',
  'BsPeople': 'Users',
  'BsTag': 'Tag',
  'BsImage': 'Image',
  'BsUpcScan': 'ScanBarcode',
  'BsCurrencyDollar': 'DollarSign',
  'BsCalculator': 'Calculator',
  'BsDiagram2': 'Network',
  'BsBuildings': 'Building2',
  'BsToggleOn': 'ToggleRight',
  'BsToggleOff': 'ToggleLeft',
  'BsCheck': 'Check',
  'BsGift': 'Gift',
  'BsPrinter': 'Printer',
  'BsGear': 'Settings',
  'BsShieldCheck': 'ShieldCheck',
  'BsLock': 'Lock',
  'BsKey': 'Key',
  'BsLaptop': 'Laptop',
  'BsArrowRight': 'ArrowRight',
  'BsArrowLeft': 'ArrowLeft',
  'BsLightning': 'Zap',
  'BsCart': 'ShoppingCart',
  'BsBag': 'ShoppingBag',
  'BsGraphUp': 'TrendingUp',
  'BsWifi': 'Wifi',
  'BsReceipt': 'Receipt',
  'BsCash': 'Banknote',
  'BsGrid': 'LayoutGrid',
  'BsList': 'List',
  'BsHouse': 'Home',
  'BsShop': 'Store',
  'BsCreditCard': 'CreditCard',
  'BsWallet': 'Wallet',
  'BsBell': 'Bell'
};

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it imports react-icons/bs
  const importRegex = /import\s+{[^}]+}\s+from\s+['"]react-icons\/bs['"];?/g;
  const match = importRegex.exec(content);

  if (!match) return;

  console.log(`Processing: ${filePath}`);
  
  // Extract the imported icons
  const importStatement = match[0];
  const iconsStr = importStatement.substring(importStatement.indexOf('{') + 1, importStatement.indexOf('}')).trim();
  const icons = iconsStr.split(',').map(i => i.trim()).filter(Boolean);
  
  // Find mapped Lucide icons
  const lucideIconsToImport = new Set();
  const unmappedIcons = [];
  
  const replacements = [];
  
  icons.forEach(icon => {
    if (iconMap[icon]) {
      lucideIconsToImport.add(iconMap[icon]);
      replacements.push({ from: `<${icon}`, to: `<${iconMap[icon]}` });
      // Remove Bs imports
    } else {
       // if we don't have a mapping, just guess it by removing Bs
      const guessed = icon.substring(2);
      lucideIconsToImport.add(guessed);
      replacements.push({ from: `<${icon}`, to: `<${guessed}` });
    }
  });

  // Apply tag replacements
  replacements.forEach(rep => {
    // Regex to match the component tag, e.g. <BsPlus or </BsPlus>
    const regex = new RegExp(rep.from + '(\\s|>|/)', 'g');
    content = content.replace(regex, rep.to + '$1');
    
    // Also replace closing tags
    const closeFrom = `</${rep.from.substring(1)}>`;
    const closeTo = `</${rep.to.substring(1)}>`;
    content = content.replace(new RegExp(closeFrom, 'g'), closeTo);
  });

  // Remove the old react-icons/bs import
  content = content.replace(match[0], '');

  // Add lucide-react import
  if (lucideIconsToImport.size > 0) {
    const lucideImportStr = `import { ${Array.from(lucideIconsToImport).join(', ')} } from 'lucide-react';\n`;
    
    // check if lucide-react is already imported
    const existingLucideRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/g;
    const existingLucideMatch = existingLucideRegex.exec(content);
    
    if (existingLucideMatch) {
      // Append to existing
      const existingIconsStr = existingLucideMatch[1];
      const existingIcons = existingIconsStr.split(',').map(i => i.trim()).filter(Boolean);
      
      lucideIconsToImport.forEach(i => {
        if (!existingIcons.includes(i)) {
          existingIcons.push(i);
        }
      });
      
      const newImport = `import { ${existingIcons.join(', ')} } from 'lucide-react';`;
      content = content.replace(existingLucideMatch[0], newImport);
    } else {
      // Add after "use client" or at top
      if (content.includes('"use client"')) {
        content = content.replace(/"use client";?/, `"use client";\n${lucideImportStr}`);
      } else if (content.includes("'use client'")) {
        content = content.replace(/'use client';?/, `'use client';\n${lucideImportStr}`);
      } else {
        content = lucideImportStr + content;
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

const allFiles = [
  ...getAllFiles(directoryPath),
  ...getAllFiles(componentsPath),
  ...getAllFiles(constantsPath)
];

allFiles.forEach(processFile);
console.log('Done!');
