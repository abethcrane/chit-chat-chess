import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'images');
const publicDir = path.join(root, 'public');
const destDir = path.join(publicDir, 'images');

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function collectImageFiles(dir, baseRel = '') {
  /** @type {{ full: string; rel: string }[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.join(baseRel, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      out.push(...collectImageFiles(full, rel));
    } else if (imageExt.has(path.extname(name).toLowerCase())) {
      out.push({ full, rel: rel.split(path.sep).join('/') });
    }
  }
  return out;
}

fs.mkdirSync(destDir, { recursive: true });

if (fs.existsSync(srcDir)) {
  const files = collectImageFiles(srcDir);
  for (const { full, rel } of files) {
    const destPath = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(full, destPath);
  }
  const manifestFiles = files.map((f) => f.rel).sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify({ files: manifestFiles }, null, 2));
  console.log(`sync-images: copied ${files.length} images under public/images`);
} else {
  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify({ files: [] }, null, 2));
  console.warn('sync-images: no images/ folder found');
}

const premiseSrc = path.join(root, 'premise.png');
const premiseDest = path.join(publicDir, 'premise.png');
if (fs.existsSync(premiseSrc)) {
  fs.copyFileSync(premiseSrc, premiseDest);
  console.log('sync-images: copied premise.png to public/');
}
