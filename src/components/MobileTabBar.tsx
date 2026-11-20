import { Gavel, Home, LayoutGrid, Map, Radio } from 'lucide-react';
import type { AppRoute } from './HeaderNav';

interface MobileTabBarProps {
  route: AppRoute;
  onNavigate: (next: AppRoute) => void;
}

export function MobileTabBar({ route, onNavigate }: MobileTabBarProps) {
  const tabs: Array<{
    label: string;
    view: AppRoute['view'];
    target: AppRoute;
    Icon: typeof LayoutGrid;
  }> = [
    { label: 'Start', view: 'home', target: { view: 'home' }, Icon: Home },
    { label: 'Werken', view: 'gallery', target: { view: 'gallery' }, Icon: LayoutGrid },
    { label: 'Live', view: 'live', target: { view: 'live' }, Icon: Radio },
    { label: 'M Leuven', view: 'floorplan', target: { view: 'floorplan' }, Icon: Map },
    { label: 'Regie', view: 'auctioneer', target: { view: 'auctioneer' }, Icon: Gavel },
  ];

  return (
    <nav
      aria-label="Mobiele navigatie"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] no-print"
    >
      <div className="grid grid-cols-5 items-center h-14">
        {tabs.map(({ label, view, target, Icon }) => {
          const isActive =
            route.view === view || (view === 'gallery' && route.view === 'artwork');
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(target)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive ? 'text-[#19706D]' : 'text-[#5D6C7B] hover:text-[#363E49]'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
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
