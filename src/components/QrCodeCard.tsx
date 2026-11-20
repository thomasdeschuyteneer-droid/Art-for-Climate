import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download } from 'lucide-react';
import type { Artwork } from '../types/auction';
import { formatLotNumber } from '../utils/format';

interface QrCodeCardProps {
  artwork: Artwork;
  compact?: boolean;
}

export function QrCodeCard({ artwork, compact = false }: QrCodeCardProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const lotUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/artwork/${artwork.id}?zaal=mleuven`
      : `/artwork/${artwork.id}?zaal=mleuven`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(lotUrl, {
      width: compact ? 180 : 280,
      margin: 2,
      color: {
        dark: '#19706D',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [lotUrl, compact]);

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
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `leuven2030-art-for-climate-lot-${String(artwork.lotNumber).padStart(2, '0')}-qr.png`;
    link.click();
  };

  return (
    <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5 print-break-inside-avoid">
      <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-3 mb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-[#19706D] font-bold tabular-nums">
            {formatLotNumber(artwork.lotNumber)} · {artwork.galleryRoom}
          </p>
          <h4 className="font-display text-lg font-bold text-[#363E49] truncate mt-0.5">
            {artwork.title}
          </h4>
          <p className="text-xs text-[#5D6C7B] truncate">{artwork.artist}</p>
        </div>
        <span className="font-mono text-[11px] font-semibold text-[#5D6C7B] whitespace-nowrap shrink-0">
          M Leuven
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="shrink-0 border border-[#E5E5E5] rounded-xl bg-white p-2">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR-code voor ${artwork.title}`}
              className={compact ? 'w-28 h-28' : 'w-36 h-36'}
            />
          ) : (
            <div className={`${compact ? 'w-28 h-28' : 'w-36 h-36'} bg-[#F7F7F7] flex items-center justify-center text-xs text-[#5D6C7B]`}>
              Bezig...
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs font-bold text-[#363E49]">
            Scan ter plekke in M Leuven om te bieden op dit kunstwerk
          </p>
          <p className="font-mono text-[11px] text-[#5D6C7B] truncate mt-1" title={lotUrl}>
            {lotUrl}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 no-print">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!dataUrl}
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
