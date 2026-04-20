import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { ActiveView } from '../../types';
import { B } from '../../design';

// ─── Aurora backdrop — 3 drifting radial gradient blobs ───────────────────────
function AuroraBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Blob 1 — aurora/teal */}
      <div
        className="blob-1"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, oklch(85% 0.12 220 / 0.14) 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />
      {/* Blob 2 — violet */}
      <div
        className="blob-2"
        style={{
          position: 'absolute',
          top: '30%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, oklch(70% 0.14 290 / 0.12) 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />
      {/* Blob 3 — mint */}
      <div
        className="blob-3"
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '25%',
          width: '45vw',
          height: '45vw',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, oklch(80% 0.14 155 / 0.10) 0%, transparent 70%)`,
          filter: 'blur(45px)',
        }}
      />
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

export default function Layout({ children, activeView, onViewChange }: LayoutProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: B.bg0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Aurora background blobs */}
      <AuroraBackdrop />

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        {/* Top header strip */}
        <Header />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Floating pill nav */}
          <Sidebar activeView={activeView} onViewChange={onViewChange} />

          {/* Main scrollable content */}
          <main
            style={{
              flex: 1,
              overflow: 'auto',
              paddingLeft: '88px', // space for floating nav
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
