import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { exportPortfolioToCsv } from '../../utils/excelExport';

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
    { id: 'zenith-ai', label: 'Zenith AI', icon: '🤖' },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon" style={{ background: 'transparent', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 128 128" width="30" height="30" style={{ display: 'block' }}>
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
        <div className="last-update" id="lastUpdate">
          <span className="pulse-dot"></span>
          <span className="update-text">TEFAS ({officialTefasDate})</span>
        </div>

        <button
          className="btn btn-ghost"
          onClick={onOpenQrTeleport}
          title="P2P Mobil Işınlama & QR Teleport"
        >
          <span>📲</span> Işınla
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenMarketSessions}
          title="Dünya Borsaları & TEFAS Seansları"
        >
          <span>🌐</span> Borsalar
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenVoiceBriefing}
          title="Zenith Voice AI Sesli Sabah Bülteni"
        >
          <span>🎙️</span> Sesli Bülten
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenPitchbook}
          title="Goldman Sachs Stili Kurumsal Pitchbook (A4 PDF)"
        >
          <span>📑</span> Pitchbook
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenExecutiveReport}
          title="Yönetici Özeti & Rapor"
        >
          <span>🖨</span> Rapor
        </button>

        <button
          className={`btn btn-ghost ${isSyncing ? 'btn-syncing' : ''}`}
          onClick={() => triggerAutoSync()}
          title="Canlı Verileri Yenile"
        >
          <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>🔄</span> Güncelle
        </button>

        <button
          className="btn btn-primary"
          onClick={handleExportExcel}
          title="Excel Olarak İndir"
        >
          <span>📥</span> Excel
        </button>
      </div>
    </header>
  );
};
