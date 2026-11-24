import React, { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LogOut,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Lock
} from 'lucide-react';

export const ConnectedAccountCard = ({
  accountStatus,
  loading,
  onConnect,
  onDisconnect,
  onRefresh
}) => {
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = accountStatus?.connected && accountStatus?.account?.status === 'connected';
  const isExpired = accountStatus?.account?.status === 'expired' || accountStatus?.account?.status === 'revoked';
  const account = accountStatus?.account;

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Gmail account? You will not be able to send outreach emails until you reconnect.')) {
      return;
    }
    setDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-[#15191E] border border-white/[0.08] relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="relative">
            {account?.metadata?.picture ? (
              <img
                src={account.metadata.picture}
                alt="Google avatar"
                className="w-12 h-12 rounded-2xl border border-white/[0.1] object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Mail className="w-6 h-6" />
              </div>
            )}
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#15191E] flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                {isConnected ? account?.email : 'Gmail Outreach Account'}
              </h3>
              {isConnected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  CONNECTED
                </span>
              ) : isExpired ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  EXPIRED / RECONNECT NEEDED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-text-muted border border-white/[0.08]">
                  NOT CONNECTED
                </span>
              )}
            </div>

            <p className="text-xs text-text-muted max-w-lg">
              {isConnected
                ? `Authorized via Google OAuth 2.0. Ready to dispatch outreach emails directly from ${account?.email}.`
                : 'Connect your personal or corporate Gmail account to send high-deliverability outreach emails directly to link prospects.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                OAuth 2.0 Encrypted At Rest
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-text-muted" />
                No Passwords Stored
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] transition-colors"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Account'}</span>
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-all shadow-lg shadow-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isExpired ? 'Reconnect Gmail' : 'Connect Gmail Account'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectedAccountCard;
