const fs = require('fs');
const path = require('path');

const SCAFFOLD_DIR = path.join(process.cwd(), 'scaffold');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'scaffold.generated.js');
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.DS_Store'];

/**
 * Recursively walk a directory and collect file contents
 */
function walk(dir, root = dir) {
  const result = {};

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry.name)) continue;
      Object.assign(result, walk(fullPath, root));
    } else {
      const relPath = '/' + path.relative(root, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');
      result[relPath] = content;
    }
  }

  return result;
}

function generate() {
  if (!fs.existsSync(SCAFFOLD_DIR)) {
    console.error('❌ Scaffold folder not found:', SCAFFOLD_DIR);
    process.exit(1);
  }

  const files = walk(SCAFFOLD_DIR);

  const content =
    `// This file is auto-generated. Do not edit manually.\n` +
    `export const scaffold = ${JSON.stringify(files, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');

  console.log(`✅ Scaffold written to: ${OUTPUT_FILE}`);
}

generate();
