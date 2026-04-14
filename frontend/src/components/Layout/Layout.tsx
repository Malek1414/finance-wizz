import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { ActiveView } from '../../types';

interface LayoutProps {
  children: ReactNode;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

export default function Layout({ children, activeView, onViewChange }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={onViewChange} />
        <main className="flex-1 overflow-auto bg-black bg-grid-pattern">
          {children}
        </main>
      </div>
    </div>
  );
}
