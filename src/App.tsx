import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { HeaderNav, type AppRoute } from './components/HeaderNav';
import { MobileTabBar } from './components/MobileTabBar';
import { BidderModal } from './components/BidderModal';
import { HomePage } from './components/HomePage';
import { ArtworkGallery } from './components/ArtworkGallery';
import { FavoritesView } from './components/FavoritesView';
import { ArtworkDetail } from './components/ArtworkDetail';
import { LiveRoom } from './components/LiveRoom';
import { FloorplanView } from './components/FloorplanView';
import { AuctioneerDashboard } from './components/AuctioneerDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AdminAuthGate, AdminLoginModal } from './components/AdminAuthGate';

function parseRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') return { view: 'home' };
  const pathname = window.location.pathname;
  const search = new URLSearchParams(window.location.search);
  const queryLot = search.get('lot');
  if (queryLot) {
    return { view: 'artwork', artworkId: queryLot };
  }
  if (pathname.startsWith('/artwork/')) {
    const id = decodeURIComponent(pathname.replace('/artwork/', '').split('/')[0]);
    if (id) return { view: 'artwork', artworkId: id };
  }
  if (pathname === '/kunstwerken' || pathname === '/gallery') return { view: 'gallery' };
  if (pathname === '/favorieten' || pathname === '/favorites') return { view: 'favorites' };
  if (pathname === '/live') return { view: 'live' };
  if (pathname === '/floorplan' || pathname === '/grondplan') return { view: 'floorplan' };
  if (pathname === '/auctioneer' || pathname === '/veilingmeester') return { view: 'auctioneer' };
  if (pathname === '/admin' || pathname === '/beheer') return { view: 'admin' };
  return { view: 'home' };
}

function routeToPath(route: AppRoute): string {
  switch (route.view) {
    case 'home':
      return '/';
    case 'gallery':
      return '/kunstwerken';
    case 'favorites':
      return '/favorieten';
    case 'artwork':
      return `/artwork/${encodeURIComponent(route.artworkId)}`;
    case 'live':
      return '/live';
    case 'floorplan':
      return '/grondplan';
    case 'auctioneer':
      return '/veilingmeester';
    case 'admin':
      return '/beheer';
  }
}

function AuctionShell() {
  const { currentBidderNumber, isAdmin, logoutAdmin, favoriteIds, artworks } = useAuction();
  const activeFavoritesCount = artworks.filter((a) => favoriteIds.includes(a.id)).length;
  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromLocation());
  const [bidderModalOpen, setBidderModalOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (next: AppRoute) => {
    const targetPath = routeToPath(next);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoutAdmin = () => {
    void logoutAdmin().then(() => {
      if (route.view === 'admin' || route.view === 'auctioneer') {
        navigate({ view: 'home' });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] text-[#363E49]">
      <HeaderNav
        route={route}
        onNavigate={navigate}
        bidderNumber={currentBidderNumber}
        onOpenBidderModal={() => setBidderModalOpen(true)}
        isAdmin={isAdmin}
        onLogoutAdmin={handleLogoutAdmin}
        favoritesCount={activeFavoritesCount}
      />

      <main className="flex-1">
        {route.view === 'home' && (
          <HomePage
            onNavigate={navigate}
            onOpenBidderModal={() => setBidderModalOpen(true)}
          />
        )}
        {route.view === 'gallery' && <ArtworkGallery onNavigate={navigate} />}
        {route.view === 'favorites' && <FavoritesView onNavigate={navigate} />}
        {route.view === 'artwork' && (
          <ArtworkDetail
            artworkId={route.artworkId}
            onNavigate={navigate}
            onOpenBidderModal={() => setBidderModalOpen(true)}
          />
        )}
        {route.view === 'live' && (
          <LiveRoom
            onNavigate={navigate}
            onOpenBidderModal={() => setBidderModalOpen(true)}
          />
        )}
        {route.view === 'floorplan' && <FloorplanView onNavigate={navigate} />}
        {route.view === 'auctioneer' &&
          (isAdmin ? (
            <AuctioneerDashboard />
          ) : (
            <AdminAuthGate
              targetLabel="Veilingmeester"
              onBack={() => navigate({ view: 'home' })}
            />
          ))}
        {route.view === 'admin' &&
          (isAdmin ? (
            <AdminPanel />
          ) : (
            <AdminAuthGate
              targetLabel="Beheer"
              onBack={() => navigate({ view: 'home' })}
            />
          ))}
      </main>

      <footer className="border-t border-[#E5E5E5] bg-white py-10 mb-14 lg:mb-0 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#5D6C7B]">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src="/leuven2030-logo.svg"
              alt="Leuven 2030"
              className="h-9 w-auto shrink-0"
            />
            <div>
              <p className="font-display text-base font-bold text-[#19706D]">
                Art for Climate · Leuven 2030
              </p>
              <p className="mt-0.5 font-semibold text-[#363E49]">
                Kunst vandaag. Impact morgen.
              </p>
              <p className="mt-0.5">
                M Leuven, Leopold Vanderkelenstraat 28, 3000 Leuven · Ten voordele van het Leuvens Klimaatfonds
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-semibold text-[#363E49]">
            <button
              type="button"
              onClick={() => navigate({ view: 'home' })}
              className="hover:text-[#19706D] cursor-pointer"
            >
              Startpagina
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'gallery' })}
              className="hover:text-[#19706D] cursor-pointer"
            >
              Kunstwerken
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'favorites' })}
              className="hover:text-[#19706D] cursor-pointer"
            >
              Favorieten{activeFavoritesCount > 0 ? ` (${activeFavoritesCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'live' })}
              className="hover:text-[#19706D] cursor-pointer"
            >
              Live veiling
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'floorplan' })}
              className="hover:text-[#19706D] cursor-pointer"
            >
              M Leuven
            </button>
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate({ view: 'auctioneer' })}
                  className="hover:text-[#19706D] cursor-pointer"
                >
                  Veilingmeester
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ view: 'admin' })}
                  className="hover:text-[#19706D] cursor-pointer"
                >
                  Beheer
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  className="text-[#5D6C7B] hover:text-[#923636] cursor-pointer"
                >
                  Afmelden
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAdminLoginOpen(true)}
                className="inline-flex items-center gap-1.5 text-[#5D6C7B] hover:text-[#19706D] font-semibold cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Beheerder inloggen</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      <MobileTabBar
        route={route}
        onNavigate={navigate}
        isAdmin={isAdmin}
        favoritesCount={activeFavoritesCount}
      />
      <BidderModal
        open={bidderModalOpen}
        onClose={() => setBidderModalOpen(false)}
      />
      <AdminLoginModal
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onAuthenticated={() => navigate({ view: 'admin' })}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuctionProvider>
      <AuctionShell />
    </AuctionProvider>
  );
}
