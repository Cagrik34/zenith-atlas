import React, { useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { BlackLittermanEngine } from '../../engines/BlackLittermanEngine';
import { HrpEngine } from '../../engines/HrpEngine';
import { formatTRY } from '../../utils/formatters';
import { Target, Layers, ArrowRight, Shield, FolderPlus, Bot, Sparkles } from 'lucide-react';

export const StrategyTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();
  const { sendMessage } = useAgentHive();

  const blResult = useMemo(() => BlackLittermanEngine.calculate(funds), [funds]);
  const hrpResult = useMemo(() => HrpEngine.calculate(funds), [funds]);

  const isEmpty = funds.length === 0;

  const handleSendStrategyDirectives = () => {
    sendMessage('MACRO_STRATEGIST', 'LEAD_QUANT', 'request', 'Black-Litterman & HRP Strateji Raporu', `Model Sharpe Oranı: ${blResult.sharpeRatio}. Hiyerarşik Risk Paritesi ağaç kümelemesi tamamlandı. Yeniden dengeleme planı hazır.`);
    alert('Stratejik optimizasyon raporu Ajan Masası (Hive) posta kutusuna iletildi.');
  };

  return (
    <div className="tab-pane active" id="tab-strategy">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Stratejik Varlık Dağılımı & Optimizasyon</h2>
          <p className="tab-sub">Black-Litterman Bayesyen Denge ve Lopez de Prado Hiyerarşik Risk Paritesi.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
            <span>🎯</span> MacroStrategist & LeadQuant Strateji Motoru
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSendStrategyDirectives}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Bot size={14} />
            <span>Ajan Masasına İlet</span>
          </button>
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

          {isEmpty ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <Target size={28} opacity={0.3} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.84rem' }}>Portföyünüzde henüz fon bulunmuyor.</p>
            </div>
          ) : (
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
                        <td className="font-bold text-accent">%{recWeight.toFixed(1)}</td>
                        <td className="text-pos font-semibold">+%{expRet.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. HRP Hiyerarşik Risk Paritesi */}
        <div className="card strategy-card">
          <div className="card-header">
            <div className="card-title-group">
              <Layers size={18} className="text-accent" />
              <h3 className="card-title">HRP (Hiyerarşik Risk Paritesi) Ağırlıkları</h3>
            </div>
            <span className="badge badge-primary">Marcos Lopez de Prado</span>
          </div>

          {isEmpty ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <Layers size={28} opacity={0.3} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.84rem' }}>Portföyünüzde henüz fon bulunmuyor.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fon Kodu</th>
                    <th>Mevcut Ağırlık</th>
                    <th>Önerilen HRP Ağırlığı</th>
                    <th>Risk Katkısı</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map(f => {
                    const curWeight = totalPortfolioValue > 0 ? ((f.shares * f.currentPrice) / totalPortfolioValue) * 100 : 0;
                    const hrpWeight = hrpResult.weights[f.code] || 0;

                    return (
                      <tr key={f.code}>
                        <td className="font-bold">{f.code}</td>
                        <td>%{curWeight.toFixed(1)}</td>
                        <td className="font-bold text-accent">%{hrpWeight.toFixed(1)}</td>
                        <td>
                          <div className="risk-bar-track">
                            <div
                              className="risk-bar-fill"
                              style={{ width: `${Math.min(hrpWeight * 2.5, 100)}%` }}
                            />
                          </div>
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
    </div>
  );
};
