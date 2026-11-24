import { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download } from 'lucide-react';
import type { Artwork } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import { formatLotNumber } from '../utils/format';

interface QrCodeCardProps {
  artwork: Artwork;
  compact?: boolean;
}

function isPreviewHostname(hostname: string): boolean {
  return (
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.run.app') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  );
}

type QrMatrix = {
  modules: {
    size: number;
    data: ArrayLike<number>;
  };
};

function createQrMatrix(text: string): QrMatrix | null {
  try {
    const mod = QRCode as unknown as {
      create?: (value: string, opts?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }) => QrMatrix;
      default?: {
        create?: (value: string, opts?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }) => QrMatrix;
      };
    };
    const createFn = typeof mod.create === 'function' ? mod.create : mod.default?.create;
    if (!createFn) return null;
    return createFn(text, { errorCorrectionLevel: 'M' });
  } catch {
    return null;
  }
}

function buildQrSvgPath(matrix: QrMatrix, margin: number): { viewSize: number; path: string } {
  const size = matrix.modules.size;
  const data = matrix.modules.data;
  const commands: string[] = [];

  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        const startX = x;
        while (x < size && data[y * size + x]) {
          x += 1;
        }
        const runLen = x - startX;
        commands.push(`M${startX + margin} ${y + margin}h${runLen}v1h-${runLen}z`);
      } else {
        x += 1;
      }
    }
  }

  return {
    viewSize: size + margin * 2,
    path: commands.join(''),
  };
}

export function QrCodeCard({ artwork, compact = false }: QrCodeCardProps) {
  const { auctionState } = useAuction();
  const [copied, setCopied] = useState(false);

  const rawConfigured =
    auctionState?.publicBaseUrl?.trim().replace(/\/+$/, '') ||
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')) ||
    '';

  let configuredOrigin = '';
  if (rawConfigured) {
    try {
      const parsedCfg = new URL(
        rawConfigured.startsWith('http://') || rawConfigured.startsWith('https://')
          ? rawConfigured
          : `https://${rawConfigured}`
      );
      configuredOrigin = parsedCfg.origin;
    } catch {
      configuredOrigin = '';
    }
  }

  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const effectiveOrigin = configuredOrigin || fallbackOrigin;
  const lotPath = `/artwork/${encodeURIComponent(artwork.id)}?zaal=mleuven`;
  const lotUrl = effectiveOrigin ? `${effectiveOrigin}${lotPath}` : lotPath;

  let displayHost = '';
  try {
    if (effectiveOrigin) {
      const parsed = new URL(effectiveOrigin);
      if (configuredOrigin || !isPreviewHostname(parsed.hostname)) {
        displayHost = `${parsed.host}/artwork/${artwork.id}`;
      }
    }
  } catch {
    displayHost = '';
  }

  const qrSvg = useMemo(() => {
    const matrix = createQrMatrix(lotUrl);
    if (!matrix) return null;
    return buildQrSvgPath(matrix, 2);
  }, [lotUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lotUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Klembord niet beschikbaar
    }
  };

  const handleDownload = () => {
    if (!qrSvg) return;
    const fileBase = `leuven2030-art-for-climate-lot-${String(artwork.lotNumber).padStart(2, '0')}-qr`;
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 ${qrSvg.viewSize} ${qrSvg.viewSize}" shape-rendering="crispEdges"><rect width="${qrSvg.viewSize}" height="${qrSvg.viewSize}" fill="#FFFFFF"/><path d="${qrSvg.path}" fill="#19706D"/></svg>`;

    const triggerDownload = (href: string, ext: 'png' | 'svg') => {
      const link = document.createElement('a');
      link.href = href;
      link.download = `${fileBase}.${ext}`;
      link.click();
    };

    try {
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            triggerDownload(svgUrl, 'svg');
            URL.revokeObjectURL(svgUrl);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 600, 600);
          ctx.drawImage(img, 0, 0, 600, 600);
          const pngUrl = canvas.toDataURL('image/png');
          triggerDownload(pngUrl, 'png');
        } catch {
          triggerDownload(svgUrl, 'svg');
        } finally {
          URL.revokeObjectURL(svgUrl);
        }
      };
      img.onerror = () => {
        triggerDownload(svgUrl, 'svg');
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch {
      const fallbackSvgHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
      triggerDownload(fallbackSvgHref, 'svg');
    }
  };

  const sizeClass = compact ? 'w-28 h-28' : 'w-36 h-36';

  return (
    <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5 print-break-inside-avoid">
      <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-3 mb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-[#19706D] font-bold tabular-nums">
            {formatLotNumber(artwork.lotNumber)} · {artwork.galleryRoom}
          </p>
          <h4 className="font-display text-lg font-bold text-[#363E49] truncate mt-0.5">
            {artwork.title || artwork.artist}
          </h4>
          {artwork.title && (
            <p className="text-xs text-[#5D6C7B] truncate">{artwork.artist}</p>
          )}
        </div>
        <span className="font-mono text-[11px] font-semibold text-[#5D6C7B] whitespace-nowrap shrink-0">
          M Leuven
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="shrink-0 border border-[#E5E5E5] rounded-xl bg-white p-2">
          {qrSvg ? (
            <svg
              viewBox={`0 0 ${qrSvg.viewSize} ${qrSvg.viewSize}`}
              role="img"
              aria-label={`QR-code voor ${artwork.title || artwork.artist}`}
              shapeRendering="crispEdges"
              className={`${sizeClass} block`}
            >
              <rect width={qrSvg.viewSize} height={qrSvg.viewSize} fill="#FFFFFF" />
              <path d={qrSvg.path} fill="#19706D" />
            </svg>
          ) : (
            <div className={`${sizeClass} bg-[#F7F7F7] flex items-center justify-center text-xs text-[#5D6C7B] text-center p-2`}>
              QR-link ongeldig
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs font-bold text-[#363E49]">
            Scan in M Leuven om dit kunstwerk te bekijken en te bewaren
          </p>
          <p className="font-mono text-[11px] text-[#5D6C7B] truncate mt-1" title={lotUrl}>
            {displayHost || `Art for Climate · ${formatLotNumber(artwork.lotNumber)} · M Leuven`}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 no-print">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrSvg}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs font-bold bg-[#3C7F90] text-white hover:bg-[#19706D] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bewaar PNG</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-[10px] text-xs font-semibold border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#1E5941]" aria-hidden="true" />
                  <span>Gekopieerd</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kopieer link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
