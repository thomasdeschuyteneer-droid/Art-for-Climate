import { useMemo, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, Heart, Lock, MapPin, Trash2 } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  M_LEUVEN_ROOMS,
  formatEuro,
  formatLotNumber,
  getStatusLabel,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { FavoriteButton } from './FavoriteButton';
import type { AppRoute } from './HeaderNav';

interface FavoritesViewProps {
  onNavigate: (next: AppRoute) => void;
  onOpenBidderModal: () => void;
}

export function FavoritesView({ onNavigate, onOpenBidderModal }: FavoritesViewProps) {
  const {
    artworks,
    bids,
    auctionState,
    currentBidderNumber,
    favoriteIds,
    clearFavorites,
  } = useAuction();
  const [roomFilter, setRoomFilter] = useState<string>('Alle zalen');

  const isAuctionClosed = Boolean(auctionState?.auctionClosed);

  const wonLots = useMemo(() => {
    if (!currentBidderNumber) return [];
    return artworks.filter(
      (lot) =>
        lot.highestBidderNumber === currentBidderNumber &&
        (lot.status === 'sold' || isAuctionClosed)
    );
  }, [artworks, currentBidderNumber, isAuctionClosed]);

  const leadingLots = useMemo(() => {
    if (!currentBidderNumber) return [];
    return artworks.filter(
      (lot) =>
        lot.highestBidderNumber === currentBidderNumber &&
        lot.status === 'live' &&
        !isAuctionClosed
    );
  }, [artworks, currentBidderNumber, isAuctionClosed]);

  const outbidItems = useMemo(() => {
    if (!currentBidderNumber) return [];
    const myBestByArtwork = new Map<string, number>();
    for (const b of bids) {
      if (b.bidderNumber === currentBidderNumber) {
        const prev = myBestByArtwork.get(b.artworkId) ?? 0;
        if (b.amount > prev) myBestByArtwork.set(b.artworkId, b.amount);
      }
    }
    return artworks
      .filter(
        (lot) =>
          myBestByArtwork.has(lot.id) &&
          lot.highestBidderNumber !== currentBidderNumber
      )
      .map((lot) => ({
        artwork: lot,
        myBid: myBestByArtwork.get(lot.id) ?? 0,
      }));
  }, [artworks, bids, currentBidderNumber]);

  const wonTotal = useMemo(
    () => wonLots.reduce((sum, lot) => sum + lot.currentBid, 0),
    [wonLots]
  );
  const leadingTotal = useMemo(
    () => leadingLots.reduce((sum, lot) => sum + lot.currentBid, 0),
    [leadingLots]
  );

  const favoriteArtworks = useMemo(() => {
    const idSet = new Set(favoriteIds);
    return artworks.filter((lot) => idSet.has(lot.id));
  }, [artworks, favoriteIds]);

  const visibleFavorites = useMemo(() => {
    if (roomFilter === 'Alle zalen') return favoriteArtworks;
    return favoriteArtworks.filter((lot) => lot.galleryRoom === roomFilter);
  }, [favoriteArtworks, roomFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24 md:pb-16 space-y-12">
      {/* SECTIE 1: MIJN GEKOCHTE WERKEN & HOOGSTE BIEDINGEN */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Persoonlijk biederoverzicht · M Leuven
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
              Mijn gekochte werken &amp; biedingen
            </h1>
            <p className="text-sm text-[#5D6C7B] mt-2 max-w-2xl">
              Hier zie je meteen welke kunstwerken definitief aan jouw biednummer zijn toegewezen, waar je momenteel het hoogste bod op hebt en waar je eventueel overboden werd.
            </p>
          </div>

          {currentBidderNumber ? (
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2 rounded-[12px] bg-[#F0F3E1] border border-[#B4C232]/60 text-xs font-bold text-[#1E5941]">
                Ingelogd als <span className="font-mono">{currentBidderNumber}</span>
              </div>
              <button
                type="button"
                onClick={onOpenBidderModal}
                className="min-h-[40px] px-3.5 py-2 rounded-[12px] border border-[#E5E5E5] bg-white text-xs font-bold text-[#363E49] hover:border-[#19706D] cursor-pointer"
              >
                Wijzig nummer
              </button>
            </div>
          ) : null}
        </div>

        {!currentBidderNumber ? (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#DEE9EC] text-[#19706D] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[#363E49]">
                  Meld je aan met jouw biednummer
                </h2>
                <p className="text-sm text-[#5D6C7B] mt-1 max-w-xl">
                  Log in met je persoonlijk biednummer (of schrijf je in zonder btw-nummer) om hier al jouw gekochte kunstwerken en actieve hoogste biedingen te bekijken.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenBidderModal}
              className="min-h-[44px] px-5 py-2.5 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inloggen / Inschrijven
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Samenvatting voor bieder */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-[#1E5941]/30 bg-[#F0F3E1] rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#1E5941]">
                  Gekocht / Toegewezen
                </p>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#1E5941] tabular-nums mt-1">
                  {wonLots.length} {wonLots.length === 1 ? 'werk' : 'werken'}
                </p>
                <p className="font-mono text-xs font-semibold text-[#1E5941]/80 mt-1 tabular-nums">
                  Totaal: {formatEuro(wonTotal)}
                </p>
              </div>

              <div className="border border-[#3C7F90]/30 bg-[#DEE9EC]/60 rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#19706D]">
                  Momenteel hoogste bod
                </p>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#19706D] tabular-nums mt-1">
                  {leadingLots.length} {leadingLots.length === 1 ? 'werk' : 'werken'}
                </p>
                <p className="font-mono text-xs font-semibold text-[#19706D]/80 mt-1 tabular-nums">
                  Waarde: {formatEuro(leadingTotal)}
                </p>
              </div>

              <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Gecombineerd totaal ({currentBidderNumber})
                </p>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#363E49] tabular-nums mt-1">
                  {formatEuro(wonTotal + leadingTotal)}
                </p>
                <p className="text-xs text-[#5D6C7B] mt-1">
                  Ten voordele van het Leuvens Klimaatfonds
                </p>
              </div>
            </div>

            {wonLots.length === 0 && leadingLots.length === 0 && outbidItems.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 text-center">
                <p className="font-display text-xl font-bold text-[#363E49]">
                  Nog geen biedingen uitgebracht met {currentBidderNumber}
                </p>
                <p className="text-sm text-[#5D6C7B] mt-1.5">
                  Zodra je een hoogste bod hebt of een werk aan jou is toegewezen, verschijnt het hier in je overzicht.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'gallery' })}
                  className="mt-5 min-h-[42px] px-5 py-2 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Bekijk alle kunstwerken</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Gekochte & leidende loten */}
                {(wonLots.length > 0 || leadingLots.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      ...wonLots.map((lot) => ({ lot, kind: 'won' as const })),
                      ...leadingLots.map((lot) => ({ lot, kind: 'leading' as const })),
                    ].map(({ lot, kind }) => (
                      <article
                        key={lot.id}
                        className={`flex flex-col border rounded-2xl bg-white overflow-hidden ${
                          kind === 'won'
                            ? 'border-[#1E5941]/50 shadow-xs'
                            : 'border-[#3C7F90]/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onNavigate({ view: 'artwork', artworkId: lot.id })}
                          className="aspect-[4/3] w-full overflow-hidden border-b border-[#E5E5E5] cursor-pointer group text-left bg-[#F7F7F7] relative"
                        >
                          <ArtworkImageFrame
                            src={lot.imageUrl}
                            alt={lot.title ? `${lot.title} door ${lot.artist}` : lot.artist}
                            className="w-full h-full"
                            imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                          <span
                            className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-xs ${
                              kind === 'won'
                                ? 'bg-[#1E5941] text-white'
                                : 'bg-[#19706D] text-white'
                            }`}
                          >
                            {kind === 'won' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Gekocht / Toegewezen</span>
                              </>
                            ) : (
                              <>
                                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Hoogste bieder</span>
                              </>
                            )}
                          </span>
                        </button>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono font-bold text-[#19706D] tabular-nums">
                                {formatLotNumber(lot.lotNumber)} · {lot.galleryRoom}
                              </span>
                              <FavoriteButton artworkId={lot.id} lotNumber={lot.lotNumber} />
                            </div>
                            <button
                              type="button"
                              onClick={() => onNavigate({ view: 'artwork', artworkId: lot.id })}
                              className="mt-2 block text-left cursor-pointer group"
                            >
                              <h2 className="font-display text-lg font-bold text-[#363E49] group-hover:text-[#19706D] leading-snug">
                                {lot.title || lot.artist}
                              </h2>
                            </button>
                            {lot.title && (
                              <p className="text-xs font-semibold text-[#5D6C7B] mt-0.5">
                                {lot.artist}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-[#E5E5E5] flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                                {kind === 'won' ? 'Toewijzingsprijs' : 'Jouw hoogste bod'}
                              </p>
                              <p
                                className={`font-mono text-lg font-bold tabular-nums ${
                                  kind === 'won' ? 'text-[#1E5941]' : 'text-[#19706D]'
                                }`}
                              >
                                {formatEuro(lot.currentBid)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onNavigate({ view: 'artwork', artworkId: lot.id })}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-[10px] border border-[#E5E5E5] hover:border-[#19706D] text-xs font-bold text-[#363E49] cursor-pointer"
                            >
                              {kind === 'won' ? 'Bekijk werk' : 'Volg bod'}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {/* Overboden werken */}
                {outbidItems.length > 0 && (
                  <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#923636] mb-3">
                      Overboden ({outbidItems.length})
                    </h2>
                    <div className="divide-y divide-[#E5E5E5]">
                      {outbidItems.map(({ artwork, myBid }) => (
                        <div
                          key={artwork.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-[#363E49]">
                              <span className="font-mono text-[#19706D] mr-2">
                                {formatLotNumber(artwork.lotNumber)}
                              </span>
                              {artwork.title || artwork.artist}
                            </p>
                            <p className="text-xs text-[#5D6C7B] mt-0.5">
                              Jouw bod: <span className="font-mono font-semibold">{formatEuro(myBid)}</span> · Actueel hoogste bod:{' '}
                              <span className="font-mono font-bold text-[#363E49]">
                                {formatEuro(artwork.currentBid)}
                              </span>{' '}
                              ({artwork.highestBidderNumber})
                            </p>
                          </div>
                          {artwork.status === 'live' && !isAuctionClosed && (
                            <button
                              type="button"
                              onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                              className="min-h-[38px] px-4 py-1.5 rounded-[10px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold cursor-pointer self-start sm:self-center shrink-0"
                            >
                              Bied opnieuw
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTIE 2: BEWAARDE FAVORIETEN MET HARTJE */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E5E5E5]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Jouw selectie in M Leuven · Art for Climate
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#19706D] mt-1">
              Bewaard met hartje ({favoriteArtworks.length})
            </h2>
            <p className="text-sm text-[#5D6C7B] mt-1.5 max-w-2xl">
              Bewaar kunstwerken via het hartje in de catalogus of rechtstreeks na het scannen van een QR-code in de zaal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate({ view: 'gallery' })}
              className="min-h-[42px] px-4 py-2 rounded-[12px] border border-[#E5E5E5] bg-white text-xs font-bold text-[#363E49] hover:border-[#19706D] inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Alle kunstwerken</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {favoriteArtworks.length > 0 && (
              <button
                type="button"
                onClick={clearFavorites}
                className="min-h-[42px] px-4 py-2 rounded-[12px] border border-[#E5E5E5] bg-white text-xs font-semibold text-[#5D6C7B] hover:border-[#923636] hover:text-[#923636] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Lijst wissen</span>
              </button>
            )}
          </div>
        </div>

        {favoriteArtworks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter favorieten op zaal">
              {(['Alle zalen', ...M_LEUVEN_ROOMS] as const).map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setRoomFilter(room)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    roomFilter === room
                      ? 'bg-[#3C7F90] text-white'
                      : 'bg-white border border-[#E5E5E5] text-[#5D6C7B] hover:text-[#363E49]'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate({ view: 'floorplan' })}
              className="min-h-[38px] px-3.5 py-1.5 rounded-[10px] bg-[#F0F3E1] text-[#1E5941] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#DEE9EC] transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bekijk zalen op grondplan</span>
            </button>
          </div>
        )}

        {favoriteArtworks.length === 0 ? (
          <div className="py-14 px-6 text-center bg-white border border-[#E5E5E5] rounded-2xl max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#923636]/10 text-[#923636] flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-2xl font-bold text-[#363E49]">
              Je hebt nog geen favorieten opgeslagen
            </h3>
            <p className="text-sm text-[#5D6C7B] mt-2 leading-relaxed">
              Tik op het hartje bij een kunstwerk in het overzicht of meteen nadat je een QR-code bij een werk in M Leuven hebt gescand om je persoonlijke favorietenlijst samen te stellen.
            </p>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'gallery' })}
              className="mt-6 min-h-[44px] px-6 py-2.5 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Ontdek de collectie</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : visibleFavorites.length === 0 ? (
          <div className="py-12 px-6 text-center bg-white border border-[#E5E5E5] rounded-2xl">
            <p className="font-display text-xl font-bold text-[#363E49]">
              Geen favorieten in {roomFilter}
            </p>
            <button
              type="button"
              onClick={() => setRoomFilter('Alle zalen')}
              className="mt-4 min-h-[42px] px-5 py-2 rounded-[12px] bg-[#3C7F90] text-white text-xs font-bold cursor-pointer"
            >
              Toon alle favorieten ({favoriteArtworks.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleFavorites.map((artwork) => {
              const hasBid = artwork.currentBid > 0;
              return (
                <article
                  key={artwork.id}
                  className="flex flex-col border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden transition-colors hover:border-[#19706D]"
                >
                  <button
                    type="button"
                    onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                    className="aspect-[4/3] w-full overflow-hidden border-b border-[#E5E5E5] cursor-pointer group text-left bg-[#F7F7F7]"
                  >
                    <ArtworkImageFrame
                      src={artwork.imageUrl}
                      alt={artwork.title ? `${artwork.title} door ${artwork.artist}` : artwork.artist}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </button>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-[#5D6C7B] font-mono tabular-nums min-w-0">
                          <span className="font-bold text-[#19706D] shrink-0">
                            {formatLotNumber(artwork.lotNumber)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{artwork.galleryRoom}</span>
                        </div>
                        <FavoriteButton artworkId={artwork.id} lotNumber={artwork.lotNumber} />
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                        className="mt-2 block text-left cursor-pointer group"
                      >
                        <h3 className="font-display text-xl font-bold text-[#363E49] group-hover:text-[#19706D] transition-colors leading-snug">
                          {artwork.title || artwork.artist}
                        </h3>
                      </button>
                      {artwork.title && (
                        <p className="text-sm font-semibold text-[#5D6C7B] mt-1">
                          {artwork.artist}
                        </p>
                      )}
                      <p className="text-xs text-[#5D6C7B] mt-1 line-clamp-1">
                        {artwork.medium} · {artwork.dimensions}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                            {hasBid ? 'Huidig bod' : 'Startbod'}
                          </p>
                          <p className="font-mono text-xl font-bold text-[#363E49] tabular-nums mt-0.5">
                            {hasBid
                              ? formatEuro(artwork.currentBid)
                              : formatEuro(artwork.startingBid)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                            {hasBid ? 'Hoogste bieder' : 'Status'}
                          </p>
                          {hasBid && artwork.highestBidderNumber ? (
                            <p className="font-mono text-sm font-bold text-[#1E5941] tabular-nums mt-0.5">
                              {artwork.highestBidderNumber}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-[#19706D] mt-1">
                              {getStatusLabel(artwork.status)}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                        className="mt-4 w-full min-h-[44px] px-4 py-2.5 rounded-[12px] text-xs font-bold tracking-wide bg-[#3C7F90] hover:bg-[#19706D] text-white transition-colors cursor-pointer"
                      >
                        Bekijk kunstwerk &amp; bied
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
