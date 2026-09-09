import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const targetDirs = ['visuels', 'visuels-lancement'];

// 1. Fallback import: if user deposited files in root `visuels/` or `assets/visuels/`
const alternateSources = [
  path.join(rootDir, 'visuels'),
  path.join(rootDir, 'assets', 'visuels'),
  path.join(rootDir, 'src', 'assets', 'visuels'),
];

const destVisuels = path.join(publicDir, 'visuels');
if (!fs.existsSync(destVisuels)) {
  fs.mkdirSync(destVisuels, { recursive: true });
}

for (const alt of alternateSources) {
  if (fs.existsSync(alt) && alt !== destVisuels) {
    const items = fs.readdirSync(alt);
    for (const item of items) {
      const srcFile = path.join(alt, item);
      const dstFile = path.join(destVisuels, item);
      if (fs.statSync(srcFile).isFile() && !fs.existsSync(dstFile)) {
        fs.copyFileSync(srcFile, dstFile);
        console.log(`[sync] Copied from ${alt}/${item} to public/visuels/${item}`);
      }
    }
  }
}

// 2. Generate multi-format aliases in all public visual directories
for (const subDir of targetDirs) {
  const dirPath = path.join(publicDir, subDir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter((f) => {
    const full = path.join(dirPath, f);
    return (
      fs.statSync(full).isFile() &&
      !f.startsWith('.') &&
      /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(f)
    );
  });

  console.log(`[sync] Dossier public/${subDir} : ${files.length} fichiers bruts détectés.`);

  for (const file of files) {
    const srcPath = path.join(dirPath, file);
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);

    // Variants to create:
    // 1. Lowercase with hyphens: "visuel-1.jpg"
    // 2. Lowercase with space: "visuel 1.jpg"
    // 3. Capitalized with hyphen: "Visuel-1.jpg"
    // 4. Capitalized with space: "Visuel 1.jpg"
    const lowerNoExt = baseName.toLowerCase();
    const hyphenated = lowerNoExt.replace(/[\s_]+/g, '-');
    const spaced = lowerNoExt.replace(/[-_]+/g, ' ');

    const capHyphenated =
      hyphenated.charAt(0).toUpperCase() + hyphenated.slice(1);
    const capSpaced = spaced.charAt(0).toUpperCase() + spaced.slice(1);

    const variants = new Set([
      file,
      `${hyphenated}${ext.toLowerCase()}`,
      `${spaced}${ext.toLowerCase()}`,
      `${capHyphenated}${ext.toLowerCase()}`,
      `${capSpaced}${ext.toLowerCase()}`,
    ]);

    for (const variant of variants) {
      const targetPath = path.join(dirPath, variant);
      if (!fs.existsSync(targetPath)) {
        try {
          fs.copyFileSync(srcPath, targetPath);
        } catch (err) {
          console.warn(`[sync] Could not create alias ${variant}:`, err);
        }
      }
    }
  }

  const finalFiles = fs.readdirSync(dirPath);
  console.log(`[sync] Dossier public/${subDir} : ${finalFiles.length} fichiers au total (avec alias Vercel).`);
}
