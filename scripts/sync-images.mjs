import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'images');
const publicDir = path.join(root, 'public');
const destDir = path.join(publicDir, 'images');

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

fs.mkdirSync(destDir, { recursive: true });

if (fs.existsSync(srcDir)) {
  const files = fs
    .readdirSync(srcDir)
    .filter((name) => imageExt.has(path.extname(name).toLowerCase()));
  for (const name of files) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  }
  fs.writeFileSync(
    path.join(destDir, 'manifest.json'),
    JSON.stringify({ files: files.sort((a, b) => a.localeCompare(b)) }, null, 2),
  );
  console.log(`sync-images: copied ${files.length} images to public/images`);
} else {
  fs.writeFileSync(
    path.join(destDir, 'manifest.json'),
    JSON.stringify({ files: [] }, null, 2),
  );
  console.warn('sync-images: no images/ folder found');
}

const premiseSrc = path.join(root, 'premise.png');
const premiseDest = path.join(publicDir, 'premise.png');
if (fs.existsSync(premiseSrc)) {
  fs.copyFileSync(premiseSrc, premiseDest);
  console.log('sync-images: copied premise.png to public/');
}
