import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck, X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';

interface AdminAuthFormProps {
  targetLabel?: string;
  onSuccess?: () => void;
}

function AdminAuthForm({ targetLabel = 'Beheer', onSuccess }: AdminAuthFormProps) {
  const { authStatus, setupAdmin, loginAdmin } = useAuction();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetupMode = !authStatus.configured;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetupMode && password !== confirmPassword) {
      setError('De ingevoerde wachtwoorden komen niet overeen.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSetupMode) {
        await setupAdmin(username, password);
      } else {
        await loginAdmin(username, password);
      }
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmelden mislukt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-[#5D6C7B] leading-relaxed">
        {isSetupMode
          ? 'Stel eenmalig je gebruikersnaam en wachtwoord in om Beheer, Facturatie en Veilingmeester te vergrendelen voor bezoekers.'
          : `Deze omgeving (${targetLabel}) is uitsluitend toegankelijk voor beheerders en de veilingmeester van Leuven 2030.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="admin-username" className="block text-xs font-bold text-[#363E49] mb-1.5">
            Gebruikersnaam
          </label>
          <input
            id="admin-username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Gebruikersnaam"
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-xs font-bold text-[#363E49] mb-1.5">
            Wachtwoord
          </label>
          <input
            id="admin-password"
            type="password"
            required
            autoComplete={isSetupMode ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
          />
        </div>

        {isSetupMode && (
          <div>
            <label htmlFor="admin-password-confirm" className="block text-xs font-bold text-[#363E49] mb-1.5">
              Bevestig wachtwoord
            </label>
            <input
              id="admin-password-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
            />
          </div>
        )}

        {error && (
          <p className="text-xs font-semibold text-[#923636] bg-[#923636]/10 border border-[#923636]/30 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[46px] px-5 py-2.5 rounded-[12px] bg-[#19706D] hover:bg-[#1E5941] text-white text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
        >
          {submitting
            ? 'Bezig...'
            : isSetupMode
              ? 'Beheerder activeren'
              : 'Aanmelden'}
        </button>
      </form>
    </div>
  );
}

interface AdminAuthGateProps {
  targetLabel: string;
  onBack: () => void;
}

export function AdminAuthGate({ targetLabel, onBack }: AdminAuthGateProps) {
  const { authStatus } = useAuction();
  const isSetupMode = !authStatus.configured;

  return (
    <div className="max-w-md mx-auto px-4 py-14 sm:py-20">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-[#19706D] hover:text-[#363E49] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Terug naar Startpagina</span>
      </button>

      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#E5E5E5]">
          <div className="w-10 h-10 rounded-xl bg-[#DEE9EC] text-[#19706D] flex items-center justify-center shrink-0">
            {isSetupMode ? (
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Lock className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#19706D]">
              Leuven 2030 · Beveiligde toegang
            </p>
            <h1 className="font-display text-2xl font-bold text-[#363E49]">
              {isSetupMode ? 'Beheerder instellen' : `Aanmelden voor ${targetLabel}`}
            </h1>
          </div>
        </div>

        <AdminAuthForm targetLabel={targetLabel} />
      </div>
    </div>
  );
}

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function AdminLoginModal({ open, onClose, onAuthenticated }: AdminLoginModalProps) {
  const { authStatus } = useAuction();
  if (!open) return null;
  const isSetupMode = !authStatus.configured;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#363E49]/50 backdrop-blur-sm flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="footer-admin-login-title"
    >
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DEE9EC] text-[#19706D] flex items-center justify-center shrink-0">
              {isSetupMode ? (
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#19706D]">
                Leuven 2030 · Organisatie
              </p>
              <h2 id="footer-admin-login-title" className="font-display text-xl font-bold text-[#363E49]">
                {isSetupMode ? 'Beheerder instellen' : 'Beheerder inloggen'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluit inlogvenster"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5D6C7B] hover:text-[#363E49] hover:bg-[#F7F7F7] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <AdminAuthForm
          targetLabel="Beheer & Veilingmeester"
          onSuccess={() => {
            onClose();
            onAuthenticated();
          }}
        />
      </div>
    </div>
  );
}
