import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  // Public CORS headers - completely open for Metricool and external services
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez GET.' });
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const domain = host ? `${proto}://${host}` : '';

  // Look for image files in public/visuels (or fallback)
  const candidateDirs = [
    path.join(process.cwd(), 'public', 'visuels'),
    path.join(process.cwd(), 'dist', 'visuels'),
    path.join(process.cwd(), 'visuels'),
    path.join(process.cwd(), 'public', 'visuels-lancement'),
  ];

  let files = [];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      const seen = new Set();
      const rawEntries = fs
        .readdirSync(dir)
        .filter(
          (f) =>
            /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(f) &&
            !f.startsWith('.'),
        );

      const found = [];
      for (const f of rawEntries) {
        const ext = path.extname(f).toLowerCase();
        const base = path.basename(f, ext).toLowerCase().replace(/[\s_]+/g, '-');
        const canonicalKey = `${base}${ext}`;
        if (!seen.has(canonicalKey)) {
          seen.add(canonicalKey);
          found.push(canonicalKey);
        }
      }

      found.sort((a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      if (found.length > 0) {
        files = found;
        break;
      }
    }
  }

  // Fallback to manifest if running in isolated serverless bundle
  if (files.length === 0) {
    const manifestCandidates = [
      path.join(process.cwd(), 'public', 'visuels-manifest.json'),
      path.join(process.cwd(), 'dist', 'visuels-manifest.json'),
      path.join(process.cwd(), 'visuels-manifest.json'),
    ];
    for (const manifestPath of manifestCandidates) {
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const folder =
            manifest.folders?.find((f) => f.name === 'visuels') ||
            manifest.folders?.[0];
          if (folder?.files) {
            files = folder.files.map((f) => f.name);
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  const payload = files.map((file) => ({
    nom: file,
    url: `${domain}/visuels/${encodeURI(file)}`,
  }));

  return res.status(200).json(payload);
}
