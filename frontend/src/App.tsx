import { useState } from 'react';
import Layout from './components/Layout/Layout';
import MindMap from './components/MindMap/MindMap';
import PurchaseDashboard from './components/Purchases/PurchaseDashboard';
import BankUpload from './components/BankUpload/BankUpload';
import Insights from './components/Insights/Insights';
import { ActiveView } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('mindmap');

  const renderView = () => {
    switch (activeView) {
      case 'mindmap':
        return <MindMap />;
      case 'purchases':
        return <PurchaseDashboard />;
      case 'bank':
        return <BankUpload />;
      case 'insights':
        return <Insights />;
      default:
        return <MindMap />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </Layout>
  );
}
