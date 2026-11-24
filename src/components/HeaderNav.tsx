import { Heart, LogOut } from 'lucide-react';

export type AppRoute =
  | { view: 'home' }
  | { view: 'gallery' }
  | { view: 'favorites' }
  | { view: 'artwork'; artworkId: string }
  | { view: 'live' }
  | { view: 'floorplan' }
  | { view: 'auctioneer' }
  | { view: 'admin' };

interface HeaderNavProps {
  route: AppRoute;
  onNavigate: (next: AppRoute) => void;
  isAdmin: boolean;
  onLogoutAdmin: () => void;
  favoritesCount: number;
}

export function HeaderNav({
  route,
  onNavigate,
  isAdmin,
  onLogoutAdmin,
  favoritesCount,
}: HeaderNavProps) {
  const publicNavItems: Array<{ label: string; view: AppRoute['view']; href: string; target: AppRoute }> = [
    { label: 'Startpagina', view: 'home', href: '/', target: { view: 'home' } },
    { label: 'Kunstwerken', view: 'gallery', href: '/kunstwerken', target: { view: 'gallery' } },
    { label: 'Favorieten', view: 'favorites', href: '/favorieten', target: { view: 'favorites' } },
    { label: 'Live veiling', view: 'live', href: '/live', target: { view: 'live' } },
    { label: 'M Leuven', view: 'floorplan', href: '/grondplan', target: { view: 'floorplan' } },
  ];

  const adminNavItems: Array<{ label: string; view: AppRoute['view']; href: string; target: AppRoute }> = [
    { label: 'Veilingmeester', view: 'auctioneer', href: '/veilingmeester', target: { view: 'auctioneer' } },
    { label: 'Beheer', view: 'admin', href: '/beheer', target: { view: 'admin' } },
  ];

  const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-6">
        {/* Zone 1: Officiële Leuven 2030 beeldmerk & titel */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate({ view: 'home' });
          }}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#19706D]"
        >
          <img
            src="/leuven2030-logo.svg"
            alt="Leuven 2030"
            className="h-8 md:h-9 w-auto shrink-0"
          />
          <span className="font-display text-lg md:text-xl font-bold tracking-tight text-[#19706D] whitespace-nowrap shrink-0">
            Art for Climate
          </span>
        </a>

        {/* Zone 2: Rustige Nederlandstalige navigatie (Beheer & Veilingmeester verborgen voor bezoekers) */}
        <nav
          aria-label="Hoofdnavigatie"
          className="hidden lg:flex items-center gap-6 text-[15px] font-semibold text-[#363E49]"
        >
          {navItems.map((item) => {
            const isActive =
              route.view === item.view ||
              (item.view === 'gallery' && route.view === 'artwork');
            return (
              <a
                key={item.view}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.target);
                }}
                className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#19706D] ${
                  isActive
                    ? 'border-[#19706D] text-[#19706D]'
                    : 'border-transparent hover:text-[#19706D] hover:border-[#DEE9EC]'
                }`}
              >
                {item.view === 'favorites' && (
                  <Heart
                    className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'fill-[#923636] text-[#923636]' : ''}`}
                    aria-hidden="true"
                  />
                )}
                <span>{item.label}</span>
                {item.view === 'favorites' && favoritesCount > 0 && (
                  <span className="font-mono text-xs font-bold text-[#923636] tabular-nums">
                    ({favoritesCount})
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Collectie bekijken & optioneel beheerdersafmelding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate({ view: 'gallery' })}
            className="min-h-[42px] px-5 py-2 text-sm font-bold rounded-[12px] bg-[#3C7F90] text-white hover:bg-[#19706D] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19706D]"
          >
            Bekijk collectie
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onLogoutAdmin}
              title="Beheerder afmelden"
              aria-label="Beheerder afmelden"
              className="min-h-[42px] px-3 py-2 text-xs font-bold rounded-[12px] border border-[#E5E5E5] bg-white text-[#5D6C7B] hover:text-[#923636] hover:border-[#923636] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Afmelden</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
