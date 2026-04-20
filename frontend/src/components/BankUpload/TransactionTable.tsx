import { motion } from 'framer-motion';
import { BankTransaction } from '../../types';
import { RefreshCw, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { B } from '../../design';

interface TransactionTableProps {
  transactions: BankTransaction[];
  onUpdate: (id: string, updates: Partial<BankTransaction>) => void;
  isEditable: boolean;
}

const CATEGORIES = [
  'INCOME', 'FIXED_COSTS', 'VARIABLE_SPENDING', 'SHOPPING',
  'Groceries', 'Dining', 'Transport', 'Entertainment',
  'Healthcare', 'Utilities', 'Rent', 'Insurance', 'Subscriptions', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  INCOME: B.mint,
  FIXED_COSTS: B.rose,
  VARIABLE_SPENDING: B.gold,
  SHOPPING: B.aurora,
};

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ConfidenceBadge({ score, aiPending }: { score?: number; aiPending?: boolean }) {
  if (aiPending) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: B.violet }}>
        <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
        <span>AI</span>
      </span>
    );
  }
  if (!score) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? B.mint : pct >= 60 ? B.gold : B.rose;
  return <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>;
}

export default function TransactionTable({ transactions, onUpdate, isEditable }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', color: B.textMute, fontSize: 14,
        borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        No transactions to display
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 20,
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Date', width: 96, align: 'left' },
                { label: 'Merchant', align: 'left' },
                { label: 'Amount', width: 110, align: 'right' },
                { label: 'Category', width: 160, align: 'left' },
                ...(isEditable ? [{ label: 'Recurring', width: 120, align: 'left' }] : []),
                ...(isEditable ? [{ label: 'AI', width: 56, align: 'center' }] : []),
              ].map((col) => (
                <th
                  key={col.label}
                  style={{
                    padding: '12px 16px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: B.textMute,
                    textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <motion.tr
                key={t.id || idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(idx * 0.025, 0.5), ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: t.aiPending ? 'oklch(70% 0.14 290 / 0.04)' : 'transparent',
                }}
              >
                {/* Date */}
                <td style={{ padding: '11px 16px', color: B.textMute, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatDate(t.date)}
                </td>

                {/* Merchant */}
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.type === 'INCOME'
                      ? <ArrowUpCircle style={{ width: 14, height: 14, color: B.mint, flexShrink: 0 }} />
                      : <ArrowDownCircle style={{ width: 14, height: 14, color: B.rose, flexShrink: 0 }} />
                    }
                    <span style={{ color: B.text, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant}
                    </span>
                    {t.isRecurring && (
                      <span style={{
                        fontSize: 10, color: B.violet, fontWeight: 700,
                        background: 'oklch(70% 0.14 290 / 0.12)',
                        border: '1px solid oklch(70% 0.14 290 / 0.3)',
                        padding: '2px 8px', borderRadius: 999,
                        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                      }}>
                        <RefreshCw style={{ width: 9, height: 9 }} />
                        {t.recurringFrequency?.toLowerCase()}
                      </span>
                    )}
                  </div>
                </td>

                {/* Amount */}
                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{
                    fontWeight: 700,
                    color: t.type === 'INCOME' ? B.mint : B.text,
                    letterSpacing: '-0.01em',
                  }}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatEuro(t.amount)}
                  </span>
                </td>

                {/* Category */}
                <td style={{ padding: '11px 16px' }}>
                  {isEditable ? (
                    <select
                      value={t.userCategory || t.autoCategory || ''}
                      onChange={e => onUpdate(t.id, { userCategory: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '4px 10px',
                        fontSize: 12,
                        color: CATEGORY_COLORS[t.userCategory || t.autoCategory || ''] || B.textDim,
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} style={{ background: 'oklch(14% 0.012 265)', color: B.text }}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, color: CATEGORY_COLORS[t.userCategory || t.autoCategory || ''] || B.textMute }}>
                      {t.userCategory || t.autoCategory || 'Uncategorized'}
                    </span>
                  )}
                </td>

                {/* Recurring */}
                {isEditable && (
                  <td style={{ padding: '11px 16px' }}>
                    <select
                      value={t.isRecurring ? (t.recurringFrequency || 'MONTHLY') : 'none'}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdate(t.id, {
                          isRecurring: val !== 'none',
                          recurringFrequency: val !== 'none' ? val as BankTransaction['recurringFrequency'] : null,
                        });
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '4px 10px',
                        fontSize: 12,
                        color: B.textDim,
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <option value="none" style={{ background: 'oklch(14% 0.012 265)' }}>One-time</option>
                      <option value="WEEKLY" style={{ background: 'oklch(14% 0.012 265)' }}>Weekly</option>
                      <option value="MONTHLY" style={{ background: 'oklch(14% 0.012 265)' }}>Monthly</option>
                      <option value="YEARLY" style={{ background: 'oklch(14% 0.012 265)' }}>Yearly</option>
                    </select>
                  </td>
                )}

                {/* AI confidence */}
                {isEditable && (
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <ConfidenceBadge score={t.confidenceScore} aiPending={t.aiPending} />
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        color: B.textMute,
      }}>
        <span>{transactions.length} transactions</span>
        <span>
          {transactions.filter(t => t.type === 'INCOME').length} income ·{' '}
          {transactions.filter(t => t.type === 'EXPENSE').length} expenses
        </span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
