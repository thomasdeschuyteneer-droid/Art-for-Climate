import { useMemo } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatEuro, formatLotNumber } from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { FavoriteButton } from './FavoriteButton';
import type { AppRoute } from './HeaderNav';

interface HomePageProps {
  onNavigate: (next: AppRoute) => void;
  onOpenBidderModal: () => void;
}

export function HomePage({ onNavigate, onOpenBidderModal }: HomePageProps) {
  const { artworks, bids, bidders, auctionState, currentBidderNumber } = useAuction();

  const highlightedLots = useMemo(() => {
    // Zet bekende werken uit de catalogus en actief lot bovenaan in de selectie
    const preferredOrder = [10, 34, 36, 16, 46, 23];
    const picked: typeof artworks = [];
    for (const num of preferredOrder) {
      const found = artworks.find((a) => a.lotNumber === num);
      if (found) picked.push(found);
    }
    for (const a of artworks) {
      if (picked.length >= 6) break;
      if (!picked.some((p) => p.id === a.id)) picked.push(a);
    }
    return picked.slice(0, 6);
  }, [artworks]);

  return (
    <div className="pb-20 lg:pb-16">
      {/* Heldere Leuven 2030 Hero-sectie */}
      <section className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  <span>Leuven 2030</span>
                  <span aria-hidden="true">·</span>
                  <span>M Leuven</span>
                  <span aria-hidden="true">·</span>
                  <span>Woensdag 16 december 2026</span>
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#19706D] mt-4 leading-[1.08]">
                  Art for Climate
                </h1>
                <p className="font-display text-xl sm:text-2xl font-bold text-[#363E49] mt-2">
                  Meer kunst, meer toekomst
                </p>

                <p className="mt-5 text-base sm:text-lg text-[#5D6C7B] max-w-2xl leading-relaxed">
                  Een unieke kunstveiling ten voordele van de klimaattransitie in Leuven.
                </p>
                <p className="mt-3 text-sm sm:text-base text-[#5D6C7B] max-w-2xl leading-relaxed">
                  Op 16 december brengen we {artworks.length} kunstwerken en artistieke ervaringen samen in M Leuven. Bieden gebeurt uitsluitend ter plekke in de zaal ten voordele van het Leuvens Klimaatfonds.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'gallery' })}
                  className="min-h-[48px] px-7 py-3 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Bekijk de collectie</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onOpenBidderModal}
                  className="min-h-[48px] px-7 py-3 rounded-[12px] border border-[#19706D] text-[#19706D] hover:bg-[#DEE9EC] text-sm font-bold inline-flex items-center transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {currentBidderNumber ? `Bieder ${currentBidderNumber}` : 'Schrijf je in'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'floorplan' })}
                  className="min-h-[48px] px-4 py-3 text-[#363E49] hover:text-[#19706D] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#19706D]" aria-hidden="true" />
                  <span>Grondplan M Leuven</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col bg-[#F7F7F7] border border-[#E5E5E5] rounded-2xl overflow-hidden">
              <div className="flex-1 min-h-[240px] lg:min-h-[300px] bg-[#F0F3E1] flex items-center justify-center overflow-hidden">
                <img
                  src="/art-for-climate-banner.png"
                  alt="Art for Climate — Leuven 2030 kunstveiling in M Leuven"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 bg-white border-t border-[#E5E5E5] flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                    {auctionState?.auctionClosed ? 'Veiling afgesloten' : 'Live in M Leuven'}
                  </p>
                  <p className="font-display text-base font-bold text-[#363E49] mt-0.5">
                    Leopold Vanderkelenstraat 28, Leuven
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'live' })}
                  className="min-h-[40px] px-4 py-2 rounded-[12px] bg-[#F0F3E1] text-[#1E5941] hover:bg-[#DEE9EC] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Live veiling
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-koloms Overzichtsstrook */}
      <section className="bg-[#F7F7F7] border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E5]">
            <div className="py-6 pr-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                Catalogus
              </p>
              <p className="font-mono text-2xl font-bold text-[#19706D] tabular-nums mt-1">
                {artworks.length} loten
              </p>
            </div>
            <div className="py-6 pl-4 lg:px-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                Locatie M Leuven
              </p>
              <p className="font-display text-xl font-bold text-[#1E5941] mt-1">
                Antichambre &amp; Forum
              </p>
            </div>
            <div className="py-6 pr-4 lg:px-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                Ingeschreven bieders
              </p>
              <p className="font-mono text-2xl font-bold text-[#363E49] tabular-nums mt-1">
                {bidders.length}
              </p>
            </div>
            <div className="py-6 pl-4 lg:pl-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                Uitgebrachte biedingen
              </p>
              <p className="font-mono text-2xl font-bold text-[#363E49] tabular-nums mt-1">
                {bids.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Uitgelichte kunstwerken uit de catalogus */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Catalogus Art for Climate
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
              Een greep uit de collectie
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'gallery' })}
            className="min-h-[42px] px-5 py-2 rounded-[12px] border border-[#3C7F90] text-[#3C7F90] hover:bg-[#3C7F90] hover:text-white text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Bekijk alle {artworks.length} kunstwerken</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {highlightedLots.map((artwork) => (
            <article
              key={artwork.id}
              className="flex flex-col bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden transition-colors hover:border-[#19706D]"
            >
              <button
                type="button"
                onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                className="aspect-[4/3] w-full overflow-hidden border-b border-[#E5E5E5] cursor-pointer group text-left"
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                      {formatLotNumber(artwork.lotNumber)} · {artwork.galleryRoom}
                    </p>
                    <FavoriteButton artworkId={artwork.id} lotNumber={artwork.lotNumber} />
                  </div>
                  {artwork.title ? (
                    <>
                      <h3 className="font-display text-xl font-bold text-[#363E49] mt-1.5 leading-snug">
                        {artwork.title}
                      </h3>
                      <p className="text-sm text-[#5D6C7B] mt-1">{artwork.artist}</p>
                    </>
                  ) : (
                    <h3 className="font-display text-xl font-bold text-[#363E49] mt-1.5 leading-snug">
                      {artwork.artist}
                    </h3>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#E5E5E5] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                      {artwork.currentBid > 0 ? 'Huidig bod' : 'Startbod'}
                    </p>
                    <p className="font-mono text-lg font-bold text-[#19706D] tabular-nums">
                      {artwork.currentBid > 0
                        ? formatEuro(artwork.currentBid)
                        : formatEuro(artwork.startingBid)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                    className="min-h-[40px] px-4 py-2 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Bekijk kunstwerk
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Jouw kunst maakt impact — Leuvens Klimaatfonds */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#E5E5E5] rounded-2xl p-7 sm:p-10">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Leuvens Klimaatfonds
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#19706D]">
              Jouw kunst maakt impact in Leuven
            </h2>
            <p className="text-sm sm:text-base text-[#363E49] leading-relaxed">
              De opbrengst van Art for Climate gaat rechtstreeks naar het Leuvens Klimaatfonds. Zo maken we investeringen mogelijk bij sociale organisaties in Leuven die hun gebouwen willen isoleren, fossiele verwarmingssystemen willen vervangen of willen inzetten op hernieuwbare energie.
            </p>
            <p className="text-sm text-[#5D6C7B] leading-relaxed">
              Met Art for Climate brengen Leuven 2030, meer dan veertig betrokken kunstenaars en M Leuven schoonheid, sociaal engagement en concrete klimaatactie samen.
            </p>
          </div>
          <div className="lg:col-span-5 bg-[#F0F3E1] rounded-xl p-6 flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#1E5941]">
                Spelregels ter plekke
              </p>
              <ul className="mt-3 space-y-2.5 text-sm text-[#363E49]">
                <li>1. Schrijf je in en ontvang een persoonlijk biedernummer (#001).</li>
                <li>2. Scan de QR-code bij een werk in Antichambre of Forum, of bied via de zaalveiling.</li>
                <li>3. Elk nieuw bod moet strikt hoger zijn dan het huidige hoogste bod.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'floorplan' })}
              className="min-h-[42px] px-4 py-2 rounded-[12px] bg-[#1E5941] hover:bg-[#19706D] text-white text-xs font-bold transition-colors text-center cursor-pointer"
            >
              Bekijk grondplan van M Leuven
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
