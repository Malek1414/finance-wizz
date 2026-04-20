import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout/Layout';
import MindMap from './components/MindMap/MindMap';
import PurchaseDashboard from './components/Purchases/PurchaseDashboard';
import BankUpload from './components/BankUpload/BankUpload';
import Insights from './components/Insights/Insights';
import { ActiveView } from './types';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: EASE } }
};

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('mindmap');

  const renderView = () => {
    switch (activeView) {
      case 'mindmap':   return <MindMap />;
      case 'purchases': return <PurchaseDashboard />;
      case 'bank':      return <BankUpload />;
      case 'insights':  return <Insights />;
      default:          return <MindMap />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
