import { useState } from 'react';
import { Copy, Check, ExternalLink, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { VisualFile } from '../types';

interface VisualCardProps {
  key?: string;
  file: VisualFile;
  folderName: string;
  baseUrl: string;
}

export function VisualCard({ file, folderName, baseUrl }: VisualCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [retryLevel, setRetryLevel] = useState(0);

  // Clean unencoded base URL and formatted size
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const rawPath = file.url.startsWith('/') ? file.url : `/${file.url}`;
  const encodedPath = encodeURI(decodeURI(rawPath));
  const encodedUrl = `${cleanBase}${encodedPath}`;

  const [currentImgSrc, setCurrentImgSrc] = useState<string>(() => encodedPath);

  const formattedSize =
    file.sizeBytes > 1024 * 1024
      ? `${(file.sizeBytes / (1024 * 1024)).toFixed(1)} Mo`
      : `${Math.round(file.sizeBytes / 1024)} Ko`;

  const handleImgError = () => {
    if (retryLevel === 0) {
      // 1. Try with absolute URL
      setRetryLevel(1);
      setCurrentImgSrc(`${cleanBase}${encodedPath}`);
    } else if (retryLevel === 1) {
      // 2. Try swapping case: Visuel <-> visuel
      setRetryLevel(2);
      let alt = encodedPath;
      if (alt.includes('Visuel')) {
        alt = alt.replace(/Visuel/g, 'visuel');
      } else if (alt.includes('visuel')) {
        alt = alt.replace(/visuel/g, 'Visuel');
      }
      setCurrentImgSrc(alt);
    } else if (retryLevel === 2) {
      // 3. Try hyphenated alias (e.g. /visuels/visuel-10.jpg)
      setRetryLevel(3);
      const hyphenated = encodedPath.toLowerCase().replace(/%20|\s+/g, '-');
      setCurrentImgSrc(hyphenated);
    } else {
      setImgError(true);
    }
  };

  const handleManualRetry = () => {
    setImgError(false);
    setImgLoaded(false);
    setRetryLevel(0);
    setCurrentImgSrc(`${encodedPath}?t=${Date.now()}`);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(encodedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = encodedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id={`card-${folderName}-${file.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs transition-all hover:border-stone-300 hover:shadow-sm"
    >
      {/* Visual Preview Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100 flex items-center justify-center border-b border-stone-100">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400">
            <ImageIcon className="h-8 w-8 animate-pulse text-stone-300" />
          </div>
        )}

        {imgError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center text-stone-400">
            <ImageIcon className="h-8 w-8 mb-1.5 text-stone-300" />
            <span className="text-xs font-medium text-stone-600 mb-2">Chargement différé</span>
            <button
              type="button"
              onClick={handleManualRetry}
              className="flex items-center gap-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 text-[11px] font-medium transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Réessayer</span>
            </button>
          </div>
        ) : (
          <img
            key={currentImgSrc}
            src={currentImgSrc}
            alt={file.name}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            onLoad={() => {
              setImgLoaded(true);
              setImgError(false);
            }}
            onError={handleImgError}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Badge File Type */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-stone-900/80 px-2 py-0.5 text-[11px] font-mono font-medium text-stone-100 backdrop-blur-xs">
            {file.name.split('.').pop()?.toUpperCase() || 'IMG'}
          </span>
          <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-mono text-stone-700 backdrop-blur-xs shadow-2xs">
            {formattedSize}
          </span>
        </div>

        {/* Open Direct Raw Link Button */}
        <a
          id={`link-raw-${file.name.replace(/\s+/g, '-')}`}
          href={encodedPath}
          target="_blank"
          rel="noreferrer"
          title="Ouvrir l'image brute en plein écran"
          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-600 shadow-2xs backdrop-blur-xs transition hover:bg-white hover:text-stone-900"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Card Info & Actions */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="truncate font-mono text-sm font-semibold text-stone-800" title={file.name}>
            {file.name}
          </h3>
          <span className="shrink-0 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
            Public direct
          </span>
        </div>

        {/* Direct URL Container */}
        <div
          onClick={copyUrl}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              copyUrl();
            }
          }}
          title="Cliquer pour copier l'URL directe complète"
          className="mb-3 rounded-lg border border-stone-200/90 bg-stone-50 p-2.5 cursor-pointer hover:border-stone-400 hover:bg-stone-100/80 transition group/url"
        >
          <div className="flex items-center justify-between gap-1 text-[11px] text-stone-500 mb-1">
            <span className="font-medium">URL directe complète :</span>
            <span className="text-[10px] text-stone-400 group-hover/url:text-stone-600">
              {copied ? '✓ Copié !' : 'Cliquer pour copier'}
            </span>
          </div>
          <p
            className="font-mono text-xs text-stone-800 break-all select-all leading-relaxed"
          >
            {encodedUrl}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-auto flex items-center gap-2">
          <button
            id={`btn-copy-${file.name.replace(/\s+/g, '-')}`}
            type="button"
            onClick={copyUrl}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>URL copiée !</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copier l'URL</span>
              </>
            )}
          </button>

          <a
            id={`btn-view-${file.name.replace(/\s+/g, '-')}`}
            href={encodeURI(file.url)}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
            title="Tester l'accès brut au fichier image"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
