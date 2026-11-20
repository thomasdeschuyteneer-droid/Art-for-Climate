import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Artwork,
  AuctionSnapshot,
  AuctionState,
  Bid,
  BidderSummary,
} from '../types/auction';
import { normalizeBidderNumber } from '../utils/format';

interface AuctionUpdatePayload extends Partial<AuctionState> {
  timerAction?: 'start' | 'pause' | 'reset' | 'add_60';
  durationSeconds?: number;
}

interface AuctionContextValue {
  artworks: Artwork[];
  bids: Bid[];
  bidders: BidderSummary[];
  auctionState: AuctionState | null;
  currentBidderNumber: string | null;
  onSiteVerified: boolean;
  setOnSiteVerified: (verified: boolean) => void;
  loading: boolean;
  connected: boolean;
  error: string | null;
  setCurrentBidderNumber: (bidderNumber: string | null) => void;
  registerBidder: (input: { name: string; email: string; city: string }) => Promise<BidderSummary>;
  placeBid: (input: {
    artworkId: string;
    amount: number;
    bidderNumber?: string;
    source?: 'qr' | 'floor';
  }) => Promise<{ bid: Bid; artwork: Artwork }>;
  createArtwork: (payload: Partial<Artwork>) => Promise<Artwork>;
  updateArtwork: (id: string, payload: Partial<Artwork>) => Promise<Artwork>;
  deleteArtwork: (id: string) => Promise<void>;
  updateAuctionState: (payload: AuctionUpdatePayload) => Promise<AuctionState>;
  importCatalogPdf: (input: {
    fileName: string;
    base64: string;
    replaceExisting?: boolean;
  }) => Promise<{ importedCount: number; totalPages: number; message: string; rawPreview?: string }>;
  uploadFloorplan: (input: { fileName: string; dataUrl: string }) => Promise<string>;
  uploadArtworkImage: (input: { fileName: string; dataUrl: string }) => Promise<string>;
  resetAuction: () => Promise<void>;
  refreshState: () => Promise<void>;
}

const AuctionContext = createContext<AuctionContextValue | null>(null);
const BIDDER_STORAGE_KEY = 'art_for_climate_bidder_number';
const ONSITE_STORAGE_KEY = 'art_for_climate_mleuven_onsite';

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot>({
    artworks: [],
    bids: [],
    bidders: [],
    auctionState: null as unknown as AuctionState,
  });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedBidderNumber, setStoredBidderNumber] = useState<string | null>(() => {
    try {
      const saved = window.localStorage.getItem(BIDDER_STORAGE_KEY);
      return saved ? normalizeBidderNumber(saved) : null;
    } catch {
      return null;
    }
  });
  const [onSiteVerifiedState, setOnSiteVerifiedState] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('zaal') === 'mleuven') {
        window.localStorage.setItem(ONSITE_STORAGE_KEY, '1');
        return true;
      }
      return window.localStorage.getItem(ONSITE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setOnSiteVerified = useCallback((verified: boolean) => {
    setOnSiteVerifiedState(verified);
    try {
      if (verified) {
        window.localStorage.setItem(ONSITE_STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(ONSITE_STORAGE_KEY);
      }
    } catch {
      // Negeer opslagfout
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Catalogus kon niet geladen worden.');
      const data = (await res.json()) as AuctionSnapshot;
      setSnapshot(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Geen verbinding met de veilingserver.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();

    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      source = new EventSource('/api/events');

      const handleEvent = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as { snapshot?: AuctionSnapshot };
          if (parsed?.snapshot) {
            setSnapshot(parsed.snapshot);
            setLoading(false);
            setError(null);
          }
        } catch {
          // Negeer lege keepalive-berichten
        }
      };

      source.onopen = () => {
        setConnected(true);
      };

      const eventNames = [
        'init',
        'sync',
        'bid_placed',
        'bidder_registered',
        'artwork_created',
        'artwork_updated',
        'artwork_deleted',
        'auction_updated',
        'catalog_imported',
        'floorplan_updated',
        'auction_reset',
      ];
      for (const name of eventNames) {
        source.addEventListener(name, handleEvent);
      }

      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2500);
        }
      };
    };

    connect();

    return () => {
      source?.close();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [refreshState]);

  const currentBidderNumber = useMemo(() => {
    return storedBidderNumber ? normalizeBidderNumber(storedBidderNumber) : null;
  }, [storedBidderNumber]);

  const setCurrentBidderNumber = useCallback((bidderNumber: string | null) => {
    const normalized = bidderNumber ? normalizeBidderNumber(bidderNumber) : null;
    try {
      if (normalized) {
        window.localStorage.setItem(BIDDER_STORAGE_KEY, normalized);
        setStoredBidderNumber(normalized);
      } else {
        window.localStorage.removeItem(BIDDER_STORAGE_KEY);
        setStoredBidderNumber(null);
      }
    } catch {
      setStoredBidderNumber(normalized);
    }
  }, []);

  const registerBidder = useCallback(
    async (input: { name: string; email: string; city: string }) => {
      const res = await fetch('/api/bidders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Inschrijving als bieder is mislukt.');
      }
      const bidder = data.bidder as BidderSummary;
      setCurrentBidderNumber(bidder.bidderNumber);
      await refreshState();
      return bidder;
    },
    [refreshState, setCurrentBidderNumber]
  );

  const placeBid = useCallback(
    async (input: {
      artworkId: string;
      amount: number;
      bidderNumber?: string;
      source?: 'qr' | 'floor';
    }) => {
      const rawTarget = input.bidderNumber ?? currentBidderNumber ?? '';
      const targetNumber = normalizeBidderNumber(rawTarget);
      if (!targetNumber) {
        throw new Error('Vul eerst een geldig biedernummer in (bv. #027) of schrijf je in.');
      }

      const source = input.source ?? 'qr';
      if (source !== 'floor' && !onSiteVerifiedState) {
        throw new Error(
          'Bieden kan enkel ter plekke in M Leuven. Bevestig eerst je aanwezigheid in de zaal.'
        );
      }

      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: input.artworkId,
          amount: input.amount,
          bidderNumber: targetNumber,
          source,
          onSiteVerified: source === 'floor' ? true : onSiteVerifiedState,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bod werd geweigerd.');
      }
      if (source !== 'floor') {
        setCurrentBidderNumber(targetNumber);
      }
      return data as { bid: Bid; artwork: Artwork };
    },
    [currentBidderNumber, onSiteVerifiedState, setCurrentBidderNumber]
  );

  const createArtwork = useCallback(async (payload: Partial<Artwork>) => {
    const res = await fetch('/api/artworks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunstwerk toevoegen mislukt.');
    return data.artwork as Artwork;
  }, []);

  const updateArtwork = useCallback(async (id: string, payload: Partial<Artwork>) => {
    const res = await fetch(`/api/artworks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunstwerk bijwerken mislukt.');
    return data.artwork as Artwork;
  }, []);

  const deleteArtwork = useCallback(async (id: string) => {
    const res = await fetch(`/api/artworks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunstwerk verwijderen mislukt.');
  }, []);

  const updateAuctionState = useCallback(async (payload: AuctionUpdatePayload) => {
    const res = await fetch('/api/auction', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Veilingstatus bijwerken mislukt.');
    return data.auctionState as AuctionState;
  }, []);

  const importCatalogPdf = useCallback(
    async (input: { fileName: string; base64: string; replaceExisting?: boolean }) => {
      const res = await fetch('/api/import/catalog-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PDF-import mislukt.');
      await refreshState();
      return data as {
        importedCount: number;
        totalPages: number;
        message: string;
        rawPreview?: string;
      };
    },
    [refreshState]
  );

  const uploadFloorplan = useCallback(
    async (input: { fileName: string; dataUrl: string }) => {
      const res = await fetch('/api/import/floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grondplan opladen mislukt.');
      await refreshState();
      return data.floorplanImageUrl as string;
    },
    [refreshState]
  );

  const uploadArtworkImage = useCallback(
    async (input: { fileName: string; dataUrl: string }) => {
      const res = await fetch('/api/import/artwork-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Afbeelding opladen mislukt.');
      return data.imageUrl as string;
    },
    []
  );

  const resetAuction = useCallback(async () => {
    const res = await fetch('/api/auction/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Veiling herstellen mislukt.');
    const data = (await res.json()) as AuctionSnapshot;
    setSnapshot(data);
  }, []);

  const value: AuctionContextValue = {
    artworks: snapshot.artworks,
    bids: snapshot.bids,
    bidders: snapshot.bidders,
    auctionState: snapshot.auctionState ?? null,
    currentBidderNumber,
    onSiteVerified: onSiteVerifiedState,
    setOnSiteVerified,
    loading,
    connected,
    error,
    setCurrentBidderNumber,
    registerBidder,
    placeBid,
    createArtwork,
    updateArtwork,
    deleteArtwork,
    updateAuctionState,
    importCatalogPdf,
    uploadFloorplan,
    uploadArtworkImage,
    resetAuction,
    refreshState,
  };

  return <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>;
}

export function useAuction(): AuctionContextValue {
  const ctx = useContext(AuctionContext);
  if (!ctx) {
    throw new Error('useAuction moet binnen AuctionProvider gebruikt worden.');
  }
  return ctx;
}
