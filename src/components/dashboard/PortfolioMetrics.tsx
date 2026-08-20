import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';

export const PortfolioMetrics: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue, totalProfitLossTRY, totalProfitLossPct } = usePortfolio();

  const ffMetrics = React.useMemo(() => {
    return FactorAttributionEngine.calculate(funds);
  }, [funds]);

  const isProfit = totalProfitLossTRY >= 0;

  return (
    <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {/* 1. TOPLAM PORTFÖY BÜYÜKLÜĞÜ */}
      <div className="summary-card card card-glow-purple">
        <div className="card-icon">💰</div>
        <div className="card-content">
          <span className="card-label">TOPLAM PORTFÖY BÜYÜKLÜĞÜ</span>
          <span className="card-value">{formatTRY(totalPortfolioValue)}</span>
          <span className="card-sub neutral">{funds.length} Fon + {formatTRY(cashTL)} Nakit</span>
        </div>
      </div>

      {/* 2. TOPLAM NET GETİRİ (P&L) */}
      <div className="summary-card card card-glow-green">
        <div className="card-icon">📈</div>
        <div className="card-content">
          <span className="card-label">TOPLAM NET GETİRİ (P&L)</span>
          <span className={`card-value ${isProfit ? 'positive' : 'negative'}`}>
            {formatTRY(totalProfitLossTRY)}
          </span>
          <span className={`card-sub ${isProfit ? 'positive' : 'negative'}`}>
            {isProfit ? '+' : ''}{formatPercent(totalProfitLossPct)} Maliyet Üzerinden
          </span>
        </div>
      </div>

      {/* 3. GÜNLÜK DEĞİŞİM */}
      <div className="summary-card card card-glow-blue">
        <div className="card-icon">⚡</div>
        <div className="card-content">
          <span className="card-label">GÜNLÜK DEĞİŞİM</span>
          <span className="card-value">₺0,00</span>
          <span className="card-sub positive">%0,00 Son 24 Saat</span>
        </div>
      </div>

      {/* 4. FAMA-FRENCH JENSEN'S ALPHA */}
      <div className="summary-card card card-glow-orange">
        <div className="card-icon">🎯</div>
        <div className="card-content">
          <span className="card-label">FAMA-FRENCH JENSEN'S ALPHA</span>
          <span className="card-value text-accent">+{formatPercent(ffMetrics.jensensAlpha)}</span>
          <span className="card-sub neutral">Beta: {ffMetrics.marketBeta}x &nbsp; R²: %{ffMetrics.rSquared}</span>
        </div>
      </div>

      {/* 5. SHARPE ORANI & RİSK */}
      <div className="summary-card card card-glow-purple">
        <div className="card-icon">🛡️</div>
        <div className="card-content">
          <span className="card-label">SHARPE ORANI & RİSK</span>
          <span className="card-value">1.57</span>
          <span className="card-sub neutral">Yıllık Volatilite: %22.5</span>
        </div>
      </div>
    </div>
  );
};
