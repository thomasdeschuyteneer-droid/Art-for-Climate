export type LotStatus = 'upcoming' | 'live' | 'sold' | 'passed';

export type HammerStage = 'open' | 'going_once' | 'going_twice' | 'hammer_down';

export interface Artwork {
  id: string;
  lotNumber: number;
  title: string;
  artist: string;
  artistLocation: string;
  year: string;
  category: string;
  medium: string;
  dimensions: string;
  galleryRoom: string;
  plinthCode: string;
  provenance: string;
  climateImpact: string;
  description: string;
  imageUrl: string;
  credit?: string;
  estimateLow: number;
  estimateHigh: number;
  startingBid: number;
  currentBid: number;
  highestBidderNumber: string | null;
  bidCount: number;
  status: LotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  artworkId: string;
  lotNumber: number;
  artworkTitle: string;
  bidderNumber: string;
  amount: number;
  source: 'qr' | 'floor';
  createdAt: string;
}

export interface BidderSummary {
  bidderNumber: string;
  city: string;
  registeredAt: string;
}

export interface AuctionState {
  title: string;
  slogan: string;
  organization: string;
  location: string;
  eventDateLabel: string;
  onSiteOnly: boolean;
  activeLotId: string;
  hammerStage: HammerStage;
  isLiveSessionActive: boolean;
  auctionClosed: boolean;
  lotDurationSeconds: number;
  lotTimerEndsAt: string | null;
  lotTimerRemainingSeconds: number;
  announcement: string;
  catalogPdfName: string | null;
  floorplanImageUrl: string | null;
  updatedAt: string;
}

export interface AuctionSnapshot {
  artworks: Artwork[];
  bids: Bid[];
  bidders: BidderSummary[];
  auctionState: AuctionState;
}
