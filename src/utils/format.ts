import type { HammerStage, InvoiceVatMode, LotStatus } from '../types/auction';

export function formatEuro(amount: number): string {
  return `€ ${amount.toLocaleString('nl-BE', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatEuroExact(amount: number): string {
  return `€ ${amount.toLocaleString('nl-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLotNumber(lotNumber: number): string {
  return `Lot ${String(lotNumber).padStart(2, '0')}`;
}

export function normalizeBidderNumber(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '');
  if (!/^\d{1,4}$/.test(cleaned)) return null;
  const num = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(num) || num <= 0 || num > 9999) return null;
  return `#${String(num).padStart(3, '0')}`;
}

/**
 * Normaliseert Belgische en Europese btw-nummers.
 * Belgische nummers zonder landcode (bv. 0544.963.123) krijgen automatisch "BE ".
 * Resultaat voor België: "BE 0544.963.123".
 */
export function normalizeVatNumber(raw: string): string | null {
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

  // Ondersteun ook geldige Europese btw-nummers (bv. NL, FR, DE, LU)
  if (/^(AT|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)[A-Z0-9]{8,12}$/.test(withPrefix)) {
    return `${withPrefix.slice(0, 2)} ${withPrefix.slice(2)}`;
  }

  return null;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeShort(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString('nl-BE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatDateBelgian(isoOrDate: string | Date): string {
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec} sec. geleden`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min. geleden`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr} u. geleden`;
  } catch {
    return '';
  }
}

export function getStatusLabel(status: LotStatus): string {
  switch (status) {
    case 'live':
      return 'Open voor biedingen';
    case 'upcoming':
      return 'Binnenkort';
    case 'sold':
      return 'Toegewezen';
    case 'passed':
      return 'Afgesloten';
  }
}

export function getHammerStageLabel(stage: HammerStage): string {
  switch (stage) {
    case 'open':
      return 'Biedingen open';
    case 'going_once':
      return 'Eénmaal';
    case 'going_twice':
      return 'Andermaal';
    case 'hammer_down':
      return 'Veiling gesloten';
  }
}

export function getVatModeDetails(mode: InvoiceVatMode): {
  rate: number;
  label: string;
  legalNote: string;
} {
  switch (mode) {
    case 'exempt_charity':
      return {
        rate: 0,
        label: '0% (Vrijgesteld)',
        legalNote:
          'Vrijgesteld van btw krachtens artikel 44, §2, 12° van het Belgisch Wetboek van de Belasting over de Toegevoegde Waarde (occasionele weldadigheidsactie georganiseerd door een vereniging zonder winstoogmerk).',
      };
    case 'vat_6':
      return {
        rate: 0.06,
        label: '6% (Kunstvoorwerpen)',
        legalNote:
          'Verlaagd Belgisch btw-tarief van 6% toegepast conform Tabel A, rubriek XXI van KB nr. 20 inzake kunstvoorwerpen.',
      };
    case 'vat_21':
      return {
        rate: 0.21,
        label: '21% (Standaardtarief)',
        legalNote: 'Standaard Belgisch btw-tarief van 21% toegepast conform het Wetboek BTW.',
      };
  }
}

export function getSuggestedMinimumBid(
  currentBid: number,
  startingBid: number,
  bidCount: number
): number {
  if (bidCount === 0 || currentBid === 0) {
    return startingBid;
  }
  if (currentBid < 1000) return currentBid + 50;
  if (currentBid < 2500) return currentBid + 100;
  return currentBid + 200;
}

export const M_LEUVEN_ROOMS = [
  'Antichambre Deel 1',
  'Antichambre Deel 2',
  'Forum',
] as const;
