import { BankTransaction } from '../../types';
import { RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface TransactionTableProps {
  transactions: BankTransaction[];
  onUpdate: (id: string, updates: Partial<BankTransaction>) => void;
  isEditable: boolean;
}

const CATEGORIES = [
  'INCOME',
  'FIXED_COSTS',
  'VARIABLE_SPENDING',
  'SHOPPING',
  'Groceries',
  'Dining',
  'Transport',
  'Entertainment',
  'Healthcare',
  'Utilities',
  'Rent',
  'Insurance',
  'Subscriptions',
  'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
  INCOME: 'text-emerald-400',
  FIXED_COSTS: 'text-rose-400',
  VARIABLE_SPENDING: 'text-amber-400',
  SHOPPING: 'text-sky-400'
};

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (!score) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400';
  return (
    <span className={`text-xs ${color}`} title="AI confidence">
      {pct}%
    </span>
  );
}

export default function TransactionTable({ transactions, onUpdate, isEditable }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        No transactions to display
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Merchant</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Category</th>
              {isEditable && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Recurring</th>
              )}
              {isEditable && (
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-16">AI</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {transactions.map((t, idx) => (
              <tr
                key={t.id || idx}
                className="hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {t.type === 'INCOME'
                      ? <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    }
                    <span className="text-slate-200 truncate max-w-xs">{t.merchant}</span>
                    {t.isRecurring && (
                      <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <RefreshCw className="w-2.5 h-2.5 inline mr-0.5" />
                        {t.recurringFrequency?.toLowerCase()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className={`font-semibold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatEuro(t.amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isEditable ? (
                    <select
                      value={t.userCategory || t.autoCategory || ''}
                      onChange={e => onUpdate(t.id, { userCategory: e.target.value })}
                      className={`bg-black/60 border border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-full
                        ${CATEGORY_COLORS[t.userCategory || t.autoCategory || ''] || 'text-slate-300'}`}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="text-slate-200 bg-zinc-900">{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs ${CATEGORY_COLORS[t.userCategory || t.autoCategory || ''] || 'text-slate-400'}`}>
                      {t.userCategory || t.autoCategory || 'Uncategorized'}
                    </span>
                  )}
                </td>
                {isEditable && (
                  <td className="px-4 py-3">
                    <select
                      value={t.isRecurring ? (t.recurringFrequency || 'MONTHLY') : 'none'}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdate(t.id, {
                          isRecurring: val !== 'none',
                          recurringFrequency: val !== 'none' ? val as BankTransaction['recurringFrequency'] : null
                        });
                      }}
                      className="bg-black/60 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-full"
                    >
                      <option value="none">One-time</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </td>
                )}
                {isEditable && (
                  <td className="px-4 py-3 text-center">
                    <ConfidenceBadge score={t.confidenceScore} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-500">
        <span>{transactions.length} transactions</span>
        <span>
          {transactions.filter(t => t.type === 'INCOME').length} income,{' '}
          {transactions.filter(t => t.type === 'EXPENSE').length} expenses
        </span>
      </div>
    </div>
  );
}
