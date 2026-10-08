import fs from 'node:fs';
import path from 'node:path';
import { visualFiles as bundledVisualFiles } from './visuels-data.js';

function toCanonicalKey(filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'visuel'}${ext}`;
}

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

  const host =
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const cleanHost = String(host).replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const domain = cleanHost ? `${proto}://${cleanHost}` : '';

  // Look for image files on disk if available, otherwise use bundled build-time list
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
        const canonicalKey = toCanonicalKey(f);
        if (!seen.has(canonicalKey)) {
          seen.add(canonicalKey);
          found.push(canonicalKey);
        }
      }

      const isPriorityVisual = (name) =>
        name.toLowerCase().startsWith('whatsapp-image-');

      found.sort((a, b) => {
        const aPrio = isPriorityVisual(a);
        const bPrio = isPriorityVisual(b);
        if (aPrio && !bPrio) return -1;
        if (!aPrio && bPrio) return 1;
        return a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });

      if (found.length > 0) {
        files = found;
        break;
      }
    }
  }

  // Fallback to bundled build-time list (guaranteed available in Vercel Serverless Functions)
  if (files.length === 0 && Array.isArray(bundledVisualFiles) && bundledVisualFiles.length > 0) {
    files = bundledVisualFiles;
  }

  const payload = files.map((file) => ({
    nom: file,
    url: `${domain}/visuels/${file}`,
  }));

  return res.status(200).json(payload);
}
