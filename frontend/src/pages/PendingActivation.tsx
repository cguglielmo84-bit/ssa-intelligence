import React from 'react';

interface PendingActivationProps {
  email?: string;
  supportContact?: string | null;
}

export const PendingActivation: React.FC<PendingActivationProps> = ({ email, supportContact }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Account Pending Activation</h2>
        <p className="text-sm text-slate-500 mb-4">
          Your account has not been activated yet.
          {supportContact
            ? <> Please contact your administrator at <a href={`mailto:${supportContact}`} className="text-brand-600 hover:underline">{supportContact}</a> for an invite link to get started.</>
            : <> Please contact your administrator for an invite link to get started.</>
          }
        </p>
        {email && (
          <p className="text-xs text-slate-400">
            Signed in as <span className="font-medium text-slate-500">{email}</span>
          </p>
        )}
      </div>
    </div>
  );
};
