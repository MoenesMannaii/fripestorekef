/**
 * obfuscate.js
 * Run AFTER copying backend files to electron-app/backend.
 * Obfuscates all .js files in the target backend directory.
 *
 * Usage: node obfuscate.js <target-dir>
 * Example: node obfuscate.js "C:\path\to\electron-app\backend"
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('❌ Usage: node obfuscate.js <target-backend-dir>');
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  console.error(`❌ Target directory not found: ${targetDir}`);
  process.exit(1);
}

// Directories to skip entirely
const SKIP_DIRS = new Set(['node_modules', '.git', 'uploads', 'logs', 'database']);

// Files to skip (entry points that must keep clear structure for Node)
const SKIP_FILES = new Set(['package.json', 'package-lock.json', '.env', '.gitignore']);

let obfuscated = 0;
let skipped = 0;

function obfuscateDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        console.log(`  ⏭️  Skipping dir: ${entry.name}`);
        skipped++;
        continue;
      }
      obfuscateDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (SKIP_FILES.has(entry.name)) {
        console.log(`  ⏭️  Skipping file: ${entry.name}`);
        skipped++;
        continue;
      }

      try {
        const originalCode = fs.readFileSync(fullPath, 'utf8');

        const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, {
          // Seed based on admin key for deterministic output
          seed: '_0x1002ap66'.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.5,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,  // Keep console.log working
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,         // Keep exports/require working
          selfDefending: false,          // Avoid runtime issues in Node
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 10,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['base64'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 2,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 4,
          stringArrayWrappersType: 'function',
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false,
          target: 'node',
        });

        fs.writeFileSync(fullPath, obfuscationResult.getObfuscatedCode(), 'utf8');
        console.log(`  ✅ Obfuscated: ${path.relative(targetDir, fullPath)}`);
        obfuscated++;
      } catch (err) {
        console.error(`  ❌ Failed to obfuscate ${entry.name}: ${err.message}`);
        // Don't crash the whole build — leave unobfuscated
      }
    }
  }
}

console.log(`\n🔐 Starting obfuscation of: ${targetDir}`);
console.log('─────────────────────────────────────────');
obfuscateDir(targetDir);
console.log('─────────────────────────────────────────');
console.log(`✅ Done! Obfuscated: ${obfuscated} files | Skipped: ${skipped}`);
