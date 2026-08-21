import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { RollingCorrelationEngine } from '../../engines/RollingCorrelationEngine';
import { SyntheticStressEngine } from '../../engines/SyntheticStressEngine';
import { TaxLossHarvestingEngine } from '../../engines/TaxLossHarvestingEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Target, Zap, Activity, Sliders, Scissors, ShieldAlert, CheckCircle, Bot } from 'lucide-react';

export const QuantAttributionTab: React.FC = () => {
  const { funds } = usePortfolio();
  const { sendMessage } = useAgentHive();

  // 1. Fama-French
  const ffResults = useMemo(() => FactorAttributionEngine.calculate(funds), [funds]);

  // 2. Rolling Correlation
  const [windowDays, setWindowDays] = useState<number>(90);
  const corrData = useMemo(() => RollingCorrelationEngine.calculate(funds, windowDays), [funds, windowDays]);

  // 3. Synthetic Stress Sliders
  const [usdShock, setUsdShock] = useState<number>(15);
  const [rateShock, setRateShock] = useState<number>(250);
  const [bistShock, setBistShock] = useState<number>(-20);
  const [goldShock, setGoldShock] = useState<number>(10);

  const stressResult = useMemo(() => {
    return SyntheticStressEngine.calculate(funds, usdShock, rateShock, bistShock, goldShock);
  }, [funds, usdShock, rateShock, bistShock, goldShock]);

  // 4. Tax-Loss Harvesting
  const taxSummary = useMemo(() => TaxLossHarvestingEngine.calculate(funds), [funds]);

  const handleApplyTaxHarvest = () => {
    sendMessage('TAX_HARVESTER', 'BROADCAST', 'inform', 'Vergi Hasadı Stratejisi Onaylandı', `Toplam ${taxSummary.lots.length} adet fon için HIFO vergi mahsup satışı hazırlandı.`);
    alert('Vergi hasadı direktifi Ajan Masası (Hive) posta kutusuna iletildi.');
  };

  return (
    <div className="tab-pane active" id="tab-quant">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Kantitatif Analitik & Faktöriyel Risk Masası</h2>
          <p className="tab-sub">Fama-French 5-Faktör Alfa, Yuvarlanan Çapraz Korelasyon, Kriz Simülasyonu ve Vergi Hasadı.</p>
        </div>

        <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
          <span>🧮</span> LeadQuant & RiskBreaker Matematiksel Motoru
        </span>
      </div>

      {/* 1. Fama-French 5-Faktör Masası */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Zap size={18} className="text-accent" />
            <h3 className="card-title">Fama-French 5-Faktör Ayrıştırması & Jensen's Alpha</h3>
          </div>
          <span className="badge badge-primary">Model: 2026 BIST & TEFAS</span>
        </div>

        <div className="ff-metrics-grid">
          <div className="ff-metric-item">
            <span className="ff-label">Jensen's Alpha (Yıllık):</span>
            <span className={`ff-val ${ffResults.jensensAlpha >= 0 ? 'text-pos' : 'text-neg'}`}>
              {formatPercent(ffResults.jensensAlpha)}
            </span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Piyasa Betası (β_mkt):</span>
            <span className="ff-val">{ffResults.marketBeta.toFixed(2)}x</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Büyüklük Primi (SMB):</span>
            <span className="ff-val">{ffResults.smbBeta.toFixed(2)}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Değer Primi (HML):</span>
            <span className="ff-val">{ffResults.hmlBeta.toFixed(2)}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Kârlılık (RMW):</span>
            <span className="ff-val">{ffResults.rmwBeta.toFixed(2)}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Yatırım Tutumu (CMA):</span>
            <span className="ff-val">{ffResults.cmaBeta.toFixed(2)}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Model R² Gücü:</span>
            <span className="ff-val font-semibold">%{ffResults.rSquared.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* 2. Yuvarlanan Çapraz Korelasyon */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Activity size={18} className="text-accent" />
            <h3 className="card-title">Dinamik Yuvarlanan Korelasyon Matrisi</h3>
          </div>
          <div className="window-select-group">
            <span>Pencere:</span>
            {[30, 90, 180, 360].map(days => (
              <button
                key={days}
                className={`btn-tag ${windowDays === days ? 'active' : ''}`}
                onClick={() => setWindowDays(days)}
              >
                {days} Gün
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="correlation-table">
            <thead>
              <tr>
                <th>Varlık</th>
                {corrData.assets.map(a => <th key={a}>{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {corrData.matrix.map((row, rIdx) => (
                <tr key={corrData.assets[rIdx]}>
                  <td className="font-bold">{corrData.assets[rIdx]}</td>
                  {row.map((val, cIdx) => {
                    const isSelf = rIdx === cIdx;
                    const bgAlpha = isSelf ? 0.1 : Math.abs(val) * 0.35;
                    const bgColor = isSelf ? '#64748B' : val > 0 ? `rgba(16, 185, 129, ${bgAlpha})` : `rgba(239, 68, 68, ${bgAlpha})`;
                    return (
                      <td
                        key={cIdx}
                        style={{ backgroundColor: bgColor, color: '#FFFFFF', fontWeight: isSelf ? 400 : 700 }}
                        className="corr-cell"
                      >
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Sentetik Stres Simülasyonu */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Sliders size={18} className="text-accent" />
            <h3 className="card-title">Sentetik Kriz & Şok Simülatörü</h3>
          </div>
          <span className="badge badge-primary">Monte Carlo & Çapraz Şok Motoru</span>
        </div>

        <div className="stress-sliders-grid">
          <div className="slider-box">
            <div className="slider-header">
              <span>USD/TRY Kuru Şoku:</span>
              <strong>{usdShock >= 0 ? '+' : ''}%{usdShock}</strong>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              value={usdShock}
              onChange={e => setUsdShock(Number(e.target.value))}
            />
          </div>

          <div className="slider-box">
            <div className="slider-header">
              <span>TCMB Faiz Şoku (bps):</span>
              <strong>{rateShock >= 0 ? '+' : ''}{rateShock} bps</strong>
            </div>
            <input
              type="range"
              min="-500"
              max="1000"
              step="50"
              value={rateShock}
              onChange={e => setRateShock(Number(e.target.value))}
            />
          </div>

          <div className="slider-box">
            <div className="slider-header">
              <span>BIST 100 Endeks Şoku:</span>
              <strong>{bistShock >= 0 ? '+' : ''}%{bistShock}</strong>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={bistShock}
              onChange={e => setBistShock(Number(e.target.value))}
            />
          </div>

          <div className="slider-box">
            <div className="slider-header">
              <span>Ons Altın ($) Şoku:</span>
              <strong>{goldShock >= 0 ? '+' : ''}%{goldShock}</strong>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              value={goldShock}
              onChange={e => setGoldShock(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="stress-result-banner" style={{ background: stressResult.portfolioLossPct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: stressResult.portfolioLossPct >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div className="stress-res-left">
            <ShieldAlert size={24} className={stressResult.portfolioLossPct >= 0 ? 'text-pos' : 'text-neg'} />
            <div>
              <h4>Tahmini Portföy Etkisi: {stressResult.scenarioName}</h4>
              <p>Dayanıklılık Skoru: <strong>%{stressResult.resilienceScore}</strong> • En Defansif Varlık: <strong>{stressResult.topDefensiveAsset}</strong></p>
            </div>
          </div>
          <div className="stress-res-right">
            <span className={`stress-pct ${stressResult.portfolioLossPct >= 0 ? 'text-pos' : 'text-neg'}`}>
              {stressResult.portfolioLossPct >= 0 ? '+' : ''}{formatPercent(stressResult.portfolioLossPct)}
            </span>
            <span className="stress-tl">
              ({stressResult.portfolioLossTRY >= 0 ? '+' : ''}{formatTRY(stressResult.portfolioLossTRY)})
            </span>
          </div>
        </div>
      </div>

      {/* 4. Vergi Kaybı Hasadı (Tax-Loss Harvesting) */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Scissors size={18} className="text-accent" />
            <h3 className="card-title">Vergi Kaybı Hasadı & İkame Fon Haritası (GVK 67)</h3>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleApplyTaxHarvest}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Bot size={14} />
            <span>Ajan Masasına İlet</span>
          </button>
        </div>

        <div className="tax-harvest-grid">
          <div className="tax-stat-box">
            <span className="tax-stat-lbl">Toplam Zararda Olan Pozisyon:</span>
            <strong className="tax-stat-val text-neg">{formatTRY(taxSummary.totalHarvestableLossTRY)}</strong>
          </div>
          <div className="tax-stat-box">
            <span className="tax-stat-lbl">Kazanılabilir Stopaj Avantajı:</span>
            <strong className="tax-stat-val text-pos">{formatTRY(taxSummary.totalTaxSavingsTRY)}</strong>
          </div>
        </div>

        {taxSummary.lots.length > 0 && (
          <div className="table-responsive" style={{ marginTop: '12px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zarardaki Fon</th>
                  <th>Mevcut Zarar</th>
                  <th>Önerilen İkame Fon</th>
                  <th>Kategori & Neden</th>
                </tr>
              </thead>
              <tbody>
                {taxSummary.lots.map(h => (
                  <tr key={h.fundCode}>
                    <td className="font-bold">{h.fundCode}</td>
                    <td className="text-neg font-bold">{formatTRY(h.unrealizedLossTRY)}</td>
                    <td className="font-bold text-accent">{h.surrogateFunds[0]?.code || '-'}</td>
                    <td>{h.surrogateFunds[0]?.reason || 'Korelasyonlu defansif ikame'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
