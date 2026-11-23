import { useMemo, useState } from 'react';
import { Heart, QrCode, Search, X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { Artwork } from '../types/auction';
import {
  M_LEUVEN_ROOMS,
  formatEuro,
  formatLotNumber,
  getStatusLabel,
} from '../utils/format';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { FavoriteButton } from './FavoriteButton';
import { QrCodeCard } from './QrCodeCard';
import type { AppRoute } from './HeaderNav';

interface ArtworkGalleryProps {
  onNavigate: (next: AppRoute) => void;
}

export function ArtworkGallery({ onNavigate }: ArtworkGalleryProps) {
  const { artworks, favoriteIds, loading, error } = useAuction();
  const [categoryFilter, setCategoryFilter] = useState<string>('Alle werken');
  const [roomFilter, setRoomFilter] = useState<string>('Alle zalen');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrArtwork, setQrArtwork] = useState<Artwork | null>(null);

  const favoritesCount = useMemo(
    () => artworks.filter((lot) => favoriteIds.includes(lot.id)).length,
    [artworks, favoriteIds]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['Alle werken']);
    for (const lot of artworks) {
      if (lot.category) set.add(lot.category);
    }
    return Array.from(set);
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artworks.filter((lot) => {
      if (onlyFavorites && !favoriteIds.includes(lot.id)) return false;
      if (categoryFilter !== 'Alle werken' && lot.category !== categoryFilter) return false;
      if (roomFilter !== 'Alle zalen' && lot.galleryRoom !== roomFilter) return false;
      if (!q) return true;
      return (
        lot.title.toLowerCase().includes(q) ||
        lot.artist.toLowerCase().includes(q) ||
        lot.medium.toLowerCase().includes(q) ||
        lot.galleryRoom.toLowerCase().includes(q) ||
        String(lot.lotNumber).includes(q)
      );
    });
  }, [artworks, categoryFilter, favoriteIds, onlyFavorites, roomFilter, searchQuery]);

  if (loading && artworks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-96 bg-white border border-[#E5E5E5] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24 md:pb-16">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E5E5E5]">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
            Catalogus Leuven 2030 · M Leuven
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
            Kunstwerken ({artworks.length})
          </h1>
          <p className="text-sm text-[#5D6C7B] mt-2 max-w-2xl">
            Alle kunstwerken en artistieke ervaringen uit de officiële catalogus van Art for Climate.
          </p>
        </div>

        <div className="relative min-w-[260px] sm:w-80">
          <Search
            className="w-4 h-4 text-[#5D6C7B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek kunstenaar, titel of techniek"
            aria-label="Zoek in kunstwerken"
            className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
          />
        </div>
      </div>

      {/* Filters op categorie & zaal */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter op categorie">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#19706D] text-white'
                  : 'bg-white border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter op zaal in M Leuven">
          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            aria-pressed={onlyFavorites}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              onlyFavorites
                ? 'bg-[#923636] border-[#923636] text-white'
                : 'bg-white border-[#E5E5E5] text-[#363E49] hover:border-[#923636] hover:text-[#923636]'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                onlyFavorites
                  ? 'fill-white text-white'
                  : favoritesCount > 0
                    ? 'fill-[#923636] text-[#923636]'
                    : ''
              }`}
              aria-hidden="true"
            />
            <span>Favorieten ({favoritesCount})</span>
          </button>
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
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-[#923636]/30 bg-[#923636]/10 text-sm text-[#923636]">
          {error}
        </div>
      )}

      {filteredArtworks.length === 0 ? (
        <div className="mt-10 py-16 text-center bg-white border border-[#E5E5E5] rounded-2xl">
          <p className="font-display text-2xl font-bold text-[#363E49]">
            Geen kunstwerken gevonden
          </p>
          <p className="text-sm text-[#5D6C7B] mt-2">
            {artworks.length === 0
              ? 'Laad de catalogus op in het Beheerpaneel.'
              : 'Pas je zoekterm of filters aan om alle werken uit de catalogus te bekijken.'}
          </p>
          {artworks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('Alle werken');
                setRoomFilter('Alle zalen');
                setOnlyFavorites(false);
                setSearchQuery('');
              }}
              className="mt-5 min-h-[44px] px-5 py-2 rounded-[12px] text-xs font-bold bg-[#3C7F90] text-white cursor-pointer"
            >
              Toon alle kunstwerken
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArtworks.map((artwork) => {
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
                      <div className="flex items-center gap-1 shrink-0">
                        <FavoriteButton artworkId={artwork.id} lotNumber={artwork.lotNumber} />
                        <button
                          type="button"
                          onClick={() => setQrArtwork(artwork)}
                          aria-label={`Toon QR-code voor Lot ${artwork.lotNumber}`}
                          className="min-h-[36px] min-w-[36px] rounded-[10px] inline-flex items-center justify-center text-[#5D6C7B] hover:text-[#19706D] hover:bg-[#F7F7F7] cursor-pointer shrink-0"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate({ view: 'artwork', artworkId: artwork.id })}
                      className="mt-2 block text-left cursor-pointer group"
                    >
                      <h2 className="font-display text-xl font-bold text-[#363E49] group-hover:text-[#19706D] transition-colors leading-snug">
                        {artwork.title || artwork.artist}
                      </h2>
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
                      Bekijk kunstwerk
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* QR-code snelvenster */}
      {qrArtwork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#363E49]/40 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR-code van het kunstwerk"
        >
          <div className="w-full max-w-md bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E5]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                QR-code voor M Leuven
              </span>
              <button
                type="button"
                onClick={() => setQrArtwork(null)}
                aria-label="Sluit QR-venster"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5D6C7B] hover:text-[#363E49] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <QrCodeCard artwork={qrArtwork} />
          </div>
        </div>
      )}
    </div>
  );
}
