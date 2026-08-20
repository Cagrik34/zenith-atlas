import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { ListOrdered, CheckCircle2, Clock, ArrowRightCircle, ShieldAlert } from 'lucide-react';

export const ExecutionPlanTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();

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

  return (
    <div className="tab-pane active" id="tab-execution-plan">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Portföy Yeniden Dengeleme & Emir Uygulama Planı</h2>
          <p className="tab-sub">Stratejik hedef ağırlıklara ulaşmak için optimize edilmiş kademeli alım/satım emirleri.</p>
        </div>

        <div className="badge badge-primary">
          <Clock size={14} className="mr-1 inline" />
          <span>TEFAS Seansı: 10:00 - 18:15 (T+0 Alım Emri)</span>
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
                <th>Önerilen İşlem</th>
                <th>İşlem Tutarı (TL)</th>
                <th>Tahmini Pay Adedi</th>
                <th>Valör Süresi</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rebalanceActions.map(item => {
                const isBuy = item.action === 'AL';
                const isSell = item.action === 'SAT';
                const actionBadgeClass = isBuy ? 'badge-success' : isSell ? 'badge-danger' : 'badge-secondary';

                return (
                  <tr key={item.code}>
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge">{item.code}</span>
                        <span className="fund-name-text">{item.name}</span>
                      </div>
                    </td>
                    <td>%{item.curWeight.toFixed(1)}</td>
                    <td className="font-semibold text-accent">%{item.targetWeight.toFixed(1)}</td>
                    <td>
                      <span className={`badge ${actionBadgeClass}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className={isBuy ? 'text-pos font-semibold' : isSell ? 'text-neg font-semibold' : ''}>
                      {item.action !== 'TUT' ? formatTRY(Math.abs(item.diffVal)) : '0,00 TL'}
                    </td>
                    <td>
                      {item.action !== 'TUT' ? `${Math.abs(item.diffShares).toLocaleString('tr-TR')} Pay` : '-'}
                    </td>
                    <td><span className="badge badge-info">{item.valort}</span></td>
                    <td>
                      <span className="badge badge-warning">Beklemede</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card notice-card mt-4">
        <div className="notice-header">
          <ShieldAlert size={18} className="text-warning mr-2 inline" />
          <h4 className="notice-title">Valör ve Likidite Yönetimi Hatırlatması</h4>
        </div>
        <p className="notice-text">
          Yabancı fonlar (AFT vb.) satıldığında nakit hesaba <strong>T+3 iş gününde</strong> geçerken, BIST Hisse fonlarında (MAC, IJC) <strong>T+2 valör</strong> uygulanır. Para Piyasası Fonları (AIS, TP2) ise <strong>T+0 aynı gün anında</strong> nakde döner. Kademeli geçiş önerilir.
        </p>
      </div>
    </div>
  );
};
