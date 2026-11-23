import { Gavel, Heart, Home, LayoutGrid, Map, Radio, Shield } from 'lucide-react';
import type { AppRoute } from './HeaderNav';

interface MobileTabBarProps {
  route: AppRoute;
  onNavigate: (next: AppRoute) => void;
  isAdmin: boolean;
  favoritesCount: number;
}

export function MobileTabBar({
  route,
  onNavigate,
  isAdmin,
  favoritesCount,
}: MobileTabBarProps) {
  const publicTabs: Array<{
    label: string;
    view: AppRoute['view'];
    target: AppRoute;
    Icon: typeof LayoutGrid;
  }> = [
    { label: 'Start', view: 'home', target: { view: 'home' }, Icon: Home },
    { label: 'Werken', view: 'gallery', target: { view: 'gallery' }, Icon: LayoutGrid },
    { label: 'Favorieten', view: 'favorites', target: { view: 'favorites' }, Icon: Heart },
    { label: 'Live', view: 'live', target: { view: 'live' }, Icon: Radio },
    { label: 'M Leuven', view: 'floorplan', target: { view: 'floorplan' }, Icon: Map },
  ];

  const tabs = isAdmin
    ? [
        { label: 'Werken', view: 'gallery' as const, target: { view: 'gallery' as const }, Icon: LayoutGrid },
        { label: 'Favorieten', view: 'favorites' as const, target: { view: 'favorites' as const }, Icon: Heart },
        { label: 'Live', view: 'live' as const, target: { view: 'live' as const }, Icon: Radio },
        { label: 'Regie', view: 'auctioneer' as const, target: { view: 'auctioneer' as const }, Icon: Gavel },
        { label: 'Beheer', view: 'admin' as const, target: { view: 'admin' as const }, Icon: Shield },
      ]
    : publicTabs;

  return (
    <nav
      aria-label="Mobiele navigatie"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] no-print"
    >
      <div className="grid grid-cols-5 items-center h-14">
        {tabs.map(({ label, view, target, Icon }) => {
          const isActive =
            route.view === view || (view === 'gallery' && route.view === 'artwork');
          const showFavCount = view === 'favorites' && favoritesCount > 0;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(target)}
              className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive ? 'text-[#19706D]' : 'text-[#5D6C7B] hover:text-[#363E49]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 ${
                    view === 'favorites' && favoritesCount > 0
                      ? 'fill-[#923636] text-[#923636]'
                      : ''
                  }`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                {showFavCount && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-[14px] rounded-full bg-[#923636] text-white font-mono text-[9px] font-bold leading-[14px] text-center tabular-nums">
                    {favoritesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap shrink-0">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
