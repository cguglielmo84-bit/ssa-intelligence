/**
 * News Dashboard Page
 * Display news articles with filtering, refresh, and search capabilities
 */

import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Filter,
  Search,
  ExternalLink,
  Clock,
  Building2,
  User,
  Tag,
  AlertCircle,
  ChevronDown,
  X,
  Loader2,
  Newspaper,
  Download,
  FileText,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  useNewsArticles,
  useRevenueOwners,
  useNewsTags,
  useTrackedCompanies,
  useNewsRefresh,
  useNewsSearch,
  NewsArticle,
  ArticleFilters,
} from '../services/newsManager';

interface NewsDashboardProps {
  onNavigate: (path: string) => void;
}

export const NewsDashboard: React.FC<NewsDashboardProps> = ({ onNavigate }) => {
  // Filters state
  const [filters, setFilters] = useState<ArticleFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Ad-hoc search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  const [searchPerson, setSearchPerson] = useState('');

  // Selected article for detail view
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportOwnerId, setExportOwnerId] = useState<string>('');

  // Data hooks
  const { articles, total, loading: articlesLoading, fetchArticles } = useNewsArticles(filters);
  const { owners } = useRevenueOwners();
  const { tags } = useNewsTags();
  const { companies } = useTrackedCompanies();
  const { status, refreshing, refresh } = useNewsRefresh();
  const { results: searchResults, searching, search, clearResults } = useNewsSearch();

  const handleRefresh = async () => {
    try {
      const result = await refresh();
      await fetchArticles();

      // Show feedback to user
      if (result.articlesFound > 0) {
        alert(`Found ${result.articlesFound} new article${result.articlesFound > 1 ? 's' : ''}!`);
      } else if (result.coverageGaps?.length > 0) {
        alert(`No new articles found. Coverage gaps: ${result.coverageGaps.map(g => g.company).join(', ')}`);
      } else {
        alert('Refresh complete. No new articles found.');
      }
    } catch (err) {
      alert(`Refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSearch = async () => {
    if (!searchCompany.trim() && !searchPerson.trim()) return;
    try {
      await search({
        company: searchCompany.trim() || undefined,
        person: searchPerson.trim() || undefined,
      });
    } catch (err) {
      // Error already shown in hook
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleExport = (format: 'pdf' | 'markdown') => {
    if (!exportOwnerId) {
      alert('Please select a Revenue Owner to export');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/news/export/${format}/${exportOwnerId}`;

    // Open in new tab to trigger download
    window.open(url, '_blank');
    setShowExportMenu(false);
  };

  // Group articles by priority
  const groupedArticles = useMemo(() => {
    const high = articles.filter(a => a.priority === 'high');
    const medium = articles.filter(a => a.priority === 'medium');
    const low = articles.filter(a => a.priority === 'low');
    const other = articles.filter(a => !a.priority);
    return { high, medium, low, other };
  }, [articles]);

  const priorityColors = {
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">News Intelligence</h2>
          <p className="text-slate-500 mt-1">
            {total} articles from tracked companies and people
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showSearch ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Search size={18} />
            <span className="hidden sm:inline">Search</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh News'}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showExportMenu ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={14} className={showExportMenu ? 'rotate-180' : ''} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Revenue Owner</label>
                  <select
                    value={exportOwnerId}
                    onChange={(e) => setExportOwnerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select owner...</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>{owner.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!exportOwnerId}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FileText size={18} className="text-rose-500" />
                    <div>
                      <div className="font-medium text-slate-700">Export as PDF</div>
                      <div className="text-xs text-slate-400">Print-ready document</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    disabled={!exportOwnerId}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FileText size={18} className="text-blue-500" />
                    <div>
                      <div className="font-medium text-slate-700">Export as Markdown</div>
                      <div className="text-xs text-slate-400">Copy-paste friendly</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ad-Hoc Search Panel */}
      {showSearch && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Ad-Hoc Search</h3>
            <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
              placeholder="Company name..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <input
              type="text"
              value={searchPerson}
              onChange={(e) => setSearchPerson(e.target.value)}
              placeholder="Person name..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={handleSearch}
              disabled={searching || (!searchCompany.trim() && !searchPerson.trim())}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {searching ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{searchResults.length} results</span>
                <button onClick={clearResults} className="text-sm text-slate-400 hover:text-slate-600">
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((article, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="font-medium text-slate-800 text-sm">{article.headline}</div>
                    <div className="text-xs text-slate-500 mt-1">{article.sourceName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-brand-600 hover:text-brand-700">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Revenue Owner</label>
              <select
                value={filters.revenueOwnerId || ''}
                onChange={(e) => setFilters({ ...filters, revenueOwnerId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All owners</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Company</label>
              <select
                value={filters.companyId || ''}
                onChange={(e) => setFilters({ ...filters, companyId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Topic</label>
              <select
                value={filters.tagId || ''}
                onChange={(e) => setFilters({ ...filters, tagId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All topics</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: (e.target.value as any) || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated Info */}
      {status.lastRefreshedAt && !refreshing && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={14} />
          <span>Last refreshed: {formatDate(status.lastRefreshedAt)}</span>
          {status.articlesFound > 0 && (
            <span className="text-slate-400">({status.articlesFound} articles found)</span>
          )}
        </div>
      )}

      {/* Refresh Progress Panel */}
      {refreshing && status.steps && status.steps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin text-brand-600" size={20} />
              <div>
                <h3 className="font-semibold text-slate-800">Refreshing News</h3>
                <p className="text-sm text-slate-500">{status.progressMessage}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-brand-600">{status.progress}%</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {status.steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-2 rounded-lg ${
                  step.status === 'in_progress' ? 'bg-brand-50' : ''
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : step.status === 'in_progress' ? (
                  <Loader2 size={18} className="text-brand-600 animate-spin mt-0.5 flex-shrink-0" />
                ) : step.status === 'error' ? (
                  <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-slate-300 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${
                    step.status === 'in_progress' ? 'font-medium text-brand-700' :
                    step.status === 'completed' ? 'text-slate-700' :
                    'text-slate-400'
                  }`}>
                    {step.step}
                  </div>
                  {step.detail && (
                    <div className="text-xs text-slate-500 mt-0.5">{step.detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!articlesLoading && articles.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Newspaper className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No News Yet</h3>
          <p className="text-slate-500 mb-4">
            {owners.length === 0
              ? 'Set up Revenue Owners with companies to track, then refresh to fetch news.'
              : 'Click "Refresh News" to fetch the latest articles for your tracked entities.'}
          </p>
          {owners.length === 0 ? (
            <button
              onClick={() => onNavigate('/news/setup')}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Go to Setup
            </button>
          ) : (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {refreshing ? 'Refreshing...' : 'Refresh News'}
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {articlesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      )}

      {/* Articles by Priority */}
      {!articlesLoading && articles.length > 0 && (
        <div className="space-y-8">
          {/* High Priority */}
          {groupedArticles.high.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                High Priority
                <span className="text-sm font-normal text-slate-400">({groupedArticles.high.length})</span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {groupedArticles.high.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority */}
          {groupedArticles.medium.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                Medium Priority
                <span className="text-sm font-normal text-slate-400">({groupedArticles.medium.length})</span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {groupedArticles.medium.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority */}
          {groupedArticles.low.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                <span className="w-3 h-3 bg-slate-400 rounded-full"></span>
                Low Priority
                <span className="text-sm font-normal text-slate-400">({groupedArticles.low.length})</span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {groupedArticles.low.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other (No Priority) */}
          {groupedArticles.other.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Other
                <span className="text-sm font-normal text-slate-400 ml-2">({groupedArticles.other.length})</span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {groupedArticles.other.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
};

// Article Card Component
const ArticleCard: React.FC<{ article: NewsArticle; onClick: () => void }> = ({ article, onClick }) => {
  const priorityColors: Record<string, string> = {
    high: 'border-l-rose-500',
    medium: 'border-l-amber-500',
    low: 'border-l-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
        priorityColors[article.priority || ''] || 'border-l-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-800 line-clamp-2">{article.headline}</h4>
      </div>

      {article.summary && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{article.summary}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {article.matchType && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            article.matchType === 'exact'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-violet-100 text-violet-700'
          }`}>
            {article.matchType.toUpperCase()}
          </span>
        )}
        {article.company && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
            <Building2 size={12} />
            {article.company.name}
          </span>
        )}
        {article.tag && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
            <Tag size={12} />
            {article.tag.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{article.sourceName || 'Unknown source'}</span>
        <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );
};

// Article Detail Modal
const ArticleDetailModal: React.FC<{ article: NewsArticle; onClose: () => void }> = ({ article, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-slate-900">{article.headline}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
              <span>{article.sourceName}</span>
              {article.publishedAt && (
                <>
                  <span>•</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {article.priority && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                article.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                article.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {article.priority.charAt(0).toUpperCase() + article.priority.slice(1)} Priority
              </span>
            )}
            {article.matchType && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                article.matchType === 'exact'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {article.matchType.toUpperCase()} Match
              </span>
            )}
            {article.company && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {article.company.name}
              </span>
            )}
            {article.tag && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                {article.tag.name}
              </span>
            )}
          </div>

          {/* Summary */}
          {article.summary && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Summary</h3>
              <p className="text-slate-600">{article.summary}</p>
            </div>
          )}

          {/* Why It Matters */}
          {article.whyItMatters && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
              <h3 className="font-semibold text-brand-800 mb-2">Why It Matters</h3>
              <p className="text-brand-700">{article.whyItMatters}</p>
            </div>
          )}

          {/* Revenue Owners */}
          {article.revenueOwners && article.revenueOwners.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Relevant To</h3>
              <div className="flex flex-wrap gap-2">
                {article.revenueOwners.map((owner) => (
                  <span key={owner.id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                    {owner.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Link */}
          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
            >
              Read Full Article
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
