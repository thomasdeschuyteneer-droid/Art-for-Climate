import React, { useMemo, useState } from 'react';
import { Award, ShieldCheck, X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatEuro, normalizeBidderNumber, normalizeVatNumber } from '../utils/format';

interface BidderModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateFavorites?: () => void;
}

export function BidderModal({ open, onClose, onNavigateFavorites }: BidderModalProps) {
  const {
    artworks,
    bidders,
    auctionState,
    currentBidderNumber,
    registerBidder,
    setCurrentBidderNumber,
  } = useAuction();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [bidderNumberInput, setBidderNumberInput] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('3000');
  const [city, setCity] = useState('Leuven');
  const [country, setCountry] = useState('België');
  const [existingPaddleInput, setExistingPaddleInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const activeStats = useMemo(() => {
    if (!currentBidderNumber) return null;
    const matched = artworks.filter((a) => a.highestBidderNumber === currentBidderNumber);
    const won = matched.filter((a) => a.status === 'sold' || Boolean(auctionState?.auctionClosed));
    const leading = matched.filter((a) => a.status === 'live' && !auctionState?.auctionClosed);
    const total = matched.reduce((sum, a) => sum + a.currentBid, 0);
    return { wonCount: won.length, leadingCount: leading.length, total };
  }, [artworks, auctionState?.auctionClosed, currentBidderNumber]);

  if (!open) return null;

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);

    const normalizedBidder = normalizeBidderNumber(bidderNumberInput);
    if (!normalizedBidder) {
      setError(
        'Biednummer is verplicht. Vul het nummer in dat je bij aankomst op jouw bordje kreeg (bv. #027).'
      );
      return;
    }

    const trimmedVat = vatNumber.trim();
    let normalizedVat = '';
    if (trimmedVat) {
      const parsed = normalizeVatNumber(trimmedVat);
      if (!parsed) {
        setError(
          'Het opgegeven btw-nummer is ongeldig (bv. BE 0544.963.123). Laat het veld leeg als je zonder btw-nummer inschrijft.'
        );
        return;
      }
      normalizedVat = parsed;
    }

    setSubmitting(true);
    try {
      await registerBidder({
        bidderNumber: normalizedBidder,
        name,
        companyName: companyName.trim(),
        vatNumber: normalizedVat,
        email,
        street,
        postalCode,
        city,
        country,
      });
      setBidderNumberInput('');
      setName('');
      setCompanyName('');
      setVatNumber('');
      setEmail('');
      setStreet('');
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
    setInfoNotice(null);

    const normalized = normalizeBidderNumber(existingPaddleInput);
    if (!normalized) {
      setError('Biednummer is verplicht. Geef het nummer van jouw bordje in, bijvoorbeeld #027.');
      return;
    }

    const isRegistered = bidders.some((b) => b.bidderNumber === normalized);
    if (!isRegistered) {
      setBidderNumberInput(normalized);
      setMode('register');
      setInfoNotice(
        `Biednummer ${normalized} is nog niet ingeschreven. Vul hieronder eenmalig jouw contactgegevens in om bordje ${normalized} te koppelen.`
      );
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
      <div className="w-full sm:max-w-xl bg-white border border-[#E5E5E5] rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#19706D]">
              Leuven 2030 · M Leuven
            </p>
            <h2 id="bidder-modal-title" className="font-display text-2xl font-bold text-[#363E49] mt-1">
              Inschrijven met jouw biednummer
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
          <div className="mt-5 p-4 bg-[#F0F3E1] border border-[#B4C232]/50 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-4">
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

            {activeStats && (activeStats.wonCount > 0 || activeStats.leadingCount > 0) && (
              <div className="pt-2.5 border-t border-[#B4C232]/40 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1E5941]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {activeStats.wonCount > 0 ? `${activeStats.wonCount} gekocht · ` : ''}
                    {activeStats.leadingCount > 0 ? `${activeStats.leadingCount} hoogste bod · ` : ''}
                    <span className="font-mono font-bold">{formatEuro(activeStats.total)}</span>
                  </span>
                </span>
                {onNavigateFavorites && (
                  <button
                    type="button"
                    onClick={onNavigateFavorites}
                    className="font-bold underline hover:text-[#19706D] cursor-pointer"
                  >
                    Bekijk bij Favorieten
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab-keuze: Inschrijven met nieuw bordje vs. Al ingeschreven */}
        <div className="mt-5 grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5]">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#19706D] shadow-xs border border-[#E5E5E5]'
                : 'text-[#5D6C7B] hover:text-[#363E49]'
            }`}
          >
            Inschrijven met bordje
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfoNotice(null);
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#19706D] shadow-xs border border-[#E5E5E5]'
                : 'text-[#5D6C7B] hover:text-[#363E49]'
            }`}
          >
            Al ingeschreven? Inloggen
          </button>
        </div>

        {infoNotice && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#F0F3E1] border border-[#B4C232]/60 text-xs font-semibold text-[#1E5941] leading-relaxed">
            {infoNotice}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleActivateExisting} className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#DEE9EC]/50 border border-[#DEE9EC] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#19706D] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-[#363E49] leading-relaxed">
                Heb je jouw bordje met biednummer al eerder in deze app gekoppeld? Vul dan hieronder jouw biednummer in om opnieuw aan te melden.
              </p>
            </div>

            <div>
              <label htmlFor="existing-paddle" className="block text-xs font-bold text-[#363E49] mb-1.5">
                Biednummer *
              </label>
              <input
                id="existing-paddle"
                type="text"
                required
                value={existingPaddleInput}
                onChange={(e) => setExistingPaddleInput(e.target.value)}
                placeholder="bv. #027 of 27"
                className="w-full min-h-[46px] px-3.5 py-2 text-base font-mono font-bold rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-[#923636] bg-[#923636]/10 border border-[#923636]/30 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-[12px] bg-[#19706D] text-white hover:bg-[#1E5941] text-sm font-bold cursor-pointer"
            >
              Inloggen met biednummer
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitRegistration} className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#DEE9EC]/50 border border-[#DEE9EC] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#19706D] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-[#363E49] leading-relaxed">
                Bij aankomst in M Leuven ontvang je een <span className="font-semibold">bordje met jouw persoonlijk biednummer</span> (bv. <span className="font-mono font-bold">#027</span>). Vul dat nummer hieronder in om je in te schrijven. Bedrijfsnaam en btw-nummer zijn <span className="font-semibold">niet verplicht</span>.
              </p>
            </div>

            <div>
              <label htmlFor="bidder-number" className="block text-xs font-bold text-[#19706D] mb-1.5">
                Biednummer (van jouw bordje) *
              </label>
              <input
                id="bidder-number"
                type="text"
                required
                value={bidderNumberInput}
                onChange={(e) => setBidderNumberInput(e.target.value)}
                placeholder="bv. #027 of 27"
                className="w-full min-h-[48px] px-3.5 py-2 text-base font-mono font-bold rounded-[12px] border-2 border-[#3C7F90]/50 bg-[#F7F7F7] text-[#19706D] focus:outline-none focus:border-[#19706D] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bidder-name" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  Contactpersoon (voor- en achternaam) *
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

              <div>
                <label htmlFor="bidder-email" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  E-mailadres *
                </label>
                <input
                  id="bidder-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.be"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bidder-company" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  Bedrijfsnaam / Organisatie (optioneel)
                </label>
                <input
                  id="bidder-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="bv. Studio Leuven bv"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>

              <div>
                <label htmlFor="bidder-vat" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  BTW-nummer (optioneel)
                </label>
                <input
                  id="bidder-vat"
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="BE 0544.963.123"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono font-semibold rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bidder-street" className="block text-xs font-bold text-[#363E49] mb-1.5">
                Factuuradres (straat en huisnummer) *
              </label>
              <input
                id="bidder-street"
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="bv. Bondgenotenlaan 120"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="bidder-postal" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  Postcode *
                </label>
                <input
                  id="bidder-postal"
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="3000"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
              <div>
                <label htmlFor="bidder-city" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  Gemeente / Stad *
                </label>
                <input
                  id="bidder-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Leuven"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
                />
              </div>
              <div>
                <label htmlFor="bidder-country" className="block text-xs font-bold text-[#363E49] mb-1.5">
                  Land *
                </label>
                <input
                  id="bidder-country"
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="België"
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
              {submitting ? 'Biednummer koppelen...' : 'Inschrijven met dit biednummer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
