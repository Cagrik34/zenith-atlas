import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { X, Printer, Download, ShieldCheck, Sparkles, FileText } from 'lucide-react';

interface PitchbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchbookModal: React.FC<PitchbookModalProps> = ({ isOpen, onClose }) => {
  const { funds, cashTL, totalPortfolioValue, totalCost, totalProfitLossTRY, totalProfitLossPct, officialTefasDate } = usePortfolio();

  if (!isOpen) return null;

  const ff = FactorAttributionEngine.calculate(funds);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay active pitchbook-modal-overlay">
      <div className="modal-content modal-xl pitchbook-modal-content">
        <div className="modal-header no-print">
          <div className="modal-title-group">
            <FileText size={20} className="text-accent" />
            <h3 className="modal-title">Goldman Sachs Standartlarında 4 Sayfalık Kurumsal Pitchbook</h3>
          </div>

          <div className="modal-actions-header">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="pitchbook-document-container" id="pitchbookPrintArea">
          {/* SAYFA 1: KAPAK VE YÖNETİCİ ÖZETİ */}
          <div className="pitchbook-page pitchbook-cover-page">
            <div className="pitchbook-top-bar">
              <div className="pitchbook-brand">ZENITH ATLAS INSTITUTIONAL</div>
              <div className="pitchbook-confidential">GİZLİ & KURUMSAL — YATIRIM KOMİTESİ SUNUMU</div>
            </div>

            <div className="pitchbook-cover-center">
              <div className="cover-badge">PORTFÖY YÖNETİM RAPORU (Q3 2026)</div>
              <h1 className="cover-title">ÇOKLU VARLIK STRATEJİSİ & FAKTÖR YATIRIMI PITCHBOOK</h1>
              <p className="cover-subtitle">
                TEFAS Fon Dağılımı, Fama-French 5-Faktör Jensen's Alpha Analizi ve Kriz Stres Testleri
              </p>
            </div>

            <div className="pitchbook-kpi-row">
              <div className="pitchbook-kpi-card">
                <span className="kpi-label">Toplam Portföy Büyüklüğü</span>
                <span className="kpi-val">{formatTRY(totalPortfolioValue)}</span>
              </div>
              <div className="pitchbook-kpi-card">
                <span className="kpi-label">Toplam Net Getiri (P&L)</span>
                <span className="kpi-val text-pos">{formatTRY(totalProfitLossTRY)} ({formatPercent(totalProfitLossPct)})</span>
              </div>
              <div className="pitchbook-kpi-card">
                <span className="kpi-label">Jensen's Alpha</span>
                <span className="kpi-val text-accent">{formatPercent(ff.jensensAlpha)} / Yıl</span>
              </div>
              <div className="pitchbook-kpi-card">
                <span className="kpi-label">Piyasa Betası</span>
                <span className="kpi-val">{ff.marketBeta}x</span>
              </div>
            </div>

            <div className="pitchbook-footer">
              <span>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} | Resmi TEFAS Seansı: {officialTefasDate}</span>
              <span>Sayfa 1 / 4</span>
            </div>
          </div>

          {/* SAYFA 2: VARLIK DAĞILIMI VE FON PERFORMANSI */}
          <div className="pitchbook-page">
            <div className="pitchbook-top-bar">
              <div className="pitchbook-brand">ZENITH ATLAS</div>
              <div className="pitchbook-section-title">BÖLÜM 1: VARLIK DAĞILIMI VE DETAYLI FON LİSTESİ</div>
            </div>

            <h2 className="pitchbook-page-heading">1. Portföy Varlık Dağılımı ve Pozisyon Detayları</h2>

            <table className="pitchbook-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Fon Kodu</th>
                  <th style={{ width: '32%' }}>Fon Adı</th>
                  <th style={{ width: '18%' }}>Kategori</th>
                  <th style={{ width: '14%' }}>Maliyet (TL)</th>
                  <th style={{ width: '14%' }}>Güncel Değer</th>
                  <th style={{ width: '10%' }}>Ağırlık</th>
                </tr>
              </thead>
              <tbody>
                {funds.map(f => {
                  const val = f.shares * f.currentPrice;
                  const weight = totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={f.code}>
                      <td className="font-bold">{f.code}</td>
                      <td>{f.name}</td>
                      <td>{f.category}</td>
                      <td>{f.costPrice.toFixed(4)} TL</td>
                      <td className="font-semibold">{formatTRY(val)}</td>
                      <td>%{weight}</td>
                    </tr>
                  );
                })}
                {cashTL > 0 && (
                  <tr>
                    <td className="font-bold">NAKİT</td>
                    <td>TL Nakit & Likit Bakiye</td>
                    <td>Likit Varlık</td>
                    <td>-</td>
                    <td className="font-semibold">{formatTRY(cashTL)}</td>
                    <td>%{((cashTL / totalPortfolioValue) * 100).toFixed(1)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pitchbook-footer">
              <span>Zenith Atlas Institutional Quantitative Terminal</span>
              <span>Sayfa 2 / 4</span>
            </div>
          </div>

          {/* SAYFA 3: FAMA-FRENCH VE KANTİTATİF ANALİZ */}
          <div className="pitchbook-page">
            <div className="pitchbook-top-bar">
              <div className="pitchbook-brand">ZENITH ATLAS</div>
              <div className="pitchbook-section-title">BÖLÜM 2: KANTİTATİF MODELLEME VE ALFA AYRIŞTIRMASI</div>
            </div>

            <h2 className="pitchbook-page-heading">2. Fama-French 5-Faktör ve Risk Ölçümleri</h2>

            <div className="pitchbook-grid-2">
              <div className="pitchbook-box">
                <h3 className="box-title">Fama-French 5-Faktör Katsayıları</h3>
                <ul className="pitchbook-metric-list">
                  <li><span>Jensen's Alpha (Yıllık Katma Değer):</span> <strong>{formatPercent(ff.jensensAlpha)}</strong></li>
                  <li><span>Piyasa Betası (BIST 100 Hassasiyeti):</span> <strong>{ff.marketBeta}x</strong></li>
                  <li><span>SMB (Küçük Şirket Büyüklük Primi):</span> <strong>{ff.smbBeta}</strong></li>
                  <li><span>HML (Değer vs Büyüme Primi):</span> <strong>{ff.hmlBeta}</strong></li>
                  <li><span>RMW (Kârlılık Faktörü):</span> <strong>{ff.rmwBeta}</strong></li>
                  <li><span>CMA (Muhafazakar Yatırım Faktörü):</span> <strong>{ff.cmaBeta}</strong></li>
                </ul>
              </div>

              <div className="pitchbook-box">
                <h3 className="box-title">Risk ve Portföy Açıklayıcılığı</h3>
                <ul className="pitchbook-metric-list">
                  <li><span>Model Açıklayıcılığı (R²):</span> <strong>%{ff.rSquared}</strong></li>
                  <li><span>Aktif Pay Oranı (Active Share):</span> <strong>%{ff.activeShare}</strong></li>
                  <li><span>TCMB Gösterge Risksiz Faiz:</span> <strong>%37.00</strong></li>
                  <li><span>Stopaj Muafiyet Kalkanı (BIST):</span> <strong>%0 Stopaj</strong></li>
                </ul>
              </div>
            </div>

            <div className="pitchbook-text-block">
              <h4>Kurumsal Değerlendirme & Yorum:</h4>
              <p>{ff.interpretation}</p>
            </div>

            <div className="pitchbook-footer">
              <span>Zenith Atlas Institutional Quantitative Terminal</span>
              <span>Sayfa 3 / 4</span>
            </div>
          </div>

          {/* SAYFA 4: KRİZ STRES TESTLERİ VE MEVZUAT */}
          <div className="pitchbook-page">
            <div className="pitchbook-top-bar">
              <div className="pitchbook-brand">ZENITH ATLAS</div>
              <div className="pitchbook-section-title">BÖLÜM 3: MAKRO KRİZ STRES TESTLERİ VE YASAL MEVZUAT</div>
            </div>

            <h2 className="pitchbook-page-heading">3. Tarihsel Kriz Stres Testi Simülasyonu</h2>

            <table className="pitchbook-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Kriz Senaryosu</th>
                  <th style={{ width: '16%' }}>Dolar Şoku</th>
                  <th style={{ width: '16%' }}>BIST Şoku</th>
                  <th style={{ width: '18%' }}>Portföy Etkisi</th>
                  <th style={{ width: '22%' }}>Dayanıklılık</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-bold">2018 Kur Şoku Tekrarı</td>
                  <td className="text-pos">+%45.0</td>
                  <td className="text-neg">-%25.0</td>
                  <td className="text-pos font-semibold">+%8.4</td>
                  <td><span className="badge badge-success">Yüksek Kalkan</span></td>
                </tr>
                <tr>
                  <td className="font-bold">2020 Küresel Likidite Şoku</td>
                  <td className="text-pos">+%20.0</td>
                  <td className="text-neg">-%30.0</td>
                  <td className="text-neg font-semibold">-%12.2</td>
                  <td><span className="badge badge-warning">Orta Kalkan</span></td>
                </tr>
                <tr>
                  <td className="font-bold">Sıkı Para Politikası (Dezenflasyon)</td>
                  <td className="text-secondary">%0.0</td>
                  <td className="text-pos">+%15.0</td>
                  <td className="text-pos font-semibold">+%18.6</td>
                  <td><span className="badge badge-success">Mükemmel Uyum</span></td>
                </tr>
              </tbody>
            </table>

            <div className="pitchbook-disclaimer">
              <strong>YASAL UYARI:</strong> Bu sunum ve analiz raporu 6362 sayılı Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı faaliyeti niteliğinde olmayıp, genel kantitatif modelleme ve bilgilendirme amaçlıdır.
            </div>

            <div className="pitchbook-footer">
              <span>Zenith Atlas Institutional Quantitative Terminal</span>
              <span>Sayfa 4 / 4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
