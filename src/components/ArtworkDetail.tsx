import { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Maximize2,
  X,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  formatEuro,
  formatLotNumber,
  getStatusLabel,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { CountdownClock } from './CountdownClock';
import { FavoriteButton } from './FavoriteButton';
import { QrCodeCard } from './QrCodeCard';
import type { AppRoute } from './HeaderNav';

interface ArtworkDetailProps {
  artworkId: string;
  onNavigate: (next: AppRoute) => void;
}

export function ArtworkDetail({
  artworkId,
  onNavigate,
}: ArtworkDetailProps) {
  const {
    artworks,
    auctionState,
    favoriteIds,
    isFavorite,
    loading,
  } = useAuction();
  const [zoomed, setZoomed] = useState(false);

  const normalizedLookup = artworkId.trim().toLowerCase();
  const artworkIndex = artworks.findIndex(
    (a) =>
      a.id.toLowerCase() === normalizedLookup ||
      String(a.lotNumber) === normalizedLookup ||
      `lot-${a.lotNumber}` === normalizedLookup
  );
  const artwork = artworkIndex >= 0 ? artworks[artworkIndex] : null;
  const prevLot = artworkIndex > 0 ? artworks[artworkIndex - 1] : null;
  const nextLot =
    artworkIndex >= 0 && artworkIndex < artworks.length - 1
      ? artworks[artworkIndex + 1]
      : null;

  if (!artwork && loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[#19706D]">
          Kunstwerk wordt geladen...
        </p>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-3xl font-bold text-[#363E49]">
          Kunstwerk niet gevonden
        </p>
        <p className="text-sm text-[#5D6C7B] mt-2">
          Dit werk maakt geen deel uit van de actuele catalogus.
        </p>
        <button
          type="button"
          onClick={() => onNavigate({ view: 'gallery' })}
          className="mt-6 min-h-[44px] px-6 py-2.5 rounded-[12px] bg-[#3C7F90] text-white text-sm font-bold cursor-pointer"
        >
          Terug naar kunstwerken
        </button>
      </div>
    );
  }

  const isSpotlightLot = auctionState?.activeLotId === artwork.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-24 md:pb-16">
      {/* Navigatiebalk bovenaan */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'gallery' })}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-bold text-[#19706D] hover:text-[#363E49] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Terug naar kunstwerken</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevLot}
            onClick={() =>
              prevLot && onNavigate({ view: 'artwork', artworkId: prevLot.id })
            }
            className="min-h-[40px] px-3.5 py-1.5 rounded-[10px] border border-[#E5E5E5] bg-white text-xs font-semibold text-[#363E49] hover:border-[#19706D] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Vorig werk</span>
          </button>
          <button
            type="button"
            disabled={!nextLot}
            onClick={() =>
              nextLot && onNavigate({ view: 'artwork', artworkId: nextLot.id })
            }
            className="min-h-[40px] px-3.5 py-1.5 rounded-[10px] border border-[#E5E5E5] bg-white text-xs font-semibold text-[#363E49] hover:border-[#19706D] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Volgend werk</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Hoofdindeling in 2 kolommen */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Linkerkolom: Grote afbeelding & Sokkel QR-code */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
            <ArtworkImageFrame
              src={artwork.imageUrl}
              alt={artwork.title ? `${artwork.title} door ${artwork.artist}` : artwork.artist}
              className="aspect-[4/5] sm:aspect-square w-full"
              imgClassName="w-full h-full object-contain p-4 sm:p-6"
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Vergroot kunstwerk"
              className="absolute bottom-4 right-4 min-h-[40px] px-3.5 py-1.5 rounded-[10px] bg-white border border-[#E5E5E5] text-xs font-bold text-[#363E49] hover:border-[#19706D] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Vergroten</span>
            </button>
          </div>
          {artwork.credit && (
            <p className="text-xs text-[#5D6C7B]">{artwork.credit}</p>
          )}

          <QrCodeCard artwork={artwork} compact />
        </div>

        {/* Rechterkolom: Kunstwerkgegevens & Startprijs */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[#5D6C7B] tabular-nums">
              <span className="font-bold text-[#19706D]">
                {formatLotNumber(artwork.lotNumber)}
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{artwork.galleryRoom}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{getStatusLabel(artwork.status)}</span>
            </p>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-2 leading-tight">
              {artwork.title || artwork.artist}
            </h1>
            {artwork.title && (
              <p className="text-lg font-bold text-[#363E49] mt-1.5">
                {artwork.artist}
              </p>
            )}

            {/* Direct favoriet-hartje (ideaal na scannen QR-code in M Leuven) */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <FavoriteButton
                artworkId={artwork.id}
                lotNumber={artwork.lotNumber}
                variant="button"
              />
              {isFavorite(artwork.id) && (
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'favorites' })}
                  className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#F7F7F7] hover:bg-[#DEE9EC] border border-[#E5E5E5] text-xs font-bold text-[#19706D] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#923636] text-[#923636]" aria-hidden="true" />
                  <span>
                    Bekijk mijn favorieten (
                    {artworks.filter((a) => favoriteIds.includes(a.id)).length})
                  </span>
                </button>
              )}
            </div>

            <p className="text-sm sm:text-base text-[#363E49] leading-relaxed mt-4">
              {artwork.description}
            </p>
          </div>

          {/* Technische fiche */}
          <dl className="bg-white border border-[#E5E5E5] rounded-2xl divide-y divide-[#E5E5E5] text-sm px-5">
            <div className="py-3.5 grid grid-cols-3 gap-4">
              <dt className="text-[#5D6C7B] font-semibold">Techniek</dt>
              <dd className="col-span-2 text-[#363E49]">{artwork.medium}</dd>
            </div>
            <div className="py-3.5 grid grid-cols-3 gap-4">
              <dt className="text-[#5D6C7B] font-semibold">Afmetingen</dt>
              <dd className="col-span-2 font-mono text-xs text-[#363E49] tabular-nums self-center">
                {artwork.dimensions}
              </dd>
            </div>
            <div className="py-3.5 grid grid-cols-3 gap-4">
              <dt className="text-[#5D6C7B] font-semibold">Locatie</dt>
              <dd className="col-span-2 text-[#363E49]">
                M Leuven · {artwork.galleryRoom}
              </dd>
            </div>
            <div className="py-3.5 grid grid-cols-3 gap-4">
              <dt className="text-[#5D6C7B] font-semibold">Startprijs</dt>
              <dd className="col-span-2 font-mono text-xs font-bold text-[#363E49] tabular-nums self-center">
                {formatEuro(artwork.startingBid)}
              </dd>
            </div>
          </dl>

          {/* Startprijs & Status in de zaal */}
          <div className="bg-[#DEE9EC]/60 border border-[#DEE9EC] rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Startprijs
                </p>
                <p className="font-mono text-3xl sm:text-4xl font-bold text-[#19706D] tabular-nums mt-1">
                  {formatEuro(artwork.startingBid)}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Status · Zaal
                </p>
                <p className="text-base font-bold text-[#1E5941] mt-1">
                  {getStatusLabel(artwork.status)} · {artwork.galleryRoom}
                </p>
              </div>
            </div>

            {isSpotlightLot && (
              <div className="pt-4 border-t border-[#3C7F90]/20 flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#19706D]">
                  Aftelklok in de zaal
                </span>
                <CountdownClock auctionState={auctionState} compact />
              </div>
            )}
          </div>

          {/* Informatiepaneel: Enkel live bieden in de zaal */}
          <div className="border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 bg-white space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#DEE9EC] text-[#19706D] flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#19706D]">
                  Enkel live bieden in de zaal
                </h2>
                <p className="text-sm text-[#5D6C7B] mt-1 leading-relaxed">
                  Online of rechtstreeks bieden via de website of QR-code is uitgeschakeld. Dit kunstwerk wordt op 16 december live geveild in M Leuven vanaf een startprijs van{' '}
                  <span className="font-mono font-bold text-[#363E49] tabular-nums">
                    {formatEuro(artwork.startingBid)}
                  </span>.
                </p>
                <p className="text-xs text-[#5D6C7B] mt-2">
                  Tip: bewaar dit kunstwerk met het hartje bovenaan zodat je het tijdens de veiling meteen terugvindt in je favorietenlijst.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vergroot beeldvenster */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-[#363E49]/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vergroot kunstwerk"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Sluit vergroting"
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-[12px] bg-white text-[#363E49] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={artwork.imageUrl}
            alt={artwork.title || artwork.artist}
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />
        </div>
      )}
    </div>
  );
}
