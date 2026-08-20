import React, { useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { BlackLittermanEngine } from '../../engines/BlackLittermanEngine';
import { HrpEngine } from '../../engines/HrpEngine';
import { formatTRY } from '../../utils/formatters';
import { Target, Layers, ArrowRight, Shield } from 'lucide-react';

export const StrategyTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();

  const blResult = useMemo(() => BlackLittermanEngine.calculate(funds), [funds]);
  const hrpResult = useMemo(() => HrpEngine.calculate(funds), [funds]);

  return (
    <div className="tab-pane active" id="tab-strategy">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Stratejik Varlık Dağılımı & Optimizasyon</h2>
          <p className="tab-sub">Black-Litterman Bayesyen Denge ve Lopez de Prado Hiyerarşik Risk Paritesi.</p>
        </div>
      </div>

      <div className="strategy-grid-row">
        {/* 1. Black-Litterman Modeli */}
        <div className="card strategy-card">
          <div className="card-header">
            <div className="card-title-group">
              <Target size={18} className="text-accent" />
              <h3 className="card-title">Black-Litterman Bayesyen Denge Ağırlıkları</h3>
            </div>
            <span className="badge badge-primary">Model Sharpe: {blResult.sharpeRatio}</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fon Kodu</th>
                  <th>Mevcut Ağırlık</th>
                  <th>Önerilen BL Ağırlığı</th>
                  <th>Beklenen Yıllık Getiri</th>
                </tr>
              </thead>
              <tbody>
                {funds.map(f => {
                  const curWeight = totalPortfolioValue > 0 ? ((f.shares * f.currentPrice) / totalPortfolioValue) * 100 : 0;
                  const recWeight = blResult.weights[f.code] || 0;
                  const expRet = blResult.expectedReturns[f.code] || 0;

                  return (
                    <tr key={f.code}>
                      <td className="font-bold">{f.code}</td>
                      <td>%{curWeight.toFixed(1)}</td>
                      <td className="font-semibold text-accent">%{recWeight.toFixed(1)}</td>
                      <td className="text-pos font-semibold">%{expRet.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. HRP Hiyerarşik Risk Paritesi Modeli */}
        <div className="card strategy-card">
          <div className="card-header">
            <div className="card-title-group">
              <Layers size={18} className="text-info" />
              <h3 className="card-title">Hiyerarşik Risk Paritesi (HRP) Dağılımı</h3>
            </div>
            <span className="badge badge-info">Lopez de Prado Algoritması</span>
          </div>

          <div className="hrp-clusters-list">
            {hrpResult.clusters.map(cluster => (
              <div key={cluster.name} className="hrp-cluster-item card">
                <div className="cluster-header">
                  <span className="cluster-name">{cluster.name}</span>
                  <span className="cluster-weight badge badge-category">%{cluster.weight}</span>
                </div>
                <div className="cluster-funds">
                  {cluster.funds.map(c => (
                    <span key={c} className="fund-chip">{c} (%{hrpResult.weights[c] || 0})</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
