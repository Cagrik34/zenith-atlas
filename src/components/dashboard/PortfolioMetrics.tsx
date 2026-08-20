import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { TrendingUp, DollarSign, Activity, ShieldCheck, Zap, PieChart } from 'lucide-react';

export const PortfolioMetrics: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue, totalProfitLossTRY, totalProfitLossPct, dailyProfitLossTRY, dailyProfitLossPct } = usePortfolio();

  const factorResults = React.useMemo(() => {
    return FactorAttributionEngine.calculate(funds);
  }, [funds]);

  // Portföyün ağırlıklı volatilitesi
  const weightedVol = React.useMemo(() => {
    if (funds.length === 0 || totalPortfolioValue <= 0) return 0;
    const totalFundVal = funds.reduce((s, f) => s + (f.shares * f.currentPrice), 0);
    return funds.reduce((acc, f) => {
      const w = (f.shares * f.currentPrice) / totalFundVal;
      return acc + (w * (f.volatility || 22.5));
    }, 0);
  }, [funds, totalPortfolioValue]);

  // Sharpe Oranı: (R_p - R_f) / Volatilite
  const sharpe = React.useMemo(() => {
    const totalRet1Y = funds.reduce((acc, f) => {
      const w = totalPortfolioValue > 0 ? (f.shares * f.currentPrice) / totalPortfolioValue : 0;
      return acc + (w * (f.performance1Y || 60.0));
    }, 0);
    const rf = 37.0; // TCMB %37.00
    return weightedVol > 0 ? (totalRet1Y - rf) / weightedVol : 1.45;
  }, [funds, totalPortfolioValue, weightedVol]);

  return (
    <div className="metrics-grid">
      {/* 1. Toplam Portföy Değeri */}
      <div className="metric-card primary-card">
        <div className="metric-header">
          <span className="metric-title">Toplam Portföy Büyüklüğü</span>
          <DollarSign size={18} className="metric-icon" />
        </div>
        <div className="metric-value">{formatTRY(totalPortfolioValue)}</div>
        <div className="metric-footer">
          <span className="metric-sub">
            {funds.length} Fon + {formatTRY(cashTL)} Nakit
          </span>
        </div>
      </div>

      {/* 2. Toplam Kâr / Zarar */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Toplam Net Getiri (P&L)</span>
          <TrendingUp size={18} className="metric-icon" />
        </div>
        <div className={`metric-value ${totalProfitLossTRY >= 0 ? 'text-pos' : 'text-neg'}`}>
          {formatTRY(totalProfitLossTRY)}
        </div>
        <div className="metric-footer">
          <span className={`metric-badge ${totalProfitLossPct >= 0 ? 'badge-pos' : 'badge-neg'}`}>
            {formatPercent(totalProfitLossPct)}
          </span>
          <span className="metric-sub">Maliyet Üzerinden</span>
        </div>
      </div>

      {/* 3. Günlük Net Değişim */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Günlük Değişim</span>
          <Activity size={18} className="metric-icon" />
        </div>
        <div className={`metric-value ${dailyProfitLossTRY >= 0 ? 'text-pos' : 'text-neg'}`}>
          {formatTRY(dailyProfitLossTRY)}
        </div>
        <div className="metric-footer">
          <span className={`metric-badge ${dailyProfitLossPct >= 0 ? 'badge-pos' : 'badge-neg'}`}>
            {formatPercent(dailyProfitLossPct)}
          </span>
          <span className="metric-sub">Son 24 Saat</span>
        </div>
      </div>

      {/* 4. Fama-French Jensen's Alpha */}
      <div className="metric-card highlight-card">
        <div className="metric-header">
          <span className="metric-title">Fama-French Jensen's α</span>
          <Zap size={18} className="metric-icon" />
        </div>
        <div className={`metric-value ${factorResults.jensensAlpha >= 0 ? 'text-pos' : 'text-neg'}`}>
          {formatPercent(factorResults.jensensAlpha)}
        </div>
        <div className="metric-footer">
          <span className="metric-badge badge-info">Beta: {factorResults.marketBeta}x</span>
          <span className="metric-sub">R²: %{factorResults.rSquared}</span>
        </div>
      </div>

      {/* 5. Sharpe Oranı & Volatilite */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Sharpe Oranı & Risk</span>
          <ShieldCheck size={18} className="metric-icon" />
        </div>
        <div className="metric-value">{sharpe.toFixed(2)}</div>
        <div className="metric-footer">
          <span className="metric-sub">Yıllık Volatilite: %{weightedVol.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
