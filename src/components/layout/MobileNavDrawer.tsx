import React from 'react';
import { 
  X, QrCode, FileText, Mic, Globe, Download, RefreshCw, 
  Bot, Shield, BarChart3, TrendingUp, PieChart, Sparkles, SlidersHorizontal 
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { exportPortfolioToCsv } from '../../utils/excelExport';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
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
  const { breakerStatus } = useAgentHive();

  if (!isOpen) return null;

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  const handleExport = () => {
    exportPortfolioToCsv(funds, cashTL, activePortfolio.name);
    onClose();
  };

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard & Özet', icon: '📊' },
    { id: 'funds', label: 'Portföy Fonlarım', icon: '💼' },
    { id: 'add-fund', label: '1.051 TEFAS Fon Arama', icon: '🔍' },
    { id: 'heatmap', label: 'Ağaç Isı Haritası', icon: '🗺️' },
    { id: 'quant', label: 'Fama-French & Quant Masa', icon: '🧮' },
    { id: 'strategy', label: 'Black-Litterman & HRP', icon: '🎯' },
    { id: 'execution-plan', label: 'Uygulama & Emir Planı', icon: '📋' },
    { id: 'zenith-ai', label: 'Ajan Masası & AI Hive', icon: '🤖' },
  ];

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-drawer-handle" />
        
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🌌</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#F8FAFC' }}>Zenith Atlas Terminali</h3>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Kurumsal Mobil Menü & Araçlar</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="mobile-drawer-section">
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hızlı Terminal Araçları
          </div>
          <div className="mobile-quick-actions-grid">
            <button className="mobile-action-pill" onClick={() => { onOpenQrTeleport(); onClose(); }}>
              <QrCode size={16} className="text-accent" />
              <span>P2P Işınlama</span>
            </button>
            <button className="mobile-action-pill" onClick={() => { onOpenVoiceBriefing(); onClose(); }}>
              <Mic size={16} className="text-pos" />
              <span>Sesli Bülten</span>
            </button>
            <button className="mobile-action-pill" onClick={() => { onOpenPitchbook(); onClose(); }}>
              <FileText size={16} style={{ color: '#F59E0B' }} />
              <span>Pitchbook PDF</span>
            </button>
            <button className="mobile-action-pill" onClick={() => { onOpenExecutiveReport(); onClose(); }}>
              <Sparkles size={16} style={{ color: '#EC4899' }} />
              <span>İcra Özeti</span>
            </button>
            <button className="mobile-action-pill" onClick={() => { onOpenMarketSessions(); onClose(); }}>
              <Globe size={16} style={{ color: '#38BDF8' }} />
              <span>Borsalar</span>
            </button>
            <button className="mobile-action-pill" onClick={handleExport}>
              <Download size={16} style={{ color: '#10B981' }} />
              <span>Excel İndir</span>
            </button>
          </div>
        </div>

        {/* Sync & Date Status */}
        <div className="mobile-drawer-status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
            <span className="pulse-dot"></span>
            <span>TEFAS Seansı: <strong>{officialTefasDate}</strong></span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => triggerAutoSync()}
            disabled={isSyncing}
            style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={isSyncing ? 'spin-animation' : ''} />
            <span>{isSyncing ? 'Senkron...' : 'Fiyatları Güncelle'}</span>
          </button>
        </div>

        {/* All Navigation Tabs */}
        <div className="mobile-drawer-section">
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tüm Terminal Masaları
          </div>
          <div className="mobile-drawer-tabs-list">
            {allTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`mobile-drawer-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(tab.id)}
                >
                  <span style={{ fontSize: '1.05rem' }}>{tab.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
                  {isActive && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Açık</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
