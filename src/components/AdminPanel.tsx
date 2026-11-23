import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  FileUp,
  Globe,
  ImagePlus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type {
  Artwork,
  BidderBillingProfile,
  InvoiceVatMode,
  LotStatus,
} from '../types/auction';
import {
  M_LEUVEN_ROOMS,
  formatEuro,
  formatLotNumber,
  formatTimeShort,
  getStatusLabel,
} from '../utils/format';
import { QrCodeCard } from './QrCodeCard';
import { ArtworkImageFrame } from './ArtworkImageFrame';
import { InvoiceModal } from './InvoiceModal';

type AdminTab = 'overview' | 'inventory' | 'billing' | 'import' | 'qrcodes' | 'ledger';

const EMPTY_FORM = {
  title: '',
  artist: '',
  artistLocation: 'Leuven / België',
  year: '2026',
  category: 'Schilderkunst',
  medium: '',
  dimensions: '',
  galleryRoom: 'Forum',
  plinthCode: 'Positie 01',
  provenance: 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.',
  climateImpact: '100% van de opbrengst gaat naar het Leuvens Klimaatfonds.',
  description: '',
  imageUrl: '/art-for-climate-banner.png',
  startingBid: '500',
  estimateLow: '500',
  estimateHigh: '900',
  status: 'live' as LotStatus,
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Bestand kon niet gelezen worden.'));
    reader.readAsDataURL(file);
  });
}

export function AdminPanel() {
  const {
    artworks,
    bids,
    bidders,
    billingProfiles,
    organizerSettings,
    auctionState,
    createArtwork,
    updateArtwork,
    deleteArtwork,
    importCatalogPdf,
    uploadFloorplan,
    uploadArtworkImage,
    fetchBillingData,
    updateBillingProfile,
    updateOrganizerSettings,
    updateAuctionState,
    resetAuction,
  } = useAuction();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewFilter, setOverviewFilter] = useState<'all' | 'leading' | 'with_bids'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Artwork | null>(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [uploadingFloorplan, setUploadingFloorplan] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(true);
  const [pdfPreviewText, setPdfPreviewText] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{
    bidder: BidderBillingProfile;
    lots: Artwork[];
    index: number;
  } | null>(null);
  const [editingBilling, setEditingBilling] = useState<BidderBillingProfile | null>(null);
  const [settingsForm, setSettingsForm] = useState(organizerSettings);
  const [publicDomainInput, setPublicDomainInput] = useState(auctionState?.publicBaseUrl || '');

  useEffect(() => {
    setPublicDomainInput(auctionState?.publicBaseUrl || '');
  }, [auctionState?.publicBaseUrl]);

  useEffect(() => {
    void fetchBillingData();
  }, [fetchBillingData]);

  useEffect(() => {
    setSettingsForm(organizerSettings);
  }, [organizerSettings]);

  const billingByBidderNumber = useMemo(() => {
    const map = new Map<string, BidderBillingProfile>();
    for (const p of billingProfiles) {
      map.set(p.bidderNumber, p);
    }
    return map;
  }, [billingProfiles]);

  const wonLotsByBidder = useMemo(() => {
    const map = new Map<string, Artwork[]>();
    for (const lot of artworks) {
      if (lot.currentBid > 0 && lot.highestBidderNumber) {
        const list = map.get(lot.highestBidderNumber) ?? [];
        list.push(lot);
        map.set(lot.highestBidderNumber, list);
      }
    }
    return map;
  }, [artworks]);

  const allKnownBidderNumbers = useMemo(() => {
    const set = new Set<string>();
    for (const b of bidders) set.add(b.bidderNumber);
    for (const p of billingProfiles) set.add(p.bidderNumber);
    for (const num of wonLotsByBidder.keys()) set.add(num);
    for (const bid of bids) set.add(bid.bidderNumber);
    return Array.from(set).sort();
  }, [bidders, billingProfiles, bids, wonLotsByBidder]);

  const artworkById = useMemo(() => {
    const map = new Map<string, Artwork>();
    for (const lot of artworks) {
      map.set(lot.id, lot);
    }
    return map;
  }, [artworks]);

  const bidsByBidder = useMemo(() => {
    const map = new Map<string, typeof bids>();
    for (const bid of bids) {
      const list = map.get(bid.bidderNumber) ?? [];
      list.push(bid);
      map.set(bid.bidderNumber, list);
    }
    return map;
  }, [bids]);

  const lotsWithBids = useMemo(() => {
    return artworks
      .filter((lot) => lot.currentBid > 0 && lot.highestBidderNumber)
      .sort((a, b) => {
        if (a.status === 'sold' && b.status !== 'sold') return -1;
        if (a.status !== 'sold' && b.status === 'sold') return 1;
        return a.lotNumber - b.lotNumber;
      });
  }, [artworks]);

  const totalRealizedAmount = useMemo(() => {
    return lotsWithBids.reduce((sum, lot) => sum + lot.currentBid, 0);
  }, [lotsWithBids]);

  const leadingBiddersCount = wonLotsByBidder.size;

  const normalizedQuery = overviewSearch.trim().toLowerCase();

  const filteredBidderNumbers = useMemo(() => {
    return allKnownBidderNumbers.filter((num) => {
      const profile = billingByBidderNumber.get(num);
      const bidderBids = bidsByBidder.get(num) ?? [];
      const leadingLots = wonLotsByBidder.get(num) ?? [];

      if (overviewFilter === 'leading' && leadingLots.length === 0) return false;
      if (overviewFilter === 'with_bids' && bidderBids.length === 0 && leadingLots.length === 0) return false;

      if (!normalizedQuery) return true;
      const haystack = [
        num,
        profile?.name || '',
        profile?.companyName || '',
        profile?.vatNumber || '',
        profile?.email || '',
        profile?.city || '',
        ...bidderBids.map((b) => `${formatLotNumber(b.lotNumber)} ${b.artworkTitle}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [
    allKnownBidderNumbers,
    billingByBidderNumber,
    bidsByBidder,
    normalizedQuery,
    overviewFilter,
    wonLotsByBidder,
  ]);

  const filteredLotsWithBids = useMemo(() => {
    if (!normalizedQuery) return lotsWithBids;
    return lotsWithBids.filter((lot) => {
      const profile = lot.highestBidderNumber
        ? billingByBidderNumber.get(lot.highestBidderNumber)
        : undefined;
      const haystack = [
        formatLotNumber(lot.lotNumber),
        lot.title,
        lot.artist,
        lot.highestBidderNumber || '',
        profile?.name || '',
        profile?.companyName || '',
        profile?.vatNumber || '',
        profile?.city || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [billingByBidderNumber, lotsWithBids, normalizedQuery]);

  const openCreateModal = () => {
    setEditingLot(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditModal = (lot: Artwork) => {
    setEditingLot(lot);
    setFormState({
      title: lot.title,
      artist: lot.artist,
      artistLocation: lot.artistLocation,
      year: lot.year,
      category: lot.category,
      medium: lot.medium,
      dimensions: lot.dimensions,
      galleryRoom: lot.galleryRoom || 'Forum',
      plinthCode: lot.plinthCode || 'Positie 01',
      provenance: lot.provenance,
      climateImpact: lot.climateImpact,
      description: lot.description,
      imageUrl: lot.imageUrl,
      startingBid: String(lot.startingBid),
      estimateLow: String(lot.estimateLow),
      estimateHigh: String(lot.estimateHigh),
      status: lot.status,
    });
    setFormOpen(true);
  };

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        ...formState,
        startingBid: Number(formState.startingBid),
        estimateLow: Number(formState.estimateLow),
        estimateHigh: Number(formState.estimateHigh),
      };
      if (editingLot) {
        await updateArtwork(editingLot.id, payload);
        setMessage(`${formatLotNumber(editingLot.lotNumber)} — ${formState.title} bijgewerkt.`);
      } else {
        const created = await createArtwork(payload);
        setMessage(`${formatLotNumber(created.lotNumber)} — ${created.title} toegevoegd aan de catalogus.`);
      }
      setFormOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLot = async (lot: Artwork) => {
    setMessage(null);
    try {
      await deleteArtwork(lot.id);
      setMessage(`${formatLotNumber(lot.lotNumber)} (${lot.title}) verwijderd.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verwijderen mislukt.');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingPdf(true);
    setMessage(null);
    setPdfPreviewText(null);
    try {
      const base64 = await readFileAsBase64(file);
      const result = await importCatalogPdf({
        fileName: file.name,
        base64,
        replaceExisting: replaceOnImport,
      });
      setMessage(result.message);
      if (result.rawPreview) {
        setPdfPreviewText(result.rawPreview);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'PDF-catalogus inlezen mislukt.');
    } finally {
      setImportingPdf(false);
      e.target.value = '';
    }
  };

  const handleFloorplanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFloorplan(true);
    setMessage(null);
    try {
      const dataUrl = await readFileAsBase64(file);
      await uploadFloorplan({ fileName: file.name, dataUrl });
      setMessage(`Grondplan "${file.name}" opgeladen en live op de pagina M Leuven geplaatst.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Grondplan opladen mislukt.');
    } finally {
      setUploadingFloorplan(false);
      e.target.value = '';
    }
  };

  const handleArtworkImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsBase64(file);
      const url = await uploadArtworkImage({ fileName: file.name, dataUrl });
      setFormState((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Foto opladen mislukt.');
    }
  };

  const handleExportExcel = () => {
    const artworkRows = artworks.map((lot) => ({
      Lotnummer: formatLotNumber(lot.lotNumber),
      Titel: lot.title,
      Kunstenaar: lot.artist,
      Techniek: lot.medium,
      Afmetingen: lot.dimensions,
      'Zaal M Leuven': lot.galleryRoom,
      'Startbod (EUR)': lot.startingBid,
      'Hoogste bod (EUR)': lot.currentBid > 0 ? lot.currentBid : 0,
      'Hoogste bieder': lot.highestBidderNumber ?? '—',
      'Aantal biedingen': lot.bidCount,
      Status: getStatusLabel(lot.status),
    }));

    const bidRows = bids.map((b) => ({
      Tijdstip: formatTimeShort(b.createdAt),
      Lot: formatLotNumber(b.lotNumber),
      Kunstwerk: b.artworkTitle,
      Biednummer: b.bidderNumber,
      'Bedrag (EUR)': b.amount,
      Kanaal: b.source === 'floor' ? 'Zaal M Leuven' : 'QR-sokkel M Leuven',
    }));

    const billingRows = allKnownBidderNumbers.map((num) => {
      const profile = billingByBidderNumber.get(num);
      const won = wonLotsByBidder.get(num) ?? [];
      const total = won.reduce((sum, l) => sum + l.currentBid, 0);
      return {
        Biednummer: num,
        'Bedrijfsnaam / Organisatie': profile?.companyName || '—',
        Contactpersoon: profile?.name || '—',
        'BTW-nummer': profile?.vatNumber || 'Nog aan te vullen',
        'E-mailadres': profile?.email || '—',
        Adres: profile?.street || '—',
        Postcode: profile?.postalCode || '—',
        Gemeente: profile?.city || '—',
        Land: profile?.country || 'België',
        'Toegewezen loten': won.map((l) => formatLotNumber(l.lotNumber)).join(', ') || '—',
        'Te factureren totaal (EUR)': total,
      };
    });

    const buyerRows = lotsWithBids.map((lot) => {
      const profile = lot.highestBidderNumber
        ? billingByBidderNumber.get(lot.highestBidderNumber)
        : undefined;
      return {
        Lotnummer: formatLotNumber(lot.lotNumber),
        Kunstwerk: lot.title,
        Kunstenaar: lot.artist,
        Status: lot.status === 'sold' ? 'Verkocht / Toegewezen' : 'Huidig hoogste bod',
        'Koper / Biednummer': lot.highestBidderNumber || '—',
        'Naam koper': profile?.name || '—',
        'Bedrijf / Organisatie': profile?.companyName || '—',
        'BTW-nummer': profile?.vatNumber || 'Nog aan te vullen',
        'E-mailadres': profile?.email || '—',
        'Bedrag (EUR)': lot.currentBid,
        'Aantal biedingen': lot.bidCount,
      };
    });

    const wb = XLSX.utils.book_new();
    const wsBuyers = XLSX.utils.json_to_sheet(
      buyerRows.length > 0
        ? buyerRows
        : [{ Melding: 'Nog geen biedingen of kopers geregistreerd.' }]
    );
    const wsArtworks = XLSX.utils.json_to_sheet(artworkRows);
    const wsBids = XLSX.utils.json_to_sheet(
      bidRows.length > 0
        ? bidRows
        : [{ Melding: 'Nog geen biedingen geregistreerd.' }]
    );
    const wsBilling = XLSX.utils.json_to_sheet(
      billingRows.length > 0
        ? billingRows
        : [{ Melding: 'Nog geen bieders ingeschreven.' }]
    );

    XLSX.utils.book_append_sheet(wb, wsBuyers, 'Kopersoverzicht');
    XLSX.utils.book_append_sheet(wb, wsBilling, 'Inschrijvingen & BTW');
    XLSX.utils.book_append_sheet(wb, wsArtworks, 'Kunstwerken');
    XLSX.utils.book_append_sheet(wb, wsBids, 'Biedgeschiedenis');
    XLSX.writeFile(wb, 'Art_for_Climate_Leuven2030_Veiling.xlsx');
    setMessage('Excel-bestand (Art_for_Climate_Leuven2030_Veiling.xlsx) met kopersoverzicht, inschrijvingen en btw-gegevens gedownload.');
  };

  const handleSaveOrganizerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await updateOrganizerSettings(settingsForm);
      setMessage('Factuurgegevens van Leuven 2030 vzw bewaard.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBillingProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBilling) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await updateBillingProfile(editingBilling.bidderNumber, editingBilling);
      setMessage(`Facturatiegegevens en btw-nummer voor bieder ${editingBilling.bidderNumber} bijgewerkt.`);
      setEditingBilling(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bijwerken mislukt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 md:pb-16">
      <section className="bg-white border-b border-[#E5E5E5] no-print invoice-hidden-when-printing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#19706D] font-bold">
              Leuven 2030 · Catalogus &amp; Organisatie
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19706D] mt-1">
              Beheer
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#1E5941] hover:bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Exporteer naar Excel</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Kunstwerk toevoegen</span>
            </button>

            <button
              type="button"
              onClick={() => void resetAuction()}
              className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] hover:border-[#19706D] text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Catalogus herstellen</span>
            </button>
          </div>
        </div>

        {/* Sub-navigatie */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 border-t border-[#E5E5E5] overflow-x-auto">
          {(
            [
              { id: 'overview', label: `Inschrijvingen & Kopers (${allKnownBidderNumbers.length})` },
              { id: 'inventory', label: `Kunstwerken (${artworks.length})` },
              { id: 'billing', label: `Facturatie & BTW` },
              { id: 'import', label: 'Catalogus PDF & Grondplan' },
              { id: 'qrcodes', label: `QR-bordjes (${artworks.length})` },
              { id: 'ledger', label: `Biedgeschiedenis (${bids.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'billing' || tab.id === 'overview') void fetchBillingData();
              }}
              className={`min-h-[48px] py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#19706D] text-[#19706D]'
                  : 'border-transparent text-[#5D6C7B] hover:text-[#363E49]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 invoice-hidden-when-printing">
        {message && (
          <div className="mb-6 p-4 rounded-xl border border-[#B4C232]/60 bg-[#F0F3E1] text-xs font-bold text-[#1E5941] flex items-center justify-between gap-4 no-print">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              aria-label="Melding sluiten"
              className="text-[#1E5941] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 0: GROOT OVERZICHT INSCHRIJVINGEN & KOPERS VAN DE KUNSTWERKEN */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* 4 Overzichtsblokken (enkel voor beheerders) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Inschrijvingen
                </p>
                <p className="font-mono text-3xl font-bold text-[#19706D] tabular-nums mt-1">
                  {allKnownBidderNumbers.length}
                </p>
                <p className="text-xs text-[#5D6C7B] mt-1">Gekoppelde biednummers</p>
              </div>
              <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Leidende bieders / kopers
                </p>
                <p className="font-mono text-3xl font-bold text-[#1E5941] tabular-nums mt-1">
                  {leadingBiddersCount}
                </p>
                <p className="text-xs text-[#5D6C7B] mt-1">Met minstens 1 hoogste bod</p>
              </div>
              <div className="border border-[#E5E5E5] bg-white rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#5D6C7B]">
                  Werken met hoogste bod
                </p>
                <p className="font-mono text-3xl font-bold text-[#363E49] tabular-nums mt-1">
                  {lotsWithBids.length} <span className="text-base font-normal text-[#5D6C7B]">/ {artworks.length}</span>
                </p>
                <p className="text-xs text-[#5D6C7B] mt-1">
                  {lotsWithBids.filter((l) => l.status === 'sold').length} definitief verkocht
                </p>
              </div>
              <div className="border border-[#B4C232]/60 bg-[#F0F3E1] rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#1E5941]">
                  Interne veilingopbrengst
                </p>
                <p className="font-mono text-3xl font-bold text-[#1E5941] tabular-nums mt-1">
                  {formatEuro(totalRealizedAmount)}
                </p>
                <p className="text-xs text-[#1E5941]/80 mt-1">Enkel zichtbaar in Beheer</p>
              </div>
            </div>

            {/* Zoekbalk & Snelfilters */}
            <div className="border border-[#E5E5E5] bg-white rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xl">
                <Search
                  className="w-4 h-4 text-[#5D6C7B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  placeholder="Zoek op biednummer (#001), naam, bedrijf, btw-nummer of titel schilderij..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-[12px] border border-[#E5E5E5] text-sm text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `Alle inschrijvingen (${allKnownBidderNumbers.length})` },
                    { id: 'with_bids', label: 'Met uitgebrachte biedingen' },
                    { id: 'leading', label: `Met hoogste bod (${leadingBiddersCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOverviewFilter(f.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      overviewFilter === f.id
                        ? 'bg-[#19706D] text-white'
                        : 'bg-[#F7F7F7] text-[#363E49] hover:bg-[#DEE9EC]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* OVERZICHT 1: ALLE INSCHRIJVINGEN GEKOPPELD AAN BIEDNUMMER + BIEDINGEN + HOOGSTE BOD */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#19706D] inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Overzicht 1 · Inschrijvingen &amp; Biedingen</span>
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#363E49] mt-0.5">
                    Inschrijvingen gekoppeld aan biednummer en biedingen
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold text-[#5D6C7B] tabular-nums">
                  {filteredBidderNumbers.length} weergegeven
                </span>
              </div>

              {filteredBidderNumbers.length === 0 ? (
                <div className="border border-[#E5E5E5] bg-white rounded-2xl p-8 text-center text-sm text-[#5D6C7B]">
                  Geen inschrijvingen gevonden die overeenkomen met je zoekfilter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBidderNumbers.map((num, idx) => {
                    const profile: BidderBillingProfile = billingByBidderNumber.get(num) ?? {
                      bidderNumber: num,
                      name: `Zaalbieder ${num}`,
                      companyName: '',
                      vatNumber: '',
                      email: '',
                      street: '',
                      postalCode: '3000',
                      city: 'Leuven',
                      country: 'België',
                      registeredAt: new Date().toISOString(),
                    };
                    const bidderBids = bidsByBidder.get(num) ?? [];
                    const leadingLots = wonLotsByBidder.get(num) ?? [];
                    const leadingTotal = leadingLots.reduce((sum, l) => sum + l.currentBid, 0);
                    const hasSoldLot = leadingLots.some((l) => l.status === 'sold');

                    return (
                      <div
                        key={num}
                        className={`border rounded-2xl bg-white overflow-hidden ${
                          leadingLots.length > 0
                            ? 'border-[#1E5941]/50 shadow-xs'
                            : 'border-[#E5E5E5]'
                        }`}
                      >
                        {/* Bieder kopbalk: Biednummer + Inschrijfgegevens + Hoogste bod status */}
                        <div className="p-5 sm:p-6 bg-[#F7F7F7]/70 border-b border-[#E5E5E5] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex flex-wrap items-start sm:items-center gap-4">
                            <div className="px-4 py-2.5 rounded-xl bg-[#19706D] text-white font-mono text-xl font-bold tabular-nums shrink-0">
                              {num}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-lg font-bold text-[#363E49]">
                                  {profile.name}
                                </h3>
                                {profile.companyName && (
                                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#DEE9EC] text-[#19706D]">
                                    {profile.companyName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#5D6C7B] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-mono font-semibold text-[#363E49]">
                                  BTW: {profile.vatNumber || 'Ontbreekt'}
                                </span>
                                <span>·</span>
                                <span>{profile.email || 'Geen e-mail'}</span>
                                {profile.street && (
                                  <>
                                    <span>·</span>
                                    <span>
                                      {profile.street}, {profile.postalCode} {profile.city}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            {leadingLots.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F3E1] border border-[#B4C232] text-[#1E5941] text-xs font-bold">
                                <Award className="w-4 h-4" aria-hidden="true" />
                                <span>
                                  {hasSoldLot ? 'Koper / Hoogste bod' : 'Hoogste bod'} op {leadingLots.length}{' '}
                                  {leadingLots.length === 1 ? 'werk' : 'werken'} ({formatEuro(leadingTotal)})
                                </span>
                              </span>
                            ) : bidderBids.length > 0 ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-[#5D6C7B] text-xs font-semibold">
                                Overboden · {bidderBids.length}{' '}
                                {bidderBids.length === 1 ? 'bod' : 'biedingen'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-[#5D6C7B] text-xs font-medium">
                                Ingeschreven · nog geen bod
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setEditingBilling(profile)}
                              className="min-h-[36px] px-3 py-1.5 rounded-[10px] border border-[#E5E5E5] bg-white text-xs font-semibold text-[#363E49] hover:border-[#19706D] cursor-pointer"
                            >
                              Bewerk
                            </button>
                            {leadingLots.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInvoiceTarget({
                                    bidder: profile,
                                    lots: leadingLots,
                                    index: idx + 1,
                                  })
                                }
                                className="min-h-[36px] px-3 py-1.5 rounded-[10px] bg-[#1E5941] hover:bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Factuur</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Lijst van alle biedingen die deze inschrijving heeft uitgebracht */}
                        <div className="p-4 sm:p-5">
                          {bidderBids.length === 0 && leadingLots.length === 0 ? (
                            <p className="text-xs text-[#5D6C7B] italic">
                              Deze inschrijving heeft nog geen bod uitgebracht op een kunstwerk.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5D6C7B]">
                                Uitgebrachte biedingen door {num} ({bidderBids.length})
                              </p>
                              <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden">
                                {bidderBids.map((bid) => {
                                  const lot = artworkById.get(bid.artworkId);
                                  const isCurrentHighest =
                                    Boolean(lot) &&
                                    lot?.highestBidderNumber === num &&
                                    lot?.currentBid === bid.amount;
                                  const isSoldWinner = isCurrentHighest && lot?.status === 'sold';

                                  return (
                                    <div
                                      key={bid.id}
                                      className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm ${
                                        isCurrentHighest ? 'bg-[#F0F3E1]/65' : 'bg-white'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                        <span className="font-mono text-xs font-bold text-[#19706D] tabular-nums shrink-0">
                                          {formatLotNumber(bid.lotNumber)}
                                        </span>
                                        <span className="font-bold text-[#363E49] truncate">
                                          {bid.artworkTitle}
                                        </span>
                                        {lot && (
                                          <span className="text-xs text-[#5D6C7B] truncate">
                                            ({lot.artist})
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                                        <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                                          {formatTimeShort(bid.createdAt)} ·{' '}
                                          {bid.source === 'floor' ? 'Zaal' : 'QR-sokkel'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-[#363E49] tabular-nums">
                                          {formatEuro(bid.amount)}
                                        </span>
                                        {isSoldWinner ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E5941] text-white text-[11px] font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span>KOPER / GEWONNEN</span>
                                          </span>
                                        ) : isCurrentHighest ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#19706D] text-white text-[11px] font-bold">
                                            <Award className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span>HOOGSTE BOD</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F7F7F7] text-[#5D6C7B] text-[11px] font-semibold">
                                            Overboden{lot && lot.currentBid > 0 ? ` (nu ${formatEuro(lot.currentBid)})` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* OVERZICHT 2: KOPERS VAN DE SCHILDERIJEN / KUNSTWERKEN */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1E5941] inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Overzicht 2 · Kopers van de kunstwerken</span>
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#363E49] mt-0.5">
                    Overzicht kopers &amp; hoogste bieders per schilderij/werk
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="min-h-[40px] px-4 py-2 rounded-[10px] bg-[#1E5941] text-white hover:bg-[#19706D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download Kopersoverzicht (.xlsx)</span>
                </button>
              </div>

              {filteredLotsWithBids.length === 0 ? (
                <div className="border border-[#E5E5E5] bg-white rounded-2xl p-8 text-center text-sm text-[#5D6C7B]">
                  Zodra een bieder een bod uitbrengt op een kunstwerk verschijnt hier het volledige kopersoverzicht met biednummer, btw-nummer en factuurknop.
                </div>
              ) : (
                <div className="border border-[#E5E5E5] rounded-2xl bg-white overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] text-xs uppercase tracking-wider text-[#5D6C7B]">
                        <th className="py-3.5 px-4 font-bold">Lot &amp; Kunstwerk</th>
                        <th className="py-3.5 px-4 font-bold">Status</th>
                        <th className="py-3.5 px-4 font-bold">Koper (Biednr.)</th>
                        <th className="py-3.5 px-4 font-bold">Naam, Bedrijf &amp; BTW-nummer</th>
                        <th className="py-3.5 px-4 font-bold">Hoogste bod</th>
                        <th className="py-3.5 px-4 font-bold text-right">Facturatie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {filteredLotsWithBids.map((lot, idx) => {
                        const buyerNum = lot.highestBidderNumber || '#000';
                        const profile: BidderBillingProfile = billingByBidderNumber.get(buyerNum) ?? {
                          bidderNumber: buyerNum,
                          name: `Zaalbieder ${buyerNum}`,
                          companyName: '',
                          vatNumber: '',
                          email: '',
                          street: '',
                          postalCode: '3000',
                          city: 'Leuven',
                          country: 'België',
                          registeredAt: new Date().toISOString(),
                        };
                        const isSold = lot.status === 'sold';

                        return (
                          <tr key={lot.id} className={isSold ? 'bg-[#F0F3E1]/40' : 'hover:bg-[#F7F7F7]'}>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <ArtworkImageFrame
                                  src={lot.imageUrl}
                                  alt={lot.title}
                                  className="w-14 h-14 shrink-0 rounded-lg border border-[#E5E5E5]"
                                />
                                <div className="min-w-0">
                                  <p className="font-mono text-xs font-bold text-[#19706D] tabular-nums">
                                    {formatLotNumber(lot.lotNumber)}
                                  </p>
                                  <p className="font-bold text-[#363E49] truncate max-w-[230px]">
                                    {lot.title}
                                  </p>
                                  <p className="text-xs text-[#5D6C7B] truncate max-w-[230px]">
                                    {lot.artist}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {isSold ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E5941] text-white text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Verkocht</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DEE9EC] text-[#19706D] text-xs font-bold">
                                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Hoogste bod</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#19706D] text-white font-mono text-sm font-bold tabular-nums">
                                {buyerNum}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-bold text-[#363E49]">
                                {profile.companyName ? `${profile.companyName} — ${profile.name}` : profile.name}
                              </p>
                              <p className="text-xs text-[#5D6C7B] mt-0.5">
                                <span className="font-mono font-semibold text-[#363E49]">
                                  {profile.vatNumber || 'BTW ontbreekt'}
                                </span>
                                {profile.email ? ` · ${profile.email}` : ''}
                              </p>
                              {profile.street && (
                                <p className="text-[11px] text-[#5D6C7B]">
                                  {profile.street}, {profile.postalCode} {profile.city}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="font-mono text-base font-bold text-[#1E5941] tabular-nums">
                                {formatEuro(lot.currentBid)}
                              </p>
                              <p className="text-[11px] text-[#5D6C7B] tabular-nums">
                                {lot.bidCount} {lot.bidCount === 1 ? 'bod' : 'biedingen'}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingBilling(profile)}
                                  className="min-h-[36px] px-3 py-1.5 rounded-[8px] border border-[#E5E5E5] text-xs font-semibold text-[#363E49] hover:border-[#19706D] cursor-pointer"
                                >
                                  Gegevens
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInvoiceTarget({
                                      bidder: profile,
                                      lots: wonLotsByBidder.get(buyerNum) ?? [lot],
                                      index: idx + 1,
                                    })
                                  }
                                  className="min-h-[36px] px-3 py-1.5 rounded-[8px] bg-[#19706D] hover:bg-[#1E5941] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Factuur</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 1: KUNSTWERKEN */}
        {activeTab === 'inventory' && (
          <div className="border border-[#E5E5E5] rounded-2xl bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] text-xs uppercase tracking-wider text-[#5D6C7B]">
                  <th className="py-3 px-4 font-bold">Lot</th>
                  <th className="py-3 px-4 font-bold">Kunstwerk</th>
                  <th className="py-3 px-4 font-bold">Zaal M Leuven</th>
                  <th className="py-3 px-4 font-bold">Startbod</th>
                  <th className="py-3 px-4 font-bold">Hoogste bod</th>
                  <th className="py-3 px-4 font-bold">Bieder</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {artworks.map((lot) => (
                  <tr key={lot.id} className="hover:bg-[#F7F7F7]">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#19706D] tabular-nums whitespace-nowrap">
                      {formatLotNumber(lot.lotNumber)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <ArtworkImageFrame
                          src={lot.imageUrl}
                          alt={lot.title}
                          className="w-12 h-12 shrink-0 rounded-lg border border-[#E5E5E5]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#363E49] truncate max-w-[230px]">
                            {lot.title}
                          </p>
                          <p className="text-xs text-[#5D6C7B] truncate max-w-[230px]">
                            {lot.artist}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5D6C7B] whitespace-nowrap">
                      {lot.galleryRoom}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#5D6C7B] tabular-nums whitespace-nowrap">
                      {formatEuro(lot.startingBid)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#363E49] tabular-nums whitespace-nowrap">
                      {lot.currentBid > 0 ? formatEuro(lot.currentBid) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#1E5941] tabular-nums whitespace-nowrap">
                      {lot.highestBidderNumber ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#363E49] whitespace-nowrap">
                      {getStatusLabel(lot.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(lot)}
                          aria-label={`Bewerk Lot ${lot.lotNumber}`}
                          className="min-h-[36px] min-w-[36px] rounded-[8px] inline-flex items-center justify-center border border-[#E5E5E5] text-[#363E49] hover:border-[#19706D] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteLot(lot)}
                          aria-label={`Verwijder Lot ${lot.lotNumber}`}
                          className="min-h-[36px] min-w-[36px] rounded-[8px] inline-flex items-center justify-center border border-[#E5E5E5] text-[#923636] hover:border-[#923636] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: FACTURATIE & BTW-NUMMERS */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div className="border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#19706D]">
                    Facturatie per bieder (met btw-nummer)
                  </h2>
                  <p className="text-xs text-[#5D6C7B] mt-0.5">
                    Enkel zichtbaar in Beheer. Maak rechtstreeks een legale Belgische factuur op voor bieders met toegewezen werken.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="min-h-[40px] px-4 py-2 rounded-[10px] bg-[#1E5941] text-white hover:bg-[#19706D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Exporteer facturatielijst (.xlsx)</span>
                </button>
              </div>

              {allKnownBidderNumbers.length === 0 ? (
                <p className="p-8 text-sm text-[#5D6C7B] text-center">
                  Er zijn nog geen bieders ingeschreven met facturatiegegevens.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] text-xs uppercase tracking-wider text-[#5D6C7B]">
                        <th className="py-3 px-4 font-bold">Biednr.</th>
                        <th className="py-3 px-4 font-bold">Bedrijf / Contactpersoon</th>
                        <th className="py-3 px-4 font-bold">BTW-nummer</th>
                        <th className="py-3 px-4 font-bold">Factuuradres</th>
                        <th className="py-3 px-4 font-bold">Gewonnen loten</th>
                        <th className="py-3 px-4 font-bold">Totaal</th>
                        <th className="py-3 px-4 font-bold text-right">Factuur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {allKnownBidderNumbers.map((num, idx) => {
                        const profile: BidderBillingProfile = billingByBidderNumber.get(num) ?? {
                          bidderNumber: num,
                          name: `Zaalbieder ${num}`,
                          companyName: '',
                          vatNumber: '',
                          email: '',
                          street: '',
                          postalCode: '3000',
                          city: 'Leuven',
                          country: 'België',
                          registeredAt: new Date().toISOString(),
                        };
                        const wonLots = wonLotsByBidder.get(num) ?? [];
                        const totalDue = wonLots.reduce((sum, l) => sum + l.currentBid, 0);

                        return (
                          <tr key={num} className="hover:bg-[#F7F7F7]">
                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#1E5941] tabular-nums whitespace-nowrap">
                              {num}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#363E49]">
                                {profile.companyName || profile.name}
                              </p>
                              <p className="text-xs text-[#5D6C7B]">
                                {profile.companyName ? `${profile.name} · ` : ''}
                                {profile.email || 'Geen e-mail'}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#363E49] tabular-nums whitespace-nowrap">
                              {profile.vatNumber ? (
                                profile.vatNumber
                              ) : (
                                <span className="text-[#923636]">Ontbreekt</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#5D6C7B]">
                              {profile.street ? (
                                <>
                                  {profile.street}, {profile.postalCode} {profile.city}
                                </>
                              ) : (
                                'Nog aan te vullen'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#19706D] tabular-nums">
                              {wonLots.length > 0
                                ? wonLots.map((l) => formatLotNumber(l.lotNumber)).join(', ')
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[#363E49] tabular-nums whitespace-nowrap">
                              {totalDue > 0 ? formatEuro(totalDue) : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingBilling(profile)}
                                  className="min-h-[36px] px-3 py-1.5 rounded-[8px] border border-[#E5E5E5] text-xs font-semibold text-[#363E49] hover:border-[#19706D] cursor-pointer"
                                >
                                  Gegevens
                                </button>
                                <button
                                  type="button"
                                  disabled={wonLots.length === 0}
                                  onClick={() =>
                                    setInvoiceTarget({
                                      bidder: profile,
                                      lots: wonLots,
                                      index: idx + 1,
                                    })
                                  }
                                  className="min-h-[36px] px-3 py-1.5 rounded-[8px] bg-[#19706D] hover:bg-[#1E5941] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Factuur</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Instellingen organisator (Leuven 2030 vzw) voor op de factuur */}
            <form
              onSubmit={handleSaveOrganizerSettings}
              className="border border-[#E5E5E5] rounded-2xl bg-white p-6 space-y-5"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  Wettelijke afzendergegevens op facturen
                </p>
                <h3 className="font-display text-xl font-bold text-[#363E49] mt-1">
                  Factuurgegevens Leuven 2030 vzw
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Statutaire benaming
                  </label>
                  <input
                    type="text"
                    value={settingsForm.legalName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, legalName: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Ondernemingsnummer / BTW-nummer
                  </label>
                  <input
                    type="text"
                    value={settingsForm.vatNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, vatNumber: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs font-mono border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Belgisch btw-stelsel
                  </label>
                  <select
                    value={settingsForm.vatMode}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        vatMode: e.target.value as InvoiceVatMode,
                      })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs border border-[#E5E5E5] bg-white"
                  >
                    <option value="exempt_charity">Vrijgesteld (art. 44 §2, 12° W.BTW — vzw)</option>
                    <option value="vat_6">6% btw (kunstvoorwerpen KB nr. 20)</option>
                    <option value="vat_21">21% btw (standaardtarief)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Maatschappelijke zetel (straat + nr.)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.addressLine}
                    onChange={(e) => setSettingsForm({ ...settingsForm, addressLine: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Postcode en gemeente
                  </label>
                  <input
                    type="text"
                    value={settingsForm.postalCity}
                    onChange={(e) => setSettingsForm({ ...settingsForm, postalCity: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    IBAN-rekeningnummer voor betaling
                  </label>
                  <input
                    type="text"
                    value={settingsForm.iban}
                    onChange={(e) => setSettingsForm({ ...settingsForm, iban: e.target.value })}
                    placeholder="bv. BE68 0000 0000 0000"
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-xs font-mono border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[42px] px-5 py-2 rounded-[10px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold cursor-pointer"
                >
                  Factuurgegevens opslaan
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: CATALOGUS PDF & GRONDPLAN IMPORT */}
        {activeTab === 'import' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  Officiële catalogus inlezen
                </p>
                <h2 className="font-display text-2xl font-bold text-[#363E49] mt-1">
                  LEUVEN2030_catalogus_kunstveiling_v12.pdf
                </h2>
                <p className="text-sm text-[#5D6C7B] mt-2 leading-relaxed">
                  De bijgewerkte officiële catalogus v12 van Leuven 2030 is reeds ingeladen met alle 45 loten (Lot 10 t/m 54) en afbeeldingen. Via onderstaande upload kan je steeds een nieuwere PDF inlezen.
                </p>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#363E49] cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(e) => setReplaceOnImport(e.target.checked)}
                  className="w-4 h-4 accent-[#19706D]"
                />
                <span>Bestaande catalogus vervangen bij importeren</span>
              </label>

              <label className="block border-2 border-dashed border-[#E5E5E5] hover:border-[#19706D] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#F7F7F7]">
                <FileUp className="w-8 h-8 text-[#19706D] mx-auto mb-3" aria-hidden="true" />
                <span className="block text-sm font-bold text-[#363E49]">
                  {importingPdf
                    ? 'Catalogus PDF wordt verwerkt...'
                    : 'Kies bijgewerkte catalogus (PDF)'}
                </span>
                <span className="block text-xs text-[#5D6C7B] mt-1">
                  Actieve bron: {auctionState?.catalogPdfName ?? 'LEUVEN2030_catalogus_kunstveiling_v12.pdf'}
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={importingPdf}
                  onChange={(e) => void handlePdfUpload(e)}
                  className="sr-only"
                />
              </label>

              {pdfPreviewText && (
                <div className="p-4 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono text-[#363E49] max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {pdfPreviewText}
                </div>
              )}
            </div>

            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  Locatieplan M Leuven
                </p>
                <h2 className="font-display text-2xl font-bold text-[#363E49] mt-1">
                  Grondplan opladen
                </h2>
                <p className="text-sm text-[#5D6C7B] mt-2 leading-relaxed">
                  Laad het grondplan van M Leuven (PNG, JPG of WEBP) op. Bezoekers zien dit samen met het interactieve L-vormige schema (Antichambre Deel 1, Antichambre Deel 2 en Forum).
                </p>
              </div>

              <label className="block border-2 border-dashed border-[#E5E5E5] hover:border-[#19706D] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#F7F7F7]">
                <ImagePlus className="w-8 h-8 text-[#19706D] mx-auto mb-3" aria-hidden="true" />
                <span className="block text-sm font-bold text-[#363E49]">
                  {uploadingFloorplan
                    ? 'Grondplan wordt opgeslagen...'
                    : 'Kies grondplanafbeelding (PNG, JPG, WEBP)'}
                </span>
                <span className="block text-xs text-[#5D6C7B] mt-1">
                  {auctionState?.floorplanImageUrl
                    ? 'Er is momenteel een eigen grondplan actief.'
                    : 'Standaard L-vormig zaalschema actief.'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingFloorplan}
                  onChange={(e) => void handleFloorplanUpload(e)}
                  className="sr-only"
                />
              </label>

              {auctionState?.floorplanImageUrl && (
                <img
                  src={auctionState.floorplanImageUrl}
                  alt="Voorvertoning grondplan M Leuven"
                  className="w-full max-h-48 object-contain rounded-xl border border-[#E5E5E5] bg-[#F7F7F7]"
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: QR-BORDJES */}
        {activeTab === 'qrcodes' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4 no-print">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#19706D]">
                  QR-bordjes voor M Leuven
                </h2>
                <p className="text-xs text-[#5D6C7B] mt-0.5">
                  Elke QR-code verwijst bezoekers rechtstreeks naar het juiste kunstwerk en activeert bieden ter plekke.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#19706D] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Druk alle bordjes af</span>
              </button>
            </div>

            {/* Eigen domeinnaam voor QR-codes */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setMessage(null);
                try {
                  await updateAuctionState({ publicBaseUrl: publicDomainInput.trim() || null });
                  setMessage(
                    publicDomainInput.trim()
                      ? `Eigen domein (${publicDomainInput.trim()}) opgeslagen. Alle QR-codes gebruiken nu dit adres.`
                      : 'Eigen domein gewist. QR-codes gebruiken het huidige webadres.'
                  );
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Domeinnaam opslaan mislukt.');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="border border-[#E5E5E5] rounded-2xl bg-white p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4 no-print"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Eigen domeinnaam voor QR-codes (zonder .vercel.app)</span>
                </div>
                <p className="text-xs text-[#5D6C7B] mt-1">
                  Vul hier het eigen domein van Leuven 2030 in (bv. <span className="font-mono text-[#363E49]">https://artforclimate.leuven2030.be</span>) nadat je dit in Vercel hebt gekoppeld via <strong>Project Settings → Domains</strong>.
                </p>
                <input
                  type="text"
                  value={publicDomainInput}
                  onChange={(e) => setPublicDomainInput(e.target.value)}
                  placeholder="https://artforclimate.leuven2030.be"
                  className="mt-3 w-full min-h-[42px] px-3.5 py-2 rounded-[10px] border border-[#E5E5E5] text-sm font-mono text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[42px] px-5 py-2 rounded-[10px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Domein opslaan
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {artworks.map((lot) => (
                <QrCodeCard key={lot.id} artwork={lot} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BIEDGESCHIEDENIS & BIEDNUMMERS */}
        {activeTab === 'ledger' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
              <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#19706D]">
                  Actieve biednummers
                </h2>
                <span className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                  {bidders.length} totaal
                </span>
              </div>
              {bidders.length === 0 ? (
                <p className="p-6 text-sm text-[#5D6C7B]">
                  Nog geen bieders ingeschreven.
                </p>
              ) : (
                <div className="divide-y divide-[#E5E5E5]">
                  {bidders.map((b) => (
                    <div key={b.bidderNumber} className="p-4 flex items-center justify-between gap-4">
                      <span className="font-mono text-sm font-bold text-[#1E5941] tabular-nums">
                        {b.bidderNumber}
                      </span>
                      <span className="text-xs text-[#5D6C7B]">{b.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-8 border border-[#E5E5E5] rounded-2xl bg-white overflow-hidden">
              <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-[#19706D]">
                  Biedgeschiedenis
                </h2>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="min-h-[40px] px-4 py-2 rounded-[10px] bg-[#1E5941] text-white hover:bg-[#19706D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Exporteer Excel (.xlsx)</span>
                </button>
              </div>
              {bids.length === 0 ? (
                <p className="p-6 text-sm text-[#5D6C7B]">
                  Nog geen biedingen uitgebracht.
                </p>
              ) : (
                <div className="divide-y divide-[#E5E5E5] max-h-[540px] overflow-y-auto">
                  {bids.map((bid) => (
                    <div key={bid.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-[#5D6C7B] tabular-nums">
                          {formatLotNumber(bid.lotNumber)} ·{' '}
                          <span className="font-bold text-[#1E5941]">{bid.bidderNumber}</span>
                        </p>
                        <p className="font-bold text-[#363E49] truncate">{bid.artworkTitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-[#19706D] tabular-nums">
                          {formatEuro(bid.amount)}
                        </p>
                        <p className="font-mono text-[11px] text-[#5D6C7B] tabular-nums">
                          {formatTimeShort(bid.createdAt)} · {bid.source === 'floor' ? 'zaal' : 'QR-sokkel'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Kunstwerk toevoegen / bewerken venster */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#363E49]/40 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingLot ? 'Kunstwerk bewerken' : 'Nieuw kunstwerk toevoegen'}
        >
          <div className="w-full sm:max-w-2xl bg-white border border-[#E5E5E5] rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h2 className="font-display text-2xl font-bold text-[#19706D]">
                {editingLot
                  ? `Bewerk ${formatLotNumber(editingLot.lotNumber)}`
                  : 'Nieuw kunstwerk toevoegen'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Sluit formulier"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5D6C7B] hover:text-[#363E49] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLot} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Titel van het werk
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Kunstenaar
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.artist}
                    onChange={(e) => setFormState({ ...formState, artist: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Techniek
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.medium}
                    onChange={(e) => setFormState({ ...formState, medium: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Afmetingen
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.dimensions}
                    onChange={(e) => setFormState({ ...formState, dimensions: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({ ...formState, status: e.target.value as LotStatus })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5] bg-white"
                  >
                    <option value="upcoming">Binnenkort</option>
                    <option value="live">Open voor biedingen</option>
                    <option value="sold">Toegewezen</option>
                    <option value="passed">Afgesloten</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Zaal in M Leuven
                  </label>
                  <select
                    value={formState.galleryRoom}
                    onChange={(e) =>
                      setFormState({ ...formState, galleryRoom: e.target.value })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5] bg-white"
                  >
                    {M_LEUVEN_ROOMS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Startbod (€)
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={formState.startingBid}
                    onChange={(e) =>
                      setFormState({ ...formState, startingBid: e.target.value })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-[10px] text-sm font-mono border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Eigen foto opladen
                  </label>
                  <label className="block min-h-[42px] px-3 py-2 rounded-[10px] text-xs font-bold text-center border border-[#E5E5E5] hover:border-[#19706D] text-[#363E49] cursor-pointer leading-relaxed">
                    Kies afbeelding
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => void handleArtworkImageFile(e)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#363E49] mb-1">
                  Beschrijving
                </label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-[#E5E5E5] text-xs font-bold text-[#363E49] cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-6 py-2 rounded-[10px] bg-[#3C7F90] hover:bg-[#19706D] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Opslaan...' : editingLot ? 'Wijzigingen bewaren' : 'Lot toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facturatiegegevens aanvullen/bewerken */}
      {editingBilling && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#363E49]/40 backdrop-blur-xs p-0 sm:p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-label={`Facturatiegegevens bieder ${editingBilling.bidderNumber}`}
        >
          <div className="w-full sm:max-w-lg bg-white border border-[#E5E5E5] rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <h2 className="font-display text-xl font-bold text-[#19706D]">
                Facturatiegegevens bieder {editingBilling.bidderNumber}
              </h2>
              <button
                type="button"
                onClick={() => setEditingBilling(null)}
                aria-label="Sluit venster"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5D6C7B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillingProfile} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Bedrijfsnaam / Organisatie
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.companyName}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, companyName: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    BTW-nummer
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.vatNumber}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, vatNumber: e.target.value })
                    }
                    placeholder="BE 0544.963.123"
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm font-mono border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Contactpersoon
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.name}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, name: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={editingBilling.email}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, email: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#363E49] mb-1">
                  Straat en huisnummer
                </label>
                <input
                  type="text"
                  required
                  value={editingBilling.street}
                  onChange={(e) =>
                    setEditingBilling({ ...editingBilling, street: e.target.value })
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.postalCode}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, postalCode: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm font-mono border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Gemeente
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.city}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, city: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#363E49] mb-1">
                    Land
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBilling.country}
                    onChange={(e) =>
                      setEditingBilling({ ...editingBilling, country: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-[10px] text-sm border border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingBilling(null)}
                  className="min-h-[42px] px-4 py-2 rounded-[10px] border border-[#E5E5E5] text-xs font-bold cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[42px] px-5 py-2 rounded-[10px] bg-[#19706D] text-white text-xs font-bold cursor-pointer"
                >
                  Bewaren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Officiële Belgische Factuur */}
      {invoiceTarget && (
        <InvoiceModal
          open={Boolean(invoiceTarget)}
          onClose={() => setInvoiceTarget(null)}
          bidder={invoiceTarget.bidder}
          wonArtworks={invoiceTarget.lots}
          organizerSettings={organizerSettings}
          defaultInvoiceNumber={`AFC-2026-${String(invoiceTarget.index).padStart(3, '0')}`}
        />
      )}
    </div>
  );
}
