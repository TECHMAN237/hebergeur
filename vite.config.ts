import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig, Plugin} from 'vite';

function toCanonicalKey(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'visuel'}${ext}`;
}

function isPriorityVisual(name: string): boolean {
  return name.toLowerCase().startsWith('whatsapp-image-');
}

function visualsScannerPlugin(): Plugin {
  const virtualModuleId = 'virtual:visuals-data';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  function syncRootVisuals() {
    try {
      const rootDir = process.cwd();
      const publicDir = path.resolve(rootDir, 'public');
      const targetDirs = ['visuels', 'visuels-lancement'];
      const alternateSources = [
        rootDir,
        path.join(rootDir, 'visuels'),
        path.join(rootDir, 'assets', 'visuels'),
        path.join(rootDir, 'src', 'assets', 'visuels'),
      ];
      const imageRegex = /\.(jpe?g|png|webp|svg|gif|avif)$/i;

      for (const subDir of targetDirs) {
        const destDir = path.join(publicDir, subDir);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, {recursive: true});
        }
        for (const alt of alternateSources) {
          if (fs.existsSync(alt) && alt !== destDir) {
            const items = fs.readdirSync(alt);
            for (const item of items) {
              if (item.startsWith('.') || !imageRegex.test(item)) continue;
              const srcFile = path.join(alt, item);
              if (!fs.statSync(srcFile).isFile()) continue;
              const canonical = toCanonicalKey(item);
              const dstFile = path.join(destDir, canonical);
              if (!fs.existsSync(dstFile)) {
                fs.copyFileSync(srcFile, dstFile);
              }
            }
          }
        }

        const files = fs
          .readdirSync(destDir)
          .filter(
            (f) =>
              !f.startsWith('.') &&
              imageRegex.test(f) &&
              fs.statSync(path.join(destDir, f)).isFile(),
          );
        for (const file of files) {
          const canonical = toCanonicalKey(file);
          const srcPath = path.join(destDir, file);
          const targetPath = path.join(destDir, canonical);
          if (file !== canonical) {
            if (!fs.existsSync(targetPath)) {
              fs.copyFileSync(srcPath, targetPath);
            }
            try {
              fs.unlinkSync(srcPath);
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // ignore sync errors
    }
  }

  function scanVisuals() {
    syncRootVisuals();
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) return [];

    const entries = fs.readdirSync(publicDir, {withFileTypes: true});
    const folders: Array<{
      name: string;
      displayName: string;
      folderPath: string;
      files: Array<{
        name: string;
        url: string;
        sizeBytes: number;
        updatedAt: string;
      }>;
    }> = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'assets' && entry.name !== 'api') {
        const folderPath = path.join(publicDir, entry.name);
        const seen = new Set<string>();
        const rawFiles = fs
          .readdirSync(folderPath, {withFileTypes: true})
          .filter(
            (f) =>
              f.isFile() &&
              /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(f.name) &&
              !f.name.startsWith('.'),
          );

        const files: Array<{
          name: string;
          url: string;
          sizeBytes: number;
          updatedAt: string;
        }> = [];

        for (const f of rawFiles) {
          const stats = fs.statSync(path.join(folderPath, f.name));
          const canonicalKey = toCanonicalKey(f.name);

          if (!seen.has(canonicalKey)) {
            seen.add(canonicalKey);
            files.push({
              name: canonicalKey,
              url: `/${entry.name}/${canonicalKey}`,
              sizeBytes: stats.size,
              updatedAt: stats.mtime.toISOString(),
            });
          }
        }

        files.sort((a, b) => {
          const aPrio = isPriorityVisual(a.name);
          const bPrio = isPriorityVisual(b.name);
          if (aPrio && !bPrio) return -1;
          if (!aPrio && bPrio) return 1;
          return a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        });

        folders.push({
          name: entry.name,
          displayName: entry.name.replace(/[-_]/g, ' '),
          folderPath: `/${entry.name}`,
          files,
        });
      }
    }

    folders.sort((a, b) => {
      if (a.name === 'visuels') return -1;
      if (b.name === 'visuels') return 1;
      return a.name.localeCompare(b.name);
    });

    return folders;
  }

  return {
    name: 'vite-plugin-visuals-scanner',
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        const folders = scanVisuals();
        return `export const visualFolders = ${JSON.stringify(folders, null, 2)};\nexport const generatedAt = ${JSON.stringify(new Date().toISOString())};`;
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] || '';

        // Handle /api/visuels directly in dev server
        if (pathname === '/api/visuels' || pathname === '/api/visuels/') {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 200;
            res.end();
            return;
          }

          const host =
            req.headers['x-forwarded-host'] ||
            req.headers.host ||
            'localhost:3000';
          const proto =
            req.headers['x-forwarded-proto'] ||
            ((req.socket as {encrypted?: boolean} | undefined)?.encrypted
              ? 'https'
              : 'http');
          const domain = `${proto}://${host}`;

          const folders = scanVisuals();
          const targetFolder =
            folders.find((f) => f.name === 'visuels') || folders[0];
          const files = targetFolder ? targetFolder.files : [];

          const apiResponse = files.map((file) => ({
            nom: file.name,
            url: `${domain}${file.url}`,
          }));

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.statusCode = 200;
          res.end(JSON.stringify(apiResponse, null, 2));
          return;
        }

        // Ensure /visuels SPA route falls back to index.html instead of directory listing
        if (pathname === '/visuels' || pathname === '/visuels/') {
          req.url = '/index.html';
        }

        next();
      });
    },
    buildStart() {
      try {
        const folders = scanVisuals();
        const manifestPath = path.resolve(
          process.cwd(),
          'public',
          'visuels-manifest.json',
        );
        fs.writeFileSync(
          manifestPath,
          JSON.stringify(
            {folders, generatedAt: new Date().toISOString()},
            null,
            2,
          ),
        );

        // Update api/visuels-data.js so Vercel's serverless function bundles the exact file list
        const targetFolder =
          folders.find((f) => f.name === 'visuels') || folders[0];
        const files = targetFolder ? targetFolder.files.map((f) => f.name) : [];
        const apiDir = path.resolve(process.cwd(), 'api');
        if (!fs.existsSync(apiDir)) {
          fs.mkdirSync(apiDir, {recursive: true});
        }
        fs.writeFileSync(
          path.join(apiDir, 'visuels-data.js'),
          `// Auto-generated at build time\nexport const visualFiles = ${JSON.stringify(files, null, 2)};\n`,
          'utf8',
        );
      } catch (err) {
        console.error('Failed to write visuels-manifest.json', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), visualsScannerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
