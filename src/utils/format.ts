import type { HammerStage, LotStatus } from '../types/auction';

export function formatEuro(amount: number): string {
  return `€ ${amount.toLocaleString('nl-BE')}`;
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
