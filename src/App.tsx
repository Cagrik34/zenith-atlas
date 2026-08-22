import React, { useState, useEffect } from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { MarketProvider } from './context/MarketContext';
import { AgentHiveProvider } from './context/AgentHiveContext';
import { useAutoSync } from './hooks/useAutoSync';
import { useLivePrices } from './hooks/useLivePrices';
import { P2pLiveSyncEngine } from './engines/P2pLiveSyncEngine';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

// Layout & Navigation
import { Header } from './components/layout/Header';
import { TerminalTicker } from './components/layout/TerminalTicker';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileNavDrawer } from './components/layout/MobileNavDrawer';

// Tabs
import { DashboardTab } from './components/dashboard/DashboardTab';
import { FundsTab } from './components/funds/FundsTab';
import { FundSearchTab } from './components/screener/FundSearchTab';
import { TreemapHeatmapTab } from './components/heatmap/TreemapHeatmapTab';
import { QuantAttributionTab } from './components/quant/QuantAttributionTab';
import { StrategyTab } from './components/strategy/StrategyTab';
import { ExecutionPlanTab } from './components/strategy/ExecutionPlanTab';
import { ZenithAiTab } from './components/ai/ZenithAiTab';

// Modals
import { PitchbookModal } from './components/modals/PitchbookModal';
import { VoiceBriefingModal } from './components/modals/VoiceBriefingModal';
import { ExecutiveReportModal } from './components/modals/ExecutiveReportModal';
import { MarketSessionsModal } from './components/modals/MarketSessionsModal';
import { QrTeleportModal } from './components/modals/QrTeleportModal';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { importAccount } = usePortfolio();

  // Modals state
  const [isPitchbookOpen, setIsPitchbookOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isExecReportOpen, setIsExecReportOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [teleportToast, setTeleportToast] = useState<string | null>(null);

  // Background hooks
  const { isSyncing, triggerSync } = useAutoSync();
  useLivePrices();

  // Mobile Deep Link & Hash Auto-Import Listener (P2P Teleport via Camera Scan)
  useEffect(() => {
    const handleDeepLinkImport = () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;
        let payload = '';

        if (hash && hash.includes('import=')) {
          payload = hash.split('import=')[1];
        } else if (search && search.includes('import=')) {
          payload = new URLSearchParams(search).get('import') || '';
        }

        if (payload) {
          const account = P2pLiveSyncEngine.parseImportPayload(payload);
          if (account && account.funds && account.funds.length > 0) {
            importAccount(account);
            setTeleportToast(`🚀 "${account.name}" (${account.funds.length} Fon) Mobil Cihazınıza Başarıyla Işınlandı!`);
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => setTeleportToast(null), 5000);
          }
        }
      } catch (err) {
        console.warn('Deep link auto-import error:', err);
      }
    };

    handleDeepLinkImport();
    window.addEventListener('hashchange', handleDeepLinkImport);
    return () => window.removeEventListener('hashchange', handleDeepLinkImport);
  }, [importAccount]);

  return (
    <div className="app">
      {/* Teleport Celebration Toast Banner */}
      {teleportToast && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.86rem',
          fontWeight: 600
        }}>
          <Sparkles size={18} />
          <span>{teleportToast}</span>
          <button onClick={() => setTeleportToast(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPitchbook={() => setIsPitchbookOpen(true)}
        onOpenVoiceBriefing={() => setIsVoiceOpen(true)}
        onOpenExecutiveReport={() => setIsExecReportOpen(true)}
        onOpenMarketSessions={() => setIsSessionsOpen(true)}
        onOpenQrTeleport={() => setIsQrOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        triggerAutoSync={triggerSync}
        isSyncing={isSyncing}
      />

      {/* Live Market Marquee Ticker */}
      <TerminalTicker />

      {/* Main Content Workspace */}
      <main className="app-main">
        {activeTab === 'dashboard' && <DashboardTab onNavigateTab={setActiveTab} />}
        {activeTab === 'funds' && <FundsTab />}
        {activeTab === 'add-fund' && <FundSearchTab />}
        {activeTab === 'heatmap' && <TreemapHeatmapTab />}
        {activeTab === 'quant' && <QuantAttributionTab />}
        {activeTab === 'strategy' && <StrategyTab />}
        {activeTab === 'execution-plan' && <ExecutionPlanTab />}
        {activeTab === 'zenith-ai' && <ZenithAiTab />}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* 5. Mobil Çekmece Menüsü */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPitchbook={() => setIsPitchbookOpen(true)}
        onOpenVoiceBriefing={() => setIsVoiceOpen(true)}
        onOpenExecutiveReport={() => setIsExecReportOpen(true)}
        onOpenMarketSessions={() => setIsSessionsOpen(true)}
        onOpenQrTeleport={() => setIsQrOpen(true)}
        triggerAutoSync={triggerSync}
        isSyncing={isSyncing}
      />

      {/* 6. Global Modallar */}
      <PitchbookModal isOpen={isPitchbookOpen} onClose={() => setIsPitchbookOpen(false)} />
      <VoiceBriefingModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      <ExecutiveReportModal isOpen={isExecReportOpen} onClose={() => setIsExecReportOpen(false)} />
      <MarketSessionsModal isOpen={isSessionsOpen} onClose={() => setIsSessionsOpen(false)} />
      <QrTeleportModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <MarketProvider>
      <PortfolioProvider>
        <AgentHiveProvider>
          <AppContent />
        </AgentHiveProvider>
      </PortfolioProvider>
    </MarketProvider>
  );
};

export default App;
