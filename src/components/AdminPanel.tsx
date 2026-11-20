import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  Edit3,
  FileUp,
  ImagePlus,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { Artwork, LotStatus } from '../types/auction';
import {
  M_LEUVEN_ROOMS,
  formatEuro,
  formatLotNumber,
  formatTimeShort,
  getStatusLabel,
} from '../utils/format';
import { QrCodeCard } from './QrCodeCard';
import { ArtworkImageFrame } from './ArtworkImageFrame';

type AdminTab = 'inventory' | 'import' | 'qrcodes' | 'ledger';

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
    auctionState,
    createArtwork,
    updateArtwork,
    deleteArtwork,
    importCatalogPdf,
    uploadFloorplan,
    uploadArtworkImage,
    resetAuction,
  } = useAuction();

  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Artwork | null>(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [uploadingFloorplan, setUploadingFloorplan] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(true);
  const [pdfPreviewText, setPdfPreviewText] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

    const wb = XLSX.utils.book_new();
    const wsArtworks = XLSX.utils.json_to_sheet(artworkRows);
    const wsBids = XLSX.utils.json_to_sheet(
      bidRows.length > 0
        ? bidRows
        : [{ Melding: 'Nog geen biedingen geregistreerd.' }]
    );

    XLSX.utils.book_append_sheet(wb, wsArtworks, 'Kunstwerken');
    XLSX.utils.book_append_sheet(wb, wsBids, 'Biedgeschiedenis');
    XLSX.writeFile(wb, 'Art_for_Climate_Leuven2030_Veiling.xlsx');
    setMessage('Excel-bestand (Art_for_Climate_Leuven2030_Veiling.xlsx) gedownload.');
  };

  return (
    <div className="pb-24 md:pb-16">
      <section className="bg-white border-b border-[#E5E5E5] no-print">
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
              { id: 'inventory', label: `Kunstwerken (${artworks.length})` },
              { id: 'import', label: 'Catalogus PDF & Grondplan' },
              { id: 'qrcodes', label: `QR-bordjes (${artworks.length})` },
              { id: 'ledger', label: `Biedgeschiedenis (${bids.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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

        {/* TAB 2: CATALOGUS PDF & GRONDPLAN IMPORT */}
        {activeTab === 'import' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border border-[#E5E5E5] rounded-2xl bg-white p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
                  Officiële catalogus inlezen
                </p>
                <h2 className="font-display text-2xl font-bold text-[#363E49] mt-1">
                  LEUVEN2030_catalogus_ArtForClimate.pdf
                </h2>
                <p className="text-sm text-[#5D6C7B] mt-2 leading-relaxed">
                  De officiële 56 pagina&apos;s tellende catalogus van Leuven 2030 is reeds ingeladen met alle 44 loten en afbeeldingen. Via onderstaande upload kan je steeds een bijgewerkte PDF inlezen.
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
                  Actieve bron: {auctionState?.catalogPdfName ?? 'LEUVEN2030_catalogus_ArtForClimate.pdf'}
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
                  Laad het grondplan van M Leuven (PNG, JPG of SVG) op. Bezoekers zien dit samen met het interactieve L-vormige schema (Antichambre Deel 1, Antichambre Deel 2 en Forum).
                </p>
              </div>

              <label className="block border-2 border-dashed border-[#E5E5E5] hover:border-[#19706D] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#F7F7F7]">
                <ImagePlus className="w-8 h-8 text-[#19706D] mx-auto mb-3" aria-hidden="true" />
                <span className="block text-sm font-bold text-[#363E49]">
                  {uploadingFloorplan
                    ? 'Grondplan wordt opgeslagen...'
                    : 'Kies grondplanafbeelding (PNG, JPG, SVG)'}
                </span>
                <span className="block text-xs text-[#5D6C7B] mt-1">
                  {auctionState?.floorplanImageUrl
                    ? 'Er is momenteel een eigen grondplan actief.'
                    : 'Standaard L-vormig zaalschema actief.'}
                </span>
                <input
                  type="file"
                  accept="image/*"
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
                      accept="image/*"
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
    </div>
  );
}
