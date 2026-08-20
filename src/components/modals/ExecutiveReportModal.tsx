import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { X, Printer, FileCheck } from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ isOpen, onClose }) => {
  const { funds, cashTL, totalPortfolioValue, totalProfitLossTRY, totalProfitLossPct, officialTefasDate } = usePortfolio();

  if (!isOpen) return null;

  const ff = FactorAttributionEngine.calculate(funds);

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-lg">
        <div className="modal-header no-print">
          <div className="modal-title-group">
            <FileCheck size={20} className="text-accent" />
            <h3 className="modal-title">İcra Komitesi Yönetici Özeti (Executive Summary)</h3>
          </div>
          <div className="modal-actions-header">
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} />
              <span>Yazdır</span>
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="executive-report-body" id="executivePrintArea">
          <div className="report-header-block">
            <h2>ZENITH ATLAS PORTFÖY YÖNETİCİ ÖZETİ</h2>
            <p>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} | Resmi TEFAS Seansı: {officialTefasDate}</p>
          </div>

          <div className="report-metrics-grid">
            <div className="report-metric">
              <span>Toplam Portföy Büyüklüğü:</span>
              <strong>{formatTRY(totalPortfolioValue)}</strong>
            </div>
            <div className="report-metric">
              <span>Toplam Kâr/Zarar:</span>
              <strong className="text-pos">{formatTRY(totalProfitLossTRY)} ({formatPercent(totalProfitLossPct)})</strong>
            </div>
            <div className="report-metric">
              <span>Fama-French Jensen's Alpha:</span>
              <strong className="text-accent">{formatPercent(ff.jensensAlpha)} / Yıl</strong>
            </div>
            <div className="report-metric">
              <span>Piyasa Betası (β):</span>
              <strong>{ff.marketBeta}x</strong>
            </div>
          </div>

          <h3 className="report-subheading">Varlık Dağılım Tablosu</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fon Kodu</th>
                <th>Adı</th>
                <th>Kategori</th>
                <th>Maliyet (TL)</th>
                <th>Güncel Değer (TL)</th>
                <th>Ağırlık</th>
              </tr>
            </thead>
            <tbody>
              {funds.map(f => (
                <tr key={f.code}>
                  <td className="font-bold">{f.code}</td>
                  <td>{f.name}</td>
                  <td>{f.category}</td>
                  <td>{f.costPrice.toFixed(4)} TL</td>
                  <td className="font-semibold">{formatTRY(f.shares * f.currentPrice)}</td>
                  <td>%{((f.shares * f.currentPrice / totalPortfolioValue) * 100).toFixed(1)}</td>
                </tr>
              ))}
              {cashTL > 0 && (
                <tr>
                  <td className="font-bold">NAKİT</td>
                  <td>TL Likit Bakiye</td>
                  <td>Likit</td>
                  <td>-</td>
                  <td className="font-semibold">{formatTRY(cashTL)}</td>
                  <td>%{((cashTL / totalPortfolioValue) * 100).toFixed(1)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
