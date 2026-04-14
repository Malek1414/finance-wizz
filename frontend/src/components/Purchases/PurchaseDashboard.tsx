import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../../api/client';
import { PurchaseItem } from '../../types';
import PurchaseCard from './PurchaseCard';
import AddPurchaseModal from './AddPurchaseModal';
import { Plus, ShoppingBag, Filter, Search, RefreshCw } from 'lucide-react';

const CATEGORIES = ['ALL', 'SPORTS', 'CLOTHING', 'ACCESSORIES', 'SUPPLEMENTS'] as const;
const STATUSES = ['ALL', 'WISHLIST', 'PLANNED', 'PURCHASED'] as const;

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function PurchaseDashboard() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PurchaseItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesApi.getAll()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  });

  const refreshPriceMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.refreshPrice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      purchasesApi.update(id, { status: status as PurchaseItem['status'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  });

  // Filter purchases
  const filtered = purchases.filter(p => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.brand?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalWishlist = purchases
    .filter(p => p.status !== 'PURCHASED')
    .reduce((sum, p) => sum + (p.targetPrice || p.estimatedPrice || 0), 0);

  const totalPurchased = purchases
    .filter(p => p.status === 'PURCHASED')
    .reduce((sum, p) => sum + (p.estimatedPrice || 0), 0);

  const highPriority = purchases.filter(p => p.priority === 'HIGH' && p.status !== 'PURCHASED').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Purchase Tracker</h2>
            <p className="text-xs text-slate-500">{purchases.length} items tracked</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card p-3 text-center border-sky-500/10 bg-sky-500/5">
            <div className="text-lg font-bold text-sky-400">{formatEuro(totalWishlist)}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Wishlist</div>
          </div>
          <div className="glass-card p-3 text-center border-emerald-500/10 bg-emerald-500/5">
            <div className="text-lg font-bold text-emerald-400">{formatEuro(totalPurchased)}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Spent</div>
          </div>
          <div className="glass-card p-3 text-center border-rose-500/10 bg-rose-500/5">
            <div className="text-lg font-bold text-rose-400">{highPriority}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">High Priority</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input-field w-full pl-9 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="select-field py-1.5 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="select-field py-1.5 text-sm"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-1.5">
                      <div className="skeleton h-5 w-20 rounded-full" />
                      <div className="skeleton h-5 w-16 rounded-full" />
                    </div>
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-5 w-12 rounded-full" />
                </div>
                <div className="skeleton h-20 w-full rounded-lg" />
                <div className="skeleton h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <ShoppingBag className="w-12 h-12 text-slate-600" />
            <div className="text-center">
              <p className="text-slate-400 font-medium">No items found</p>
              <p className="text-slate-500 text-sm mt-1">
                {purchases.length === 0 ? 'Add your first purchase item' : 'Try adjusting your filters'}
              </p>
            </div>
            {purchases.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <PurchaseCard
                key={item.id}
                item={item}
                onEdit={() => setEditItem(item)}
                onDelete={() => {
                  if (window.confirm(`Delete "${item.name}"?`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
                onRefreshPrice={() => refreshPriceMutation.mutate(item.id)}
                onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                isRefreshing={refreshPriceMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editItem) && (
        <AddPurchaseModal
          item={editItem || undefined}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            setShowAdd(false);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}
