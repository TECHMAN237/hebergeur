import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig, Plugin} from 'vite';

function visualsScannerPlugin(): Plugin {
  const virtualModuleId = 'virtual:visuals-data';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  function scanVisuals() {
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
      if (entry.isDirectory() && entry.name !== 'assets') {
        const folderPath = path.join(publicDir, entry.name);
        const seen = new Set<string>();
        const files = fs
          .readdirSync(folderPath, {withFileTypes: true})
          .filter(
            (f) =>
              f.isFile() &&
              /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(f.name) &&
              !f.name.startsWith('.') &&
              !f.name.includes('-'),
          )
          .map((f) => {
            const stats = fs.statSync(path.join(folderPath, f.name));
            const canonicalName = f.name.toLowerCase();
            return {
              name: canonicalName,
              url: `/${entry.name}/${canonicalName}`,
              sizeBytes: stats.size,
              updatedAt: stats.mtime.toISOString(),
            };
          })
          .filter((f) => {
            if (seen.has(f.name)) return false;
            seen.add(f.name);
            return true;
          })
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
              numeric: true,
              sensitivity: 'base',
            }),
          );

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
            ((req.socket as { encrypted?: boolean } | undefined)?.encrypted
              ? 'https'
              : 'http');
          const domain = `${proto}://${host}`;

          const folders = scanVisuals();
          const targetFolder =
            folders.find((f) => f.name === 'visuels') || folders[0];
          const files = targetFolder ? targetFolder.files : [];

          const apiResponse = files.map((file) => ({
            nom: file.name,
            url: `${domain}${encodeURI(file.url)}`,
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

        // Pre-generate static API response files
        const targetFolder =
          folders.find((f) => f.name === 'visuels') || folders[0];
        const files = targetFolder ? targetFolder.files : [];
        const staticApiPayload = files.map((file) => ({
          nom: file.name,
          url: file.url,
        }));

        const apiDir = path.resolve(process.cwd(), 'public', 'api');
        if (!fs.existsSync(apiDir)) {
          fs.mkdirSync(apiDir, {recursive: true});
        }
        fs.writeFileSync(
          path.join(apiDir, 'visuels.json'),
          JSON.stringify(staticApiPayload, null, 2),
        );
        fs.writeFileSync(
          path.join(apiDir, 'visuels'),
          JSON.stringify(staticApiPayload, null, 2),
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
