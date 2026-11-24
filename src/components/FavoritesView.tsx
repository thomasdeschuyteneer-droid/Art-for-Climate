import { useMemo, useState } from 'react';
import { ArrowRight, Heart, MapPin, QrCode, Trash2, X } from 'lucide-react';
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

interface FavoritesViewProps {
  onNavigate: (next: AppRoute) => void;
}

export function FavoritesView({ onNavigate }: FavoritesViewProps) {
  const {
    artworks,
    favoriteIds,
    clearFavorites,
  } = useAuction();
  const [roomFilter, setRoomFilter] = useState<string>('Alle zalen');
  const [qrArtwork, setQrArtwork] = useState<Artwork | null>(null);

  const favoriteArtworks = useMemo(() => {
    const idSet = new Set(favoriteIds);
    return artworks.filter((lot) => idSet.has(lot.id));
  }, [artworks, favoriteIds]);

  const visibleFavorites = useMemo(() => {
    if (roomFilter === 'Alle zalen') return favoriteArtworks;
    return favoriteArtworks.filter((lot) => lot.galleryRoom === roomFilter);
  }, [favoriteArtworks, roomFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-24 md:pb-16 space-y-8">
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E5E5E5]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Jouw selectie in M Leuven · Art for Climate
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
              Mijn favorieten ({favoriteArtworks.length})
            </h1>
            <p className="text-sm text-[#5D6C7B] mt-2 max-w-2xl">
              Bewaar kunstwerken via het hartje in de catalogus of na het scannen van een QR-code in M Leuven, zodat je ze tijdens de live zaalveiling vlot terugvindt.
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
            <h2 className="font-display text-2xl font-bold text-[#363E49]">
              Je hebt nog geen favorieten opgeslagen
            </h2>
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
            {visibleFavorites.map((artwork) => (
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
                          Startprijs
                        </p>
                        <p className="font-mono text-xl font-bold text-[#363E49] tabular-nums mt-0.5">
                          {formatEuro(artwork.startingBid)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                          Status
                        </p>
                        <p className="text-xs font-semibold text-[#19706D] mt-1">
                          {getStatusLabel(artwork.status)}
                        </p>
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
            ))}
          </div>
        )}
      </section>

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
