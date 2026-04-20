// Aurora design tokens — Finance Wizz Glam Redesign
export const B = {
  // Backgrounds
  bg0: 'oklch(11% 0.012 265)',
  bg1: 'oklch(14% 0.012 265)',
  bg2: 'oklch(17% 0.01 265)',
  bg3: 'oklch(21% 0.01 265)',

  // Accent palette
  aurora: 'oklch(85% 0.12 220)',
  violet: 'oklch(70% 0.14 290)',
  mint: 'oklch(80% 0.14 155)',
  rose: 'oklch(72% 0.16 22)',
  gold: 'oklch(82% 0.14 80)',

  // Text
  text: 'oklch(96% 0.005 265)',
  textDim: 'oklch(72% 0.01 265)',
  textMute: 'oklch(50% 0.01 265)',

  // Borders / overlays
  hair: 'rgba(255,255,255,0.06)',
  glow: (color: string, alpha = 0.35) => `0 0 32px ${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
} as const;

// Glassmorphism panel styles
export const glass = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(60px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 24,
} as const;

// Gradient helpers
export const grad = {
  aurora: `linear-gradient(135deg, ${B.aurora}, ${B.violet})`,
  mint: `linear-gradient(135deg, ${B.mint}, ${B.aurora})`,
  rose: `linear-gradient(135deg, ${B.rose}, ${B.violet})`,
  gold: `linear-gradient(135deg, ${B.gold}, ${B.rose})`,
  income: `linear-gradient(135deg, oklch(80% 0.14 155), oklch(70% 0.12 200))`,
  expense: `linear-gradient(135deg, oklch(72% 0.16 22), oklch(68% 0.14 320))`,
} as const;
