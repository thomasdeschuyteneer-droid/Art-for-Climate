import { Heart } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatLotNumber } from '../utils/format';

interface FavoriteButtonProps {
  artworkId: string;
  lotNumber: number;
  variant?: 'icon' | 'button';
  className?: string;
}

export function FavoriteButton({
  artworkId,
  lotNumber,
  variant = 'icon',
  className = '',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useAuction();
  const saved = isFavorite(artworkId);

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(artworkId);
        }}
        aria-pressed={saved}
        aria-label={
          saved
            ? `${formatLotNumber(lotNumber)} verwijderen uit favorieten`
            : `${formatLotNumber(lotNumber)} opslaan in favorieten`
        }
        className={`min-h-[44px] px-4 py-2 rounded-[12px] text-xs font-bold inline-flex items-center gap-2 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          saved
            ? 'bg-[#923636]/10 border-[#923636]/40 text-[#923636] hover:bg-[#923636]/15'
            : 'bg-white border-[#E5E5E5] text-[#363E49] hover:border-[#923636] hover:text-[#923636]'
        } ${className}`}
      >
        <Heart
          className={`w-4 h-4 shrink-0 ${saved ? 'fill-[#923636] text-[#923636]' : ''}`}
          aria-hidden="true"
        />
        <span>{saved ? 'Opgeslagen bij favorieten' : 'Bewaar bij favorieten'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(artworkId);
      }}
      aria-pressed={saved}
      aria-label={
        saved
          ? `${formatLotNumber(lotNumber)} verwijderen uit favorieten`
          : `${formatLotNumber(lotNumber)} opslaan in favorieten`
      }
      title={saved ? 'Verwijder uit favorieten' : 'Bewaar bij favorieten'}
      className={`min-h-[36px] min-w-[36px] rounded-[10px] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
        saved
          ? 'text-[#923636] bg-[#923636]/10 hover:bg-[#923636]/15'
          : 'text-[#5D6C7B] hover:text-[#923636] hover:bg-[#F7F7F7]'
      } ${className}`}
    >
      <Heart
        className={`w-4 h-4 ${saved ? 'fill-[#923636] text-[#923636]' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
