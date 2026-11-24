import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdminAuthStatus,
  Artwork,
  AuctionSnapshot,
  AuctionState,
  Bid,
  BidderBillingProfile,
  BidderSummary,
  InvoiceOrganizerSettings,
} from '../types/auction';
import { normalizeBidderNumber, normalizeVatNumber } from '../utils/format';
import { buildInitialSeedSnapshot, DEFAULT_ORGANIZER_SETTINGS } from '../utils/catalogSeed';

interface AuctionUpdatePayload extends Partial<AuctionState> {
  timerAction?: 'start' | 'pause' | 'reset' | 'add_60';
  durationSeconds?: number;
}

export interface BidderRegistrationInput {
  bidderNumber: string;
  name: string;
  companyName?: string;
  vatNumber?: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country?: string;
}

interface AuctionContextValue {
  artworks: Artwork[];
  bids: Bid[];
  bidders: BidderSummary[];
  auctionState: AuctionState | null;
  billingProfiles: BidderBillingProfile[];
  organizerSettings: InvoiceOrganizerSettings;
  authStatus: AdminAuthStatus;
  isAdmin: boolean;
  currentBidderNumber: string | null;
  onSiteVerified: boolean;
  setOnSiteVerified: (verified: boolean) => void;
  loading: boolean;
  connected: boolean;
  error: string | null;
  setCurrentBidderNumber: (bidderNumber: string | null) => void;
  loginAdmin: (username: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  registerBidder: (input: BidderRegistrationInput) => Promise<BidderSummary>;
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
  fetchBillingData: () => Promise<void>;
  updateBillingProfile: (
    bidderNumber: string,
    payload: Partial<BidderBillingProfile>
  ) => Promise<BidderBillingProfile>;
  updateOrganizerSettings: (
    payload: Partial<InvoiceOrganizerSettings>
  ) => Promise<InvoiceOrganizerSettings>;
  resetAuction: () => Promise<void>;
  refreshState: () => Promise<void>;
  favoriteIds: string[];
  isFavorite: (artworkId: string) => boolean;
  toggleFavorite: (artworkId: string) => void;
  clearFavorites: () => void;
}

const AuctionContext = createContext<AuctionContextValue | null>(null);
const BIDDER_STORAGE_KEY = 'art_for_climate_bidder_number';
const ONSITE_STORAGE_KEY = 'art_for_climate_mleuven_onsite';
const FAVORITES_STORAGE_KEY = 'art_for_climate_favorites_v1';
const LOCAL_SNAPSHOT_KEY = 'art_for_climate_static_snapshot_v12c';
const LOCAL_BILLING_KEY = 'art_for_climate_static_billing_v5';
const LOCAL_SETTINGS_KEY = 'art_for_climate_static_settings_v5';

function loadLocalFallbackSnapshot(): AuctionSnapshot {
  try {
    const raw = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuctionSnapshot;
      if (Array.isArray(parsed.artworks) && parsed.artworks.length > 0 && parsed.auctionState) {
        return parsed;
      }
    }
  } catch {
    // Val terug op officiële gebundelde catalogus
  }
  return buildInitialSeedSnapshot();
}

function loadLocalBillingProfiles(): BidderBillingProfile[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_BILLING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as BidderBillingProfile[];
    }
  } catch {
    // Negeer
  }
  return [];
}

function loadLocalOrganizerSettings(): InvoiceOrganizerSettings {
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_ORGANIZER_SETTINGS, ...(JSON.parse(raw) as Partial<InvoiceOrganizerSettings>) };
    }
  } catch {
    // Negeer
  }
  return DEFAULT_ORGANIZER_SETTINGS;
}

function loadStoredFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from(
        new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
      );
    }
  } catch {
    // Negeer opslagfout
  }
  return [];
}

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot>(() => buildInitialSeedSnapshot());
  const [billingProfiles, setBillingProfiles] = useState<BidderBillingProfile[]>([]);
  const [organizerSettings, setOrganizerSettings] = useState<InvoiceOrganizerSettings>(
    DEFAULT_ORGANIZER_SETTINGS
  );

  // Sessietoken blijft uitsluitend in geheugen (nooit in localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus>({
    configured: true,
    hasEnvCredentials: false,
    authenticated: false,
    username: null,
  });

  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const backendAvailableRef = useRef<boolean>(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

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
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadStoredFavorites());

  const setMemoryToken = useCallback((token: string | null) => {
    authTokenRef.current = token;
    setAuthToken(token);
  }, []);

  const persistLocalFallback = useCallback(
    (
      nextSnap: AuctionSnapshot,
      nextBilling?: BidderBillingProfile[],
      nextSettings?: InvoiceOrganizerSettings
    ) => {
      try {
        window.localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(nextSnap));
        if (nextBilling) {
          window.localStorage.setItem(LOCAL_BILLING_KEY, JSON.stringify(nextBilling));
        }
        if (nextSettings) {
          window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(nextSettings));
        }
        channelRef.current?.postMessage({
          snapshot: nextSnap,
          billingProfiles: nextBilling,
          organizerSettings: nextSettings,
        });
      } catch {
        // Negeer opslagfout
      }
    },
    []
  );

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

  const refreshAuthStatus = useCallback(async () => {
    if (!backendAvailableRef.current) {
      setMemoryToken(null);
      setAuthStatus({
        configured: false,
        hasEnvCredentials: false,
        authenticated: false,
        username: null,
      });
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (authTokenRef.current) {
        headers.Authorization = `Bearer ${authTokenRef.current}`;
      }
      const res = await fetch('/api/auth/status', { headers });
      if (!res.ok) return;
      const data = (await res.json()) as AdminAuthStatus;
      setAuthStatus(data);
      if (!data.authenticated && authTokenRef.current) {
        setMemoryToken(null);
      }
    } catch {
      // Negeer
    }
  }, [setMemoryToken]);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        throw new Error('STATIC_HOSTING');
      }
      const data = (await res.json()) as AuctionSnapshot;
      if (!Array.isArray(data.artworks) || data.artworks.length === 0) {
        throw new Error('STATIC_HOSTING');
      }
      backendAvailableRef.current = true;
      setBackendAvailable(true);
      setSnapshot(data);
      setError(null);
    } catch {
      backendAvailableRef.current = false;
      setBackendAvailable(false);
      setConnected(true);
      const localSnap = loadLocalFallbackSnapshot();
      setSnapshot(localSnap);
      setBillingProfiles(loadLocalBillingProfiles());
      setOrganizerSettings(loadLocalOrganizerSettings());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('art_for_climate_sync');
      channelRef.current = ch;
      ch.onmessage = (ev) => {
        if (Array.isArray(ev.data?.favoriteIds)) {
          setFavoriteIds(ev.data.favoriteIds as string[]);
        }
        if (!backendAvailableRef.current && ev.data?.snapshot) {
          setSnapshot(ev.data.snapshot as AuctionSnapshot);
          if (ev.data.billingProfiles && authTokenRef.current) {
            setBillingProfiles(ev.data.billingProfiles as BidderBillingProfile[]);
          }
          if (ev.data.organizerSettings) {
            setOrganizerSettings(ev.data.organizerSettings as InvoiceOrganizerSettings);
          }
        }
      };
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === FAVORITES_STORAGE_KEY) {
        setFavoriteIds(loadStoredFavorites());
      }
    };
    window.addEventListener('storage', onStorage);

    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connectSSE = () => {
      if (!backendAvailableRef.current) return;
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
        'bidder_updated',
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
        if (!backendAvailableRef.current) {
          source?.close();
          return;
        }
        setConnected(false);
        source?.close();
        if (reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 3000);
        }
      };
    };

    void refreshState().then(() => {
      void refreshAuthStatus();
      if (backendAvailableRef.current) {
        connectSSE();
      }
    });

    return () => {
      source?.close();
      channelRef.current?.close();
      window.removeEventListener('storage', onStorage);
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [refreshState, refreshAuthStatus]);

  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
      };
      if (authTokenRef.current) {
        headers.Authorization = `Bearer ${authTokenRef.current}`;
      }
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        setMemoryToken(null);
        setBillingProfiles([]);
        setAuthStatus((prev) => ({ ...prev, authenticated: false, username: null }));
      }
      return res;
    },
    [setMemoryToken]
  );

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      const cleanUser = username.trim();
      if (!backendAvailableRef.current) {
        throw new Error(
          'Beheerderstoegang vereist een actieve serververbinding met ingestelde beheerdersgegevens.'
        );
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Aanmelden mislukt.');
      }
      setMemoryToken(data.token as string);
      await refreshAuthStatus();
    },
    [refreshAuthStatus, setMemoryToken]
  );

  const logoutAdmin = useCallback(async () => {
    if (backendAvailableRef.current) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Negeer
      }
    }
    setMemoryToken(null);
    setBillingProfiles([]);
    setAuthStatus((prev) => ({
      ...prev,
      authenticated: false,
      username: null,
    }));
  }, [setMemoryToken]);

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

  const fetchBillingData = useCallback(async () => {
    if (!authTokenRef.current) return;
    if (!backendAvailableRef.current) {
      setBillingProfiles(loadLocalBillingProfiles());
      setOrganizerSettings(loadLocalOrganizerSettings());
      return;
    }
    try {
      const res = await adminFetch('/api/admin/billing');
      if (!res.ok) return;
      const data = (await res.json()) as {
        bidders: BidderBillingProfile[];
        organizerSettings: InvoiceOrganizerSettings;
      };
      if (Array.isArray(data.bidders)) setBillingProfiles(data.bidders);
      if (data.organizerSettings) setOrganizerSettings(data.organizerSettings);
    } catch {
      // Negeer netwerkfout
    }
  }, [adminFetch]);

  const registerBidder = useCallback(
    async (input: BidderRegistrationInput) => {
      if (!backendAvailableRef.current) {
        const normalizedNumber = normalizeBidderNumber(input.bidderNumber);
        if (!normalizedNumber) {
          throw new Error(
            'Biednummer is verplicht. Vul het nummer van jouw bordje in (bv. #027).'
          );
        }
        const rawVat = (input.vatNumber ?? '').trim();
        let normalizedVat = '';
        if (rawVat) {
          const parsed = normalizeVatNumber(rawVat);
          if (!parsed) {
            throw new Error('Het opgegeven btw-nummer is ongeldig (bv. BE 0544.963.123).');
          }
          normalizedVat = parsed;
        }
        const cleanEmail = input.email.trim();
        const currentProfiles = loadLocalBillingProfiles();
        const existingSameEmail = currentProfiles.find(
          (b) => b.email && b.email.toLowerCase() === cleanEmail.toLowerCase()
        );
        if (existingSameEmail && existingSameEmail.bidderNumber !== normalizedNumber) {
          throw new Error(
            `Dit e-mailadres is reeds gekoppeld aan biednummer ${existingSameEmail.bidderNumber}.`
          );
        }
        const existingByNumber = currentProfiles.find(
          (b) => b.bidderNumber === normalizedNumber
        );
        if (existingByNumber) {
          if (
            existingByNumber.email &&
            existingByNumber.email.toLowerCase() === cleanEmail.toLowerCase()
          ) {
            const summary: BidderSummary = {
              bidderNumber: existingByNumber.bidderNumber,
              city: existingByNumber.city,
              registeredAt: existingByNumber.registeredAt,
            };
            setCurrentBidderNumber(summary.bidderNumber);
            return summary;
          }
          if (existingByNumber.email) {
            throw new Error(
              `Biednummer ${normalizedNumber} is al ingeschreven. Meld je aan via "Al ingeschreven? Inloggen".`
            );
          }
        }

        const profile: BidderBillingProfile = {
          bidderNumber: normalizedNumber,
          name: input.name.trim(),
          companyName: (input.companyName ?? '').trim(),
          vatNumber: normalizedVat,
          email: cleanEmail,
          street: input.street.trim(),
          postalCode: input.postalCode.trim(),
          city: input.city.trim(),
          country: (input.country || 'België').trim(),
          registeredAt: existingByNumber?.registeredAt ?? new Date().toISOString(),
        };
        const updatedProfiles = existingByNumber
          ? currentProfiles.map((p) => (p.bidderNumber === normalizedNumber ? profile : p))
          : [...currentProfiles, profile];

        const summary: BidderSummary = {
          bidderNumber: profile.bidderNumber,
          city: profile.city,
          registeredAt: profile.registeredAt,
        };
        const nextBidders = snapshot.bidders.some((b) => b.bidderNumber === summary.bidderNumber)
          ? snapshot.bidders
          : [...snapshot.bidders, summary];
        const nextSnap: AuctionSnapshot = {
          ...snapshot,
          bidders: nextBidders,
        };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap, updatedProfiles);
        setCurrentBidderNumber(summary.bidderNumber);
        return summary;
      }

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
    [persistLocalFallback, refreshState, setCurrentBidderNumber, snapshot]
  );

  const placeBid = useCallback(
    async (input: {
      artworkId: string;
      amount: number;
      bidderNumber?: string;
      source?: 'qr' | 'floor';
    }) => {
      const source = input.source ?? 'qr';
      if (source !== 'floor' && !currentBidderNumber) {
        throw new Error('Log eerst in met jouw biednummer om een bod uit te brengen.');
      }

      const rawTarget = source === 'floor' ? (input.bidderNumber ?? '') : (currentBidderNumber ?? '');
      const targetNumber = normalizeBidderNumber(rawTarget);
      if (!targetNumber) {
        throw new Error('Biednummer is verplicht om een bod uit te brengen (bv. #027).');
      }

      if (source !== 'floor' && !onSiteVerifiedState) {
        throw new Error(
          'Bieden kan enkel ter plekke in M Leuven. Bevestig eerst je aanwezigheid in de zaal.'
        );
      }

      if (!backendAvailableRef.current) {
        if (source === 'floor' && !authTokenRef.current) {
          throw new Error('Enkel de aangemelde veilingmeester kan zaalbiedingen registreren.');
        }
        if (snapshot.auctionState?.auctionClosed) {
          throw new Error('De veiling is afgesloten door de veilingmeester.');
        }
        const idx = snapshot.artworks.findIndex((a) => a.id === input.artworkId);
        if (idx === -1) throw new Error('Kunstwerk niet gevonden.');
        const artwork = snapshot.artworks[idx];
        if (artwork.status !== 'live') {
          throw new Error(`Biedingen zijn gesloten voor Lot ${artwork.lotNumber}.`);
        }
        if (!Number.isInteger(input.amount) || input.amount <= artwork.currentBid || input.amount > 1_000_000) {
          throw new Error(
            `Het bod moet strikt hoger zijn dan € ${artwork.currentBid.toLocaleString('nl-BE')}.`
          );
        }
        if (artwork.bidCount === 0 && input.amount < artwork.startingBid) {
          throw new Error(
            `Het openingsbod bedraagt minstens € ${artwork.startingBid.toLocaleString('nl-BE')}.`
          );
        }
        const nowIso = new Date().toISOString();
        const bid: Bid = {
          id: `bid-${Date.now()}`,
          artworkId: artwork.id,
          lotNumber: artwork.lotNumber,
          artworkTitle: artwork.title || artwork.artist,
          bidderNumber: targetNumber,
          amount: input.amount,
          source,
          createdAt: nowIso,
        };
        const updatedArtwork: Artwork = {
          ...artwork,
          currentBid: input.amount,
          highestBidderNumber: targetNumber,
          bidCount: artwork.bidCount + 1,
          updatedAt: nowIso,
        };
        const nextArtworks = [...snapshot.artworks];
        nextArtworks[idx] = updatedArtwork;

        let nextBidders = snapshot.bidders;
        const currentProfiles = loadLocalBillingProfiles();
        if (!currentProfiles.some((b) => b.bidderNumber === targetNumber)) {
          currentProfiles.push({
            bidderNumber: targetNumber,
            name: `Zaalbieder ${targetNumber}`,
            companyName: '',
            vatNumber: '',
            email: '',
            street: '',
            postalCode: '3000',
            city: 'Leuven',
            country: 'België',
            registeredAt: nowIso,
          });
        }
        if (!nextBidders.some((b) => b.bidderNumber === targetNumber)) {
          nextBidders = [
            ...nextBidders,
            { bidderNumber: targetNumber, city: 'Leuven', registeredAt: nowIso },
          ];
        }

        const nextSnap: AuctionSnapshot = {
          ...snapshot,
          artworks: nextArtworks,
          bids: [bid, ...snapshot.bids],
          bidders: nextBidders,
        };
        setSnapshot(nextSnap);
        if (authTokenRef.current) setBillingProfiles(currentProfiles);
        persistLocalFallback(nextSnap, currentProfiles);
        if (source !== 'floor') {
          setCurrentBidderNumber(targetNumber);
        }
        return { bid, artwork: updatedArtwork };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (source === 'floor' && authTokenRef.current) {
        headers.Authorization = `Bearer ${authTokenRef.current}`;
      }

      const res = await fetch('/api/bids', {
        method: 'POST',
        headers,
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
    [currentBidderNumber, onSiteVerifiedState, persistLocalFallback, setCurrentBidderNumber, snapshot]
  );

  const createArtwork = useCallback(
    async (payload: Partial<Artwork>) => {
      if (!backendAvailableRef.current) {
        const maxLot = snapshot.artworks.reduce((m, a) => (a.lotNumber > m ? a.lotNumber : m), 9);
        const nowIso = new Date().toISOString();
        const lotNumber = Number(payload.lotNumber) || maxLot + 1;
        const artwork: Artwork = {
          id: `lot-${String(lotNumber).padStart(2, '0')}-${Date.now().toString(36)}`,
          lotNumber,
          title: (payload.title ?? '').trim(),
          artist: payload.artist || 'Kunstenaar',
          artistLocation: payload.artistLocation || 'Leuven / België',
          year: payload.year || '2026',
          category: payload.category || 'Beeldende kunst',
          medium: payload.medium || 'Kunstwerk',
          dimensions: payload.dimensions || 'Zie catalogus',
          galleryRoom: payload.galleryRoom || 'Forum',
          plinthCode: payload.plinthCode || `Positie ${lotNumber}`,
          provenance: payload.provenance || 'Leuven 2030 — Art for Climate.',
          climateImpact: payload.climateImpact || 'Ten voordele van het Leuvens Klimaatfonds.',
          description: payload.description || '',
          imageUrl: payload.imageUrl || '/art-for-climate-banner.png',
          estimateLow: Number(payload.estimateLow) || Number(payload.startingBid) || 500,
          estimateHigh: Number(payload.estimateHigh) || 900,
          startingBid: Number(payload.startingBid) || 500,
          currentBid: 0,
          highestBidderNumber: null,
          bidCount: 0,
          status: payload.status || 'live',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        const nextSnap: AuctionSnapshot = {
          ...snapshot,
          artworks: [...snapshot.artworks, artwork].sort((a, b) => a.lotNumber - b.lotNumber),
        };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap);
        return artwork;
      }

      const res = await adminFetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunstwerk toevoegen mislukt.');
      return data.artwork as Artwork;
    },
    [adminFetch, persistLocalFallback, snapshot]
  );

  const updateArtwork = useCallback(
    async (id: string, payload: Partial<Artwork>) => {
      if (!backendAvailableRef.current) {
        const nextArtworks = snapshot.artworks.map((a) =>
          a.id === id ? { ...a, ...payload, updatedAt: new Date().toISOString() } : a
        );
        const updated = nextArtworks.find((a) => a.id === id);
        if (!updated) throw new Error('Kunstwerk niet gevonden.');
        const nextSnap: AuctionSnapshot = { ...snapshot, artworks: nextArtworks };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap);
        return updated;
      }

      const res = await adminFetch(`/api/artworks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunstwerk bijwerken mislukt.');
      return data.artwork as Artwork;
    },
    [adminFetch, persistLocalFallback, snapshot]
  );

  const deleteArtwork = useCallback(
    async (id: string) => {
      if (!backendAvailableRef.current) {
        const nextSnap: AuctionSnapshot = {
          ...snapshot,
          artworks: snapshot.artworks.filter((a) => a.id !== id),
          bids: snapshot.bids.filter((b) => b.artworkId !== id),
        };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap);
        return;
      }

      const res = await adminFetch(`/api/artworks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunstwerk verwijderen mislukt.');
    },
    [adminFetch, persistLocalFallback, snapshot]
  );

  const updateAuctionState = useCallback(
    async (payload: AuctionUpdatePayload) => {
      if (!backendAvailableRef.current) {
        const nowMs = Date.now();
        const cur = snapshot.auctionState;
        const nextState: AuctionState = { ...cur, ...payload, updatedAt: new Date(nowMs).toISOString() };
        if (payload.timerAction === 'start') {
          const rem = cur.lotTimerRemainingSeconds || cur.lotDurationSeconds;
          nextState.lotTimerEndsAt = new Date(nowMs + rem * 1000).toISOString();
        } else if (payload.timerAction === 'pause') {
          const rem = cur.lotTimerEndsAt
            ? Math.max(0, Math.ceil((new Date(cur.lotTimerEndsAt).getTime() - nowMs) / 1000))
            : cur.lotTimerRemainingSeconds;
          nextState.lotTimerRemainingSeconds = rem;
          nextState.lotTimerEndsAt = null;
        } else if (payload.timerAction === 'reset') {
          nextState.lotTimerEndsAt = null;
          nextState.lotTimerRemainingSeconds = cur.lotDurationSeconds;
        } else if (payload.timerAction === 'add_60') {
          const baseRem = cur.lotTimerEndsAt
            ? Math.max(0, Math.ceil((new Date(cur.lotTimerEndsAt).getTime() - nowMs) / 1000))
            : cur.lotTimerRemainingSeconds;
          const rem = baseRem + 60;
          nextState.lotTimerRemainingSeconds = rem;
          if (cur.lotTimerEndsAt) {
            nextState.lotTimerEndsAt = new Date(nowMs + rem * 1000).toISOString();
          }
        }
        const nextSnap: AuctionSnapshot = { ...snapshot, auctionState: nextState };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap);
        return nextState;
      }

      const res = await adminFetch('/api/auction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Veilingstatus bijwerken mislukt.');
      return data.auctionState as AuctionState;
    },
    [adminFetch, persistLocalFallback, snapshot]
  );

  const importCatalogPdf = useCallback(
    async (input: { fileName: string; base64: string; replaceExisting?: boolean }) => {
      if (!backendAvailableRef.current) {
        throw new Error('PDF-verwerking vereist de Node-server; de 44 officiële werken zijn reeds actief.');
      }
      const res = await adminFetch('/api/import/catalog-pdf', {
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
    [adminFetch, refreshState]
  );

  const uploadFloorplan = useCallback(
    async (input: { fileName: string; dataUrl: string }) => {
      if (!backendAvailableRef.current) {
        const nextState: AuctionState = {
          ...snapshot.auctionState,
          floorplanImageUrl: input.dataUrl,
          updatedAt: new Date().toISOString(),
        };
        const nextSnap: AuctionSnapshot = { ...snapshot, auctionState: nextState };
        setSnapshot(nextSnap);
        persistLocalFallback(nextSnap);
        return input.dataUrl;
      }

      const res = await adminFetch('/api/import/floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grondplan opladen mislukt.');
      await refreshState();
      return data.floorplanImageUrl as string;
    },
    [adminFetch, persistLocalFallback, refreshState, snapshot]
  );

  const uploadArtworkImage = useCallback(
    async (input: { fileName: string; dataUrl: string }) => {
      if (!backendAvailableRef.current) {
        return input.dataUrl;
      }
      const res = await adminFetch('/api/import/artwork-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Afbeelding opladen mislukt.');
      return data.imageUrl as string;
    },
    [adminFetch]
  );

  const updateBillingProfile = useCallback(
    async (bidderNumber: string, payload: Partial<BidderBillingProfile>) => {
      if (!backendAvailableRef.current) {
        const list = loadLocalBillingProfiles();
        const idx = list.findIndex((b) => b.bidderNumber === bidderNumber);
        const normalizedVat = payload.vatNumber
          ? normalizeVatNumber(payload.vatNumber)
          : undefined;
        if (payload.vatNumber && !normalizedVat) {
          throw new Error('Ongeldig btw-nummer (bv. BE 0544.963.123).');
        }
        const updated: BidderBillingProfile = {
          ...(idx >= 0
            ? list[idx]
            : {
                bidderNumber,
                name: '',
                companyName: '',
                vatNumber: '',
                email: '',
                street: '',
                postalCode: '3000',
                city: 'Leuven',
                country: 'België',
                registeredAt: new Date().toISOString(),
              }),
          ...payload,
          ...(normalizedVat ? { vatNumber: normalizedVat } : {}),
        };
        if (idx >= 0) list[idx] = updated;
        else list.push(updated);
        setBillingProfiles(list);
        persistLocalFallback(snapshot, list);
        return updated;
      }

      const res = await adminFetch(
        `/api/admin/bidders/${encodeURIComponent(bidderNumber)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Facturatiegegevens bijwerken mislukt.');
      await fetchBillingData();
      return data.bidder as BidderBillingProfile;
    },
    [adminFetch, fetchBillingData, persistLocalFallback, snapshot]
  );

  const updateOrganizerSettings = useCallback(
    async (payload: Partial<InvoiceOrganizerSettings>) => {
      if (!backendAvailableRef.current) {
        const next = { ...organizerSettings, ...payload };
        setOrganizerSettings(next);
        persistLocalFallback(snapshot, undefined, next);
        return next;
      }
      const res = await adminFetch('/api/admin/invoice-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Factuurinstellingen bijwerken mislukt.');
      setOrganizerSettings(data.organizerSettings as InvoiceOrganizerSettings);
      return data.organizerSettings as InvoiceOrganizerSettings;
    },
    [adminFetch, organizerSettings, persistLocalFallback, snapshot]
  );

  const resetAuction = useCallback(async () => {
    if (!backendAvailableRef.current) {
      const clean = buildInitialSeedSnapshot();
      setSnapshot(clean);
      setBillingProfiles([]);
      persistLocalFallback(clean, []);
      return;
    }
    const res = await adminFetch('/api/auction/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Veiling herstellen mislukt.');
    const data = (await res.json()) as AuctionSnapshot;
    setSnapshot(data);
    setBillingProfiles([]);
  }, [adminFetch, persistLocalFallback]);

  const isAdmin = Boolean(authToken && authStatus.authenticated);

  const value: AuctionContextValue = {
    artworks: snapshot.artworks,
    bids: snapshot.bids,
    bidders: snapshot.bidders,
    auctionState: snapshot.auctionState ?? null,
    billingProfiles,
    organizerSettings,
    authStatus,
    isAdmin,
    currentBidderNumber,
    onSiteVerified: onSiteVerifiedState,
    setOnSiteVerified,
    loading,
    connected: connected || !backendAvailable,
    error,
    setCurrentBidderNumber,
    loginAdmin,
    logoutAdmin,
    registerBidder,
    placeBid,
    createArtwork,
    updateArtwork,
    deleteArtwork,
    updateAuctionState,
    importCatalogPdf,
    uploadFloorplan,
    uploadArtworkImage,
    fetchBillingData,
    updateBillingProfile,
    updateOrganizerSettings,
    resetAuction,
    refreshState,
    favoriteIds,
    isFavorite: useCallback(
      (artworkId: string) => favoriteIds.includes(artworkId),
      [favoriteIds]
    ),
    toggleFavorite: useCallback((artworkId: string) => {
      setFavoriteIds((prev) => {
        const next = prev.includes(artworkId)
          ? prev.filter((id) => id !== artworkId)
          : [...prev, artworkId];
        try {
          window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
          channelRef.current?.postMessage({ favoriteIds: next });
        } catch {
          // Negeer opslagfout
        }
        return next;
      });
    }, []),
    clearFavorites: useCallback(() => {
      setFavoriteIds([]);
      try {
        window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
        channelRef.current?.postMessage({ favoriteIds: [] });
      } catch {
        // Negeer opslagfout
      }
    }, []),
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
