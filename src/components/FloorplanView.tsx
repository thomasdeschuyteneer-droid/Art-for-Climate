import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import {
  M_LEUVEN_ROOMS,
  formatEuro,
  formatLotNumber,
  getStatusLabel,
} from '../utils/format';
import { FavoriteButton } from './FavoriteButton';
import type { AppRoute } from './HeaderNav';

interface FloorplanViewProps {
  onNavigate: (next: AppRoute) => void;
}

export function FloorplanView({ onNavigate }: FloorplanViewProps) {
  const { artworks, auctionState } = useAuction();
  const [selectedRoom, setSelectedRoom] = useState<string>('Alle zalen');

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Antichambre Deel 1': 0,
      'Antichambre Deel 2': 0,
      Forum: 0,
    };
    for (const lot of artworks) {
      if (lot.galleryRoom in counts) {
        counts[lot.galleryRoom] += 1;
      }
    }
    return counts;
  }, [artworks]);

  const visibleArtworks = useMemo(() => {
    if (selectedRoom === 'Alle zalen') return artworks;
    return artworks.filter((a) => a.galleryRoom === selectedRoom);
  }, [artworks, selectedRoom]);

  const antichambre1Lots = useMemo(
    () => artworks.filter((a) => a.galleryRoom === 'Antichambre Deel 1'),
    [artworks]
  );
  const antichambre2Lots = useMemo(
    () => artworks.filter((a) => a.galleryRoom === 'Antichambre Deel 2'),
    [artworks]
  );
  const forumLots = useMemo(
    () => artworks.filter((a) => a.galleryRoom === 'Forum'),
    [artworks]
  );

  const renderZoneLots = (lots: typeof artworks) => (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {lots.map((lot) => (
        <button
          key={lot.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate({ view: 'artwork', artworkId: lot.id });
          }}
          title={`${formatLotNumber(lot.lotNumber)} — ${lot.title ? `${lot.title} (${lot.artist})` : lot.artist}`}
          className="min-h-[34px] px-2.5 py-1 rounded-[8px] bg-white border border-[#E5E5E5] hover:border-[#19706D] hover:bg-[#F0F3E1] font-mono text-xs font-bold text-[#363E49] tabular-nums transition-colors cursor-pointer"
        >
          #{lot.lotNumber}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24 md:pb-16 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E5E5] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
            Locatie · M Leuven
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
            Grondplan M Leuven
          </h1>
          <p className="text-sm text-[#5D6C7B] mt-2 max-w-2xl">
            De L-vormige tentoonstellingsopstelling van Art for Climate loopt door Antichambre Deel 1, Antichambre Deel 2 en het Forum. Klik op een zaal of lotnummer om het kunstwerk en de startprijs te bekijken.
          </p>
        </div>

        <div className="text-xs text-[#5D6C7B] flex items-center gap-2 shrink-0">
          <MapPin className="w-4 h-4 text-[#19706D]" aria-hidden="true" />
          <span>Leopold Vanderkelenstraat 28, 3000 Leuven</span>
        </div>
      </div>

      {/* Opgeladen eigen grondplan-afbeelding indien beschikbaar */}
      {auctionState?.floorplanImageUrl && (
        <div className="border border-[#E5E5E5] rounded-2xl bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[#19706D]">
              Officieel grondplan M Leuven
            </h2>
            <span className="text-xs text-[#5D6C7B]">Opgeladen via Beheer</span>
          </div>
          <img
            src={auctionState.floorplanImageUrl}
            alt="Grondplan M Leuven voor Art for Climate"
            className="w-full max-h-[520px] object-contain bg-[#F7F7F7] rounded-xl border border-[#E5E5E5]"
          />
        </div>
      )}

      {/* Interactieve L-vormige plattegrond: Antichambre Deel 1 -> Antichambre Deel 2 -> Forum */}
      <div className="border border-[#E5E5E5] rounded-2xl bg-white p-5 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#19706D]">
              L-vormige zaalplattegrond
            </h2>
            <p className="text-xs text-[#5D6C7B] mt-0.5">
              Klik op een ruimte of op een lotnummer (#10–#53) om het kunstwerk te openen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['Alle zalen', ...M_LEUVEN_ROOMS] as const).map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
                  selectedRoom === room
                    ? 'bg-[#19706D] text-white'
                    : 'bg-[#F7F7F7] border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D]'
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        {/* L-vormig architecturaal raster (bovenste verticale vleugel + onderste hoek + rechtervleugel) */}
        <div className="bg-[#F7F7F7] border border-[#E5E5E5] rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Linkerboven-vleugel van de L: Antichambre Deel 1 */}
            <div
              onClick={() =>
                setSelectedRoom(
                  selectedRoom === 'Antichambre Deel 1' ? 'Alle zalen' : 'Antichambre Deel 1'
                )
              }
              className={`lg:col-span-5 rounded-xl border-2 p-5 transition-colors cursor-pointer ${
                selectedRoom === 'Antichambre Deel 1'
                  ? 'border-[#19706D] bg-[#DEE9EC]/60'
                  : 'border-[#3C7F90]/40 bg-white hover:border-[#19706D]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E5E5]">
                <h3 className="font-display text-lg font-bold text-[#19706D]">
                  Antichambre Deel 1
                </h3>
                <span className="font-mono text-xs font-bold text-[#5D6C7B] tabular-nums">
                  {roomCounts['Antichambre Deel 1']} werken
                </span>
              </div>
              <p className="text-xs text-[#5D6C7B] mt-2">
                Noordelijke vleugel · Doorgang vanaf de hoofdingang
              </p>
              {renderZoneLots(antichambre1Lots)}
            </div>

            {/* Open binnentuin / Patio naast de L-vleugel */}
            <div className="hidden lg:flex lg:col-span-7 rounded-xl border border-dashed border-[#E5E5E5] bg-[#F7F7F7] items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5D6C7B]">
                  M Leuven · Binnengebied
                </p>
                <p className="text-xs text-[#5D6C7B] mt-1">
                  De tentoonstelling vormt een L-traject van Antichambre Deel 1 via Antichambre Deel 2 naar het Forum.
                </p>
              </div>
            </div>

            {/* Hoekstuk onderaan links van de L: Antichambre Deel 2 */}
            <div
              onClick={() =>
                setSelectedRoom(
                  selectedRoom === 'Antichambre Deel 2' ? 'Alle zalen' : 'Antichambre Deel 2'
                )
              }
              className={`lg:col-span-5 rounded-xl border-2 p-5 transition-colors cursor-pointer ${
                selectedRoom === 'Antichambre Deel 2'
                  ? 'border-[#19706D] bg-[#DEE9EC]/60'
                  : 'border-[#3C7F90]/40 bg-white hover:border-[#19706D]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E5E5]">
                <h3 className="font-display text-lg font-bold text-[#19706D]">
                  Antichambre Deel 2
                </h3>
                <span className="font-mono text-xs font-bold text-[#5D6C7B] tabular-nums">
                  {roomCounts['Antichambre Deel 2']} werken
                </span>
              </div>
              <p className="text-xs text-[#5D6C7B] mt-2">
                Hoekverbinding tussen Antichambre Deel 1 en het Forum
              </p>
              {renderZoneLots(antichambre2Lots)}
            </div>

            {/* Rechteronder-vleugel van de L: Forum */}
            <div
              onClick={() =>
                setSelectedRoom(selectedRoom === 'Forum' ? 'Alle zalen' : 'Forum')
              }
              className={`lg:col-span-7 rounded-xl border-2 p-5 transition-colors cursor-pointer ${
                selectedRoom === 'Forum'
                  ? 'border-[#19706D] bg-[#F0F3E1]'
                  : 'border-[#1E5941]/40 bg-[#F0F3E1]/40 hover:border-[#19706D]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E5E5]">
                <h3 className="font-display text-lg font-bold text-[#1E5941]">
                  Forum (Live veilingzaal)
                </h3>
                <span className="font-mono text-xs font-bold text-[#1E5941] tabular-nums">
                  {roomCounts['Forum']} werken &amp; concerten
                </span>
              </div>
              <p className="text-xs text-[#5D6C7B] mt-2">
                Hoofdruimte voor de live veiling, kunstwerken en huiskamerconcerten
              </p>
              {renderZoneLots(forumLots)}
            </div>
          </div>
        </div>
      </div>

      {/* Gefilterde werkenlijst */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-[#19706D]">
          Kunstwerken in {selectedRoom} ({visibleArtworks.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleArtworks.map((lot) => (
            <div
              key={lot.id}
              onClick={() => onNavigate({ view: 'artwork', artworkId: lot.id })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate({ view: 'artwork', artworkId: lot.id });
                }
              }}
              className="text-left border border-[#E5E5E5] rounded-2xl p-5 bg-white hover:border-[#19706D] transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-[#19706D] font-bold tabular-nums">
                    {formatLotNumber(lot.lotNumber)} · {lot.galleryRoom}
                  </p>
                  <FavoriteButton artworkId={lot.id} lotNumber={lot.lotNumber} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#363E49] mt-1">
                  {lot.title || lot.artist}
                </h3>
                {lot.title && (
                  <p className="text-sm text-[#5D6C7B] mt-0.5">{lot.artist}</p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
                <span className="text-[#5D6C7B]">{getStatusLabel(lot.status)}</span>
                <span className="font-mono font-bold text-[#19706D] tabular-nums">
                  Startprijs {formatEuro(lot.startingBid)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
