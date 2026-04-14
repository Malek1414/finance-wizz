import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/client';
import { TrendingUp } from 'lucide-react';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);
}

export default function Header() {
  const { data: tree } = useQuery({
    queryKey: ['finance-tree'],
    queryFn: financeApi.getTree,
    refetchInterval: 30_000
  });

  const totalBalance = tree?.value ?? 0;
  const incomeNode = tree?.children?.find(c => c.type === 'INCOME');
  const totalIncome = incomeNode?.value ?? 0;

  const isPositive = totalBalance >= 0;

  return (
    <header className="h-16 bg-black/95 border-b border-zinc-800/60 backdrop-blur-md flex items-center px-6 justify-between z-40 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-xl shadow-black/60">
          <img
            src="/logo.png"
            alt="Finance Wizz logo"
            className="w-full h-full object-cover object-[center_15%]"
          />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none tracking-tight">Finance Wizz</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-zinc-600">Live dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {totalIncome > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Income</span>
            <span className="text-sm font-semibold text-emerald-400">{formatEuro(totalIncome)}</span>
          </div>
        )}

        <div className={`flex items-center gap-3 rounded-xl px-4 py-2 border ${
          isPositive
            ? 'bg-emerald-500/10 border-emerald-500/25'
            : 'bg-rose-500/10 border-rose-500/25'
        }`}>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500 leading-none mb-0.5">Total Balance</p>
            <span className={`text-xl font-bold leading-none ${
              isPositive
                ? 'text-emerald-400 balance-glow'
                : 'text-rose-400 balance-glow-negative'
            }`}>
              {formatEuro(totalBalance)}
            </span>
          </div>
          <span className={`text-xl font-bold sm:hidden ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatEuro(totalBalance)}
          </span>
        </div>
      </div>
    </header>
  );
}
