import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '../../api/client';
import { SpendingPieChart, MonthlyAreaChart, HealthGauge } from './Charts';
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank,
  RefreshCw, ShoppingCart, AlertTriangle, CheckCircle,
  BarChart3, RepeatIcon
} from 'lucide-react';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="glass-card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            trend === 'up'
              ? 'text-emerald-400 bg-emerald-500/10'
              : trend === 'down'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs mt-1.5 font-medium" style={{ color }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function Insights() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['insights'],
    queryFn: insightsApi.getSummary,
    staleTime: 60_000
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-3 w-56" />
            </div>
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="skeleton h-7 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5 space-y-4">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-48 w-full rounded-xl" />
            </div>
            <div className="glass-card p-5 space-y-4">
              <div className="skeleton h-4 w-52" />
              <div className="skeleton h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card p-8 text-center max-w-md">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-medium mb-2">No insights yet</p>
          <p className="text-slate-400 text-sm">
            Import bank transactions to see your spending analytics and financial health score.
          </p>
          <button onClick={() => refetch()} className="btn-secondary mt-4 flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totalIncome, totalExpenses, remaining, savingsRate,
    spendingByCategory, monthlyHistory, healthScore,
    topMerchants, recurringExpenses, wishlistAffordability } = data;

  const monthlyRecurring = recurringExpenses.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Financial Insights</h2>
            <p className="text-xs text-slate-500">Based on all imported transactions</p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Income"
            value={formatEuro(totalIncome)}
            icon={TrendingUp}
            color="#10b981"
            trend="up"
          />
          <StatCard
            title="Total Expenses"
            value={formatEuro(totalExpenses)}
            icon={TrendingDown}
            color="#f43f5e"
            trend="down"
          />
          <StatCard
            title="Net Remaining"
            value={formatEuro(remaining)}
            subtitle={remaining >= 0 ? 'Positive balance' : 'Over budget'}
            icon={DollarSign}
            color={remaining >= 0 ? '#10b981' : '#f43f5e'}
            trend={remaining >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Savings Rate"
            value={formatPct(savingsRate)}
            subtitle={savingsRate >= 20 ? 'Great!' : savingsRate >= 10 ? 'Good' : 'Improve this'}
            icon={PiggyBank}
            color={savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#f43f5e'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Breakdown */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-400" />
              Spending Breakdown
            </h3>
            <SpendingPieChart data={spendingByCategory} />
          </div>

          {/* Monthly History */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-sky-400" />
              Income vs Expenses (6 months)
            </h3>
            <MonthlyAreaChart data={monthlyHistory} />
          </div>
        </div>

        {/* Health Score + Wishlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Score */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-violet-400" />
              Financial Health Score
            </h3>
            <HealthGauge score={healthScore} />
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                {savingsRate >= 20
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                }
                <span className="text-slate-300">
                  Savings rate: <strong className={savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
                    {formatPct(savingsRate)}
                  </strong> {savingsRate >= 20 ? '(excellent)' : '(aim for 20%+)'}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                {recurringExpenses.length > 0
                  ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  : <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                }
                <span className="text-slate-300">
                  Recurring costs: <strong className="text-amber-400">{formatEuro(monthlyRecurring)}/month</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Wishlist Affordability */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-sky-400" />
              Wishlist Affordability
            </h3>
            {wishlistAffordability.totalWishlistCost > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {wishlistAffordability.canAfford
                    ? <CheckCircle className="w-10 h-10 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className="w-10 h-10 text-amber-400 flex-shrink-0" />
                  }
                  <div>
                    <p className={`font-semibold ${wishlistAffordability.canAfford ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {wishlistAffordability.canAfford ? 'You can afford your wishlist!' : 'Wishlist exceeds budget'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {wishlistAffordability.canAfford
                        ? `${formatEuro(remaining - wishlistAffordability.totalWishlistCost)} left after purchases`
                        : `${formatEuro(wishlistAffordability.shortfall)} short of your goal`
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total wishlist cost</span>
                    <span className="text-slate-200 font-medium">{formatEuro(wishlistAffordability.totalWishlistCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Available budget</span>
                    <span className={`font-medium ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatEuro(remaining)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          wishlistAffordability.canAfford ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (remaining / wishlistAffordability.totalWishlistCost) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.min(100, Math.round((remaining / wishlistAffordability.totalWishlistCost) * 100))}% funded
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-600" />
                <p className="text-slate-400 text-sm">No items in your wishlist</p>
                <p className="text-slate-500 text-xs">Add purchase items to see affordability analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* Recurring Expenses */}
        {recurringExpenses.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-violet-400" />
              <RepeatIcon className="w-4 h-4 text-violet-400" />
              Recurring Expenses ({recurringExpenses.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recurringExpenses.map(t => (
                <div key={t.id} className="bg-black/40 border border-zinc-800/40 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200 truncate">{t.merchant}</p>
                    <p className="text-xs text-violet-400 mt-0.5 capitalize">{t.recurringFrequency?.toLowerCase()}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-400 flex-shrink-0">{formatEuro(t.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/30 flex justify-between text-sm">
              <span className="text-slate-400">Total recurring per month</span>
              <span className="text-rose-400 font-bold">{formatEuro(monthlyRecurring)}</span>
            </div>
          </div>
        )}

        {/* Top Merchants */}
        {topMerchants.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-rose-400" />
              Top Spending Merchants
            </h3>
            <div className="space-y-3">
              {topMerchants.slice(0, 8).map((m, i) => {
                const maxTotal = topMerchants[0].total;
                const pct = (m.total / maxTotal) * 100;
                return (
                  <div key={m.merchant} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 truncate">{m.merchant}</span>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs text-slate-500">{m.count}x</span>
                          <span className="text-sm font-semibold text-slate-200">{formatEuro(m.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500/60 rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
