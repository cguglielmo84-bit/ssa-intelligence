import React, { useEffect, useRef, useState } from 'react';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

interface InviteAcceptProps {
  token: string;
  onAccepted: () => void | Promise<void>;
}

export const InviteAccept: React.FC<InviteAcceptProps> = ({ token, onAccepted }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const onAcceptedRef = useRef(onAccepted);
  onAcceptedRef.current = onAccepted;

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No invite token provided.');
      return;
    }

    let cancelled = false;

    const accept = async () => {
      try {
        // Check if user is already active — skip accept if so
        const meRes = await fetch(`${API_BASE}/me`, { credentials: 'include' });
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled && me.status === 'ACTIVE') {
            setStatus('success');
            setTimeout(() => onAcceptedRef.current(), 1000);
            return;
          }
        }

        if (cancelled) return;

        const res = await fetch(`${API_BASE}/invites/accept`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed: ${res.status}`);
        }

        if (cancelled) return;
        setStatus('success');
        setTimeout(() => onAcceptedRef.current(), 2000);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invite.');
      }
    };

    accept();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Accepting Invite</h2>
            <p className="text-sm text-slate-500">Please wait while we activate your account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Welcome!</h2>
            <p className="text-sm text-slate-500">Your account has been activated. Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Unable to Accept Invite</h2>
            <p className="text-sm text-slate-500 mb-4">{errorMessage}</p>
            <button
              onClick={() => { window.location.hash = '/'; }}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};
