import React from 'react';
import { PortfolioMetrics } from './PortfolioMetrics';
import { AssetDistribution } from './AssetDistribution';
import { MacroNewsStrip } from './MacroNewsStrip';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Plus, Sparkles, FolderPlus, Bot, Shield } from 'lucide-react';

interface DashboardTabProps {
  onNavigateTab: (tabId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigateTab }) => {
  const { funds, cashTL, loadDemoPortfolio } = usePortfolio();
  const { breakerStatus, agents } = useAgentHive();

  const isPortfolioEmpty = funds.length === 0 && cashTL === 0;

  return (
    <div className="tab-pane active" id="tab-dashboard">
      {/* 0. Ajan Masası Canlı Koruma Bandı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
            <span>🏛️</span> LeadQuant Nöbette (5/5 Otonom Ajan Aktif)
          </span>
          <span className="badge badge-category" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
            <span>🛡️</span> Devre Kesici: <strong style={{ color: breakerStatus.level === 'HEALTHY' ? '#10B981' : '#EF4444' }}>{breakerStatus.level}</strong>
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => onNavigateTab('zenith-ai')}
          style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Bot size={13} />
          <span>Ajan Komuta Merkezine Git →</span>
        </button>
      </div>

      {/* 1. Üst KPI Kartları */}
      <PortfolioMetrics />

      {/* 2. Orta Bölüm: Dağılım & Hızlı Portföy Özeti */}
      <div className="dashboard-grid-row">
        <AssetDistribution />

        <div className="card top-performers-card">
          <div className="card-header">
            <h3 className="card-title">Portföy Varlık Özeti</h3>
            {!isPortfolioEmpty && (
              <button className="btn-text" onClick={() => onNavigateTab('funds')}>
                Tümünü Yönet →
              </button>
            )}
          </div>

          {isPortfolioEmpty ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: '#818CF8' }}>
                <FolderPlus size={24} />
              </div>
              <h4 style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>
                Henüz Portföyünüzde Fon Bulunmuyor
              </h4>
              <p style={{ color: '#94A3B8', fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 18px', lineHeight: '1.5' }}>
                Kendi fonlarınızı ekleyebilir veya terminal özelliklerini hemen test etmek için örnek kurumsal portföyü yükleyebilirsiniz.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigateTab('add-fund')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                >
                  <Plus size={14} />
                  <span>İlk Fonunu Ekle</span>
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={loadDemoPortfolio}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <Sparkles size={14} />
                  <span>Örnek Portföy Yükle</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fon</th>
                    <th>Kategori</th>
                    <th>Adet</th>
                    <th>Güncel Fiyat</th>
                    <th>Toplam Değer</th>
                    <th>Kâr / Zarar</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((f) => {
                    const curVal = f.shares * f.currentPrice;
                    const costVal = f.shares * f.costPrice;
                    const pnl = curVal - costVal;
                    const pnlPct = costVal > 0 ? (pnl / costVal) * 100 : 0;
                    const isPos = pnl >= 0;

                    return (
                      <tr key={f.code}>
                        <td>
                          <div className="fund-cell">
                            <span className="fund-code-badge">{f.code}</span>
                            <span className="fund-name-text">{f.name}</span>
                          </div>
                        </td>
                        <td><span className="badge badge-category">{f.category}</span></td>
                        <td className="font-semibold">{f.shares.toLocaleString('tr-TR')}</td>
                        <td>{f.currentPrice.toFixed(4)} TL</td>
                        <td className="font-bold">{formatTRY(curVal)}</td>
                        <td className={isPos ? 'text-pos font-bold' : 'text-neg font-bold'}>
                          {isPos ? '+' : ''}{formatTRY(pnl)} ({isPos ? '+' : ''}{formatPercent(pnlPct)})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Alt Bölüm: Resmi Kurum Senkronizasyonlu Makro Bülten */}
      <MacroNewsStrip />
    </div>
  );
};
