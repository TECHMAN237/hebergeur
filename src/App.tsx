import { useState, useMemo, useEffect } from 'react';
import {
  visualFolders as importedFolders,
  generatedAt as buildGeneratedAt,
} from 'virtual:visuals-data';
import {
  Folder,
  Globe,
  Search,
  ExternalLink,
  Info,
  CheckCircle2,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Copy,
  Check,
  Code,
  ShieldCheck,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import { VisualFolder } from './types';
import { VisualCard } from './components/VisualCard';

export default function App() {
  const [folders, setFolders] = useState<VisualFolder[]>(importedFolders || []);
  const [selectedFolder, setSelectedFolder] = useState<string>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/visuels') ||
        window.location.pathname === '/visuels/')
    ) {
      return 'visuels';
    }
    if (importedFolders?.some((f) => f.name === 'visuels')) {
      return 'visuels';
    }
    if (importedFolders?.some((f) => f.name === 'visuels-lancement')) {
      return 'visuels-lancement';
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState<boolean>(false);

  // Auto-detect current origin as base URL and fetch latest manifest
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setCustomBaseUrl(window.location.origin);
    }

    fetch('/visuels-manifest.json?t=' + Date.now())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.folders) && data.folders.length > 0) {
          setFolders(data.folders);
        }
      })
      .catch(() => {});
  }, []);

  const totalFiles = useMemo(() => {
    return folders.reduce((acc, folder) => acc + folder.files.length, 0);
  }, [folders]);

  // Filtered files according to active folder tab and search input
  const displayedFiles = useMemo(() => {
    const list: Array<{ file: VisualFolder['files'][0]; folderName: string }> = [];

    folders.forEach((folder) => {
      if (selectedFolder !== 'all' && folder.name !== selectedFolder) {
        return;
      }
      folder.files.forEach((file) => {
        if (
          !searchQuery.trim() ||
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          folder.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          list.push({ file, folderName: folder.name });
        }
      });
    });

    return list;
  }, [folders, selectedFolder, searchQuery]);

  const copyAllUrls = async () => {
    if (displayedFiles.length === 0) return;
    const allUrls = displayedFiles
      .map(
        ({ file }) =>
          `${customBaseUrl.replace(/\/+$/, '')}${encodeURI(file.url)}`,
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(allUrls);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = allUrls;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const copyApiUrl = async () => {
    const apiUrl = `${customBaseUrl.replace(/\/+$/, '')}/api/visuels`;
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopiedApiUrl(true);
      setTimeout(() => setCopiedApiUrl(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = apiUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedApiUrl(true);
      setTimeout(() => setCopiedApiUrl(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
      {/* Top Banner / Status */}
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white font-mono font-bold text-sm">
                IMG
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-stone-900 sm:text-lg">
                  Hébergeur de Visuels Marketing
                </h1>
                <p className="text-xs text-stone-500">
                  Accès public direct aux images brutes • Compatible Metricool
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accès 100% Public
              </span>

              <button
                id="btn-toggle-guide"
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                <Info className="h-3.5 w-3.5 text-stone-500" />
                <span>Guide Metricool</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Guide / Metricool Instructions */}
        {showGuide && (
          <div
            id="panel-guide"
            className="mb-8 rounded-xl border border-blue-100 bg-blue-50/70 p-5 text-sm text-stone-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-stone-900 mb-1">
                  Fonctionnement avec Metricool &amp; Outils Externes
                </h2>
                <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                  Chaque fichier stocké dans <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-900">public/visuels/</code> est servi directement par le serveur web sous son type MIME natif (<code className="font-mono text-xs">image/jpeg</code>, <code className="font-mono text-xs">image/png</code>). Aucune page HTML intermédiaire, aucun cookie, aucun token n'est requis.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg bg-white p-3 border border-blue-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-1">1. Copier l'URL</span>
                    <span>Cliquez sur « Copier l'URL directe » sur le visuel souhaité.</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-blue-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-1">2. Coller dans Metricool</span>
                    <span>Dans l'éditeur de publication, sélectionnez « Ajouter une image par URL » et collez le lien.</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-blue-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-1">3. Ajouter de nouveaux visuels</span>
                    <span>Glissez simplement vos images dans <code className="font-mono">public/visuels/</code> et déployez sur Vercel.</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-stone-400 hover:text-stone-600 p-1 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Endpoint API & Architectural Guarantee Card */}
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2.5 py-1 text-xs font-mono font-semibold text-white">
                  GET /api/visuels
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  100% Public • Sans Auth
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                  CORS: Access-Control-Allow-Origin: *
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                  Cache: no-cache, no-store
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mb-3">
                Retourne un JSON listant tous les fichiers de <code className="font-mono text-stone-800 bg-stone-100 px-1 py-0.5 rounded">public/visuels/</code> avec leur URL directe complète pour Metricool ou vos automatisations.
              </p>
              <div className="rounded-lg bg-stone-950 p-3 font-mono text-[11px] text-stone-200 overflow-x-auto border border-stone-800">
                <div className="text-stone-400 text-[10px] mb-1 font-sans">// Format JSON officiel renvoyé par /api/visuels :</div>
                <pre className="text-stone-300">
{`[
  { "nom": "visuel 1.jpg", "url": "${customBaseUrl || 'https://[domaine]'}/visuels/visuel%201.jpg" },
  { "nom": "visuel 2.jpg", "url": "${customBaseUrl || 'https://[domaine]'}/visuels/visuel%202.jpg" }
]`}
                </pre>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col items-stretch sm:items-center lg:items-stretch gap-2 w-full lg:w-auto shrink-0">
              <a
                id="link-api-json"
                href="/api/visuels"
                target="_blank"
                rel="noreferrer"
                className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-stone-800 transition"
              >
                <Code className="h-3.5 w-3.5" />
                <span>Tester /api/visuels (JSON)</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>

              <button
                id="btn-copy-api-url"
                type="button"
                onClick={copyApiUrl}
                className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-xs font-medium transition ${
                  copiedApiUrl
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                {copiedApiUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>URL API copiée !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-500" />
                    <span>Copier l'URL de l'API</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Base URL & Folder Tabs */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          {/* Top Controls Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                id="input-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un visuel (ex: visuel-1, visuel-2)..."
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Base URL Indicator / Switcher */}
            <div className="flex items-center gap-2">
              <button
                id="btn-toggle-config"
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
                title="Personnaliser le domaine pour copier les URLs de production"
              >
                <Globe className="h-3.5 w-3.5 text-stone-500" />
                <span className="truncate max-w-[180px] sm:max-w-[240px] font-mono text-[11px]">
                  {customBaseUrl || 'https://votre-domaine.com'}
                </span>
                <SlidersHorizontal className="h-3 w-3 text-stone-400" />
              </button>

              <button
                id="btn-copy-all"
                type="button"
                onClick={copyAllUrls}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  copiedAll
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
                title="Copier la liste complète des URLs affichées (pratique pour l'import par lot)"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{displayedFiles.length} URLs copiées !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-500" />
                    <span>Copier la liste ({displayedFiles.length})</span>
                  </>
                )}
              </button>

              <a
                id="btn-raw-manifest"
                href="/visuels-manifest.json"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
                title="Consulter le fichier JSON d'indexation complet"
              >
                <FileText className="h-3.5 w-3.5 text-stone-400" />
                <span className="hidden sm:inline">Manifest JSON</span>
              </a>
            </div>
          </div>

          {/* Expanded Domain Configuration */}
          {showConfig && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
              <label htmlFor="input-domain" className="block font-medium text-stone-700 mb-1">
                Domaine personnalisé pour la copie d'URL :
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="input-domain"
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://votre-domaine.vercel.app"
                  className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs text-stone-900 focus:border-stone-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setCustomBaseUrl(window.location.origin)}
                  className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                >
                  <RefreshCw className="h-3 w-3" />
                  Réinitialiser
                </button>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Utile pour copier directement les URLs avec votre domaine Vercel final ou votre nom de domaine personnalisé (ex: <code className="font-mono">https://media.mondomaine.com</code>).
              </p>
            </div>
          )}

          {/* Folder Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
            <span className="text-xs font-medium text-stone-500 mr-1 flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" /> Dossiers :
            </span>

            <button
              id="tab-folder-all"
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedFolder === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tous les visuels ({totalFiles})
            </button>

            {folders.map((folder) => (
              <button
                key={folder.name}
                id={`tab-folder-${folder.name}`}
                type="button"
                onClick={() => setSelectedFolder(folder.name)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono transition ${
                  selectedFolder === folder.name
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                /{folder.name}/ ({folder.files.length})
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {displayedFiles.length > 0 ? (
          <div
            id="visuals-grid"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {displayedFiles.map(({ file, folderName }) => (
              <VisualCard
                key={`${folderName}-${file.name}`}
                file={file}
                folderName={folderName}
                baseUrl={customBaseUrl}
              />
            ))}
          </div>
        ) : (
          <div
            id="empty-state"
            className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              Aucun visuel correspondant trouvé
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `Aucun fichier ne correspond à la recherche « ${searchQuery} ».`
                : `Le dossier sélectionné ne contient aucun fichier image pour le moment.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800"
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        )}

        {/* Quick Instructions & Architecture footer note */}
        <section className="mt-12 rounded-xl border border-stone-200/80 bg-white p-6 shadow-2xs">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-stone-900 mb-2">
                📂 Structure des dossiers
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed mb-3">
                Vos images sont directement stockées dans le répertoire statique racine. Vous pouvez ajouter autant de fichiers ou sous-dossiers que nécessaire :
              </p>
              <div className="rounded-lg bg-stone-900 p-3 font-mono text-xs text-stone-200">
                <p className="text-emerald-400"># Dossier principal public</p>
                <p>/public/visuels/visuel-1.jpg</p>
                <p>/public/visuels/visuel-2.jpg</p>
                <p className="text-emerald-400 mt-2"># Autres dossiers thématiques supportés</p>
                <p>/public/visuels-lancement/visuel-1.jpg</p>
                <p>/public/visuels-communaute/visuel-1.jpg</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-900 mb-2">
                ⚡ Déploiement Vercel &amp; Accès direct
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed mb-3">
                Le projet est un site statique Vite ultra-léger sans base de données. Sur Vercel, les en-têtes CORS <code className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">Access-Control-Allow-Origin: *</code> sont automatiquement configurés via <code className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">vercel.json</code> pour garantir une compatibilité totale avec Metricool et les robots sociaux.
              </p>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                <span className="font-medium text-stone-800 block mb-1">
                  Format de l'URL brute :
                </span>
                <code className="text-stone-900 font-mono text-[11px] break-all">
                  https://[votre-domaine]/visuels/[nom-du-fichier].jpg
                </code>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
