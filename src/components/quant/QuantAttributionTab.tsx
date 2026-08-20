import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { RollingCorrelationEngine } from '../../engines/RollingCorrelationEngine';
import { SyntheticStressEngine } from '../../engines/SyntheticStressEngine';
import { TaxLossHarvestingEngine } from '../../engines/TaxLossHarvestingEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Target, Zap, Activity, Sliders, Scissors, ShieldAlert, CheckCircle } from 'lucide-react';

export const QuantAttributionTab: React.FC = () => {
  const { funds } = usePortfolio();

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

  return (
    <div className="tab-pane active" id="tab-quant">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Kantitatif Analitik & Faktöriyel Risk Masası</h2>
          <p className="tab-sub">Fama-French 5-Faktör Alfa, Yuvarlanan Çapraz Korelasyon, Kriz Simülasyonu ve Vergi Hasadı.</p>
        </div>
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
            <span className="ff-val">{ffResults.marketBeta}x</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Büyüklük Primi (SMB):</span>
            <span className="ff-val">{ffResults.smbBeta}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Değer Primi (HML):</span>
            <span className="ff-val">{ffResults.hmlBeta}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Kârlılık Primi (RMW):</span>
            <span className="ff-val">{ffResults.rmwBeta}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Yatırım Primi (CMA):</span>
            <span className="ff-val">{ffResults.cmaBeta}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Açıklayıcılık (R²):</span>
            <span className="ff-val">%{ffResults.rSquared}</span>
          </div>
          <div className="ff-metric-item">
            <span className="ff-label">Aktif Pay (Active Share):</span>
            <span className="ff-val">%{ffResults.activeShare}</span>
          </div>
        </div>

        <div className="quant-interpretation-box">
          <p><strong>💡 Kantitatif Değerlendirme:</strong> {ffResults.interpretation}</p>
        </div>
      </div>

      {/* 2. Yuvarlanan Çapraz Korelasyon & PCA */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Activity size={18} className="text-info" />
            <h3 className="card-title">Yuvarlanan Çapraz Varlık Korelasyonu & PCA Absorpsiyon Oranı</h3>
          </div>
          <div className="toggle-group">
            <button className={`toggle-btn ${windowDays === 30 ? 'active' : ''}`} onClick={() => setWindowDays(30)}>30 Günlük</button>
            <button className={`toggle-btn ${windowDays === 90 ? 'active' : ''}`} onClick={() => setWindowDays(90)}>90 Günlük</button>
            <button className={`toggle-btn ${windowDays === 365 ? 'active' : ''}`} onClick={() => setWindowDays(365)}>365 Günlük</button>
          </div>
        </div>

        <div className="pca-strip">
          <div className="pca-badge">
            <span>PCA Absorpsiyon Oranı (Sistemik Risk): </span>
            <strong>%{corrData.pcaAbsorptionRatio}</strong>
          </div>
          <div className="pca-badge">
            <span>Çeşitlendirme Katsayısı: </span>
            <strong>{corrData.diversificationRatio}x</strong>
          </div>
        </div>

        <div className="correlation-matrix-container">
          <table className="correlation-table">
            <thead>
              <tr>
                <th>Varlık</th>
                {corrData.assets.map(a => <th key={a}>{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {corrData.matrix.map((row, i) => (
                <tr key={corrData.assets[i]}>
                  <td className="font-bold">{corrData.assets[i]}</td>
                  {row.map((val, j) => {
                    const isDiag = i === j;
                    const isPos = val > 0.4 && !isDiag;
                    const isNeg = val < 0;
                    return (
                      <td
                        key={j}
                        className={`corr-cell ${isDiag ? 'diag' : isPos ? 'high-corr' : isNeg ? 'neg-corr' : ''}`}
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

      {/* 3. Sentetik Makro Şok Simülatörü */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Sliders size={18} className="text-warning" />
            <h3 className="card-title">İnteraktif Sentetik Makro Şok Jeneratörü (What-If Stress Test)</h3>
          </div>
          <span className="badge badge-warning">Canlı Portföy Duyarlılığı</span>
        </div>

        <div className="stress-sliders-grid">
          <div className="slider-item">
            <div className="slider-label-row">
              <span>USD/TRY Sıçraması:</span>
              <strong>{formatPercent(usdShock)}</strong>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              value={usdShock}
              onChange={(e) => setUsdShock(parseFloat(e.target.value))}
              className="stress-range-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-label-row">
              <span>TCMB Faiz Şoku (Bps):</span>
              <strong>+{rateShock} bps</strong>
            </div>
            <input
              type="range"
              min="-500"
              max="1000"
              step="50"
              value={rateShock}
              onChange={(e) => setRateShock(parseFloat(e.target.value))}
              className="stress-range-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-label-row">
              <span>BIST 100 Endeks Şoku:</span>
              <strong>{formatPercent(bistShock)}</strong>
            </div>
            <input
              type="range"
              min="-40"
              max="30"
              value={bistShock}
              onChange={(e) => setBistShock(parseFloat(e.target.value))}
              className="stress-range-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-label-row">
              <span>Spot Ons Altın Şoku:</span>
              <strong>{formatPercent(goldShock)}</strong>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              value={goldShock}
              onChange={(e) => setGoldShock(parseFloat(e.target.value))}
              className="stress-range-slider"
            />
          </div>
        </div>

        <div className="stress-result-summary">
          <div className="stress-stat">
            <span className="stress-stat-label">Tahmini Net Portföy Etkisi:</span>
            <span className={`stress-stat-val ${stressResult.portfolioLossTRY >= 0 ? 'text-pos' : 'text-neg'}`}>
              {formatTRY(stressResult.portfolioLossTRY)} ({formatPercent(stressResult.portfolioLossPct)})
            </span>
          </div>

          <div className="stress-stat">
            <span className="stress-stat-label">Portföy Dayanıklılık Skoru:</span>
            <span className="stress-stat-val text-accent">{stressResult.resilienceScore} / 100</span>
          </div>

          <div className="stress-stat">
            <span className="stress-stat-label">En Güçlü Savunma Varlığı:</span>
            <span className="stress-stat-val">{stressResult.topDefensiveAsset}</span>
          </div>
        </div>
      </div>

      {/* 4. Vergi Kayıp Hasadı (Tax-Loss Harvesting) */}
      <div className="card quant-card">
        <div className="card-header">
          <div className="card-title-group">
            <Scissors size={18} className="text-success" />
            <h3 className="card-title">2026 Stopaj Rejimi Vergi Kayıp Hasadı & HIFO Optimizasyonu</h3>
          </div>
          <span className="badge badge-success">GVK Geçici 67. Madde</span>
        </div>

        <div className="tax-summary-strip">
          <div className="tax-badge-item">
            <span>Hasat Edilebilir Zarar: </span>
            <strong>{formatTRY(taxSummary.totalHarvestableLossTRY)}</strong>
          </div>
          <div className="tax-badge-item">
            <span>Yasal Vergi Kalkanı (%17.5): </span>
            <strong className="text-pos">{formatTRY(taxSummary.totalTaxSavingsTRY)}</strong>
          </div>
          <div className="tax-badge-item">
            <span>HIFO Metodu Ek Avantajı: </span>
            <strong className="text-accent">+{formatTRY(taxSummary.hifoAdvantageTRY)}</strong>
          </div>
        </div>

        {taxSummary.lots.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fon Kodu</th>
                  <th>Alış Fiyatı</th>
                  <th>Güncel Fiyat</th>
                  <th>Zarar (TL)</th>
                  <th>Vergi Tasarrufu</th>
                  <th>Önerilen İkame Fonlar (Surrogates)</th>
                </tr>
              </thead>
              <tbody>
                {taxSummary.lots.map(l => (
                  <tr key={l.lotId}>
                    <td className="font-bold">{l.fundCode}</td>
                    <td>{l.buyPrice.toFixed(4)} TL</td>
                    <td>{l.currentPrice.toFixed(4)} TL</td>
                    <td className="text-neg font-semibold">-{formatTRY(l.unrealizedLossTRY)}</td>
                    <td className="text-pos font-semibold">+{formatTRY(l.taxShieldTRY)}</td>
                    <td>
                      <div className="surrogate-tags">
                        {l.surrogateFunds.map(s => (
                          <span key={s.code} className="badge badge-info" title={s.reason}>
                            {s.code} (Corr: {s.correlation})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <CheckCircle size={24} className="text-pos mb-2" />
            <p>Portföyünüzde vergi hasadı gerektiren zararda lot bulunmuyor. Tüm varlıklar kârlı bölgede!</p>
          </div>
        )}
      </div>
    </div>
  );
};
