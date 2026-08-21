import React, { useState } from 'react';
import { PortfolioProvider } from './context/PortfolioContext';
import { MarketProvider } from './context/MarketContext';
import { AgentHiveProvider } from './context/AgentHiveContext';
import { useAutoSync } from './hooks/useAutoSync';
import { useLivePrices } from './hooks/useLivePrices';

// Layout & Navigation
import { Header } from './components/layout/Header';
import { TerminalTicker } from './components/layout/TerminalTicker';

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

  // Modals state
  const [isPitchbookOpen, setIsPitchbookOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isExecReportOpen, setIsExecReportOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Background hooks
  const { isSyncing, triggerSync } = useAutoSync();
  useLivePrices();

  return (
    <div className="app">
      {/* 1. Sabit Üst Header Bar (Titreme/Kayma Engelli) */}
      <Header
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

      {/* 2. Donanım Hızlandırmalı 60 FPS Canlı Ticker */}
      <TerminalTicker />

      {/* 3. Ana İçerik Alanı (Kenarlardan Dengeli Boşluklu ve Taşmasız) */}
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

      {/* 4. Global Modallar */}
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
