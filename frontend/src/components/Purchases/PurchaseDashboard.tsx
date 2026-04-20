import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { purchasesApi } from '../../api/client';
import { PurchaseItem } from '../../types';
import PurchaseCard from './PurchaseCard';
import AddPurchaseModal from './AddPurchaseModal';
import { Plus, ShoppingBag, Filter, Search } from 'lucide-react';
import { B, grad } from '../../design';

const CATEGORIES = ['ALL', 'SPORTS', 'CLOTHING', 'ACCESSORIES', 'SUPPLEMENTS'] as const;
const STATUSES = ['ALL', 'WISHLIST', 'PLANNED', 'PURCHASED'] as const;

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function PurchaseDashboard() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PurchaseItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const refreshPriceMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.refreshPrice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      purchasesApi.update(id, { status: status as PurchaseItem['status'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const filtered = purchases.filter(p => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.brand?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalWishlist = purchases
    .filter(p => p.status !== 'PURCHASED')
    .reduce((sum, p) => sum + (p.targetPrice || p.estimatedPrice || 0), 0);

  const totalPurchased = purchases
    .filter(p => p.status === 'PURCHASED')
    .reduce((sum, p) => sum + (p.estimatedPrice || 0), 0);

  const highPriority = purchases.filter(p => p.priority === 'HIGH' && p.status !== 'PURCHASED').length;

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Page heading + add button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}
      >
        <div>
          <h2
            className="iridescent-text"
            style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}
          >
            Purchase Tracker
          </h2>
          <p style={{ fontSize: 13, color: B.textMute, marginTop: 8, margin: '8px 0 0' }}>
            {purchases.length} items tracked
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Add Item
        </button>
      </motion.div>

      {/* Stat pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}
      >
        {[
          { label: 'Wishlist', value: formatEuro(totalWishlist), gradient: grad.aurora, glow: B.aurora },
          { label: 'Spent', value: formatEuro(totalPurchased), gradient: grad.income, glow: B.mint },
          { label: 'High Priority', value: String(highPriority), gradient: grad.rose, glow: B.rose },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              padding: '18px 20px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.07)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: stat.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
            <p style={{ fontSize: 11, color: B.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, margin: '6px 0 0' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: B.textMute }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="input-field"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter style={{ width: 14, height: 14, color: B.textMute }} />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="select-field"
            style={{ fontSize: 13 }}
          >
            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: 'oklch(14% 0.012 265)' }}>{c}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="select-field"
          style={{ fontSize: 13 }}
        >
          {STATUSES.map(s => <option key={s} value={s} style={{ background: 'oklch(14% 0.012 265)' }}>{s}</option>)}
        </select>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 32px', gap: 16, textAlign: 'center',
            borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <ShoppingBag style={{ width: 48, height: 48, color: B.textMute }} />
          <div>
            <p style={{ color: B.textDim, fontWeight: 600, fontSize: 15, margin: 0 }}>No items found</p>
            <p style={{ color: B.textMute, fontSize: 13, marginTop: 6, margin: '6px 0 0' }}>
              {purchases.length === 0 ? 'Add your first purchase item' : 'Try adjusting your filters'}
            </p>
          </div>
          {purchases.length === 0 && (
            <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Plus style={{ width: 16, height: 16 }} />
              Add First Item
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filtered.map(item => (
            <motion.div key={item.id} variants={cardVariants}>
              <PurchaseCard
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
            </motion.div>
          ))}
        </motion.div>
      )}

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
