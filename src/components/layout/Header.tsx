import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { exportPortfolioToCsv } from '../../utils/excelExport';
import { 
  BarChart3, 
  Briefcase, 
  PlusCircle, 
  Grid3X3, 
  Target, 
  ListOrdered, 
  Bot, 
  FileText, 
  Printer, 
  RotateCw, 
  Download, 
  Volume2, 
  Bell, 
  QrCode,
  Globe
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPitchbook: () => void;
  onOpenVoiceBriefing: () => void;
  onOpenExecutiveReport: () => void;
  onOpenMarketSessions: () => void;
  onOpenQrTeleport: () => void;
  triggerAutoSync: () => void;
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
  isSyncing
}) => {
  const { funds, cashTL, activePortfolio, officialTefasDate, lastUpdateStr } = usePortfolio();

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'funds', label: 'Fonlar', icon: Briefcase },
    { id: 'add-fund', label: 'Fon Ekle', icon: PlusCircle },
    { id: 'heatmap', label: 'Isı Haritası', icon: Grid3X3 },
    { id: 'quant', label: 'Kantitatif Masa', icon: Target },
    { id: 'strategy', label: 'Strateji', icon: Target },
    { id: 'execution-plan', label: 'Uygulama Planı', icon: ListOrdered },
    { id: 'zenith-ai', label: 'Zenith AI', icon: Bot },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <span className="logo-icon">🌌</span>
          </div>
          <div className="logo-text-block">
            <h1 className="logo-title">ZENITH ATLAS</h1>
            <div className="logo-subtitle-row">
              <span className="logo-sub">INSTITUTIONAL TERMINAL</span>
              <span className="version-tag">v2.2</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="header-nav">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} className="tab-icon" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <div className="last-update-badge" title="Resmi TEFAS & Canlı WebSocket Veri Durumu">
          <span className="pulse-dot"></span>
          <span className="update-text">
            TEFAS ({officialTefasDate}): {lastUpdateStr}
          </span>
        </div>

        <button 
          className="header-btn qr-teleport-btn" 
          onClick={onOpenQrTeleport} 
          title="Mobil QR Işınlama & WebRTC P2P Senkronizasyon"
        >
          <QrCode size={14} />
          <span>Işınla</span>
        </button>

        <button 
          className="header-btn market-sessions-btn" 
          onClick={onOpenMarketSessions} 
          title="Dünya Borsaları & TEFAS Seans Saatleri"
        >
          <Globe size={14} />
          <span>Borsalar</span>
        </button>

        <button 
          className="header-btn voice-briefing-btn" 
          onClick={onOpenVoiceBriefing} 
          title="Zenith Voice AI — Türkçe Sabah Bülteni"
        >
          <Volume2 size={14} />
          <span>Sesli Bülten</span>
        </button>

        <button 
          className="header-btn pitchbook-btn" 
          onClick={onOpenPitchbook} 
          title="Goldman Sachs 4 Sayfalık A4 Pitchbook"
        >
          <FileText size={14} />
          <span>Pitchbook</span>
        </button>

        <button 
          className="header-btn report-btn" 
          onClick={onOpenExecutiveReport} 
          title="İcra Komitesi Yönetici Özeti"
        >
          <Printer size={14} />
          <span>Rapor</span>
        </button>

        <button 
          className="header-btn refresh-btn" 
          onClick={triggerAutoSync} 
          disabled={isSyncing}
          title="Canlı TEFAS & Piyasa Fiyatlarını Güncelle"
        >
          <RotateCw size={14} className={isSyncing ? 'spin' : ''} />
          <span>{isSyncing ? 'Güncelleniyor...' : 'Güncelle'}</span>
        </button>

        <button 
          className="header-btn export-btn" 
          onClick={() => exportPortfolioToCsv(funds, cashTL, activePortfolio.name)} 
          title="Excel / CSV Formatında İhraç Et"
        >
          <Download size={14} />
          <span>Excel</span>
        </button>
      </div>
    </header>
  );
};
