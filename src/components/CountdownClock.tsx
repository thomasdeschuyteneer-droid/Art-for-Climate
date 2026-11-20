import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { AuctionState } from '../types/auction';
import { formatCountdown } from '../utils/format';

interface CountdownClockProps {
  auctionState: AuctionState | null;
  compact?: boolean;
}

export function useRemainingSeconds(auctionState: AuctionState | null): number {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    const compute = () => {
      if (!auctionState) return 0;
      if (auctionState.auctionClosed) return 0;
      if (!auctionState.lotTimerEndsAt) {
        return Math.max(0, auctionState.lotTimerRemainingSeconds ?? 0);
      }
      const diff = Math.ceil(
        (new Date(auctionState.lotTimerEndsAt).getTime() - Date.now()) / 1000
      );
      return Math.max(0, diff);
    };

    setSeconds(compute());
    if (!auctionState?.lotTimerEndsAt || auctionState.auctionClosed) {
      return;
    }

    const id = window.setInterval(() => {
      setSeconds(compute());
    }, 500);
    return () => window.clearInterval(id);
  }, [
    auctionState?.lotTimerEndsAt,
    auctionState?.lotTimerRemainingSeconds,
    auctionState?.auctionClosed,
  ]);

  return seconds;
}

export function CountdownClock({ auctionState, compact = false }: CountdownClockProps) {
  const remaining = useRemainingSeconds(auctionState);
  const isRunning = Boolean(auctionState?.lotTimerEndsAt && !auctionState?.auctionClosed);
  const isUrgent = isRunning && remaining > 0 && remaining <= 30;

  return (
    <div className={compact ? 'inline-flex items-center gap-2' : 'flex items-center gap-2.5'}>
      <Clock
        className={`w-4 h-4 shrink-0 ${
          auctionState?.auctionClosed
            ? 'text-[#923636]'
            : isUrgent
              ? 'text-[#923636]'
              : 'text-[#19706D]'
        }`}
        aria-hidden="true"
      />
      <span
        className={`font-mono font-bold tabular-nums ${
          compact ? 'text-base' : 'text-2xl sm:text-3xl'
        } ${
          auctionState?.auctionClosed
            ? 'text-[#923636]'
            : isUrgent
              ? 'text-[#923636]'
              : 'text-[#363E49]'
        }`}
      >
        {auctionState?.auctionClosed ? '00:00' : formatCountdown(remaining)}
      </span>
      {!compact && (
        <span className="text-xs text-[#5D6C7B]">
          {auctionState?.auctionClosed
            ? 'Veiling afgesloten'
            : isRunning
              ? 'Resterende tijd'
              : 'Klok gepauzeerd'}
        </span>
      )}
    </div>
  );
}
