import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ShoppingBag, Upload, BarChart3 } from 'lucide-react';
import { ActiveView } from '../../types';
import { B } from '../../design';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navItems = [
  {
    id: 'mindmap' as ActiveView,
    label: 'Finance Map',
    icon: Network,
    gradient: `linear-gradient(135deg, ${B.mint}, ${B.aurora})`,
    glow: B.mint,
  },
  {
    id: 'purchases' as ActiveView,
    label: 'Purchases',
    icon: ShoppingBag,
    gradient: `linear-gradient(135deg, ${B.aurora}, oklch(65% 0.16 230))`,
    glow: B.aurora,
  },
  {
    id: 'bank' as ActiveView,
    label: 'Bank Upload',
    icon: Upload,
    gradient: `linear-gradient(135deg, ${B.gold}, ${B.rose})`,
    glow: B.gold,
  },
  {
    id: 'insights' as ActiveView,
    label: 'Insights',
    icon: BarChart3,
    gradient: `linear-gradient(135deg, ${B.violet}, oklch(65% 0.16 310))`,
    glow: B.violet,
  },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<ActiveView | null>(null);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <motion.nav
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '14px 10px',
          borderRadius: 32,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
          position: 'relative',
        }}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isHovered = hoveredId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      left: 'calc(100% + 12px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(20,20,30,0.92)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '6px 12px',
                      whiteSpace: 'nowrap',
                      fontSize: 12,
                      fontWeight: 600,
                      color: B.text,
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => onViewChange(item.id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                title={item.label}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  background: isActive ? item.gradient : 'transparent',
                  boxShadow: isActive ? `0 4px 20px ${item.glow}50` : 'none',
                  transition: 'background 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Active glow halo */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-halo"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: -3,
                        borderRadius: 19,
                        background: item.gradient,
                        opacity: 0.2,
                        filter: 'blur(8px)',
                        zIndex: -1,
                      }}
                    />
                  )}
                </AnimatePresence>

                <Icon
                  style={{
                    width: 18,
                    height: 18,
                    color: isActive ? 'oklch(11% 0.012 265)' : isHovered ? B.textDim : B.textMute,
                    transition: 'color 0.18s ease',
                    flexShrink: 0,
                  }}
                />
              </motion.button>
            </motion.div>
          );
        })}
      </motion.nav>
    </div>
  );
}
