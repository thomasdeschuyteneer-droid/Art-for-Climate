import officialCatalogRaw from '../data/official-catalog.json';
import type {
  Artwork,
  AuctionSnapshot,
  AuctionState,
  InvoiceOrganizerSettings,
} from '../types/auction';

interface OfficialCatalogSeedItem {
  id: string;
  lotNumber: number;
  title: string;
  artist: string;
  category: string;
  medium: string;
  dimensions: string;
  galleryRoom: string;
  plinthCode: string;
  credit?: string;
  description: string;
  imageUrl: string;
  startingBid: number;
}

export const DEFAULT_ORGANIZER_SETTINGS: InvoiceOrganizerSettings = {
  legalName: 'Leuven Klimaatneutraal 2030 vzw (Leuven 2030)',
  addressLine: 'Professor Van Overstraetenplein 1',
  postalCity: '3000 Leuven',
  country: 'België',
  vatNumber: 'BE 0544.963.123',
  courtDistrict: 'RPR Leuven',
  iban: '',
  bic: '',
  email: 'info@leuven2030.be',
  vatMode: 'exempt_charity',
};

export function buildInitialSeedSnapshot(): AuctionSnapshot {
  const nowIso = new Date().toISOString();
  const items = officialCatalogRaw as OfficialCatalogSeedItem[];

  const artworks: Artwork[] = items.map((item) => {
    const startBid = Math.max(50, Math.round(item.startingBid || 500));
    return {
      id: item.id,
      lotNumber: item.lotNumber,
      title: item.title,
      artist: item.artist,
      artistLocation: 'Leuven / België',
      year: '2026',
      category: item.category || 'Beeldende kunst',
      medium: item.medium || 'Kunstwerk uit de catalogus',
      dimensions: item.dimensions || 'Zie catalogus',
      galleryRoom: item.galleryRoom || 'Antichambre Deel 1',
      plinthCode: item.plinthCode || `Positie ${item.lotNumber}`,
      provenance: 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.',
      climateImpact:
        'Ten voordele van het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.',
      description: item.description,
      imageUrl: item.imageUrl,
      credit: item.credit || '',
      estimateLow: startBid,
      estimateHigh: Math.round(startBid * 1.8),
      startingBid: startBid,
      currentBid: 0,
      highestBidderNumber: null,
      bidCount: 0,
      status: 'live',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const defaultDuration = 180;
  const auctionState: AuctionState = {
    title: 'Art for Climate',
    slogan: 'Meer kunst, meer toekomst',
    organization: 'Leuven 2030',
    location: 'M Leuven, Leopold Vanderkelenstraat 28',
    eventDateLabel: 'Woensdag 16 december 2026 · 16:00 uur',
    onSiteOnly: true,
    activeLotId: artworks[0]?.id ?? '',
    hammerStage: 'open',
    isLiveSessionActive: true,
    auctionClosed: false,
    lotDurationSeconds: defaultDuration,
    lotTimerEndsAt: null,
    lotTimerRemainingSeconds: defaultDuration,
    announcement:
      'Welkom in M Leuven. Ontdek alle kunstwerken gemixed in Antichambre Deel 1 en 2, bewaar je favorieten en bied op 16 december live in het Forum ten voordele van het Leuvens Klimaatfonds.',
    catalogPdfName: 'LEUVEN2030_catalogus_kunstveiling_v12.pdf',
    floorplanImageUrl: null,
    publicBaseUrl:
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')) ||
      null,
    updatedAt: nowIso,
  };

  return {
    artworks,
    bids: [],
    bidders: [],
    auctionState,
  };
}
