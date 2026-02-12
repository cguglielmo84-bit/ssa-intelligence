import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronDown, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

interface AdminBugReportsProps {
  isAdmin?: boolean;
}

interface BugReport {
  id: string;
  severity: 'critical' | 'error' | 'warning';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'wont_fix';
  category: 'rate_limit' | 'server_error' | 'parse_error' | 'content_error' | 'timeout' | 'unknown';
  title: string;
  description: string;
  errorMessage: string;
  errorStack: string | null;
  errorFingerprint: string;
  jobId: string;
  subJobId: string | null;
  stage: string;
  companyName: string;
  reportType: string;
  geography: string | null;
  industry: string | null;
  attempts: number;
  maxAttempts: number;
  errorContext: Record<string, unknown>;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Summary {
  open: number;
  critical: number;
  byCategory: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  acknowledged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  investigating: 'bg-purple-50 text-purple-700 border-purple-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  wont_fix: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  rate_limit: 'Rate Limit',
  server_error: 'Server Error',
  parse_error: 'Parse Error',
  content_error: 'Content Error',
  timeout: 'Timeout',
  unknown: 'Unknown',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  investigating: 'Investigating',
  resolved: 'Resolved',
  wont_fix: "Won't Fix",
};

export const AdminBugReports: React.FC<AdminBugReportsProps> = ({ isAdmin }) => {
  const { showToast, ToastContainer } = useToast();
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [summary, setSummary] = useState<Summary>({ open: 0, critical: 0, byCategory: {} });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'default';
  } | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Detail modal state
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showStack, setShowStack] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape key handler for detail modal
  useEffect(() => {
    if (!selectedReport) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedReport]);

  const fetchBugReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filterStatus) params.set('status', filterStatus);
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterCategory) params.set('category', filterCategory);
      if (filterStage) params.set('stage', filterStage);

      const res = await fetch(`${apiBase}/admin/bug-reports?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch bug reports');
      const data = await res.json();
      setBugReports(data.bugReports || []);
      setSummary(data.summary || { open: 0, critical: 0, byCategory: {} });
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      showToast('Failed to load bug reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, filterCategory, filterStage, showToast]);

  useEffect(() => {
    fetchBugReports(1);
  }, [fetchBugReports]);

  const openDetail = (report: BugReport) => {
    setSelectedReport(report);
    setEditStatus(report.status);
    setEditNotes(report.resolutionNotes || '');
    setShowStack(false);
    setShowContext(false);
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/admin/bug-reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: editStatus, resolutionNotes: editNotes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      const data = await res.json();
      setSelectedReport(data.bugReport);
      showToast('Bug report updated', 'success');
      fetchBugReports(pagination.page);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (report: BugReport) => {
    setConfirmState({
      open: true,
      title: 'Delete Bug Report',
      message: `Delete "${report.title}"? This cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiBase}/admin/bug-reports/${report.id}`, { method: 'DELETE', credentials: 'include' });
          if (!res.ok && res.status !== 204) throw new Error('Delete failed');
          showToast('Bug report deleted', 'success');
          setSelectedReport(null);
          fetchBugReports(pagination.page);
        } catch {
          showToast('Failed to delete bug report', 'error');
        }
        setConfirmState(null);
      },
    });
  };

  if (!isAdmin) {
    return <div className="text-center text-slate-500 py-12">Admin access required.</div>;
  }

  const topCategory = Object.entries(summary.byCategory).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Open" value={summary.open} color="blue" />
        <SummaryCard label="Critical" value={summary.critical} color="red" />
        <SummaryCard
          label="Top Category"
          value={topCategory ? CATEGORY_LABELS[topCategory[0]] || topCategory[0] : 'None'}
          subtext={topCategory ? `${topCategory[1]} reports` : ''}
          color="amber"
        />
        <SummaryCard label="Total" value={pagination.total} color="slate" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={[
          { value: '', label: 'All Statuses' },
          ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
        ]} />
        <FilterSelect label="Severity" value={filterSeverity} onChange={setFilterSeverity} options={[
          { value: '', label: 'All Severities' },
          { value: 'critical', label: 'Critical' },
          { value: 'error', label: 'Error' },
          { value: 'warning', label: 'Warning' },
        ]} />
        <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory} options={[
          { value: '', label: 'All Categories' },
          ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
        ]} />
        <input
          type="text"
          placeholder="Filter by stage..."
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
        <button
          onClick={() => fetchBugReports(1)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bugReports.length === 0 ? (
          <div className="text-center text-slate-400 py-16">No bug reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {bugReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => openDetail(report)}
                    className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <Pill text={report.severity} style={SEVERITY_STYLES[report.severity]} />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{report.stage}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.companyName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{CATEGORY_LABELS[report.category] || report.category}</td>
                    <td className="px-4 py-3">
                      <Pill text={STATUS_LABELS[report.status] || report.status} style={STATUS_STYLES[report.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchBugReports(pagination.page - 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchBugReports(pagination.page + 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label={`Bug report: ${selectedReport.title}`} className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{selectedReport.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Pill text={selectedReport.severity} style={SEVERITY_STYLES[selectedReport.severity]} />
                  <Pill text={STATUS_LABELS[selectedReport.status] || selectedReport.status} style={STATUS_STYLES[selectedReport.status]} />
                  <span className="text-xs text-slate-400">{CATEGORY_LABELS[selectedReport.category]}</span>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-400">Stage:</span> <span className="font-mono">{selectedReport.stage}</span></div>
                <div><span className="text-slate-400">Company:</span> {selectedReport.companyName}</div>
                <div><span className="text-slate-400">Report Type:</span> {selectedReport.reportType}</div>
                <div><span className="text-slate-400">Attempts:</span> {selectedReport.attempts}/{selectedReport.maxAttempts}</div>
                <div><span className="text-slate-400">Job ID:</span> <span className="font-mono text-xs">{selectedReport.jobId}</span></div>
                <div><span className="text-slate-400">Created:</span> {new Date(selectedReport.createdAt).toLocaleString()}</div>
              </div>

              {/* Error Message */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Error Message</h3>
                <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                  {selectedReport.errorMessage}
                </pre>
              </div>

              {/* Stack Trace (collapsible) */}
              {selectedReport.errorStack && (
                <div>
                  <button
                    onClick={() => setShowStack(!showStack)}
                    className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-800"
                  >
                    {showStack ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Stack Trace
                  </button>
                  {showStack && (
                    <pre className="bg-slate-900 text-slate-300 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono mt-2 max-h-64 overflow-y-auto">
                      {selectedReport.errorStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Error Context (collapsible) */}
              {selectedReport.errorContext && Object.keys(selectedReport.errorContext).length > 0 && (
                <div>
                  <button
                    onClick={() => setShowContext(!showContext)}
                    className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-800"
                  >
                    {showContext ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Error Context
                  </button>
                  {showContext && (
                    <pre className="bg-slate-50 text-slate-700 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono mt-2 border border-slate-200 max-h-64 overflow-y-auto">
                      {JSON.stringify(selectedReport.errorContext, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Status & Resolution */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Resolution Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    placeholder="Add notes about the resolution..."
                  />
                </div>
              </div>

              {/* Resolved info */}
              {selectedReport.resolvedAt && (
                <p className="text-xs text-slate-400">
                  Resolved on {new Date(selectedReport.resolvedAt).toLocaleString()}
                  {selectedReport.resolvedBy ? ` by ${selectedReport.resolvedBy}` : ''}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedReport)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState?.open}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        variant={confirmState?.variant}
        onConfirm={confirmState?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};

/* ---------- small helper components ---------- */

function Pill({ text, style }: { text: string; style?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {text}
    </span>
  );
}

function SummaryCard({ label, value, subtext, color }: { label: string; value: string | number; subtext?: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    red: 'bg-red-50 border-red-100',
    amber: 'bg-amber-50 border-amber-100',
    slate: 'bg-slate-50 border-slate-100',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.slate}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color] || textColors.slate}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
