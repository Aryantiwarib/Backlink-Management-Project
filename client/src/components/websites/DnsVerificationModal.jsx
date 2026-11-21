import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useWebsite } from '../../context/WebsiteContext';

export const DnsVerificationModal = ({ isOpen, website, onClose }) => {
  const { verifyDomain, getWebsiteDetails } = useWebsite();

  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // Load full website details with token & dnsRecord
  useEffect(() => {
    if (isOpen && website) {
      setLoadingDetails(true);
      setVerificationResult(null);
      getWebsiteDetails(website.id || website._id)
        .then((data) => {
          setDetails(data);
          setLoadingDetails(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingDetails(false);
        });
    }
  }, [isOpen, website]);

  if (!isOpen || !website) return null;

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    const res = await verifyDomain(website.id || website._id);
    setVerifying(false);
    setVerificationResult(res);

    if (res.success && res.data) {
      setDetails(res.data);
    }
  };

  const hostName = `_linkora-verification.${website.domain}`;
  const recordValue = details?.dnsRecord?.value || `linkora-verification=${details?.verificationToken || 'loading...'}`;
  const isVerified = details?.verificationStatus === 'verified' || website.verificationStatus === 'verified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="surface-card w-full max-w-xl rounded-2xl border border-white/[0.08] shadow-elevated overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} border flex items-center justify-center`}>
              {isVerified ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-primary">Domain Ownership Verification</h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted font-mono">{website.domain}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {loadingDetails ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Fetching verification instructions...</span>
            </div>
          ) : isVerified ? (
            /* Already Verified View */
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Domain Ownership Confirmed!</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                <span className="font-mono text-emerald-400">{website.domain}</span> has been successfully verified via DNS TXT. All SEO & backlink analytics are authorized for this domain.
              </p>
              {details?.verifiedAt && (
                <p className="text-[11px] text-text-muted">
                  Verified on: {new Date(details.verifiedAt).toLocaleDateString()} at {new Date(details.verifiedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            /* Pending Verification Instructions */
            <>
              <div className="space-y-1">
                <p className="text-text-secondary leading-relaxed">
                  To confirm you own <span className="font-mono text-text-primary font-semibold">{website.domain}</span>, please create a DNS TXT record with your domain provider (Cloudflare, GoDaddy, Namecheap, Route 53, etc.).
                </p>
              </div>

              {/* DNS Record Details Card */}
              <div className="p-4 rounded-xl bg-[#0B0D10] border border-white/[0.08] space-y-3.5">
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Required DNS Record
                </div>

                {/* Record Type */}
                <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-text-muted">Record Type</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">TXT</span>
                  </div>
                </div>

                {/* Record Name / Host */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Host / Name</span>
                    <button
                      onClick={() => handleCopy('_linkora-verification', 'host')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedField === 'host' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'host' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] font-mono text-text-primary text-[11px] break-all select-all">
                    _linkora-verification
                  </div>
                  <p className="text-[10px] text-text-muted">
                    Some DNS providers require the full host: <code className="text-text-secondary">{hostName}</code>
                  </p>
                </div>

                {/* Record Value / Content */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Value / Target</span>
                    <button
                      onClick={() => handleCopy(recordValue, 'value')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedField === 'value' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'value' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] font-mono text-emerald-400 text-[11px] break-all select-all font-semibold">
                    {recordValue}
                  </div>
                </div>

                {/* TTL */}
                <div className="flex items-center justify-between py-1.5 border-t border-white/[0.04] text-[11px]">
                  <span className="text-text-muted">TTL</span>
                  <span className="text-text-secondary font-mono">Auto or 300 seconds</span>
                </div>
              </div>

              {/* Step-by-step Helper */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>How to verify:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-text-secondary pl-1 leading-relaxed">
                  <li>Log in to your DNS manager (e.g. Cloudflare, Namecheap, GoDaddy).</li>
                  <li>Add a new <strong>TXT</strong> record with the Name and Value above.</li>
                  <li>Click <strong>Verify Domain</strong> below. Most providers propagate within 1–5 minutes.</li>
                </ol>
              </div>

              {/* Verification Feedback Alert */}
              {verificationResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                    verificationResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  }`}
                >
                  {verificationResult.success ? (
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{verificationResult.message}</p>
                    {verificationResult.details && (
                      <p className="text-[11px] text-rose-300/80 leading-normal">
                        {verificationResult.details.tip}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-[#0E1115] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            Close
          </button>

          {!isVerified && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || loadingDetails}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs shadow-glow-brand transition-all disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Querying DNS...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Domain</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
