import React from 'react';
import { PurchaseItem } from '../../types';
import { Edit2, Trash2, RefreshCw, ExternalLink, Tag, Target, TrendingDown, CheckCircle, Clock, Star, Flame, Minus, ArrowDown } from 'lucide-react';

interface PurchaseCardProps {
  item: PurchaseItem;
  onEdit: () => void;
  onDelete: () => void;
  onRefreshPrice: () => void;
  onStatusChange: (status: string) => void;
  isRefreshing: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  SPORTS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  CLOTHING: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  ACCESSORIES: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  SUPPLEMENTS: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
};

const PRIORITY_CONFIG: Record<string, { label: string; badgeClass: string; Icon: React.ElementType }> = {
  HIGH: { label: 'High', badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30', Icon: Flame },
  MEDIUM: { label: 'Med', badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', Icon: Minus },
  LOW: { label: 'Low', badgeClass: 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40', Icon: ArrowDown }
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  WISHLIST: { label: 'Wishlist', color: 'bg-zinc-800 text-zinc-300' },
  PLANNED: { label: 'Planned', color: 'bg-sky-500/20 text-sky-400' },
  PURCHASED: { label: 'Purchased', color: 'bg-emerald-500/20 text-emerald-400' }
};

function formatEuro(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PurchaseCard({ item, onEdit, onDelete, onRefreshPrice, onStatusChange, isRefreshing }: PurchaseCardProps) {
  const categoryStyle = CATEGORY_COLORS[item.category] || 'text-zinc-400 bg-zinc-800 border-zinc-700';
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
  const PriorityIcon = priority.Icon;
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.WISHLIST;

  const savingsAmount = item.estimatedPrice && item.currentBestPrice
    ? item.estimatedPrice - item.currentBestPrice
    : null;

  const isPurchased = item.status === 'PURCHASED';

  return (
    <div className={`glass-card-hover p-4 flex flex-col gap-3 ${isPurchased ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${categoryStyle}`}>
              {item.category}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-slate-100 text-sm leading-tight truncate">{item.name}</h3>
          {item.brand && (
            <p className="text-xs text-slate-500 mt-0.5">{item.brand}{item.colorway ? ` · ${item.colorway}` : ''}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${priority.badgeClass}`}>
          <PriorityIcon className="w-3 h-3" />
          {priority.label}
        </div>
      </div>

      {/* Price Section */}
      <div className="bg-black/40 rounded-lg p-2.5 space-y-1.5 border border-zinc-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Tag className="w-3 h-3" />
            Estimated
          </div>
          <span className="text-sm font-medium text-slate-200">{formatEuro(item.estimatedPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Target className="w-3 h-3" />
            Target
          </div>
          <span className="text-sm font-medium text-sky-400">{formatEuro(item.targetPrice)}</span>
        </div>
        {item.currentBestPrice != null && (
          <div className="flex items-center justify-between border-t border-slate-700/50 pt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Star className="w-3 h-3 text-emerald-400" />
              Best Price
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-400">{formatEuro(item.currentBestPrice)}</span>
              {savingsAmount !== null && savingsAmount > 0 && (
                <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" />
                  -{formatEuro(savingsAmount)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subcategory / Notes */}
      {(item.subcategory || item.notes) && (
        <div className="text-xs text-slate-500 space-y-1">
          {item.subcategory && <div>Category: <span className="text-slate-400">{item.subcategory}</span></div>}
          {item.notes && <div className="italic text-slate-500 truncate">{item.notes}</div>}
        </div>
      )}

      {/* Last price fetch */}
      {item.lastPriceFetch && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          Price updated: {formatDate(item.lastPriceFetch)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/30">
        {/* Status cycle */}
        {!isPurchased ? (
          <button
            onClick={() => {
              const next = item.status === 'WISHLIST' ? 'PLANNED' : 'PURCHASED';
              onStatusChange(next);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {item.status === 'WISHLIST' ? 'Mark Planned' : 'Mark Purchased'}
          </button>
        ) : (
          <button
            onClick={() => onStatusChange('WISHLIST')}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            Move to Wishlist
          </button>
        )}

        <button
          onClick={onRefreshPrice}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Refresh price"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {item.productLink && (
          <a
            href={item.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
            title="Open product link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          title="Edit item"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Delete item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
