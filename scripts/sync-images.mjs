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

/** Remove files under destRoot that are not in allowedRels (forward-slash paths). Keeps manifest.json. */
function pruneStaleFiles(destRoot, allowedRels) {
  const allowed = new Set(allowedRels);
  allowed.add('manifest.json');
  if (!fs.existsSync(destRoot)) return;

  function walkDir(absDir) {
    for (const name of fs.readdirSync(absDir)) {
      const abs = path.join(absDir, name);
      const rel = path.relative(destRoot, abs).split(path.sep).join('/');
      const st = fs.lstatSync(abs);
      if (st.isDirectory()) {
        walkDir(abs);
        if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
      } else if (!allowed.has(rel)) {
        fs.unlinkSync(abs);
        console.log(`sync-images: removed stale ${rel}`);
      }
    }
  }
  walkDir(destRoot);
}

fs.mkdirSync(destDir, { recursive: true });

/** @type {{ full: string; rel: string }[]} */
let files = [];
if (fs.existsSync(srcDir)) {
  files = collectImageFiles(srcDir);
  for (const { full, rel } of files) {
    const destPath = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(full, destPath);
  }
  const manifestFiles = files.map((f) => f.rel).sort((a, b) => a.localeCompare(b));
  const attrPath = path.join(srcDir, 'attribution.json');
  let attributions = {};
  if (fs.existsSync(attrPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(attrPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        attributions = parsed;
      }
    } catch (e) {
      console.warn('sync-images: could not parse images/attribution.json', e);
    }
  }
  const manifestPayload =
    Object.keys(attributions).length > 0
      ? { files: manifestFiles, attributions }
      : { files: manifestFiles };
  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify(manifestPayload, null, 2));
  console.log(`sync-images: copied ${files.length} images under public/images`);
} else {
  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify({ files: [] }, null, 2));
  console.warn('sync-images: no images/ folder found');
}

pruneStaleFiles(destDir, files.map((f) => f.rel));

const premiseSrc = path.join(root, 'premise.png');
const premiseDest = path.join(publicDir, 'premise.png');
if (fs.existsSync(premiseSrc)) {
  fs.copyFileSync(premiseSrc, premiseDest);
  console.log('sync-images: copied premise.png to public/');
}
