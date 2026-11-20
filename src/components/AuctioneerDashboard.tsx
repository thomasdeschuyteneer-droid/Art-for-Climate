import React, { useEffect, useMemo, useState } from 'react';
import { Gavel, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { HammerStage, LotStatus } from '../types/auction';
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

export function AuctioneerDashboard() {
  const {
    artworks,
    bids,
    bidders,
    auctionState,
    placeBid,
    updateArtwork,
    updateAuctionState,
  } = useAuction();

  const activeLot = useMemo(() => {
    return (
      artworks.find((a) => a.id === auctionState?.activeLotId) ??
      artworks[0] ??
      null
    );
  }, [artworks, auctionState]);

  const [floorPaddle, setFloorPaddle] = useState<string>('#001');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [announcementInput, setAnnouncementInput] = useState<string>(
    auctionState?.announcement ?? ''
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auctionState?.announcement !== undefined) {
      setAnnouncementInput(auctionState.announcement);
    }
  }, [auctionState?.announcement]);

  useEffect(() => {
    if (activeLot) {
      const next =
        activeLot.currentBid > 0
          ? activeLot.currentBid + 100
          : activeLot.startingBid;
      setCustomAmount(String(next));
    }
  }, [activeLot?.id, activeLot?.currentBid, activeLot?.startingBid]);

  const handleFloorBid = async (amount: number) => {
    if (!activeLot) return;
    const normalized = normalizeBidderNumber(floorPaddle);
    if (!normalized) {
      setFeedback({
        type: 'error',
        text: 'Vul een geldig biednummer in (bv. #027).',
      });
      return;
    }

    setFeedback(null);
    setBusy(true);
    try {
      await placeBid({
        artworkId: activeLot.id,
        amount,
        bidderNumber: normalized,
        source: 'floor',
      });
      setFeedback({
        type: 'success',
        text: `Zaalbod van ${formatEuro(amount)} geregistreerd voor bieder ${normalized}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Zaalbod kon niet worden geregistreerd.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSetActiveLot = async (lotId: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await updateAuctionState({
        activeLotId: lotId,
        hammerStage: 'open',
        auctionClosed: false,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Wisselen van kunstwerk mislukt.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleHammerStage = async (stage: HammerStage) => {
    if (!activeLot) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (stage === 'hammer_down') {
        const nextStatus: LotStatus =
          activeLot.currentBid > 0 ? 'sold' : 'passed';
        await updateArtwork(activeLot.id, { status: nextStatus });
      } else if (activeLot.status !== 'live') {
        await updateArtwork(activeLot.id, { status: 'live' });
      }
      await updateAuctionState({ hammerStage: stage });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Hamerstatus bijwerken mislukt.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCloseAuction = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const nextClosed = !auctionState?.auctionClosed;
      await updateAuctionState({ auctionClosed: nextClosed });
      setFeedback({
        type: 'success',
        text: nextClosed
          ? 'De veiling werd gesloten. Alle schermen zijn bijgewerkt.'
          : 'De veiling werd opnieuw geopend.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Veiling sluiten mislukt.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTimerAction = async (timerAction: 'start' | 'pause' | 'reset' | 'add_60') => {
    setBusy(true);
    try {
      await updateAuctionState({ timerAction });
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (lotId: string, status: LotStatus) => {
    setBusy(true);
    try {
      await updateArtwork(lotId, { status });
    } finally {
      setBusy(false);
    }
  };

  const handleAnnouncementSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateAuctionState({ announcement: announcementInput });
      setFeedback({
        type: 'success',
        text: 'Zaalmelding live bijgewerkt op alle schermen.',
      });
    } finally {
      setBusy(false);
    }
  };

  const totalHammerValue = useMemo(
    () => artworks.reduce((sum, a) => sum + (a.currentBid > 0 ? a.currentBid : 0), 0),
    [artworks]
  );

  const isTimerRunning = Boolean(auctionState?.lotTimerEndsAt && !auctionState?.auctionClosed);

  return (
    <div className="pb-24 md:pb-16">
      {/* Leuven 2030 Veilingmeester-hoofding */}
      <section className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#19706D] font-bold">
              M Leuven · Regie Veilingmeester
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
              Veilingmeester
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#5D6C7B]">
                  Totale opbrengst
                </p>
                <p className="font-mono text-xl font-bold text-[#1E5941] tabular-nums mt-0.5">
                  {formatEuro(totalHammerValue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#5D6C7B]">
                  Huidig werk
                </p>
                <p className="font-mono text-xl font-bold text-[#363E49] tabular-nums mt-0.5">
                  {activeLot ? formatLotNumber(activeLot.lotNumber) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#5D6C7B]">
                  Bieders
                </p>
                <p className="font-mono text-xl font-bold text-[#363E49] tabular-nums mt-0.5">
                  {bidders.length}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCloseAuction()}
              className={`min-h-[46px] px-6 py-2.5 rounded-[12px] text-xs font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                auctionState?.auctionClosed
                  ? 'bg-[#1E5941] text-white hover:bg-[#19706D]'
                  : 'bg-[#923636] text-white hover:opacity-90'
              }`}
            >
              {auctionState?.auctionClosed ? 'Veiling heropenen' : 'Veiling sluiten'}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {activeLot && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Linkerkolom: Huidig kunstwerk, aftelklok & zaalbod */}
            <div className="lg:col-span-7 border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start border-b border-[#E5E5E5] pb-5">
                <ArtworkImageFrame
                  src={activeLot.imageUrl}
                  alt={activeLot.title}
                  className="w-full sm:w-32 aspect-[4/3] sm:aspect-square shrink-0 rounded-xl border border-[#E5E5E5]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-widest text-[#19706D] font-bold tabular-nums">
                      {formatLotNumber(activeLot.lotNumber)} · {getStatusLabel(activeLot.status)}
                    </p>
                    <span className="font-mono text-xs text-[#5D6C7B]">
                      {auctionState ? getHammerStageLabel(auctionState.hammerStage) : 'Open'}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#363E49] mt-1">
                    {activeLot.title}
                  </h2>
                  <p className="text-sm text-[#5D6C7B] mt-0.5">{activeLot.artist}</p>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-[#E5E5E5]">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                        Hoogste bod
                      </p>
                      <p className="font-mono text-2xl font-bold text-[#19706D] tabular-nums">
                        {activeLot.currentBid > 0
                          ? formatEuro(activeLot.currentBid)
                          : 'Geen bod'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                        Hoogste bieder
                      </p>
                      <p className="font-mono text-2xl font-bold text-[#1E5941] tabular-nums">
                        {activeLot.highestBidderNumber ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                        Startbod
                      </p>
                      <p className="font-mono text-lg font-bold text-[#5D6C7B] tabular-nums mt-0.5">
                        {formatEuro(activeLot.startingBid)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resterende tijd (Aftelklok) */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#DEE9EC]/60 border border-[#DEE9EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CountdownClock auctionState={auctionState} />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || auctionState?.auctionClosed}
                    onClick={() =>
                      void handleTimerAction(isTimerRunning ? 'pause' : 'start')
                    }
                    className="min-h-[40px] px-3.5 py-2 rounded-[10px] bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pauzeer</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Start klok</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy || auctionState?.auctionClosed}
                    onClick={() => void handleTimerAction('add_60')}
                    className="min-h-[40px] px-3 py-2 rounded-[10px] bg-white border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D] text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>1 min</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || auctionState?.auctionClosed}
                    onClick={() => void handleTimerAction('reset')}
                    className="min-h-[40px] px-3 py-2 rounded-[10px] bg-white border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D] text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Hamerbediening per lot */}
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-[#5D6C7B] mb-3">
                  Hamerbediening voor dit kunstwerk
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      { id: 'open', label: 'Biedingen open' },
                      { id: 'going_once', label: 'Eénmaal' },
                      { id: 'going_twice', label: 'Andermaal' },
                      { id: 'hammer_down', label: 'Toegewezen' },
                    ] as const
                  ).map((stage) => {
                    const active = auctionState?.hammerStage === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleHammerStage(stage.id)}
                        className={`min-h-[44px] px-3 py-2 rounded-[10px] text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                          stage.id === 'hammer_down'
                            ? active
                              ? 'bg-[#1E5941] text-white border-[#1E5941]'
                              : 'border-[#1E5941] text-[#1E5941] hover:bg-[#F0F3E1]'
                            : active
                              ? 'bg-[#19706D] text-white border-[#19706D]'
                              : 'border-[#E5E5E5] text-[#363E49] hover:border-[#19706D]'
                        }`}
                      >
                        {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zaalbod registreren (enkel biednummer, geen namen) */}
              <div className="p-5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-[#19706D]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-[#363E49]">
                      Bod uit de zaal registreren
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="floor-paddle-input" className="text-xs font-semibold text-[#5D6C7B]">
                      Biednummer:
                    </label>
                    <input
                      id="floor-paddle-input"
                      type="text"
                      value={floorPaddle}
                      onChange={(e) => setFloorPaddle(e.target.value)}
                      placeholder="#027"
                      className="w-28 min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-mono font-bold border border-[#E5E5E5] bg-white text-[#363E49]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map((inc) => {
                    const targetAmount =
                      activeLot.currentBid > 0
                        ? activeLot.currentBid + inc
                        : activeLot.startingBid + (inc === 50 ? 0 : inc);
                    return (
                      <button
                        key={inc}
                        type="button"
                        disabled={busy || activeLot.status !== 'live' || auctionState?.auctionClosed}
                        onClick={() => void handleFloorBid(targetAmount)}
                        className="min-h-[44px] px-3 py-2 rounded-[10px] bg-white border border-[#E5E5E5] hover:border-[#19706D] hover:bg-[#F0F3E1] text-xs font-semibold text-[#363E49] disabled:opacity-40 cursor-pointer"
                      >
                        <span className="block text-[11px] text-[#5D6C7B]">
                          {activeLot.currentBid > 0 ? `+€ ${inc}` : inc === 50 ? 'Startbod' : `+€ ${inc}`}
                        </span>
                        <span className="font-mono font-bold tabular-nums">
                          {formatEuro(targetAmount)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleFloorBid(Number(customAmount));
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={activeLot.status !== 'live' || auctionState?.auctionClosed}
                    aria-label="Aangepast zaalbod in euro"
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-[10px] font-mono text-sm font-bold border border-[#E5E5E5] bg-white text-[#363E49] tabular-nums"
                  />
                  <button
                    type="submit"
                    disabled={busy || activeLot.status !== 'live' || auctionState?.auctionClosed}
                    className="min-h-[44px] px-5 py-2 rounded-[10px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold tracking-wide disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Bod uitbrengen ({normalizeBidderNumber(floorPaddle) ?? '#...'})
                  </button>
                </form>

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

              {/* Zaalmelding */}
              <form onSubmit={handleAnnouncementSave} className="space-y-2 pt-2 border-t border-[#E5E5E5]">
                <label
                  htmlFor="rostrum-announcement"
                  className="block text-xs uppercase tracking-widest font-bold text-[#5D6C7B]"
                >
                  Melding op de live pagina
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="rostrum-announcement"
                    type="text"
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-[10px] text-sm border border-[#E5E5E5] bg-white text-[#363E49]"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#19706D] text-white text-xs font-bold hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Bijwerken
                  </button>
                </div>
              </form>
            </div>

            {/* Rechterkolom: Binnenkomende biedingen (enkel biednummers) */}
            <div className="lg:col-span-5 border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <h2 className="font-display text-xl font-bold text-[#19706D]">
                  Biedgeschiedenis in de zaal
                </h2>
                <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                  {bids.length} totaal
                </span>
              </div>

              {bids.length === 0 ? (
                <p className="text-sm text-[#5D6C7B] py-10 text-center">
                  Nog geen biedingen ontvangen tijdens deze sessie.
                </p>
              ) : (
                <div className="divide-y divide-[#E5E5E5] max-h-[600px] overflow-y-auto mt-1">
                  {bids.map((bid) => (
                    <div
                      key={bid.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                          {formatLotNumber(bid.lotNumber)} ·{' '}
                          <span className="font-bold text-[#1E5941]">
                            {bid.bidderNumber}
                          </span>{' '}
                          ({bid.source === 'floor' ? 'zaal' : 'QR'})
                        </p>
                        <p className="text-sm font-bold text-[#363E49] truncate">
                          {bid.artworkTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-bold text-[#19706D] tabular-nums">
                          {formatEuro(bid.amount)}
                        </p>
                        <p className="font-mono text-[11px] text-[#5D6C7B] tabular-nums">
                          {formatTimeShort(bid.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lotenwachtrij */}
        <div className="border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E5E5E5]">
            <h2 className="font-display text-2xl font-bold text-[#19706D]">
              Alle kunstwerken uit de catalogus ({artworks.length})
            </h2>
            <p className="text-xs text-[#5D6C7B] mt-0.5">
              Selecteer welk kunstwerk momenteel op de live projectie in M Leuven staat.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] text-xs uppercase tracking-wider text-[#5D6C7B]">
                  <th className="py-3 px-4 font-bold">Lot</th>
                  <th className="py-3 px-4 font-bold">Kunstwerk</th>
                  <th className="py-3 px-4 font-bold">Hoogste bod</th>
                  <th className="py-3 px-4 font-bold">Hoogste bieder</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Live zaal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {artworks.map((lot) => {
                  const isSpotlit = activeLot?.id === lot.id;
                  return (
                    <tr
                      key={lot.id}
                      className={isSpotlit ? 'bg-[#F0F3E1]' : 'hover:bg-[#F7F7F7]'}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#19706D] tabular-nums whitespace-nowrap">
                        {formatLotNumber(lot.lotNumber)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#363E49]">{lot.title}</p>
                        <p className="text-xs text-[#5D6C7B]">{lot.artist}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#363E49] tabular-nums whitespace-nowrap">
                        {lot.currentBid > 0
                          ? formatEuro(lot.currentBid)
                          : `${formatEuro(lot.startingBid)} (start)`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#1E5941] tabular-nums whitespace-nowrap">
                        {lot.highestBidderNumber ?? '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Status voor Lot ${lot.lotNumber}`}
                          value={lot.status}
                          onChange={(e) =>
                            void handleStatusChange(lot.id, e.target.value as LotStatus)
                          }
                          className="min-h-[36px] px-2.5 py-1 rounded-[8px] text-xs border border-[#E5E5E5] bg-white text-[#363E49]"
                        >
                          <option value="upcoming">Binnenkort</option>
                          <option value="live">Open voor biedingen</option>
                          <option value="sold">Toegewezen</option>
                          <option value="passed">Afgesloten</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleSetActiveLot(lot.id)}
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
                            isSpotlit
                              ? 'bg-[#19706D] text-white'
                              : 'border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D]'
                          }`}
                        >
                          {isSpotlit ? 'Nu in de zaal' : 'Oproepen'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
