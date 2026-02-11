import React, { useState } from 'react';
import {
  ChevronRight,
  Building2,
} from 'lucide-react';
import type { NewsArticle } from '../../services/newsManager';
import { ArticleCard } from './ArticleCard';

interface CompanyArticleGroupProps {
  companyName: string;
  articles: NewsArticle[];
  onArticleClick: (article: NewsArticle) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (articleId: string, event: React.MouseEvent) => void;
  pinnedIds?: Set<string>;
  onTogglePin?: (articleId: string) => void;
}

export const CompanyArticleGroup: React.FC<CompanyArticleGroupProps> = ({
  companyName,
  articles,
  onArticleClick,
  selectedIds,
  onToggleSelection,
  pinnedIds,
  onTogglePin,
}) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-4 rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className={`p-1.5 rounded-lg transition-transform ${collapsed ? 'rotate-0' : 'rotate-90'}`}>
            <ChevronRight size={18} className="text-slate-500" />
          </div>
          <div className="p-2 rounded-xl shadow-md bg-gradient-to-br from-brand-400 to-violet-500">
            <Building2 className="text-white" size={18} />
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-bold text-slate-800">{companyName}</h3>
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold min-w-[28px] shadow-md border backdrop-blur-sm bg-gradient-to-r from-brand-500 to-violet-500 text-white border-brand-400/50 shadow-brand-500/30">
              {articles.length}
            </span>
          </div>
        </button>
      </div>

      {/* Cards Grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => onArticleClick(article)}
              isSelected={selectedIds?.has(article.id) || false}
              isPinned={pinnedIds?.has(article.id) || false}
              onToggleSelection={onToggleSelection}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
};
