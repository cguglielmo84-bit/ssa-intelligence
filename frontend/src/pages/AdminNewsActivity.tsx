/**
 * Admin News Activity Dashboard
 * Charts and tables for user engagement analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Eye, Users, Clock, ChevronLeft, Loader2 } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

// ============================================================================
// Types
// ============================================================================

interface Summary {
  totalEvents: number;
  uniqueActiveUsers: number;
  avgTimePerArticleMs: number;
}

interface DailyOpen {
  date: string;
  count: number;
}

interface TopArticle {
  articleId: string;
  views: number;
  headline: string;
  company: string | null;
}

interface ActiveUser {
  userId: string;
  eventCount: number;
  name: string | null;
  email: string;
}

interface RecentEvent {
  id: string;
  type: string;
  articleId: string | null;
  pagePath: string | null;
  durationMs: number | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface UserDetail {
  user: { id: string; name: string | null; email: string; role: string };
  total: number;
  typeCounts: Array<{ type: string; count: number }>;
  events: Array<{
    id: string;
    type: string;
    articleId: string | null;
    pagePath: string | null;
    durationMs: number | null;
    createdAt: string;
    metadata: unknown;
  }>;
}

// ============================================================================
// Component
// ============================================================================

interface AdminNewsActivityProps {
  isAdmin?: boolean;
}

export const AdminNewsActivity: React.FC<AdminNewsActivityProps> = ({ isAdmin }) => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyOpens, setDailyOpens] = useState<DailyOpen[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

  // User drill-down state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Fetch aggregated metrics
  useEffect(() => {
    if (!isAdmin) return;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE.replace(/\/$/, '')}/admin/news/activity?days=${days}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setSummary(data.summary);
        setDailyOpens(data.dailyOpens || []);
        setTopArticles(data.topArticles || []);
        setActiveUsers(data.activeUsers || []);
        setRecentEvents(data.recentEvents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity data');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [isAdmin, days]);

  // Fetch user detail
  useEffect(() => {
    if (!selectedUserId) {
      setUserDetail(null);
      return;
    }

    const fetchUserDetail = async () => {
      setUserDetailLoading(true);
      try {
        const res = await fetch(`${API_BASE.replace(/\/$/, '')}/admin/news/activity/${selectedUserId}?days=${days}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setUserDetail(data);
      } catch {
        setUserDetail(null);
      } finally {
        setUserDetailLoading(false);
      }
    };

    fetchUserDetail();
  }, [selectedUserId, days]);

  const avgTimeFormatted = useMemo(() => {
    if (!summary?.avgTimePerArticleMs) return '0s';
    const seconds = Math.round(summary.avgTimePerArticleMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }, [summary]);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
        Admin access required.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-rose-600">
        {error}
      </div>
    );
  }

  // User detail view
  if (selectedUserId && userDetail) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedUserId(null)}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <ChevronLeft size={16} />
          Back to Overview
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            {userDetail.user.name || userDetail.user.email}
          </h2>
          <p className="text-sm text-slate-500 mb-4">{userDetail.user.email}</p>

          {/* Type breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {userDetail.typeCounts.map(tc => (
              <div key={tc.type} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500 truncate">{tc.type.replace(/_/g, ' ')}</div>
                <div className="text-lg font-bold text-slate-800">{tc.count}</div>
              </div>
            ))}
          </div>

          {/* Events timeline */}
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Recent Events ({userDetail.total} total)
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {userDetail.events.map(event => (
              <div key={event.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="inline-flex items-center px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium min-w-[100px] justify-center">
                  {event.type.replace(/_/g, ' ')}
                </span>
                {event.articleId && (
                  <span className="text-slate-500 truncate max-w-[200px]" title={event.articleId}>
                    Article: {event.articleId.slice(0, 8)}...
                  </span>
                )}
                {event.durationMs && (
                  <span className="text-slate-400 text-xs">{Math.round(event.durationMs / 1000)}s</span>
                )}
                <span className="text-slate-400 text-xs ml-auto whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
            {userDetail.events.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No events in this period.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">News Engagement</h2>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Activity size={20} className="text-brand-500" />}
          label="Total Events"
          value={summary?.totalEvents?.toLocaleString() || '0'}
        />
        <SummaryCard
          icon={<Users size={20} className="text-purple-500" />}
          label="Active Users"
          value={String(summary?.uniqueActiveUsers || 0)}
        />
        <SummaryCard
          icon={<Clock size={20} className="text-emerald-500" />}
          label="Avg Time / Article"
          value={avgTimeFormatted}
        />
      </div>

      {/* Daily Opens Chart */}
      {dailyOpens.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Article Opens</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyOpens}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Opens" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column: Top Articles + Most Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Articles */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Eye size={16} className="text-slate-400" />
            Top Articles
          </h3>
          {topArticles.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topArticles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis
                  dataKey="headline"
                  type="category"
                  width={180}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 30) + '...' : v}
                />
                <Tooltip />
                <Bar dataKey="views" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Views" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No article views yet.</p>
          )}
        </div>

        {/* Most Active Users */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Most Active Users
          </h3>
          {activeUsers.length > 0 ? (
            <div className="space-y-2">
              {activeUsers.map((user, idx) => (
                <button
                  key={user.userId}
                  onClick={() => setSelectedUserId(user.userId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg hover:bg-brand-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{user.name || user.email}</div>
                      {user.name && <div className="text-xs text-slate-400">{user.email}</div>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-600">{user.eventCount}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No user activity yet.</p>
          )}
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Events</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">Article</th>
                <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEvents.slice(0, 25).map(event => (
                <tr key={event.id} className="hover:bg-slate-50">
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => setSelectedUserId(event.user.id)}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      {event.user.name || event.user.email}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {event.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-500 max-w-[200px] truncate">
                    {event.articleId ? `${event.articleId.slice(0, 8)}...` : '-'}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">
                    {event.durationMs ? `${Math.round(event.durationMs / 1000)}s` : '-'}
                  </td>
                  <td className="py-2 text-slate-400 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentEvents.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No events recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
    <div className="p-3 rounded-xl bg-slate-50">{icon}</div>
    <div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  </div>
);
