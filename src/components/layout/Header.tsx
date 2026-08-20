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
          <div className="logo-icon">📊</div>
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
          className="btn btn-ghost"
          onClick={() => triggerAutoSync()}
          title="Canlı Verileri Yenile"
        >
          <span>🔄</span> {isSyncing ? 'Güncelleniyor...' : 'Güncelle'}
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
