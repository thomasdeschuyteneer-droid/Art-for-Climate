import { useMemo, useState } from 'react';
import { ArrowRight, Info, QrCode, X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  formatEuro,
  formatLotNumber,
  getHammerStageLabel,
  getStatusLabel,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { CountdownClock } from './CountdownClock';
import { FavoriteButton } from './FavoriteButton';
import { QrCodeCard } from './QrCodeCard';
import type { AppRoute } from './HeaderNav';

interface LiveRoomProps {
  onNavigate: (next: AppRoute) => void;
}

export function LiveRoom({ onNavigate }: LiveRoomProps) {
  const { artworks, auctionState } = useAuction();
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const activeLot = useMemo(() => {
    return (
      artworks.find((a) => a.id === auctionState?.activeLotId) ??
      artworks.find((a) => a.status === 'live') ??
      artworks[0] ??
      null
    );
  }, [artworks, auctionState]);

  if (!activeLot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-3xl font-bold text-[#19706D]">
          Live veilingzaal
        </p>
        <p className="text-sm text-[#5D6C7B] mt-2">
          Er zijn momenteel geen loten in de catalogus geladen.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-16">
      {/* Aankondigingsstrook M Leuven */}
      <section className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
            M Leuven · Live veiling · 16 december 2026
          </div>
          {auctionState?.announcement && (
            <p className="text-xs sm:text-sm text-[#363E49] max-w-2xl">
              {auctionState.announcement}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Actueel kunstwerk op de veilingvloer */}
          <div className="lg:col-span-7 border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-widest text-[#19706D] font-bold">
                  {formatLotNumber(activeLot.lotNumber)} ·{' '}
                  {auctionState
                    ? getHammerStageLabel(auctionState.hammerStage)
                    : getStatusLabel(activeLot.status)}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#363E49] mt-1">
                  {activeLot.title || activeLot.artist}
                </h1>
                <p className="text-sm text-[#5D6C7B] mt-0.5">
                  {activeLot.title ? `${activeLot.artist} · ${activeLot.medium}` : activeLot.medium}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FavoriteButton artworkId={activeLot.id} lotNumber={activeLot.lotNumber} />
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  aria-label={`Toon QR-code voor Lot ${activeLot.lotNumber}`}
                  className="min-h-[40px] min-w-[40px] rounded-[10px] border border-[#E5E5E5] text-[#5D6C7B] hover:text-[#19706D] hover:border-[#19706D] inline-flex items-center justify-center cursor-pointer shrink-0"
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({ view: 'artwork', artworkId: activeLot.id })
                  }
                  className="min-h-[40px] px-4 py-2 rounded-[10px] border border-[#E5E5E5] text-xs font-bold text-[#363E49] hover:border-[#19706D] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Bekijk kunstwerk</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <ArtworkImageFrame
              src={activeLot.imageUrl}
              alt={activeLot.title || activeLot.artist}
              className="aspect-[16/11] w-full border-b border-[#E5E5E5]"
              imgClassName="w-full h-full object-contain p-4 sm:p-6"
            />

            <div className="p-5 sm:p-6 bg-[#DEE9EC]/50 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Startprijs
                </p>
                <p className="font-mono text-3xl font-bold text-[#19706D] tabular-nums mt-1">
                  {formatEuro(activeLot.startingBid)}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Zaal
                </p>
                <p className="text-lg font-bold text-[#1E5941] mt-1">
                  {activeLot.galleryRoom}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B] mb-1">
                  Resterende tijd
                </p>
                <div className="sm:flex sm:justify-end">
                  <CountdownClock auctionState={auctionState} compact />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-[#E5E5E5] bg-white">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#DEE9EC] text-[#19706D] flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm text-[#363E49] leading-relaxed">
                  Bieden gebeurt uitsluitend live in de zaal in M Leuven op 16 december — online of rechtstreeks bieden via deze website is uitgeschakeld.
                </p>
              </div>
            </div>
          </div>

          {/* Live zaalveiling spelregels & Catalogusvolgorde */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6 space-y-3">
              <h2 className="font-display text-xl font-bold text-[#19706D] border-b border-[#E5E5E5] pb-3">
                Live zaalveiling · Spelregels
              </h2>
              <ul className="text-sm text-[#363E49] space-y-2.5 leading-relaxed">
                <li>
                  <span className="font-bold text-[#19706D]">1.</span> Alle werken worden op 16 december vanaf 16:00 live geveild in M Leuven.
                </li>
                <li>
                  <span className="font-bold text-[#19706D]">2.</span> Elk werk vermeldt enkel zijn <span className="font-semibold">startprijs</span>; online of rechtstreeks bieden is niet mogelijk.
                </li>
                <li>
                  <span className="font-bold text-[#19706D]">3.</span> Bewaar je favoriete werken met het hartje zodat je ze tijdens de zaalveiling snel bij de hand hebt.
                </li>
              </ul>
            </div>

            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-[#19706D] pb-3 border-b border-[#E5E5E5]">
                Catalogus in de veilingzaal
              </h2>
              <div className="divide-y divide-[#E5E5E5] max-h-[420px] overflow-y-auto mt-1">
                {artworks.map((lot) => {
                  const isSpotlit = lot.id === activeLot.id;
                  return (
                    <div
                      key={lot.id}
                      onClick={() =>
                        onNavigate({ view: 'artwork', artworkId: lot.id })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate({ view: 'artwork', artworkId: lot.id });
                        }
                      }}
                      className={`w-full py-3 px-2.5 text-left rounded-xl flex items-center justify-between gap-3 hover:bg-[#F7F7F7] transition-colors cursor-pointer ${
                        isSpotlit ? 'bg-[#F0F3E1]' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-[#5D6C7B] tabular-nums">
                          {formatLotNumber(lot.lotNumber)} · {getStatusLabel(lot.status)}
                        </p>
                        <p className="text-sm font-bold text-[#363E49] truncate">
                          {lot.title || lot.artist}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-[#5D6C7B]">
                            Startprijs
                          </p>
                          <p className="font-mono text-sm font-bold text-[#19706D] tabular-nums">
                            {formatEuro(lot.startingBid)}
                          </p>
                        </div>
                        <FavoriteButton artworkId={lot.id} lotNumber={lot.lotNumber} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#363E49]/40 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR-code van het actieve lot"
        >
          <div className="w-full max-w-md bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                QR-code voor M Leuven
              </span>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                aria-label="Sluit QR-venster"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5D6C7B] hover:text-[#363E49] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <QrCodeCard artwork={activeLot} />
          </div>
        </div>
      )}
    </div>
  );
}
