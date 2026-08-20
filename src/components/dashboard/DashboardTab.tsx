import React from 'react';
import { PortfolioMetrics } from './PortfolioMetrics';
import { AssetDistribution } from './AssetDistribution';
import { MacroNewsStrip } from './MacroNewsStrip';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatTRY, formatPercent } from '../../utils/formatters';

interface DashboardTabProps {
  onNavigateTab: (tabId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigateTab }) => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();

  return (
    <div className="tab-pane active" id="tab-dashboard">
      {/* 1. Üst KPI Kartları */}
      <PortfolioMetrics />

      {/* 2. Orta Bölüm: Dağılım & Hızlı Portföy Özeti */}
      <div className="dashboard-grid-row">
        <AssetDistribution />

        <div className="card top-performers-card">
          <div className="card-header">
            <h3 className="card-title">Portföy Varlık Özeti</h3>
            <button className="btn-text" onClick={() => onNavigateTab('funds')}>
              Tümünü Yönet →
            </button>
          </div>
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
                {funds.map(f => {
                  const val = f.shares * f.currentPrice;
                  const cost = f.shares * f.costPrice;
                  const pnl = val - cost;
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                  return (
                    <tr key={f.code}>
                      <td>
                        <div className="fund-cell">
                          <span className="fund-code-badge">{f.code}</span>
                          <span className="fund-name-text">{f.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-category">{f.category}</span></td>
                      <td>{f.shares.toLocaleString('tr-TR')}</td>
                      <td>{f.currentPrice.toFixed(4)} TL</td>
                      <td className="font-semibold">{formatTRY(val)}</td>
                      <td className={pnl >= 0 ? 'text-pos font-semibold' : 'text-neg font-semibold'}>
                        {formatTRY(pnl)} ({formatPercent(pnlPct)})
                      </td>
                    </tr>
                  );
                })}
                {cashTL > 0 && (
                  <tr className="cash-row">
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge badge-cash">NAKİT</span>
                        <span className="fund-name-text">TL Nakit & Likit Bakiye</span>
                      </div>
                    </td>
                    <td><span className="badge badge-info">Likit</span></td>
                    <td>-</td>
                    <td>-</td>
                    <td className="font-semibold">{formatTRY(cashTL)}</td>
                    <td className="text-secondary">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Alt Bölüm: Resmi Makroekonomi & Kurum Bültenleri */}
      <MacroNewsStrip />
    </div>
  );
};
