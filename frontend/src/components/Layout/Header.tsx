import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/client';
import { B } from '../../design';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function Header() {
  const { data: tree } = useQuery({
    queryKey: ['finance-tree'],
    queryFn: financeApi.getTree,
    refetchInterval: 30_000,
  });

  const totalBalance = tree?.value ?? 0;
  const incomeNode = tree?.children?.find((c: { type: string }) => c.type === 'INCOME');
  const totalIncome = incomeNode?.value ?? 0;
  const isPositive = totalBalance >= 0;

  const balanceColor = isPositive ? B.mint : B.rose;

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 100,
        paddingRight: 24,
        borderBottom: `1px solid ${B.hair}`,
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="Finance Wizz"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }}
          />
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: B.text,
          }}
        >
          Finance Wizz
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: B.mint,
              boxShadow: `0 0 8px ${B.mint}`,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 11, color: B.textMute, letterSpacing: '0.04em' }}>Live</span>
        </div>
      </div>

      {/* Balance display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {totalIncome > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 999,
              background: `oklch(80% 0.14 155 / 0.08)`,
              border: `1px solid oklch(80% 0.14 155 / 0.2)`,
            }}
          >
            <span style={{ fontSize: 11, color: B.textMute }}>Income</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: B.mint }}>{formatEuro(totalIncome)}</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 18px',
            borderRadius: 999,
            background: isPositive
              ? 'oklch(80% 0.14 155 / 0.07)'
              : 'oklch(72% 0.16 22 / 0.07)',
            border: `1px solid ${isPositive ? 'oklch(80% 0.14 155 / 0.2)' : 'oklch(72% 0.16 22 / 0.2)'}`,
          }}
        >
          <span style={{ fontSize: 11, color: B.textMute }}>Balance</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: balanceColor,
              letterSpacing: '-0.02em',
              textShadow: `0 0 20px ${balanceColor}50`,
            }}
          >
            {formatEuro(totalBalance)}
          </span>
        </div>
      </div>
    </header>
  );
}
