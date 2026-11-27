import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Artwork,
  AuctionState,
  Bid,
  BidderBillingProfile,
  HammerStage,
  InvoiceOrganizerSettings,
  InvoiceVatMode,
  LotStatus,
} from '../types/auction';

const DEFAULT_SUPABASE_URL = 'https://qntcbrwivyfbhefjjrnq.supabase.co';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Sessietoken blijft uitsluitend in het werkgeheugen (nooit in localStorage)
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export interface ArtworkRow {
  id: string;
  lot_number: number;
  title: string;
  artist: string;
  artist_location: string;
  year: string;
  category: string;
  medium: string;
  dimensions: string;
  gallery_room: string;
  plinth_code: string;
  provenance: string;
  climate_impact: string;
  description: string;
  image_url: string;
  credit: string | null;
  estimate_low: number;
  estimate_high: number;
  starting_bid: number;
  current_bid: number;
  highest_bidder_number: string | null;
  bid_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionStateRow {
  id: string;
  title: string;
  slogan: string;
  organization: string;
  location: string;
  event_date_label: string;
  on_site_only: boolean;
  active_lot_id: string;
  hammer_stage: string;
  is_live_session_active: boolean;
  auction_closed: boolean;
  lot_duration_seconds: number;
  lot_timer_ends_at: string | null;
  lot_timer_remaining_seconds: number;
  announcement: string;
  catalog_pdf_name: string | null;
  floorplan_image_url: string | null;
  public_base_url: string | null;
  updated_at: string;
}

export interface BidRow {
  id: string;
  artwork_id: string;
  lot_number: number;
  artwork_title: string;
  bidder_number: string;
  amount: number;
  source: string;
  created_at: string;
}

export interface BidderRow {
  bidder_number: string;
  name: string;
  company_name: string;
  vat_number: string;
  email: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  registered_at: string;
}

export interface OrganizerSettingsRow {
  id: string;
  legal_name: string;
  address_line: string;
  postal_city: string;
  country: string;
  vat_number: string;
  court_district: string;
  iban: string;
  bic: string;
  email: string;
  vat_mode: string;
}

function asLotStatus(raw: string): LotStatus {
  if (raw === 'upcoming' || raw === 'live' || raw === 'sold' || raw === 'passed') {
    return raw;
  }
  return 'live';
}

function asHammerStage(raw: string): HammerStage {
  if (raw === 'open' || raw === 'going_once' || raw === 'going_twice' || raw === 'hammer_down') {
    return raw;
  }
  return 'open';
}

function asVatMode(raw: string): InvoiceVatMode {
  if (raw === 'exempt_charity' || raw === 'vat_6' || raw === 'vat_21') {
    return raw;
  }
  return 'exempt_charity';
}

export function mapArtworkRow(row: ArtworkRow): Artwork {
  return {
    id: row.id,
    lotNumber: Number(row.lot_number),
    title: row.title ?? '',
    artist: row.artist ?? '',
    artistLocation: row.artist_location ?? 'Leuven / België',
    year: row.year ?? '2026',
    category: row.category ?? 'Beeldende kunst',
    medium: row.medium ?? '',
    dimensions: row.dimensions ?? '',
    galleryRoom: row.gallery_room || 'Antichambre Deel 1',
    plinthCode: row.plinth_code ?? '',
    provenance: row.provenance ?? '',
    climateImpact: row.climate_impact ?? '',
    description: row.description ?? '',
    imageUrl: row.image_url || '/art-for-climate-banner.png',
    credit: row.credit ?? '',
    estimateLow: Number(row.estimate_low ?? 500),
    estimateHigh: Number(row.estimate_high ?? 900),
    startingBid: Number(row.starting_bid ?? 500),
    currentBid: Number(row.current_bid ?? 0),
    highestBidderNumber: row.highest_bidder_number ?? null,
    bidCount: Number(row.bid_count ?? 0),
    status: asLotStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAuctionStateRow(row: AuctionStateRow): AuctionState {
  return {
    title: row.title || 'Art for Climate',
    slogan: row.slogan || 'Meer kunst, meer toekomst',
    organization: row.organization || 'Leuven 2030',
    location: row.location || 'M Leuven, Leopold Vanderkelenstraat 28',
    eventDateLabel: row.event_date_label || 'Woensdag 16 december 2026 · 16:00 uur',
    onSiteOnly: Boolean(row.on_site_only),
    activeLotId: row.active_lot_id || 'lot-10',
    hammerStage: asHammerStage(row.hammer_stage),
    isLiveSessionActive: Boolean(row.is_live_session_active),
    auctionClosed: Boolean(row.auction_closed),
    lotDurationSeconds: Number(row.lot_duration_seconds ?? 180),
    lotTimerEndsAt: row.lot_timer_ends_at ?? null,
    lotTimerRemainingSeconds: Number(row.lot_timer_remaining_seconds ?? 180),
    announcement: row.announcement ?? '',
    catalogPdfName: row.catalog_pdf_name ?? null,
    floorplanImageUrl: row.floorplan_image_url ?? null,
    publicBaseUrl: row.public_base_url ?? null,
    updatedAt: row.updated_at,
  };
}

export function mapBidRow(row: BidRow): Bid {
  return {
    id: row.id,
    artworkId: row.artwork_id,
    lotNumber: Number(row.lot_number),
    artworkTitle: row.artwork_title ?? '',
    bidderNumber: row.bidder_number,
    amount: Number(row.amount),
    source: row.source === 'floor' ? 'floor' : 'qr',
    createdAt: row.created_at,
  };
}

export function mapBidderRow(row: BidderRow): BidderBillingProfile {
  return {
    bidderNumber: row.bidder_number,
    name: row.name ?? '',
    companyName: row.company_name ?? '',
    vatNumber: row.vat_number ?? '',
    email: row.email ?? '',
    street: row.street ?? '',
    postalCode: row.postal_code ?? '',
    city: row.city ?? '',
    country: row.country || 'België',
    registeredAt: row.registered_at,
  };
}

export function mapOrganizerSettingsRow(row: OrganizerSettingsRow): InvoiceOrganizerSettings {
  return {
    legalName: row.legal_name,
    addressLine: row.address_line,
    postalCity: row.postal_city,
    country: row.country,
    vatNumber: row.vat_number,
    courtDistrict: row.court_district,
    iban: row.iban ?? '',
    bic: row.bic ?? '',
    email: row.email,
    vatMode: asVatMode(row.vat_mode),
  };
}
