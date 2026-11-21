import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GOOGLE_AUTH_URL } from '../config/api';
import { Link2, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const from = location.state?.from?.pathname || '/';

  // Check URL query parameters for OAuth errors or messages
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const messageParam = params.get('message');
    if (errorParam) {
      setServerError(
        messageParam ? decodeURIComponent(messageParam) : 'Google authentication failed or was cancelled.'
      );
    }
  }, [location.search]);

  // If already logged in, redirect away
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      addToast(`Welcome back, ${result.user?.name || 'Alex'}!`, 'success');
      navigate(from, { replace: true });
    } else {
      setServerError(result.message || 'Invalid email or password.');
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = GOOGLE_AUTH_URL;
  };

  const handleFillDemo = () => {
    setEmail('alex@growthlabs.io');
    setPassword('password123');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-text-primary flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background subtle radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow-brand mb-2">
            <Link2 className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-2xl tracking-wider text-text-primary">
              LINK<span className="text-emerald-400">ORA</span>
            </span>
          </div>
          <p className="text-xs text-text-muted">
            SEO Automation & Backlink Intelligence Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-white/[0.08] shadow-elevated">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Access your SEO analytics and backlink profile
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#1B2026] hover:bg-[#222831] border border-white/[0.1] text-text-primary text-xs font-semibold tracking-tight transition-all active:scale-[0.99] hover:border-white/[0.2] mb-5 disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-white/[0.08] w-full" />
            <span className="bg-[#15191E] px-3 text-[11px] font-medium text-text-muted uppercase tracking-wider">
              or continue with email
            </span>
            <div className="border-t border-white/[0.08] w-full" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Work Email <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@growthlabs.io"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  className={`w-full bg-[#111419] border ${
                    errors.email ? 'border-rose-500/50' : 'border-white/[0.08]'
                  } rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  Password <span className="text-emerald-400">*</span>
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  className={`w-full bg-[#111419] border ${
                    errors.password ? 'border-rose-500/50' : 'border-white/[0.08]'
                  } rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-tight transition-all shadow-glow-brand disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-text-muted text-[11px]">Demo account:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20"
            >
              Autofill Demo Login
            </button>
          </div>
        </div>

        {/* Footer Link to Signup */}
        <p className="text-center text-xs text-text-muted">
          Don't have a Linkora account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google OAuth 2.0 & Passport.js Session-Secured</span>
        </div>
      </div>
    </div>
  );
};
