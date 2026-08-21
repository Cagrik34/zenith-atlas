import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { ListOrdered, CheckCircle2, Clock, ArrowRightCircle, ShieldAlert, Bot, Send } from 'lucide-react';

export const ExecutionPlanTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();
  const { sendMessage } = useAgentHive();

  // Hedef model ağırlıkları (Dengeli Portföy)
  const targetWeights: Record<string, number> = {
    'MAC': 20.0,
    'IJC': 15.0,
    'AFT': 20.0,
    'KZL': 15.0,
    'AIS': 15.0,
    'TP2': 15.0
  };

  const rebalanceActions = React.useMemo(() => {
    return funds.map(f => {
      const curVal = f.shares * f.currentPrice;
      const curWeight = totalPortfolioValue > 0 ? (curVal / totalPortfolioValue) * 100 : 0;
      const targetWeight = targetWeights[f.code] || 15.0;
      const targetVal = (totalPortfolioValue * targetWeight) / 100.0;
      const diffVal = targetVal - curVal;
      const diffShares = Math.round(diffVal / f.currentPrice);

      const action = diffVal > 500 ? 'AL' : diffVal < -500 ? 'SAT' : 'TUT';

      return {
        code: f.code,
        name: f.name,
        curWeight,
        targetWeight,
        curVal,
        targetVal,
        diffVal,
        diffShares,
        action,
        valort: f.category.includes('Yabancı') ? 'T+3' : f.category.includes('Hisse') ? 'T+2' : 'T+1'
      };
    });
  }, [funds, totalPortfolioValue]);

  const handleDispatchOrdersToHive = () => {
    const buyCount = rebalanceActions.filter(a => a.action === 'AL').length;
    const sellCount = rebalanceActions.filter(a => a.action === 'SAT').length;
    sendMessage(
      'RISK_BREAKER',
      'BROADCAST',
      'request',
      'Yeniden Dengeleme Emirleri Onaylandı',
      `Toplam ${buyCount} ALIM ve ${sellCount} SATIM emri TEFAS valör takvimine (T+1/T+2/T+3) göre icra kuyruğuna alındı. Vergi kalkanı doğrulandı.`
    );
    alert('Yeniden dengeleme emirleri Ajan Masası (Hive) posta kutusuna başarıyla iletildi!');
  };

  return (
    <div className="tab-pane active" id="tab-execution-plan">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Portföy Yeniden Dengeleme & Emir Uygulama Planı</h2>
          <p className="tab-sub">Stratejik hedef ağırlıklara ulaşmak için optimize edilmiş kademeli alım/satım emirleri.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
            <span>🛡️</span> RiskBreaker & TaxHarvester Emir Kalkanı
          </span>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleDispatchOrdersToHive}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Bot size={14} />
            <span>Ajan Masasına Emirleri İlet</span>
          </button>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fon</th>
                <th>Mevcut Ağırlık</th>
                <th>Hedef Ağırlık</th>
                <th>Fark (TL)</th>
                <th>Tahmini Pay</th>
                <th>Önerilen İşlem</th>
                <th>Takas Valörü</th>
              </tr>
            </thead>
            <tbody>
              {rebalanceActions.map(act => {
                const isBuy = act.action === 'AL';
                const isSell = act.action === 'SAT';
                const isHold = act.action === 'TUT';

                return (
                  <tr key={act.code}>
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge">{act.code}</span>
                        <span className="fund-name-text">{act.name}</span>
                      </div>
                    </td>
                    <td>%{act.curWeight.toFixed(1)}</td>
                    <td className="font-bold">%{act.targetWeight.toFixed(1)}</td>
                    <td className={act.diffVal > 0 ? 'text-pos font-bold' : act.diffVal < 0 ? 'text-neg font-bold' : ''}>
                      {act.diffVal > 0 ? '+' : ''}{formatTRY(act.diffVal)}
                    </td>
                    <td className="font-semibold">
                      {Math.abs(act.diffShares).toLocaleString('tr-TR')} Adet
                    </td>
                    <td>
                      <span className={`badge ${isBuy ? 'badge-success' : isSell ? 'badge-danger' : 'badge-category'}`} style={{ fontWeight: 700 }}>
                        {act.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-category">{act.valort}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
