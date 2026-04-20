import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { insightsApi } from '../../api/client';
import { SpendingPieChart, MonthlyAreaChart, HealthGauge } from './Charts';
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank,
  RefreshCw, ShoppingCart, AlertTriangle, CheckCircle,
  BarChart3, RepeatIcon
} from 'lucide-react';
import { B, grad } from '../../design';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(target * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

// ─── Stat Card (Aurora edition) ───────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  isPercent?: boolean;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

function StatCard({ title, value, isPercent, subtitle, icon: Icon, gradient, glowColor, trend, delay = 0 }: StatCardProps) {
  const animated = useCountUp(value);
  const displayValue = isPercent ? formatPct(animated) : formatEuro(animated);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] as const }}
      style={{
        padding: '20px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 30px ${glowColor}20`,
        borderColor: 'rgba(255,255,255,0.13)',
      } as never}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradient,
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18, color: 'oklch(11% 0.012 265)' }} />
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 999,
              background: trend === 'up'
                ? 'oklch(80% 0.14 155 / 0.12)'
                : trend === 'down'
                ? 'oklch(72% 0.16 22 / 0.12)'
                : 'transparent',
              color: trend === 'up' ? B.mint : trend === 'down' ? B.rose : B.textMute,
            }}
          >
            {trend === 'up' ? <TrendingUp style={{ width: 12, height: 12 }} /> :
             trend === 'down' ? <TrendingDown style={{ width: 12, height: 12 }} /> : null}
          </div>
        )}
      </div>
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: B.text,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayValue}
      </p>
      <p style={{ fontSize: 11, color: B.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: glowColor }}>{subtitle}</p>
      )}
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ─── Chapter label ────────────────────────────────────────────────────────────
function Chapter({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: B.aurora,
        }}
      >
        {num}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: B.text, letterSpacing: '-0.02em' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── Glass panel wrapper ───────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Insights() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['insights'],
    queryFn: insightsApi.getSummary,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            padding: 40,
            textAlign: 'center',
            maxWidth: 420,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <BarChart3 style={{ width: 48, height: 48, color: B.textMute, margin: '0 auto 16px' }} />
          <p style={{ color: B.text, fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No insights yet</p>
          <p style={{ color: B.textMute, fontSize: 14, lineHeight: 1.6 }}>
            Import bank transactions to see your spending analytics and financial health score.
          </p>
          <button onClick={() => refetch()} className="btn-secondary" style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  const { totalIncome, totalExpenses, remaining, savingsRate,
    spendingByCategory, monthlyHistory, healthScore,
    topMerchants, recurringExpenses, wishlistAffordability } = data;

  const monthlyRecurring = recurringExpenses.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}
      >
        <div>
          <h2 className="iridescent-text" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
            Financial Insights
          </h2>
          <p style={{ fontSize: 13, color: B.textMute, marginTop: 6, margin: '6px 0 0' }}>
            Based on all imported transactions
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Refresh
        </button>
      </motion.div>

      {/* ── Chapter 01 — Cash Flow ──────────────────────────────────────────── */}
      <Chapter num="01" title="Cash Flow" />

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard
          title="Total Income" value={totalIncome}
          icon={TrendingUp} gradient={grad.income} glowColor={B.mint}
          trend="up" delay={0}
        />
        <StatCard
          title="Total Expenses" value={totalExpenses}
          icon={TrendingDown} gradient={grad.expense} glowColor={B.rose}
          trend="down" delay={0.07}
        />
        <StatCard
          title="Net Remaining" value={remaining}
          icon={DollarSign}
          gradient={remaining >= 0 ? grad.income : grad.expense}
          glowColor={remaining >= 0 ? B.mint : B.rose}
          subtitle={remaining >= 0 ? 'Positive balance' : 'Over budget'}
          trend={remaining >= 0 ? 'up' : 'down'} delay={0.14}
        />
        <StatCard
          title="Savings Rate" value={savingsRate} isPercent
          icon={PiggyBank}
          gradient={savingsRate >= 20 ? grad.income : savingsRate >= 10 ? grad.gold : grad.expense}
          glowColor={savingsRate >= 20 ? B.mint : savingsRate >= 10 ? B.gold : B.rose}
          subtitle={savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Good — aim for 20%' : 'Needs improvement'}
          delay={0.21}
        />
      </div>

      {/* ── Chapter 02 — Breakdown ─────────────────────────────────────────── */}
      <Chapter num="02" title="Breakdown" />

      <motion.div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.gold }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>Spending Breakdown</h3>
            </div>
            <SpendingPieChart data={spendingByCategory} />
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.aurora }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>Income vs Expenses (6 months)</h3>
            </div>
            <MonthlyAreaChart data={monthlyHistory} />
          </Panel>
        </motion.div>
      </motion.div>

      {/* ── Chapter 03 — Health & Goals ────────────────────────────────────── */}
      <Chapter num="03" title="Health & Goals" />

      <motion.div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.mint }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>Financial Health Score</h3>
            </div>
            <HealthGauge score={healthScore} />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                {savingsRate >= 20
                  ? <CheckCircle style={{ width: 16, height: 16, color: B.mint, marginTop: 1, flexShrink: 0 }} />
                  : <AlertTriangle style={{ width: 16, height: 16, color: B.gold, marginTop: 1, flexShrink: 0 }} />
                }
                <span style={{ color: B.textDim }}>
                  Savings rate:{' '}
                  <strong style={{ color: savingsRate >= 20 ? B.mint : B.gold }}>
                    {formatPct(savingsRate)}
                  </strong>{' '}
                  {savingsRate >= 20 ? '(excellent)' : '(aim for 20%+)'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                {recurringExpenses.length > 0
                  ? <AlertTriangle style={{ width: 16, height: 16, color: B.gold, marginTop: 1, flexShrink: 0 }} />
                  : <CheckCircle style={{ width: 16, height: 16, color: B.mint, marginTop: 1, flexShrink: 0 }} />
                }
                <span style={{ color: B.textDim }}>
                  Recurring costs:{' '}
                  <strong style={{ color: B.rose }}>{formatEuro(monthlyRecurring)}/month</strong>
                </span>
              </div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.aurora }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>Wishlist Affordability</h3>
            </div>
            {wishlistAffordability.totalWishlistCost > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {wishlistAffordability.canAfford
                    ? <CheckCircle style={{ width: 36, height: 36, color: B.mint, flexShrink: 0 }} />
                    : <AlertTriangle style={{ width: 36, height: 36, color: B.gold, flexShrink: 0 }} />
                  }
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: wishlistAffordability.canAfford ? B.mint : B.gold, margin: 0 }}>
                      {wishlistAffordability.canAfford ? 'You can afford your wishlist!' : 'Wishlist exceeds budget'}
                    </p>
                    <p style={{ fontSize: 12, color: B.textMute, marginTop: 4 }}>
                      {wishlistAffordability.canAfford
                        ? `${formatEuro(remaining - wishlistAffordability.totalWishlistCost)} left after purchases`
                        : `${formatEuro(wishlistAffordability.shortfall)} short of your goal`
                      }
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Total wishlist cost', value: formatEuro(wishlistAffordability.totalWishlistCost), color: B.textDim },
                    { label: 'Available budget', value: formatEuro(remaining), color: remaining >= 0 ? B.mint : B.rose },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: B.textMute }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 4 }}>
                    <motion.div
                      style={{ height: '100%', borderRadius: 999, background: wishlistAffordability.canAfford ? grad.income : grad.gold }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (remaining / wishlistAffordability.totalWishlistCost) * 100)}%` }}
                      transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: B.textMute }}>
                    {Math.min(100, Math.round((remaining / wishlistAffordability.totalWishlistCost) * 100))}% funded
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, textAlign: 'center' }}>
                <ShoppingCart style={{ width: 32, height: 32, color: B.textMute }} />
                <p style={{ color: B.textDim, fontSize: 14, margin: 0 }}>No items in your wishlist</p>
                <p style={{ color: B.textMute, fontSize: 12, margin: 0 }}>Add purchase items to see affordability analysis</p>
              </div>
            )}
          </Panel>
        </motion.div>
      </motion.div>

      {/* Recurring Expenses */}
      {recurringExpenses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          style={{ marginBottom: 32 }}
        >
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.mint }} />
              <RepeatIcon style={{ width: 16, height: 16, color: B.violet }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>
                Recurring Expenses ({recurringExpenses.length})
              </h3>
            </div>
            <motion.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {recurringExpenses.map((t: { id: string; merchant: string; recurringFrequency?: string | null; amount: number }) => (
                <motion.div
                  key={t.id}
                  variants={itemVariants}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: B.text, margin: 0, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant}
                    </p>
                    <p style={{ fontSize: 11, color: B.violet, marginTop: 4, margin: '4px 0 0', textTransform: 'capitalize' }}>
                      {t.recurringFrequency?.toLowerCase()}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: B.rose, flexShrink: 0, marginLeft: 8 }}>
                    {formatEuro(t.amount)}
                  </span>
                </motion.div>
              ))}
            </motion.div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: B.textMute }}>Total recurring per month</span>
              <span style={{ fontWeight: 800, color: B.rose }}>{formatEuro(monthlyRecurring)}</span>
            </div>
          </Panel>
        </motion.div>
      )}

      {/* Top Merchants */}
      {topMerchants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
        >
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: grad.rose }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: B.text, margin: 0 }}>Top Spending Merchants</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topMerchants.slice(0, 8).map((m: { merchant: string; total: number; count: number }, i: number) => {
                const maxTotal = topMerchants[0].total;
                const pct = (m.total / maxTotal) * 100;
                return (
                  <motion.div
                    key={m.merchant}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                  >
                    <span style={{ fontSize: 11, color: B.textMute, width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: B.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {m.merchant}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ fontSize: 11, color: B.textMute }}>{m.count}x</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: B.text }}>{formatEuro(m.total)}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', borderRadius: 999, background: grad.rose }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: [0.25, 0.1, 0.25, 1] as const }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        </motion.div>
      )}
    </div>
  );
}
