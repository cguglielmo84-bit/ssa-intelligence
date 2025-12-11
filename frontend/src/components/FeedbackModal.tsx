import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name?: string; email?: string; message: string; pagePath?: string; reportId?: string }) => Promise<void>;
  context: { pagePath?: string; reportId?: string };
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, context }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!message.trim()) {
      setError('Please enter your feedback.');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim(),
        ...context
      });
      setSuccess('Thank you for your feedback!');
      setMessage('');
      setName('');
      setEmail('');
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Share feedback</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm"
            disabled={submitting}
          >
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">
            Tell us what you think. Please include which page/report you’re referencing.
          </p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name (optional)</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email (optional)</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Feedback *</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[140px] focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What’s working well? What could be improved?"
              maxLength={5000}
              required
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">{message.length}/5000</div>
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">{success}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Submit feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
