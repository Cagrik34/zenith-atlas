import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { exportPortfolioToCsv } from '../../utils/excelExport';
import { Bot, Shield, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPitchbook: () => void;
  onOpenVoiceBriefing: () => void;
  onOpenExecutiveReport: () => void;
  onOpenMarketSessions: () => void;
  onOpenQrTeleport: () => void;
  triggerAutoSync: () => Promise<void>;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenPitchbook,
  onOpenVoiceBriefing,
  onOpenExecutiveReport,
  onOpenMarketSessions,
  onOpenQrTeleport,
  triggerAutoSync,
  isSyncing,
}) => {
  const { funds, cashTL, activePortfolio, officialTefasDate } = usePortfolio();
  const { agents, breakerStatus, setIsBreakerModalOpen } = useAgentHive();

  const handleExportExcel = () => {
    exportPortfolioToCsv(funds, cashTL, activePortfolio.name);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'funds', label: 'Fonlar', icon: '💼' },
    { id: 'add-fund', label: 'Fon Ekle', icon: '🔍' },
    { id: 'heatmap', label: 'Isı Haritası', icon: '🗺️' },
    { id: 'quant', label: 'Kantitatif Masa', icon: '🧮' },
    { id: 'strategy', label: 'Strateji', icon: '🎯' },
    { id: 'execution-plan', label: 'Uygulama Planı', icon: '📋' },
    { id: 'zenith-ai', label: 'Ajan Masası & AI', icon: '🤖' },
  ];

  const isBreakerTripped = breakerStatus.level === 'TRIPPED';

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon" style={{ background: 'transparent', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 128 128" width="28" height="28" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="zenithHdrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <filter id="hdrZPrismGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect width="128" height="128" rx="28" fill="#0C1021" stroke="#334155" strokeWidth="3" />
              <circle cx="64" cy="64" r="40" fill="none" stroke="url(#zenithHdrGrad)" strokeWidth="2" opacity="0.5" />
              <path d="M42 42 L86 42 L42 86 L86 86" fill="none" stroke="url(#zenithHdrGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter="url(#hdrZPrismGlow)" />
              <circle cx="86" cy="42" r="5" fill="#38BDF8" />
              <circle cx="42" cy="86" r="5" fill="#EC4899" />
            </svg>
          </div>
          <div className="logo-text">
            <h1>ZENITH ATLAS</h1>
            <span className="strategy-badge">INSTITUTIONAL TERMINAL v2.2</span>
          </div>
        </div>
      </div>

      <nav className="header-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            id={`nav-${item.id}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="header-actions">
        {/* Ajan Masası Canlı Nabız Rozeti */}
        <button
          className="btn btn-ghost"
          onClick={() => setActiveTab('zenith-ai')}
          title="Zenith Quant Hive: 5 Otonom Ajan Nöbette"
          style={{
            background: isBreakerTripped ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.12)',
            border: isBreakerTripped ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.25)',
            color: isBreakerTripped ? '#EF4444' : '#818CF8',
            padding: '4px 8px'
          }}
        >
          <span className="pulse-dot" style={{ background: isBreakerTripped ? '#EF4444' : '#10B981', marginRight: '4px' }}></span>
          <span className="btn-label-hide-md">Hive (5/5)</span>
        </button>

        <div className="last-update" id="lastUpdate" title="Son Resmi TEFAS Kapanış Seansı">
          <span className="pulse-dot"></span>
          <span className="update-text">{officialTefasDate}</span>
        </div>

        <button
          className="btn btn-ghost"
          onClick={onOpenQrTeleport}
          title="P2P Mobil Işınlama & QR Teleport"
        >
          <span>📲</span> <span className="btn-label-hide-md">Işınla</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenMarketSessions}
          title="Dünya Borsaları & TEFAS Seansları"
        >
          <span>🌐</span> <span className="btn-label-hide-md">Borsalar</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenVoiceBriefing}
          title="Zenith Voice AI Sesli Sabah Bülteni"
        >
          <span>🎙️</span> <span className="btn-label-hide-md">Sesli</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenPitchbook}
          title="Goldman Sachs Standartlarında 4 Sayfalık PDF Pitchbook"
        >
          <span>📑</span> <span className="btn-label-hide-md">Pitchbook</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenExecutiveReport}
          title="Üst Yönetim Portföy İcra Özeti"
        >
          <span>🖨</span> <span className="btn-label-hide-md">Rapor</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={triggerAutoSync}
          disabled={isSyncing}
          title="Canlı TEFAS & Piyasa Fiyatlarını Senkronize Et"
        >
          <span>{isSyncing ? '⏳' : '🔄'}</span> <span className="btn-label-hide-sm">{isSyncing ? 'Senkron...' : 'Güncelle'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleExportExcel}
          title="Kurumsal Excel & CSV Portföy Raporu İndir"
        >
          <span>📥</span> <span className="btn-label-hide-sm">Excel</span>
        </button>
      </div>
    </header>
  );
};
