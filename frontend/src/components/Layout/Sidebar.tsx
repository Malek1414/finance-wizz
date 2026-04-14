import { Network, ShoppingBag, Upload, BarChart3 } from 'lucide-react';
import { ActiveView } from '../../types';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navItems = [
  {
    id: 'mindmap' as ActiveView,
    label: 'Finance Map',
    icon: Network,
    description: 'Visual budget overview',
    iconColor: 'text-emerald-400',
    accentColor: 'bg-emerald-400',
    activeBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/20',
    activeIconBg: 'bg-emerald-500/15',
  },
  {
    id: 'purchases' as ActiveView,
    label: 'Purchases',
    icon: ShoppingBag,
    description: 'Wishlist & tracking',
    iconColor: 'text-sky-400',
    accentColor: 'bg-sky-400',
    activeBg: 'bg-sky-500/10',
    activeBorder: 'border-sky-500/20',
    activeIconBg: 'bg-sky-500/15',
  },
  {
    id: 'bank' as ActiveView,
    label: 'Bank Upload',
    icon: Upload,
    description: 'Import statements',
    iconColor: 'text-amber-400',
    accentColor: 'bg-amber-400',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/20',
    activeIconBg: 'bg-amber-500/15',
  },
  {
    id: 'insights' as ActiveView,
    label: 'Insights',
    icon: BarChart3,
    description: 'Analytics & charts',
    iconColor: 'text-violet-400',
    accentColor: 'bg-violet-400',
    activeBg: 'bg-violet-500/10',
    activeBorder: 'border-violet-500/20',
    activeIconBg: 'bg-violet-500/15',
  }
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-60 bg-zinc-950/95 border-r border-zinc-800/50 flex flex-col py-5 gap-0.5 flex-shrink-0">
      <div className="px-4 mb-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Menu</p>
      </div>

      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return (
          <div key={item.id} className="relative px-2">
            {/* Left accent bar */}
            {isActive && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full ${item.accentColor}`} />
            )}
            <button
              onClick={() => onViewChange(item.id)}
              className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 border text-left
                ${isActive
                  ? `${item.activeBg} ${item.activeBorder}`
                  : 'border-transparent hover:bg-zinc-900/60 hover:border-zinc-800/30'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200
                ${isActive ? item.activeIconBg : 'bg-zinc-900/80'}`}>
                <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? item.iconColor : 'text-slate-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium leading-tight transition-colors duration-200 ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                  {item.label}
                </div>
                <div className={`text-xs mt-0.5 transition-colors duration-200 ${isActive ? 'text-slate-500' : 'text-slate-600'}`}>
                  {item.description}
                </div>
              </div>
            </button>
          </div>
        );
      })}

      <div className="mt-auto px-3 pt-4">
        <div className="rounded-xl p-3 bg-gradient-to-br from-zinc-900/80 to-zinc-900/20 border border-zinc-800/40">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-xs font-semibold text-slate-400">Quick tip</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Click any node in the Finance Map to edit inline. Totals update automatically.
          </p>
        </div>
      </div>
    </aside>
  );
}
