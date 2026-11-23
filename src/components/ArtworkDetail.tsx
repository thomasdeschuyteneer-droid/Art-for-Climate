import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  formatEuro,
  formatLotNumber,
  formatRelativeTime,
  formatTimeShort,
  getStatusLabel,
  getSuggestedMinimumBid,
  normalizeBidderNumber,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { CountdownClock } from './CountdownClock';
import { QrCodeCard } from './QrCodeCard';
import type { AppRoute } from './HeaderNav';

interface ArtworkDetailProps {
  artworkId: string;
  onNavigate: (next: AppRoute) => void;
  onOpenBidderModal: () => void;
}

export function ArtworkDetail({
  artworkId,
  onNavigate,
  onOpenBidderModal,
}: ArtworkDetailProps) {
  const {
    artworks,
    bids,
    auctionState,
    currentBidderNumber,
    onSiteVerified,
    setOnSiteVerified,
    placeBid,
  } = useAuction();
  const [zoomed, setZoomed] = useState(false);

  const artworkIndex = artworks.findIndex((a) => a.id === artworkId);
  const artwork = artworkIndex >= 0 ? artworks[artworkIndex] : null;
  const prevLot = artworkIndex > 0 ? artworks[artworkIndex - 1] : null;
  const nextLot =
    artworkIndex >= 0 && artworkIndex < artworks.length - 1
      ? artworks[artworkIndex + 1]
      : null;

  const lotBids = useMemo(
    () => bids.filter((b) => b.artworkId === artworkId),
    [bids, artworkId]
  );

  const suggestedMinimum = artwork
    ? getSuggestedMinimumBid(artwork.currentBid, artwork.startingBid, artwork.bidCount)
    : 0;

  const [bidderInput, setBidderInput] = useState<string>(currentBidderNumber ?? '');
  const [bidInput, setBidInput] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (currentBidderNumber) {
      setBidderInput(currentBidderNumber);
    }
  }, [currentBidderNumber]);

  useEffect(() => {
    if (artwork) {
      setBidInput(
        String(
          getSuggestedMinimumBid(
            artwork.currentBid,
            artwork.startingBid,
            artwork.bidCount
          )
        )
      );
    }
  }, [artwork?.id, artwork?.currentBid, artwork?.bidCount, artwork?.startingBid]);

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

  const normalizedEnteredBidder = normalizeBidderNumber(bidderInput);
  const isLeadingBidder =
    Boolean(normalizedEnteredBidder) &&
    artwork.highestBidderNumber === normalizedEnteredBidder;
  const isAuctionOpen =
    artwork.status === 'live' && !auctionState?.auctionClosed;

  const handleSubmitBid = async (amountToBid: number) => {
    setFeedback(null);
    const activeNumber = normalizeBidderNumber(bidderInput);
    if (!activeNumber) {
      setFeedback({
        type: 'error',
        message: 'Vul je biedernummer in (bv. #027) of schrijf je eerst in.',
      });
      return;
    }

    if (!Number.isFinite(amountToBid) || !Number.isInteger(amountToBid)) {
      setFeedback({
        type: 'error',
        message: 'Geef een geldig geheel bedrag in euro in.',
      });
      return;
    }

    if (amountToBid <= artwork.currentBid) {
      setFeedback({
        type: 'error',
        message: `Je bod moet strikt hoger zijn dan het huidige hoogste bod van ${formatEuro(artwork.currentBid)}.`,
      });
      return;
    }

    if (artwork.bidCount === 0 && amountToBid < artwork.startingBid) {
      setFeedback({
        type: 'error',
        message: `Het openingsbod bedraagt minstens ${formatEuro(artwork.startingBid)}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await placeBid({
        artworkId: artwork.id,
        bidderNumber: activeNumber,
        amount: amountToBid,
      });
      setFeedback({
        type: 'success',
        message: `Bod van ${formatEuro(amountToBid)} geregistreerd voor bieder ${activeNumber}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Bod kon niet worden verwerkt.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmitBid(Number(bidInput));
  };

  const baseForQuickIncrements =
    artwork.currentBid > 0 ? artwork.currentBid : artwork.startingBid;
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

        {/* Rechterkolom: Kunstwerkgegevens & Biedformulier */}
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
              <dt className="text-[#5D6C7B] font-semibold">Startbod</dt>
              <dd className="col-span-2 font-mono text-xs font-bold text-[#363E49] tabular-nums self-center">
                {formatEuro(artwork.startingBid)}
              </dd>
            </div>
          </dl>

          {/* Huidig hoogste bod & Aftelklok */}
          <div className="bg-[#DEE9EC]/60 border border-[#DEE9EC] rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  {artwork.currentBid > 0 ? 'Huidig hoogste bod' : 'Openingsbod (minimum)'}
                </p>
                <p className="font-mono text-3xl sm:text-4xl font-bold text-[#19706D] tabular-nums mt-1">
                  {artwork.currentBid > 0
                    ? formatEuro(artwork.currentBid)
                    : formatEuro(artwork.startingBid)}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Hoogste bieder
                </p>
                {artwork.highestBidderNumber ? (
                  <p className="font-mono text-2xl font-bold text-[#1E5941] tabular-nums mt-1">
                    {artwork.highestBidderNumber}
                  </p>
                ) : (
                  <p className="font-mono text-sm text-[#5D6C7B] mt-2">
                    Nog geen biedingen
                  </p>
                )}
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

            {isLeadingBidder && (
              <p className="text-xs font-bold text-[#1E5941]">
                Jouw biednummer {normalizedEnteredBidder} staat momenteel bovenaan.
              </p>
            )}
          </div>

          {/* Biedformulier: Biednummer + Bedrag + Bod uitbrengen */}
          {isAuctionOpen ? (
            <div className="border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 bg-white space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#19706D]">
                    Bod uitbrengen
                  </h2>
                  <p className="text-xs text-[#5D6C7B] mt-0.5">
                    Enkel ter plekke in M Leuven · Minimaal:{' '}
                    <span className="font-mono font-bold text-[#363E49] tabular-nums">
                      {formatEuro(
                        artwork.bidCount > 0
                          ? artwork.currentBid + 1
                          : artwork.startingBid
                      )}
                    </span>
                  </p>
                </div>

                {!currentBidderNumber && (
                  <button
                    type="button"
                    onClick={onOpenBidderModal}
                    className="min-h-[38px] px-4 py-1.5 rounded-[10px] text-xs font-bold bg-[#F0F3E1] text-[#1E5941] border border-[#B4C232]/50 hover:bg-[#DEE9EC] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Nog geen nummer? Schrijf je in
                  </button>
                )}
              </div>

              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold text-[#363E49] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onSiteVerified}
                  onChange={(e) => setOnSiteVerified(e.target.checked)}
                  className="w-4 h-4 accent-[#19706D] shrink-0"
                />
                <span>
                  Ik ben ter plekke aanwezig in M Leuven om deel te nemen aan de veiling.
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {[50, 100, 250].map((inc) => {
                  const targetAmount =
                    artwork.currentBid > 0
                      ? baseForQuickIncrements + inc
                      : artwork.startingBid + (inc === 50 ? 0 : inc);
                  return (
                    <button
                      key={inc}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setBidInput(String(targetAmount));
                        void handleSubmitBid(targetAmount);
                      }}
                      className="min-h-[48px] px-2 py-2 rounded-[12px] border border-[#E5E5E5] hover:border-[#19706D] hover:bg-[#F0F3E1] text-center transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="block text-[11px] text-[#5D6C7B]">
                        {artwork.currentBid > 0
                          ? `+€ ${inc}`
                          : inc === 50
                            ? 'Startbod'
                            : `+€ ${inc}`}
                      </span>
                      <span className="block font-mono text-sm font-bold text-[#363E49] tabular-nums">
                        {formatEuro(targetAmount)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bidder-number-input"
                      className="block text-xs font-bold text-[#363E49] mb-1.5"
                    >
                      Biednummer
                    </label>
                    <input
                      id="bidder-number-input"
                      type="text"
                      required
                      value={bidderInput}
                      onChange={(e) => setBidderInput(e.target.value)}
                      placeholder="bv. #027"
                      className="w-full min-h-[48px] px-3.5 py-2 rounded-[12px] font-mono text-base font-bold border border-[#E5E5E5] bg-white text-[#363E49] tabular-nums focus:outline-none focus:border-[#19706D]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bid-amount-input"
                      className="block text-xs font-bold text-[#363E49] mb-1.5"
                    >
                      Bedrag (€)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#5D6C7B]">
                        €
                      </span>
                      <input
                        id="bid-amount-input"
                        type="number"
                        required
                        min={
                          artwork.bidCount > 0
                            ? artwork.currentBid + 1
                            : artwork.startingBid
                        }
                        step={1}
                        value={bidInput}
                        onChange={(e) => setBidInput(e.target.value)}
                        className="w-full min-h-[48px] pl-8 pr-4 py-2 rounded-[12px] font-mono text-base font-bold border border-[#E5E5E5] bg-white text-[#363E49] tabular-nums focus:outline-none focus:border-[#19706D]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] px-7 py-3 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-sm font-bold tracking-wide transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Bod wordt verwerkt...' : 'Bod uitbrengen'}
                </button>
              </form>

              {feedback && (
                <div
                  role="status"
                  className={`p-3.5 rounded-xl text-xs font-semibold border ${
                    feedback.type === 'success'
                      ? 'bg-[#F0F3E1] border-[#B4C232]/60 text-[#1E5941]'
                      : 'bg-[#923636]/10 border-[#923636]/30 text-[#923636]'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5">
              <p className="text-sm font-semibold text-[#363E49]">
                {auctionState?.auctionClosed
                  ? 'De veiling werd afgesloten door de veilingmeester.'
                  : artwork.status === 'sold'
                    ? `Lot ${artwork.lotNumber} werd toegewezen aan bieder ${artwork.highestBidderNumber ?? '—'} voor ${formatEuro(artwork.currentBid)}.`
                    : artwork.status === 'upcoming'
                      ? `Biedingen openen zodra de veilingmeester dit werk oproept (startbod ${formatEuro(suggestedMinimum)}).`
                      : `Lot ${artwork.lotNumber} werd afgesloten.`}
              </p>
            </div>
          )}

          {/* Biedgeschiedenis — enkel biednummers, geen namen */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#5D6C7B]">
                Biedgeschiedenis
              </h2>
              <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                {lotBids.length} {lotBids.length === 1 ? 'bod' : 'biedingen'}
              </span>
            </div>

            {lotBids.length === 0 ? (
              <p className="text-sm text-[#5D6C7B] py-6">
                Er werd nog geen bod uitgebracht op dit kunstwerk.
              </p>
            ) : (
              <div className="divide-y divide-[#E5E5E5]">
                {lotBids.map((bid, idx) => (
                  <div
                    key={bid.id}
                    className="py-3 flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          idx === 0 ? 'text-[#1E5941]' : 'text-[#363E49]'
                        }`}
                      >
                        {bid.bidderNumber}
                      </span>
                      <span className="text-xs text-[#5D6C7B] truncate">
                        {bid.source === 'floor' ? 'Zaalbod M Leuven' : 'Ter plekke via QR'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-xs text-[#5D6C7B] tabular-nums hidden sm:inline">
                        {formatTimeShort(bid.createdAt)}
                      </span>
                      <span className="font-mono text-xs text-[#5D6C7B] tabular-nums sm:hidden">
                        {formatRelativeTime(bid.createdAt)}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          idx === 0 ? 'text-[#1E5941]' : 'text-[#363E49]'
                        }`}
                      >
                        {formatEuro(bid.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
