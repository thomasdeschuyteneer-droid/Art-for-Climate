import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  formatEuro,
  formatLotNumber,
  formatTimeShort,
  getHammerStageLabel,
  getStatusLabel,
  normalizeBidderNumber,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { CountdownClock } from './CountdownClock';
import type { AppRoute } from './HeaderNav';

interface LiveRoomProps {
  onNavigate: (next: AppRoute) => void;
  onOpenBidderModal: () => void;
}

export function LiveRoom({ onNavigate, onOpenBidderModal }: LiveRoomProps) {
  const {
    artworks,
    bids,
    auctionState,
    currentBidderNumber,
    onSiteVerified,
    setOnSiteVerified,
    placeBid,
  } = useAuction();
  const [bidderInput, setBidderInput] = useState(currentBidderNumber ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentBidderNumber) {
      setBidderInput(currentBidderNumber);
    }
  }, [currentBidderNumber]);

  const activeLot = useMemo(() => {
    return (
      artworks.find((a) => a.id === auctionState?.activeLotId) ??
      artworks.find((a) => a.status === 'live') ??
      artworks[0] ??
      null
    );
  }, [artworks, auctionState]);

  const activeLotBids = useMemo(() => {
    if (!activeLot) return [];
    return bids.filter((b) => b.artworkId === activeLot.id).slice(0, 10);
  }, [bids, activeLot]);

  const handleQuickBid = async (targetAmount: number) => {
    if (!activeLot) return;
    const normalized = normalizeBidderNumber(bidderInput);
    if (!normalized) {
      onOpenBidderModal();
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await placeBid({
        artworkId: activeLot.id,
        bidderNumber: normalized,
        amount: targetAmount,
      });
      setFeedback({
        type: 'success',
        text: `Bod van ${formatEuro(targetAmount)} geregistreerd voor bieder ${normalized}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bod werd geweigerd',
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  const isAuctionOpen =
    activeLot.status === 'live' && !auctionState?.auctionClosed;

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

            <ArtworkImageFrame
              src={activeLot.imageUrl}
              alt={activeLot.title || activeLot.artist}
              className="aspect-[16/11] w-full border-b border-[#E5E5E5]"
              imgClassName="w-full h-full object-contain p-4 sm:p-6"
            />

            <div className="p-5 sm:p-6 bg-[#DEE9EC]/50 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  {activeLot.currentBid > 0 ? 'Hoogste bod' : 'Startbod'}
                </p>
                <p className="font-mono text-3xl font-bold text-[#19706D] tabular-nums mt-1">
                  {activeLot.currentBid > 0
                    ? formatEuro(activeLot.currentBid)
                    : formatEuro(activeLot.startingBid)}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Hoogste bieder
                </p>
                <p className="font-mono text-2xl font-bold text-[#1E5941] tabular-nums mt-1">
                  {activeLot.highestBidderNumber ?? '—'}
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

            {isAuctionOpen ? (
              <div className="p-5 sm:p-6 border-t border-[#E5E5E5] bg-white space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <label htmlFor="live-bidder-input" className="text-xs font-bold text-[#363E49]">
                      Biednummer:
                    </label>
                    <input
                      id="live-bidder-input"
                      type="text"
                      value={bidderInput}
                      onChange={(e) => setBidderInput(e.target.value)}
                      placeholder="#027"
                      className="w-28 min-h-[38px] px-3 py-1 rounded-[10px] border border-[#E5E5E5] font-mono text-sm font-bold text-[#363E49] focus:outline-none focus:border-[#19706D]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onOpenBidderModal}
                    className="text-xs font-bold text-[#19706D] underline cursor-pointer"
                  >
                    {currentBidderNumber ? 'Wijzig biednummer' : 'Schrijf je in'}
                  </button>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold text-[#363E49] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onSiteVerified}
                    onChange={(e) => setOnSiteVerified(e.target.checked)}
                    className="w-4 h-4 accent-[#19706D] shrink-0"
                  />
                  <span>
                    Enkel ter plekke: ik bevestig dat ik aanwezig ben in M Leuven.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[50, 100, 250].map((inc) => {
                    const amount =
                      activeLot.currentBid > 0
                        ? activeLot.currentBid + inc
                        : activeLot.startingBid + (inc === 50 ? 0 : inc);
                    return (
                      <button
                        key={inc}
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleQuickBid(amount)}
                        className="min-h-[48px] px-4 py-2.5 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Bod uitbrengen ·{' '}
                        <span className="font-mono tabular-nums">{formatEuro(amount)}</span>
                      </button>
                    );
                  })}
                </div>

                {feedback && (
                  <p
                    className={`p-3 rounded-xl text-xs font-semibold border ${
                      feedback.type === 'success'
                        ? 'bg-[#F0F3E1] border-[#B4C232]/60 text-[#1E5941]'
                        : 'bg-[#923636]/10 border-[#923636]/30 text-[#923636]'
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 sm:p-6 border-t border-[#E5E5E5] bg-[#F7F7F7]">
                <p className="text-sm font-semibold text-[#363E49]">
                  {auctionState?.auctionClosed
                    ? 'De veiling werd gesloten door de veilingmeester.'
                    : `Dit werk (${formatLotNumber(activeLot.lotNumber)}) is momenteel gesloten voor biedingen.`}
                </p>
              </div>
            )}
          </div>

          {/* Live biedingen (enkel biednummers) & Catalogusvolgorde */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <h2 className="font-display text-xl font-bold text-[#19706D]">
                  Biedgeschiedenis
                </h2>
                <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                  {activeLotBids.length} op dit lot
                </span>
              </div>

              {activeLotBids.length === 0 ? (
                <p className="text-sm text-[#5D6C7B] py-8 text-center">
                  Wachten op het eerste bod voor {formatLotNumber(activeLot.lotNumber)}.
                </p>
              ) : (
                <div className="divide-y divide-[#E5E5E5] mt-2">
                  {activeLotBids.map((bid, idx) => (
                    <div
                      key={bid.id}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            idx === 0 ? 'text-[#1E5941]' : 'text-[#363E49]'
                          }`}
                        >
                          {bid.bidderNumber}
                        </span>
                        <span className="text-xs text-[#5D6C7B]">
                          {bid.source === 'floor' ? 'Zaalbod' : 'QR-sokkel'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                          {formatTimeShort(bid.createdAt)}
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

            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-[#19706D] pb-3 border-b border-[#E5E5E5]">
                Catalogus in de veilingzaal
              </h2>
              <div className="divide-y divide-[#E5E5E5] max-h-[420px] overflow-y-auto mt-1">
                {artworks.map((lot) => {
                  const isSpotlit = lot.id === activeLot.id;
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() =>
                        onNavigate({ view: 'artwork', artworkId: lot.id })
                      }
                      className={`w-full py-3 px-2.5 text-left rounded-xl flex items-center justify-between gap-3 hover:bg-[#F7F7F7] transition-colors cursor-pointer ${
                        isSpotlit ? 'bg-[#F0F3E1]' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-[#5D6C7B] tabular-nums">
                          {formatLotNumber(lot.lotNumber)} · {getStatusLabel(lot.status)}
                        </p>
                        <p className="text-sm font-bold text-[#363E49] truncate">
                          {lot.title || lot.artist}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-bold text-[#19706D] tabular-nums">
                          {lot.currentBid > 0
                            ? formatEuro(lot.currentBid)
                            : formatEuro(lot.startingBid)}
                        </p>
                        {lot.highestBidderNumber && (
                          <p className="font-mono text-[11px] font-bold text-[#1E5941] tabular-nums">
                            {lot.highestBidderNumber}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
