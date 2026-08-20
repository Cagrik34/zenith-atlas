import React, { useState, useRef } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { AddFundModal } from './AddFundModal';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, Edit3, DollarSign, ArrowUpDown, Sparkles, RotateCcw, Download, Upload, FolderPlus } from 'lucide-react';

export const FundsTab: React.FC = () => {
  const {
    funds,
    cashTL,
    setCashTL,
    removeFund,
    totalFundValue,
    totalPortfolioValue,
    loadDemoPortfolio,
    clearPortfolio,
    importPortfolioJson,
    exportPortfolioJson
  } = usePortfolio();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashTL));
  const [sortField, setSortField] = useState<'value' | 'pnl' | 'pnlPct' | 'name'>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCashUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput) || 0;
    setCashTL(val);
  };

  const handleExportBackup = () => {
    const jsonStr = exportPortfolioJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zenith_Portfoy_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importPortfolioJson(content);
        if (ok) {
          alert('Portföy yedeği başarıyla geri yüklendi!');
        } else {
          alert('Geçersiz portföy yedek dosyası formatı.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    if (window.confirm('Tüm portföyü sıfırlamak ve temiz bir başlangıç yapmak istediğinize emin misiniz?')) {
      clearPortfolio();
      setCashInput('0');
    }
  };

  const isPortfolioEmpty = funds.length === 0 && cashTL === 0;

  const sortedFunds = React.useMemo(() => {
    return [...funds].sort((a, b) => {
      const valA = a.shares * a.currentPrice;
      const valB = b.shares * b.currentPrice;
      const costA = a.shares * a.costPrice;
      const costB = b.shares * b.costPrice;
      const pnlA = valA - costA;
      const pnlB = valB - costB;
      const pnlPctA = costA > 0 ? (pnlA / costA) : 0;
      const pnlPctB = costB > 0 ? (pnlB / costB) : 0;

      let comp = 0;
      if (sortField === 'value') comp = valB - valA;
      else if (sortField === 'pnl') comp = pnlB - pnlA;
      else if (sortField === 'pnlPct') comp = pnlPctB - pnlPctA;
      else if (sortField === 'name') comp = a.code.localeCompare(b.code);

      return sortAsc ? -comp : comp;
    });
  }, [funds, sortField, sortAsc]);

  const toggleSort = (field: 'value' | 'pnl' | 'pnlPct' | 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="tab-pane active" id="tab-funds">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Portföy Varlıkları & Fon Yönetimi</h2>
          <p className="tab-sub">Aktif portföyünüzdeki fonları, lotları ve nakit bakiyenizi anlık yönetin.</p>
        </div>

        <div className="action-buttons-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleCashUpdate} className="cash-update-form">
            <div className="cash-input-group">
              <span className="currency-prefix">₺</span>
              <input
                type="number"
                step="any"
                className="cash-input"
                placeholder="Nakit Bakiye"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-secondary">
                Nakit Güncelle
              </button>
            </div>
          </form>

          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Yeni Fon Ekle</span>
          </button>

          <button
            className="btn btn-ghost"
            onClick={loadDemoPortfolio}
            title="Örnek 6 Fonlu Kurumsal Demo Portföyü Yükle"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <Sparkles size={14} color="#F59E0B" />
            <span>Örnek Portföy</span>
          </button>

          {!isPortfolioEmpty && (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleExportBackup}
                title="Portföyü JSON Yedek Olarak İndir"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <Download size={14} />
                <span>Yedek Al</span>
              </button>

              <button
                className="btn btn-ghost"
                onClick={handleClear}
                title="Portföyü Tamamen Sıfırla ve Temizle"
                style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
              >
                <RotateCcw size={14} />
                <span>Sıfırla</span>
              </button>
            </>
          )}

          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            title="JSON Portföy Yedeğini Geri Yükle"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <Upload size={14} />
            <span>Yedek Yükle</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="card table-card">
        {isPortfolioEmpty ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#818CF8' }}>
              <FolderPlus size={28} />
            </div>
            <h3 style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>
              Portföyünüz Tamamen Temiz ve Boş
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              TEFAS fonlarınızı ekleyerek kendi özel portföyünüzü oluşturabilir veya terminalin kantitatif analizlerini keşfetmek için tek tıkla örnek portföyü yükleyebilirsiniz.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} />
                <span>İlk Fonunu Ekle</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={loadDemoPortfolio}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sparkles size={16} color="#F59E0B" />
                <span>Örnek Portföyü Yükle (Demo)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')} className="sortable-th">
                    Fon Kodu & Adı <ArrowUpDown size={12} />
                  </th>
                  <th>Kategori</th>
                  <th>Pay Adedi</th>
                  <th>Maliyet (TL)</th>
                  <th>Güncel Fiyat (TL)</th>
                  <th onClick={() => toggleSort('value')} className="sortable-th">
                    Toplam Değer <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => toggleSort('pnl')} className="sortable-th">
                    Net Kâr/Zarar <ArrowUpDown size={12} />
                  </th>
                  <th>Portföy Payı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sortedFunds.map(f => {
                  const totalCost = f.shares * f.costPrice;
                  const totalVal = f.shares * f.currentPrice;
                  const pnl = totalVal - totalCost;
                  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                  const sharePct = totalPortfolioValue > 0 ? (totalVal / totalPortfolioValue) * 100 : 0;

                  return (
                    <tr key={f.code}>
                      <td>
                        <div className="fund-cell">
                          <span className="fund-code-badge">{f.code}</span>
                          <span className="fund-name-text">{f.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-category">{f.category}</span></td>
                      <td>{f.shares.toLocaleString('tr-TR')}</td>
                      <td>{f.costPrice.toFixed(4)} TL</td>
                      <td>{f.currentPrice.toFixed(4)} TL</td>
                      <td className="font-semibold">{formatTRY(totalVal)}</td>
                      <td className={pnl >= 0 ? 'text-pos font-semibold' : 'text-neg font-semibold'}>
                        {formatTRY(pnl)} ({formatPercent(pnlPct)})
                      </td>
                      <td>
                        <div className="share-cell">
                          <span>%{sharePct.toFixed(1)}</span>
                          <div className="mini-progress-bar">
                            <div className="mini-progress-fill" style={{ width: `${Math.min(sharePct, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-icon delete-btn"
                          onClick={() => removeFund(f.code)}
                          title="Fonu Portföyden Çıkar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {cashTL > 0 && (
                  <tr className="cash-row">
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge badge-cash">NAKİT</span>
                        <span className="fund-name-text">TL Nakit & Likit Varlık</span>
                      </div>
                    </td>
                    <td><span className="badge badge-info">Likit</span></td>
                    <td>1</td>
                    <td>{cashTL.toFixed(2)} TL</td>
                    <td>{cashTL.toFixed(2)} TL</td>
                    <td className="font-semibold">{formatTRY(cashTL)}</td>
                    <td className="text-secondary">-</td>
                    <td>
                      <div className="share-cell">
                        <span>%{((cashTL / totalPortfolioValue) * 100).toFixed(1)}</span>
                      </div>
                    </td>
                    <td>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddFundModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
