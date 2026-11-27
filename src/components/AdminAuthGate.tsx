import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lock, X } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';

import { isSupabaseConfigured } from '../lib/supabase';

interface AdminAuthFormProps {
  targetLabel?: string;
  onSuccess?: () => void;
}

function AdminAuthForm({ targetLabel = 'Beheer', onSuccess }: AdminAuthFormProps) {
  const { authStatus, refreshAuthStatus, loginAdmin } = useAuction();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  const isSupabaseMode = authStatus.authMode === 'supabase' || isSupabaseConfigured;
  const isConfigured = isSupabaseMode ? true : authStatus.configured;
  const serverReachable = isSupabaseMode ? true : authStatus.serverReachable !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginAdmin(username, password);
      setPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmelden mislukt.');
      void refreshAuthStatus();
    } finally {
      setSubmitting(false);
    }
  };

  const isStaticShareHost =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-pre-');
  const activeLiveUrl = isStaticShareHost
    ? window.location.href.replace('://ais-pre-', '://ais-dev-')
    : null;

  return (
    <div>
      <p className="text-xs text-[#5D6C7B] leading-relaxed">
        Deze omgeving ({targetLabel}) is uitsluitend toegankelijk voor de beheerder van Leuven 2030. Nieuwe beheerdersaccounts aanmaken is uitgeschakeld.
      </p>

      {isSupabaseMode && (
        <p className="mt-3 text-xs font-medium text-[#19706D] bg-[#DEE9EC]/60 border border-[#19706D]/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
          Meld je aan met je Supabase-beheerdersaccount. Alle wijzigingen synchroniseren live via Supabase Realtime.
        </p>
      )}

      {!isSupabaseMode && !isConfigured && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#923636]/10 border border-[#923636]/30 text-xs font-semibold text-[#923636] leading-relaxed space-y-2.5">
          {serverReachable ? (
            <>
              <p>
                De beheerderslogin is nog niet ingesteld op deze server.
              </p>
              <p className="font-normal text-[#363E49]">
                Voeg <span className="font-mono">ADMIN_USERNAME</span> en{' '}
                <span className="font-mono">ADMIN_PASSWORD</span> toe bij <strong>Secrets</strong> en herlaad de pagina.
              </p>
            </>
          ) : (
            <>
              <p>
                Alleen voorbeeldweergave (geen live server op deze statische deellink).
              </p>
              <p className="font-normal text-[#363E49]">
                Op deze statische deellink draait geen server voor beheerderstoegang. Open de actieve live app-omgeving of koppel een Supabase-project via Secrets.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {activeLiveUrl && (
                  <a
                    href={activeLiveUrl}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#19706D] hover:bg-[#1E5941] text-white text-[11px] font-bold transition-colors"
                  >
                    Open actieve beheeromgeving
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void refreshAuthStatus()}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-[#923636]/30 text-[11px] font-bold text-[#923636] hover:bg-[#F7F7F7] cursor-pointer"
                >
                  Opnieuw controleren
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="admin-username" className="block text-xs font-bold text-[#363E49] mb-1.5">
            {isSupabaseMode ? 'E-mailadres' : 'Gebruikersnaam'}
          </label>
          <input
            id="admin-username"
            type={isSupabaseMode ? 'email' : 'text'}
            required
            autoComplete={isSupabaseMode ? 'email' : 'username'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={isSupabaseMode ? 'thomas.deschuyteneer@leuven.be' : 'Gebruikersnaam'}
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[12px] border border-[#E5E5E5] bg-white text-[#363E49] focus:outline-none focus:border-[#19706D]"
          />
        </div>

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
          {submitting ? 'Bezig...' : 'Aanmelden'}
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
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#19706D]">
              Leuven 2030 · Beveiligde toegang
            </p>
            <h1 className="font-display text-2xl font-bold text-[#363E49]">
              Aanmelden voor {targetLabel}
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
  if (!open) return null;

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
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#19706D]">
                Leuven 2030 · Organisatie
              </p>
              <h2 id="footer-admin-login-title" className="font-display text-xl font-bold text-[#363E49]">
                Beheerder inloggen
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
