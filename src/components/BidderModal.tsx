import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { normalizeBidderNumber } from '../utils/format';

interface BidderModalProps {
  open: boolean;
  onClose: () => void;
}

export function BidderModal({ open, onClose }: BidderModalProps) {
  const { currentBidderNumber, registerBidder, setCurrentBidderNumber } = useAuction();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Leuven');
  const [existingPaddleInput, setExistingPaddleInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerBidder({ name, email, city });
      setName('');
      setEmail('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inschrijving mislukt.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateExisting = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizeBidderNumber(existingPaddleInput);
    if (!normalized) {
      setError('Geef een geldig biedernummer in, bijvoorbeeld #027.');
      return;
    }
    setCurrentBidderNumber(normalized);
    setExistingPaddleInput('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#363E49]/40 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bidder-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white border border-[#E5E5E5] rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Leuven 2030 · M Leuven
            </p>
            <h2 id="bidder-modal-title" className="font-display text-2xl font-bold text-[#363E49] mt-1">
              Inschrijven als bieder
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluit inschrijvingsvenster"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5D6C7B] hover:text-[#363E49] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentBidderNumber && (
          <div className="mt-5 p-4 bg-[#F0F3E1] border border-[#B4C232]/50 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#1E5941] font-semibold">Jouw actief biednummer</p>
              <p className="font-mono text-xl font-bold text-[#1E5941] tabular-nums mt-0.5">
                {currentBidderNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentBidderNumber(null)}
              className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] hover:border-[#19706D] cursor-pointer whitespace-nowrap shrink-0"
            >
              Afmelden
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-[#5D6C7B]">
            Vraag een nieuw persoonlijk biednummer aan. Op de schermen en in de biedgeschiedenis wordt uitsluitend je nummer getoond, nooit je naam.
          </p>

          <div>
            <label htmlFor="bidder-name" className="block text-xs font-bold text-[#363E49] mb-1.5">
              Volledige naam (enkel voor toewijzing door Leuven 2030)
            </label>
            <input
              id="bidder-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voornaam en achternaam"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bidder-email" className="block text-xs font-bold text-[#363E49] mb-1.5">
                E-mailadres
              </label>
              <input
                id="bidder-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@domein.be"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
              />
            </div>
            <div>
              <label htmlFor="bidder-city" className="block text-xs font-bold text-[#363E49] mb-1.5">
                Gemeente / Stad
              </label>
              <input
                id="bidder-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Leuven"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#923636] bg-[#923636]/10 border border-[#923636]/30 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-5 py-3 text-sm font-bold rounded-[12px] bg-[#3C7F90] text-white hover:bg-[#19706D] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Biednummer toekennen...' : 'Nieuw biednummer ontvangen'}
          </button>
        </form>

        <form onSubmit={handleActivateExisting} className="mt-7 pt-5 border-t border-[#E5E5E5] space-y-3">
          <label htmlFor="existing-paddle" className="block text-xs font-bold uppercase tracking-wider text-[#5D6C7B]">
            Heb je al een biednummer aan het onthaal in M Leuven ontvangen?
          </label>
          <div className="flex gap-2.5">
            <input
              id="existing-paddle"
              type="text"
              value={existingPaddleInput}
              onChange={(e) => setExistingPaddleInput(e.target.value)}
              placeholder="bv. #027"
              className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono font-semibold rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
            />
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-[12px] border border-[#3C7F90] text-[#3C7F90] hover:bg-[#DEE9EC] text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Activeer nummer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
