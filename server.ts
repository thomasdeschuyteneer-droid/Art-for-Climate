import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { extractText, getDocumentProxy } from 'unpdf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const REPO_DATA_DIR = path.resolve(__dirname, 'data');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const SRC_CATALOG_FILE = path.resolve(__dirname, 'src', 'data', 'official-catalog.json');
const DATA_CATALOG_FILE = path.resolve(REPO_DATA_DIR, 'official-catalog.json');

function resolveWritableDataDir(): string {
  try {
    fs.mkdirSync(REPO_DATA_DIR, { recursive: true });
    const probe = path.join(REPO_DATA_DIR, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return REPO_DATA_DIR;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'art-for-climate-data');
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }
}

const DATA_DIR = resolveWritableDataDir();
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'auction-db.json');
const CURRENT_SCHEMA_VERSION = 5;

type LotStatus = 'upcoming' | 'live' | 'sold' | 'passed';
type HammerStage = 'open' | 'going_once' | 'going_twice' | 'hammer_down';

interface OfficialCatalogItem {
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

interface Artwork {
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

interface Bid {
  id: string;
  artworkId: string;
  lotNumber: number;
  artworkTitle: string;
  bidderNumber: string;
  amount: number;
  source: 'qr' | 'floor';
  createdAt: string;
}

type InvoiceVatMode = 'exempt_charity' | 'vat_6' | 'vat_21';

interface BidderRecord {
  bidderNumber: string;
  name: string;
  companyName: string;
  vatNumber: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  registeredAt: string;
}

interface BidderSummary {
  bidderNumber: string;
  city: string;
  registeredAt: string;
}

interface InvoiceOrganizerSettings {
  legalName: string;
  addressLine: string;
  postalCity: string;
  country: string;
  vatNumber: string;
  courtDistrict: string;
  iban: string;
  bic: string;
  email: string;
  vatMode: InvoiceVatMode;
}

interface AuctionState {
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

interface AuctionDB {
  schemaVersion: number;
  artworks: Artwork[];
  bids: Bid[];
  bidders: BidderRecord[];
  organizerSettings: InvoiceOrganizerSettings;
  auctionState: AuctionState;
}

function loadOfficialCatalogSeed(): OfficialCatalogItem[] {
  const candidates = [SRC_CATALOG_FILE, DATA_CATALOG_FILE];
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Probeer volgende locatie
    }
  }
  return [];
}

function createInitialSeed(): AuctionDB {
  const now = new Date();
  const nowIso = now.toISOString();
  const officialItems = loadOfficialCatalogSeed();

  const artworks: Artwork[] = officialItems.map((item) => {
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
      galleryRoom: item.galleryRoom || 'Forum',
      plinthCode: item.plinthCode || `Positie ${item.lotNumber}`,
      provenance: 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.',
      climateImpact:
        'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.',
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

  const defaultActiveId = artworks[0]?.id ?? '';
  const defaultDuration = 180;

  const auctionState: AuctionState = {
    title: 'Art for Climate',
    slogan: 'Kunst vandaag. Impact morgen.',
    organization: 'Leuven 2030',
    location: 'M Leuven, Leopold Vanderkelenstraat 28',
    eventDateLabel: 'Woensdag 16 december 2026 · 16:00 uur',
    onSiteOnly: true,
    activeLotId: defaultActiveId,
    hammerStage: 'open',
    isLiveSessionActive: true,
    auctionClosed: false,
    lotDurationSeconds: defaultDuration,
    lotTimerEndsAt: null,
    lotTimerRemainingSeconds: defaultDuration,
    announcement:
      'Welkom in M Leuven. Bieden gebeurt uitsluitend ter plekke met jouw persoonlijk biedernummer ten voordele van het Leuvens Klimaatfonds.',
    catalogPdfName: 'LEUVEN2030_catalogus_ArtForClimate.pdf',
    floorplanImageUrl: null,
    updatedAt: nowIso,
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    artworks,
    bids: [],
    bidders: [],
    organizerSettings: {
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
    },
    auctionState,
  };
}

function loadDB(): AuctionDB {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seeded = createInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AuctionDB;
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      const seeded = createInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
}

let db: AuctionDB = loadDB();

function persistDB(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Publieke weergave zonder persoonsnamen van bieders (enkel biednummers)
function getPublicSnapshot() {
  const safeBidders: BidderSummary[] = db.bidders.map((b) => ({
    bidderNumber: b.bidderNumber,
    city: b.city,
    registeredAt: b.registeredAt,
  }));
  return {
    artworks: db.artworks,
    bids: db.bids,
    bidders: safeBidders,
    auctionState: db.auctionState,
  };
}

const sseClients = new Set<express.Response>();

function broadcastState(eventType = 'sync'): void {
  const payload = JSON.stringify({
    type: eventType,
    snapshot: getPublicSnapshot(),
    timestamp: new Date().toISOString(),
  });
  for (const client of sseClients) {
    try {
      client.write(`event: ${eventType}\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function formatBidderNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}

function normalizeBidderInput(raw: string): string | null {
  const trimmed = raw.trim().replace(/^#/, '');
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 9999) return null;
  return formatBidderNumber(parsed);
}

function normalizeVatNumber(raw: string): string | null {
  const compact = raw
    .trim()
    .toUpperCase()
    .replace(/[\s.\-/]+/g, '');
  if (!compact) return null;
  const withPrefix = /^[01]\d{9}$/.test(compact) ? `BE${compact}` : compact;
  if (/^BE[01]\d{9}$/.test(withPrefix)) {
    const digits = withPrefix.slice(2);
    return `BE ${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`;
  }
  if (/^(AT|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)[A-Z0-9]{8,12}$/.test(withPrefix)) {
    return `${withPrefix.slice(0, 2)} ${withPrefix.slice(2)}`;
  }
  return null;
}

function getEffectiveRemainingSeconds(state: AuctionState): number {
  if (!state.lotTimerEndsAt) {
    return Math.max(0, state.lotTimerRemainingSeconds);
  }
  const diff = Math.ceil((new Date(state.lotTimerEndsAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

function assignRoomForLot(lotNumber: number, medium: string): { galleryRoom: string; plinthCode: string } {
  if (/huiskamerconcert|improvisatietheater|concert/i.test(medium)) {
    return { galleryRoom: 'Forum', plinthCode: `Forum · Podiumbord ${lotNumber}` };
  }
  const mod = lotNumber % 3;
  if (mod === 1) {
    return { galleryRoom: 'Antichambre Deel 1', plinthCode: `Antichambre 1 · Positie ${lotNumber}` };
  }
  if (mod === 2) {
    return { galleryRoom: 'Antichambre Deel 2', plinthCode: `Antichambre 2 · Positie ${lotNumber}` };
  }
  return { galleryRoom: 'Forum', plinthCode: `Forum · Positie ${lotNumber}` };
}

function parseCatalogPagesToLots(pages: string[]): Array<Partial<Artwork>> {
  const parsedLots: Array<Partial<Artwork>> = [];

  for (const pageText of pages) {
    const lines = pageText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Herken officiële Leuven 2030 cataloguspagina's: "10 | CATALOGUS" of "ART FOR CLIMATE | 11"
    const pageNumLine = lines.find(
      (l) => /^(\d+)\s*\|\s*CATALOGUS$/i.test(l) || /^ART FOR CLIMATE\s*\|\s*(\d+)$/i.test(l)
    );
    if (!pageNumLine) continue;

    const numMatch = pageNumLine.match(/(\d+)/);
    if (!numMatch) continue;
    const lotNumber = Number(numMatch[1]);

    const filtered = lines.filter(
      (l) =>
        !/^\d+\s*\|\s*CATALOGUS$/i.test(l) &&
        !/^ART FOR CLIMATE\s*\|\s*\d+$/i.test(l) &&
        !l.startsWith('©') &&
        !l.startsWith('@ ')
    );

    const startIdx = filtered.findIndex((l) => /startbod:\s*€/i.test(l));
    if (startIdx < 1) continue;

    let metaStart = startIdx;
    while (metaStart > 0 && filtered[metaStart - 1].includes('|')) {
      metaStart--;
    }
    const artistIdx = Math.max(1, metaStart - 1);
    const title = filtered.slice(0, artistIdx).join(' ').replace(/\s+/g, ' ').trim();
    const artist = filtered.slice(artistIdx, metaStart).join(' ').replace(/\s+/g, ' ').trim();
    const metaRaw = filtered.slice(metaStart, startIdx + 1).join(' ');
    const startMatch = metaRaw.match(/startbod:\s*€\s*([\d.]+)/i);
    const startingBid = startMatch ? Number(startMatch[1].replace(/\./g, '')) : 500;
    const parts = metaRaw
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s && !/^startbod:/i.test(s) && !/^voorwaarden/i.test(s) && !/^meer werken/i.test(s));

    const dimRegex = /(\d+(?:[.,]\d+)?\s*[x×]\s*\d+|A4|A5|\d+\s*(?:kg|gr|stuks))/i;
    const dimensions = parts.filter((s) => dimRegex.test(s)).join(' · ') || 'Zie catalogus';
    const medium = parts.filter((s) => !dimRegex.test(s)).join(' · ') || 'Kunstwerk uit de catalogus';
    const description = filtered.slice(startIdx + 1).join(' ').replace(/\s+/g, ' ').trim();
    const { galleryRoom, plinthCode } = assignRoomForLot(lotNumber, medium);

    parsedLots.push({
      lotNumber,
      title: title || `Lot ${lotNumber}`,
      artist: artist || 'Deelnemende kunstenaar',
      medium,
      dimensions,
      galleryRoom,
      plinthCode,
      description:
        description === 'Zonder omschrijving.'
          ? 'Uniek werk uit de officiële Art for Climate-catalogus ten voordele van het Leuvens Klimaatfonds.'
          : description,
      startingBid,
      estimateLow: startingBid,
      estimateHigh: Math.round(startingBid * 1.8),
      status: 'live',
    });
  }

  return parsedLots;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '30mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));
  if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get('/api/state', (_req, res) => {
    res.json(getPublicSnapshot());
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    const initial = JSON.stringify({
      type: 'init',
      snapshot: getPublicSnapshot(),
      timestamp: new Date().toISOString(),
    });
    res.write(`event: init\ndata: ${initial}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.post('/api/bidders', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const companyName = typeof req.body?.companyName === 'string' ? req.body.companyName.trim() : '';
    const rawVat = typeof req.body?.vatNumber === 'string' ? req.body.vatNumber.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const street = typeof req.body?.street === 'string' ? req.body.street.trim() : '';
    const postalCode = typeof req.body?.postalCode === 'string' ? req.body.postalCode.trim() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : 'Leuven';
    const country = typeof req.body?.country === 'string' ? req.body.country.trim() : 'België';

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Vul je volledige naam in om een biednummer te ontvangen.' });
      return;
    }

    if (!companyName || companyName.length < 2) {
      res.status(400).json({ error: 'Vul de bedrijfsnaam of tenaamstelling voor de factuur in.' });
      return;
    }

    const normalizedVat = normalizeVatNumber(rawVat);
    if (!normalizedVat) {
      res.status(400).json({
        error: 'Vul een geldig btw-nummer in voor facturatie (bijvoorbeeld BE 0544.963.123).',
      });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Vul een geldig e-mailadres in voor het verzenden van de factuur.' });
      return;
    }

    if (!street || street.length < 3 || !postalCode || !city) {
      res.status(400).json({
        error: 'Vul een volledig factuuradres (straat + nummer, postcode en gemeente) in.',
      });
      return;
    }

    const existing = db.bidders.find(
      (b) =>
        (b.email && b.email.toLowerCase() === email.toLowerCase()) ||
        (b.vatNumber && b.vatNumber === normalizedVat)
    );
    if (existing) {
      existing.name = name.slice(0, 80);
      existing.companyName = companyName.slice(0, 120);
      existing.vatNumber = normalizedVat;
      existing.email = email.slice(0, 120);
      existing.street = street.slice(0, 140);
      existing.postalCode = postalCode.slice(0, 20);
      existing.city = city.slice(0, 60);
      existing.country = (country || 'België').slice(0, 60);
      persistDB();
      res.json({
        bidder: {
          bidderNumber: existing.bidderNumber,
          city: existing.city,
          registeredAt: existing.registeredAt,
        },
        existing: true,
      });
      return;
    }

    const maxNum = db.bidders.reduce((max, b) => {
      const parsed = Number.parseInt(b.bidderNumber.replace('#', ''), 10);
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);

    const bidder: BidderRecord = {
      bidderNumber: formatBidderNumber(maxNum + 1),
      name: name.slice(0, 80),
      companyName: companyName.slice(0, 120),
      vatNumber: normalizedVat,
      email: email.slice(0, 120),
      street: street.slice(0, 140),
      postalCode: postalCode.slice(0, 20),
      city: city.slice(0, 60),
      country: (country || 'België').slice(0, 60),
      registeredAt: new Date().toISOString(),
    };

    db.bidders.push(bidder);
    persistDB();
    broadcastState('bidder_registered');
    res.status(201).json({
      bidder: {
        bidderNumber: bidder.bidderNumber,
        city: bidder.city,
        registeredAt: bidder.registeredAt,
      },
      existing: false,
    });
  });

  // Vertrouwelijke facturatie-eindpunten uitsluitend voor het beheerpaneel
  app.get('/api/admin/billing', (_req, res) => {
    res.json({
      bidders: db.bidders,
      organizerSettings: db.organizerSettings,
    });
  });

  app.patch('/api/admin/bidders/:bidderNumber', (req, res) => {
    const normalizedNum = normalizeBidderInput(req.params.bidderNumber);
    if (!normalizedNum) {
      res.status(400).json({ error: 'Ongeldig biednummer.' });
      return;
    }
    const bidder = db.bidders.find((b) => b.bidderNumber === normalizedNum);
    if (!bidder) {
      res.status(404).json({ error: 'Bieder niet gevonden.' });
      return;
    }

    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      bidder.name = req.body.name.trim().slice(0, 80);
    }
    if (typeof req.body?.companyName === 'string') {
      bidder.companyName = req.body.companyName.trim().slice(0, 120);
    }
    if (typeof req.body?.vatNumber === 'string' && req.body.vatNumber.trim()) {
      const normalizedVat = normalizeVatNumber(req.body.vatNumber);
      if (!normalizedVat) {
        res.status(400).json({ error: 'Ongeldig btw-nummer (bv. BE 0544.963.123).' });
        return;
      }
      bidder.vatNumber = normalizedVat;
    }
    if (typeof req.body?.email === 'string') {
      bidder.email = req.body.email.trim().slice(0, 120);
    }
    if (typeof req.body?.street === 'string') {
      bidder.street = req.body.street.trim().slice(0, 140);
    }
    if (typeof req.body?.postalCode === 'string') {
      bidder.postalCode = req.body.postalCode.trim().slice(0, 20);
    }
    if (typeof req.body?.city === 'string' && req.body.city.trim()) {
      bidder.city = req.body.city.trim().slice(0, 60);
    }
    if (typeof req.body?.country === 'string' && req.body.country.trim()) {
      bidder.country = req.body.country.trim().slice(0, 60);
    }

    persistDB();
    broadcastState('bidder_updated');
    res.json({ bidder });
  });

  app.patch('/api/admin/invoice-settings', (req, res) => {
    const s = db.organizerSettings;
    if (typeof req.body?.legalName === 'string' && req.body.legalName.trim()) {
      s.legalName = req.body.legalName.trim().slice(0, 140);
    }
    if (typeof req.body?.addressLine === 'string' && req.body.addressLine.trim()) {
      s.addressLine = req.body.addressLine.trim().slice(0, 140);
    }
    if (typeof req.body?.postalCity === 'string' && req.body.postalCity.trim()) {
      s.postalCity = req.body.postalCity.trim().slice(0, 80);
    }
    if (typeof req.body?.country === 'string' && req.body.country.trim()) {
      s.country = req.body.country.trim().slice(0, 60);
    }
    if (typeof req.body?.vatNumber === 'string' && req.body.vatNumber.trim()) {
      s.vatNumber = req.body.vatNumber.trim().slice(0, 40);
    }
    if (typeof req.body?.courtDistrict === 'string') {
      s.courtDistrict = req.body.courtDistrict.trim().slice(0, 60);
    }
    if (typeof req.body?.iban === 'string') {
      s.iban = req.body.iban.trim().toUpperCase().slice(0, 40);
    }
    if (typeof req.body?.bic === 'string') {
      s.bic = req.body.bic.trim().toUpperCase().slice(0, 20);
    }
    if (typeof req.body?.email === 'string') {
      s.email = req.body.email.trim().slice(0, 120);
    }
    if (
      req.body?.vatMode === 'exempt_charity' ||
      req.body?.vatMode === 'vat_6' ||
      req.body?.vatMode === 'vat_21'
    ) {
      s.vatMode = req.body.vatMode;
    }

    persistDB();
    res.json({ organizerSettings: s });
  });

  app.post('/api/bids', (req, res) => {
    const artworkId = typeof req.body?.artworkId === 'string' ? req.body.artworkId.trim() : '';
    const rawBidderNumber = typeof req.body?.bidderNumber === 'string' ? req.body.bidderNumber.trim() : '';
    const amount = Number(req.body?.amount);
    const source: 'qr' | 'floor' = req.body?.source === 'floor' ? 'floor' : 'qr';
    const onSiteVerified = Boolean(req.body?.onSiteVerified) || source === 'floor';

    if (db.auctionState.auctionClosed) {
      res.status(409).json({
        error: 'De veiling is afgesloten door de veilingmeester. Er kunnen geen nieuwe biedingen meer worden uitgebracht.',
      });
      return;
    }

    if (!onSiteVerified) {
      res.status(403).json({
        error: 'Bieden kan uitsluitend ter plekke in M Leuven. Bevestig je aanwezigheid in de zaal.',
      });
      return;
    }

    const artwork = db.artworks.find((a) => a.id === artworkId);
    if (!artwork) {
      res.status(404).json({ error: 'Dit kunstwerk werd niet teruggevonden in de catalogus.' });
      return;
    }

    if (artwork.status !== 'live') {
      res.status(409).json({
        error: `Biedingen zijn momenteel gesloten voor Lot ${artwork.lotNumber}.`,
      });
      return;
    }

    const normalizedNumber = normalizeBidderInput(rawBidderNumber);
    if (!normalizedNumber) {
      res.status(400).json({
        error: 'Geef een geldig biedernummer in (bijvoorbeeld #027).',
      });
      return;
    }

    let bidder = db.bidders.find((b) => b.bidderNumber === normalizedNumber);
    if (!bidder) {
      // Biedernummers die ter plekke aan de balie in M Leuven uitgereikt werden
      bidder = {
        bidderNumber: normalizedNumber,
        name: `Zaalbieder ${normalizedNumber}`,
        companyName: '',
        vatNumber: '',
        email: '',
        street: '',
        postalCode: '3000',
        city: 'Leuven',
        country: 'België',
        registeredAt: new Date().toISOString(),
      };
      db.bidders.push(bidder);
    }

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      res.status(400).json({ error: 'Het bod moet een geheel bedrag in euro zijn.' });
      return;
    }

    if (amount <= artwork.currentBid) {
      res.status(409).json({
        error: `Het bod moet strikt hoger zijn dan het huidige hoogste bod van € ${artwork.currentBid.toLocaleString('nl-BE')}.`,
      });
      return;
    }

    if (artwork.bidCount === 0 && amount < artwork.startingBid) {
      res.status(409).json({
        error: `Het openingsbod bedraagt minstens € ${artwork.startingBid.toLocaleString('nl-BE')}.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newBid: Bid = {
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      artworkId: artwork.id,
      lotNumber: artwork.lotNumber,
      artworkTitle: artwork.title,
      bidderNumber: bidder.bidderNumber,
      amount,
      source,
      createdAt: nowIso,
    };

    artwork.currentBid = amount;
    artwork.highestBidderNumber = bidder.bidderNumber;
    artwork.bidCount += 1;
    artwork.updatedAt = nowIso;

    if (db.auctionState.activeLotId === artwork.id && db.auctionState.hammerStage !== 'open') {
      db.auctionState.hammerStage = 'open';
      db.auctionState.updatedAt = nowIso;
    }

    db.bids.unshift(newBid);
    persistDB();
    broadcastState('bid_placed');
    res.status(201).json({ bid: newBid, artwork });
  });

  app.post('/api/artworks', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const artist = typeof req.body?.artist === 'string' ? req.body.artist.trim() : '';
    if (!title || !artist) {
      res.status(400).json({ error: 'Titel en kunstenaar zijn verplicht.' });
      return;
    }

    const maxLot = db.artworks.reduce((max, a) => (a.lotNumber > max ? a.lotNumber : max), 9);
    const startingBid = Math.max(50, Math.round(Number(req.body?.startingBid) || 500));
    const estimateLow = Math.max(startingBid, Math.round(Number(req.body?.estimateLow) || startingBid));
    const estimateHigh = Math.max(estimateLow, Math.round(Number(req.body?.estimateHigh) || Math.round(startingBid * 1.8)));
    const nowIso = new Date().toISOString();
    const lotNumber = Number(req.body?.lotNumber) > 0 ? Math.round(Number(req.body.lotNumber)) : maxLot + 1;
    const slugId = `lot-${String(lotNumber).padStart(2, '0')}-${Date.now().toString(36).slice(-4)}`;

    const statusInput = req.body?.status;
    const status: LotStatus =
      statusInput === 'live' || statusInput === 'sold' || statusInput === 'passed' || statusInput === 'upcoming'
        ? statusInput
        : 'live';

    const artwork: Artwork = {
      id: slugId,
      lotNumber,
      title: title.slice(0, 140),
      artist: artist.slice(0, 90),
      artistLocation: (typeof req.body?.artistLocation === 'string' ? req.body.artistLocation.trim() : 'Leuven / België').slice(0, 80),
      year: (typeof req.body?.year === 'string' ? req.body.year.trim() : '2026').slice(0, 16),
      category: (typeof req.body?.category === 'string' ? req.body.category.trim() : 'Beeldende kunst').slice(0, 60),
      medium: (typeof req.body?.medium === 'string' ? req.body.medium.trim() : 'Kunstwerk uit de catalogus').slice(0, 160),
      dimensions: (typeof req.body?.dimensions === 'string' ? req.body.dimensions.trim() : 'Zie catalogus').slice(0, 80),
      galleryRoom: (typeof req.body?.galleryRoom === 'string' ? req.body.galleryRoom.trim() : 'Forum').slice(0, 60),
      plinthCode: (typeof req.body?.plinthCode === 'string' ? req.body.plinthCode.trim() : `Positie ${lotNumber}`).slice(0, 60),
      provenance: (typeof req.body?.provenance === 'string' ? req.body.provenance.trim() : 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.').slice(0, 200),
      climateImpact: (typeof req.body?.climateImpact === 'string' ? req.body.climateImpact.trim() : '100% ten voordele van het Leuvens Klimaatfonds.').slice(0, 240),
      description: (typeof req.body?.description === 'string' ? req.body.description.trim() : 'Kunstwerk uit de Art for Climate-catalogus van Leuven 2030.').slice(0, 600),
      imageUrl: typeof req.body?.imageUrl === 'string' && req.body.imageUrl.trim() ? req.body.imageUrl.trim() : '/art-for-climate-banner.png',
      estimateLow,
      estimateHigh,
      startingBid,
      currentBid: 0,
      highestBidderNumber: null,
      bidCount: 0,
      status,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.artworks.push(artwork);
    db.artworks.sort((a, b) => a.lotNumber - b.lotNumber);
    persistDB();
    broadcastState('artwork_created');
    res.status(201).json({ artwork });
  });

  app.patch('/api/artworks/:id', (req, res) => {
    const artwork = db.artworks.find((a) => a.id === req.params.id);
    if (!artwork) {
      res.status(404).json({ error: 'Kunstwerk niet gevonden.' });
      return;
    }

    const stringFields: Array<keyof Pick<
      Artwork,
      | 'title'
      | 'artist'
      | 'artistLocation'
      | 'year'
      | 'category'
      | 'medium'
      | 'dimensions'
      | 'galleryRoom'
      | 'plinthCode'
      | 'provenance'
      | 'climateImpact'
      | 'description'
      | 'imageUrl'
    >> = [
      'title',
      'artist',
      'artistLocation',
      'year',
      'category',
      'medium',
      'dimensions',
      'galleryRoom',
      'plinthCode',
      'provenance',
      'climateImpact',
      'description',
      'imageUrl',
    ];

    for (const field of stringFields) {
      if (typeof req.body?.[field] === 'string' && req.body[field].trim()) {
        artwork[field] = req.body[field].trim();
      }
    }

    if (req.body?.lotNumber !== undefined && Number(req.body.lotNumber) > 0) {
      artwork.lotNumber = Math.round(Number(req.body.lotNumber));
    }
    if (req.body?.startingBid !== undefined && Number(req.body.startingBid) > 0) {
      artwork.startingBid = Math.round(Number(req.body.startingBid));
    }
    if (req.body?.estimateLow !== undefined && Number(req.body.estimateLow) > 0) {
      artwork.estimateLow = Math.round(Number(req.body.estimateLow));
    }
    if (req.body?.estimateHigh !== undefined && Number(req.body.estimateHigh) > 0) {
      artwork.estimateHigh = Math.round(Number(req.body.estimateHigh));
    }

    const statusInput = req.body?.status;
    if (statusInput === 'upcoming' || statusInput === 'live' || statusInput === 'sold' || statusInput === 'passed') {
      artwork.status = statusInput;
    }

    artwork.updatedAt = new Date().toISOString();
    db.artworks.sort((a, b) => a.lotNumber - b.lotNumber);
    persistDB();
    broadcastState('artwork_updated');
    res.json({ artwork });
  });

  app.delete('/api/artworks/:id', (req, res) => {
    const index = db.artworks.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Kunstwerk niet gevonden.' });
      return;
    }
    const [removed] = db.artworks.splice(index, 1);
    db.bids = db.bids.filter((b) => b.artworkId !== removed.id);
    if (db.auctionState.activeLotId === removed.id && db.artworks.length > 0) {
      db.auctionState.activeLotId = db.artworks[0].id;
    }
    persistDB();
    broadcastState('artwork_deleted');
    res.json({ deletedId: removed.id });
  });

  app.post('/api/import/catalog-pdf', async (req, res) => {
    try {
      const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : 'catalogus.pdf';
      const base64Data = typeof req.body?.base64 === 'string' ? req.body.base64 : '';
      const replaceExisting = Boolean(req.body?.replaceExisting);

      if (!base64Data) {
        res.status(400).json({ error: 'Geen PDF-bestand ontvangen.' });
        return;
      }

      const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(rawBase64, 'base64');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text, totalPages } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [String(text)];

      const parsedLots = parseCatalogPagesToLots(pages);
      const nowIso = new Date().toISOString();

      if (parsedLots.length === 0) {
        db.auctionState.catalogPdfName = fileName;
        db.auctionState.updatedAt = nowIso;
        persistDB();
        broadcastState('auction_updated');
        res.json({
          importedCount: 0,
          totalPages,
          rawPreview: pages.join('\n').slice(0, 1200),
          message: `PDF gelezen (${totalPages} pagina's), maar er werden geen gestructureerde cataloguspagina's gevonden.`,
        });
        return;
      }

      if (replaceExisting) {
        db.artworks = [];
        db.bids = [];
      }

      const seedFallback = loadOfficialCatalogSeed();
      let importedCount = 0;
      for (const item of parsedLots) {
        const lotNumber = item.lotNumber ?? db.artworks.length + 10;
        const existingIndex = db.artworks.findIndex((a) => a.lotNumber === lotNumber);
        const seedMatch = seedFallback.find((s) => s.lotNumber === lotNumber);
        const lotId = `lot-${String(lotNumber).padStart(2, '0')}`;
        const built: Artwork = {
          id: lotId,
          lotNumber,
          title: item.title || `Lot ${lotNumber}`,
          artist: item.artist || 'Deelnemende kunstenaar',
          artistLocation: 'Leuven / België',
          year: '2026',
          category: seedMatch?.category || 'Beeldende kunst',
          medium: item.medium || 'Kunstwerk uit de catalogus',
          dimensions: item.dimensions || 'Zie catalogus',
          galleryRoom: item.galleryRoom || 'Forum',
          plinthCode: item.plinthCode || `Positie ${lotNumber}`,
          provenance: `Geïmporteerd uit ${fileName} voor Leuven 2030.`,
          climateImpact: '100% van de opbrengst ondersteunt het Leuvens Klimaatfonds.',
          description: item.description || 'Werk uit de officiële Art for Climate-catalogus.',
          imageUrl: seedMatch?.imageUrl || `/catalog-images/lot-${String(lotNumber).padStart(2, '0')}.png`,
          estimateLow: item.estimateLow || 500,
          estimateHigh: item.estimateHigh || 900,
          startingBid: item.startingBid || 500,
          currentBid: 0,
          highestBidderNumber: null,
          bidCount: 0,
          status: 'live',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (existingIndex >= 0) {
          db.artworks[existingIndex] = {
            ...db.artworks[existingIndex],
            title: built.title,
            artist: built.artist,
            medium: built.medium,
            dimensions: built.dimensions,
            description: built.description,
            startingBid: built.startingBid,
            estimateLow: built.estimateLow,
            estimateHigh: built.estimateHigh,
            updatedAt: nowIso,
          };
        } else {
          db.artworks.push(built);
        }
        importedCount += 1;
      }

      db.artworks.sort((a, b) => a.lotNumber - b.lotNumber);
      if (db.artworks.length > 0 && !db.artworks.some((a) => a.id === db.auctionState.activeLotId)) {
        db.auctionState.activeLotId = db.artworks[0].id;
      }
      db.auctionState.catalogPdfName = fileName;
      db.auctionState.updatedAt = nowIso;
      persistDB();
      broadcastState('catalog_imported');
      res.json({
        importedCount,
        totalPages,
        message: `${importedCount} kunstwerken ingelezen uit ${fileName} (${totalPages} pagina's).`,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'PDF kon niet worden verwerkt.',
      });
    }
  });

  app.post('/api/import/floorplan', (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : 'grondplan.png';
      if (!dataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Gelieve een geldige afbeelding (PNG, JPG of SVG) te kiezen.' });
        return;
      }
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Ongeldig afbeeldingsformaat.' });
        return;
      }
      const ext = match[1].includes('svg') ? 'svg' : match[1] === 'jpeg' ? 'jpg' : match[1];
      const savedName = `grondplan-m-leuven-${Date.now()}.${ext}`;
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.resolve(UPLOADS_DIR, savedName), Buffer.from(match[2], 'base64'));

      db.auctionState.floorplanImageUrl = `/uploads/${savedName}`;
      db.auctionState.updatedAt = new Date().toISOString();
      persistDB();
      broadcastState('floorplan_updated');
      res.json({ floorplanImageUrl: db.auctionState.floorplanImageUrl, fileName });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Grondplan opladen mislukt.',
      });
    }
  });

  app.post('/api/import/artwork-image', (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Ongeldige afbeelding.' });
        return;
      }
      const ext = match[1].includes('svg') ? 'svg' : match[1] === 'jpeg' ? 'jpg' : match[1];
      const savedName = `kunstwerk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.resolve(UPLOADS_DIR, savedName), Buffer.from(match[2], 'base64'));
      res.json({ imageUrl: `/uploads/${savedName}` });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Afbeelding opladen mislukt.',
      });
    }
  });

  app.patch('/api/auction', (req, res) => {
    const {
      activeLotId,
      hammerStage,
      isLiveSessionActive,
      auctionClosed,
      announcement,
      timerAction,
      durationSeconds,
    } = req.body ?? {};
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (typeof activeLotId === 'string' && db.artworks.some((a) => a.id === activeLotId)) {
      db.auctionState.activeLotId = activeLotId;
      // Reset aftelklok bij wissel naar ander kunstwerk
      db.auctionState.lotTimerEndsAt = null;
      db.auctionState.lotTimerRemainingSeconds = db.auctionState.lotDurationSeconds;
    }

    if (
      hammerStage === 'open' ||
      hammerStage === 'going_once' ||
      hammerStage === 'going_twice' ||
      hammerStage === 'hammer_down'
    ) {
      db.auctionState.hammerStage = hammerStage;
    }

    if (typeof isLiveSessionActive === 'boolean') {
      db.auctionState.isLiveSessionActive = isLiveSessionActive;
    }

    if (typeof auctionClosed === 'boolean') {
      db.auctionState.auctionClosed = auctionClosed;
      if (auctionClosed) {
        db.auctionState.isLiveSessionActive = false;
        db.auctionState.hammerStage = 'hammer_down';
        db.auctionState.lotTimerEndsAt = null;
        db.auctionState.lotTimerRemainingSeconds = 0;
        const activeLot = db.artworks.find((a) => a.id === db.auctionState.activeLotId);
        if (activeLot && activeLot.status === 'live') {
          activeLot.status = activeLot.currentBid > 0 ? 'sold' : 'passed';
          activeLot.updatedAt = nowIso;
        }
      } else {
        db.auctionState.isLiveSessionActive = true;
        db.auctionState.hammerStage = 'open';
        db.auctionState.lotTimerRemainingSeconds = db.auctionState.lotDurationSeconds;
      }
    }

    if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds >= 30) {
      const clamped = Math.min(3600, Math.round(durationSeconds));
      db.auctionState.lotDurationSeconds = clamped;
      if (!db.auctionState.lotTimerEndsAt) {
        db.auctionState.lotTimerRemainingSeconds = clamped;
      }
    }

    if (timerAction === 'start') {
      const rem = getEffectiveRemainingSeconds(db.auctionState) || db.auctionState.lotDurationSeconds;
      db.auctionState.lotTimerRemainingSeconds = rem;
      db.auctionState.lotTimerEndsAt = new Date(nowMs + rem * 1000).toISOString();
    } else if (timerAction === 'pause') {
      db.auctionState.lotTimerRemainingSeconds = getEffectiveRemainingSeconds(db.auctionState);
      db.auctionState.lotTimerEndsAt = null;
    } else if (timerAction === 'reset') {
      db.auctionState.lotTimerEndsAt = null;
      db.auctionState.lotTimerRemainingSeconds = db.auctionState.lotDurationSeconds;
    } else if (timerAction === 'add_60') {
      const rem = getEffectiveRemainingSeconds(db.auctionState) + 60;
      db.auctionState.lotTimerRemainingSeconds = rem;
      if (db.auctionState.lotTimerEndsAt) {
        db.auctionState.lotTimerEndsAt = new Date(nowMs + rem * 1000).toISOString();
      }
    }

    if (typeof announcement === 'string') {
      db.auctionState.announcement = announcement.trim().slice(0, 240);
    }

    db.auctionState.updatedAt = nowIso;
    persistDB();
    broadcastState('auction_updated');
    res.json({ auctionState: db.auctionState });
  });

  app.post('/api/auction/reset', (_req, res) => {
    db = createInitialSeed();
    persistDB();
    broadcastState('auction_reset');
    res.json(getPublicSnapshot());
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Art for Climate server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
