import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import type {
  Artwork,
  BidderBillingProfile,
  InvoiceOrganizerSettings,
  InvoiceVatMode,
} from '../types/auction';
import {
  formatDateBelgian,
  formatEuroExact,
  formatLotNumber,
  getVatModeDetails,
} from '../utils/format';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  bidder: BidderBillingProfile;
  wonArtworks: Artwork[];
  organizerSettings: InvoiceOrganizerSettings;
  defaultInvoiceNumber: string;
}

export function InvoiceModal({
  open,
  onClose,
  bidder,
  wonArtworks,
  organizerSettings,
  defaultInvoiceNumber,
}: InvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);
  const [vatMode, setVatMode] = useState<InvoiceVatMode>(organizerSettings.vatMode);

  useEffect(() => {
    setInvoiceNumber(defaultInvoiceNumber);
  }, [defaultInvoiceNumber]);

  useEffect(() => {
    setVatMode(organizerSettings.vatMode);
  }, [organizerSettings.vatMode]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-invoice');
    return () => {
      document.body.classList.remove('printing-invoice');
    };
  }, [open]);

  if (!open) return null;

  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const vatInfo = getVatModeDetails(vatMode);

  const subtotal = wonArtworks.reduce((sum, lot) => sum + lot.currentBid, 0);
  const vatAmount = Math.round(subtotal * vatInfo.rate * 100) / 100;
  const totalAmount = subtotal + vatAmount;

  return (
    <div
      id="invoice-print-wrapper"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#363E49]/50 backdrop-blur-xs p-0 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Factuur voor bieder ${bidder.bidderNumber}`}
    >
      <div className="w-full max-w-4xl bg-white sm:rounded-2xl border border-[#E5E5E5] shadow-2xl my-0 sm:my-4 overflow-hidden">
        {/* Actiebalk (niet zichtbaar bij afdrukken) */}
        <div className="no-print bg-[#F7F7F7] border-b border-[#E5E5E5] px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="invoice-num-input" className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6C7B]">
                Factuurnummer
              </label>
              <input
                id="invoice-num-input"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="min-h-[36px] px-2.5 py-1 rounded-[8px] border border-[#E5E5E5] bg-white font-mono text-xs font-bold text-[#363E49]"
              />
            </div>
            <div>
              <label htmlFor="invoice-vat-mode" className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6C7B]">
                Belgisch btw-stelsel
              </label>
              <select
                id="invoice-vat-mode"
                value={vatMode}
                onChange={(e) => setVatMode(e.target.value as InvoiceVatMode)}
                className="min-h-[36px] px-2.5 py-1 rounded-[8px] border border-[#E5E5E5] bg-white text-xs font-semibold text-[#363E49]"
              >
                <option value="exempt_charity">Vrijgesteld (art. 44 §2, 12° W.BTW — vzw)</option>
                <option value="vat_6">6% btw (kunstvoorwerpen KB nr. 20)</option>
                <option value="vat_21">21% btw (standaardtarief)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[42px] px-4 py-2 rounded-[10px] bg-[#19706D] hover:bg-[#1E5941] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Afdrukken / Bewaar als PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluit factuurvenster"
              className="min-h-[42px] min-w-[42px] rounded-[10px] border border-[#E5E5E5] bg-white text-[#5D6C7B] hover:text-[#363E49] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Officieel A4 Factuurblad */}
        <div id="invoice-print-sheet" className="p-8 sm:p-12 bg-white text-[#363E49] space-y-8">
          {/* Briefhoofd Leuven 2030 vzw */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-[#19706D] pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src="/leuven2030-logo.svg"
                  alt="Leuven 2030"
                  className="h-9 w-auto"
                />
                <span className="font-display text-lg font-bold text-[#19706D]">
                  Art for Climate
                </span>
              </div>
              <div className="text-xs text-[#5D6C7B] leading-relaxed pt-1">
                <p className="font-bold text-[#363E49]">{organizerSettings.legalName}</p>
                <p>{organizerSettings.addressLine}</p>
                <p>
                  {organizerSettings.postalCity}, {organizerSettings.country}
                </p>
                <p className="font-mono text-[#363E49] mt-1">
                  Ondernemingsnr. / BTW: <span className="font-bold">{organizerSettings.vatNumber}</span> · {organizerSettings.courtDistrict}
                </p>
                {organizerSettings.email && <p>{organizerSettings.email}</p>}
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#19706D] uppercase">
                Factuur
              </h2>
              <dl className="text-xs space-y-1 pt-2">
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-[#5D6C7B]">Factuurnummer:</dt>
                  <dd className="font-mono font-bold text-[#363E49] tabular-nums">{invoiceNumber}</dd>
                </div>
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-[#5D6C7B]">Factuurdatum:</dt>
                  <dd className="font-mono text-[#363E49] tabular-nums">{formatDateBelgian(issueDate)}</dd>
                </div>
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-[#5D6C7B]">Vervaldatum:</dt>
                  <dd className="font-mono text-[#363E49] tabular-nums">{formatDateBelgian(dueDate)}</dd>
                </div>
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-[#5D6C7B]">Biednummer:</dt>
                  <dd className="font-mono font-bold text-[#1E5941] tabular-nums">{bidder.bidderNumber}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Klantgegevens & Veilingreferentie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] space-y-1 text-xs leading-relaxed">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#19706D] mb-2">
                Facturatie aan
              </p>
              <p className="text-sm font-bold text-[#363E49]">
                {bidder.companyName || bidder.name}
              </p>
              {bidder.companyName && bidder.name && (
                <p className="text-[#363E49]">T.a.v. {bidder.name}</p>
              )}
              <p>{bidder.street || 'Adres nog aan te vullen'}</p>
              <p>
                {bidder.postalCode} {bidder.city}
                {bidder.country ? `, ${bidder.country}` : ''}
              </p>
              <p className="pt-1.5 font-mono text-[#363E49]">
                BTW-nummer:{' '}
                <span className="font-bold">
                  {bidder.vatNumber || 'Nog aan te vullen'}
                </span>
              </p>
              {bidder.email && <p className="text-[#5D6C7B]">{bidder.email}</p>}
            </div>

            <div className="p-5 rounded-xl bg-[#F0F3E1]/60 border border-[#B4C232]/40 space-y-1.5 text-xs leading-relaxed">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1E5941] mb-2">
                Betreft &amp; Levering
              </p>
              <p className="font-bold text-[#363E49]">
                Kunstveiling Art for Climate — Leuven 2030
              </p>
              <p>Plaats van veiling &amp; afhaling: M Leuven, Leopold Vanderkelenstraat 28, 3000 Leuven</p>
              <p>Datum veiling: 16 december 2026</p>
              <p className="pt-1 text-[#1E5941] font-semibold">
                Ten voordele van het Leuvens Klimaatfonds.
              </p>
            </div>
          </div>

          {/* Factuurlijnen */}
          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] uppercase tracking-wider text-[#5D6C7B]">
                  <th className="py-3 px-4 font-bold">Lot</th>
                  <th className="py-3 px-4 font-bold">Omschrijving</th>
                  <th className="py-3 px-4 font-bold text-right">Aantal</th>
                  <th className="py-3 px-4 font-bold text-right">Maatstaf</th>
                  <th className="py-3 px-4 font-bold text-right">Btw</th>
                  <th className="py-3 px-4 font-bold text-right">Bedrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {wonArtworks.map((lot) => {
                  const lineVat = Math.round(lot.currentBid * vatInfo.rate * 100) / 100;
                  const lineTotal = lot.currentBid + lineVat;
                  return (
                    <tr key={lot.id}>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#19706D] tabular-nums whitespace-nowrap align-top">
                        {formatLotNumber(lot.lotNumber)}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-bold text-[#363E49]">{lot.title || lot.artist}</p>
                        <p className="text-xs text-[#5D6C7B] mt-0.5">
                          {lot.title ? `${lot.artist} · ` : ''}{lot.medium} ({lot.dimensions})
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right tabular-nums align-top">1</td>
                      <td className="py-3.5 px-4 font-mono text-right tabular-nums whitespace-nowrap align-top">
                        {formatEuroExact(lot.currentBid)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right tabular-nums whitespace-nowrap align-top">
                        {Math.round(vatInfo.rate * 100)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-right tabular-nums whitespace-nowrap align-top">
                        {formatEuroExact(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totalen */}
          <div className="flex justify-end">
            <dl className="w-full sm:w-80 space-y-2 text-sm">
              <div className="flex justify-between text-[#5D6C7B]">
                <dt>Maatstaf van heffing (excl. btw)</dt>
                <dd className="font-mono tabular-nums">{formatEuroExact(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-[#5D6C7B]">
                <dt>Btw ({vatInfo.label})</dt>
                <dd className="font-mono tabular-nums">{formatEuroExact(vatAmount)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-[#19706D] text-base font-bold text-[#19706D]">
                <dt>Totaal te betalen</dt>
                <dd className="font-mono tabular-nums">{formatEuroExact(totalAmount)}</dd>
              </div>
            </dl>
          </div>

          {/* Wettelijke vermeldingen en betaalinstructies */}
          <div className="border-t border-[#E5E5E5] pt-6 space-y-3 text-xs text-[#5D6C7B] leading-relaxed">
            <p className="text-[#363E49] font-semibold">
              Btw-vermelding: <span className="font-normal">{vatInfo.legalNote}</span>
            </p>
            <p>
              <strong className="text-[#363E49]">Betalingsvoorwaarden:</strong> Gelieve het totaalbedrag van{' '}
              <strong className="font-mono text-[#363E49]">{formatEuroExact(totalAmount)}</strong>{' '}
              uiterlijk op <strong className="font-mono text-[#363E49]">{formatDateBelgian(dueDate)}</strong> over te schrijven
              {organizerSettings.iban ? (
                <>
                  {' '}op rekening <strong className="font-mono text-[#363E49]">{organizerSettings.iban}</strong>
                  {organizerSettings.bic ? ` (BIC: ${organizerSettings.bic})` : ''}
                </>
              ) : (
                ' op het rekeningnummer van Leuven Klimaatneutraal 2030 vzw'
              )}{' '}
              met als mededeling <strong className="font-mono text-[#363E49]">{invoiceNumber} · Bieder {bidder.bidderNumber}</strong>.
            </p>
            <p>
              Op facturen van {organizerSettings.legalName} zijn de Belgische wettelijke bepalingen en de algemene veilingsvoorwaarden van Art for Climate van toepassing. Elk geschil valt onder de uitsluitende bevoegdheid van de rechtbanken van het gerechtelijk arrondissement Leuven.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
