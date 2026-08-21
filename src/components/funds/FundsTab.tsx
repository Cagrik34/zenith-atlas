import React, { useState, useRef } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { AddFundModal } from './AddFundModal';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, Edit3, DollarSign, ArrowUpDown, Sparkles, RotateCcw, Download, Upload, FolderPlus, Bot, ShieldCheck } from 'lucide-react';

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

  const { sendMessage } = useAgentHive();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashTL));
  const [sortField, setSortField] = useState<'value' | 'pnl' | 'pnlPct' | 'name'>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCashUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput) || 0;
    setCashTL(val);
    sendMessage('LEAD_QUANT', 'BROADCAST', 'inform', 'Nakit Bakiyesi Güncellendi', `Portföy serbest nakit bakiyesi ${formatTRY(val)} olarak güncellendi.`);
  };

  const handleRemoveFund = (code: string, name: string) => {
    if (confirm(`${code} - ${name} fonunu portföyden çıkarmak istediğinize emin misiniz?`)) {
      removeFund(code);
      sendMessage('TAX_HARVESTER', 'BROADCAST', 'inform', 'Fon Portföyden Çıkarıldı', `${code} pozisyonu tasfiye edildi. Vergi mahsup matrahı güncellendi.`);
    }
  };

  const handleClearPortfolio = () => {
    if (confirm('Tüm portföyü sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      clearPortfolio();
      sendMessage('RISK_BREAKER', 'BROADCAST', 'inform', 'Portföy Sıfırlandı', 'Kullanıcı portföyü sıfırladı. Devre kesici nominal duruma alındı.');
    }
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
          sendMessage('SYNC_SENTINEL', 'BROADCAST', 'inform', 'Portföy Geri Yüklendi', 'JSON yedek dosyasından portföy başarıyla geri yüklendi.');
        } else {
          alert('Geçersiz portföy yedek dosyası formatı.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sortedFunds = [...funds].sort((a, b) => {
    const aVal = a.shares * a.currentPrice;
    const bVal = b.shares * b.currentPrice;
    const aCost = a.shares * a.costPrice;
    const bCost = b.shares * b.costPrice;
    const aPnl = aVal - aCost;
    const bPnl = bVal - bCost;
    const aPnlPct = aCost > 0 ? (aPnl / aCost) * 100 : 0;
    const bPnlPct = bCost > 0 ? (bPnl / bCost) * 100 : 0;

    let comp = 0;
    if (sortField === 'value') comp = bVal - aVal;
    else if (sortField === 'pnl') comp = bPnl - aPnl;
    else if (sortField === 'pnlPct') comp = bPnlPct - aPnlPct;
    else if (sortField === 'name') comp = a.code.localeCompare(b.code);

    return sortAsc ? -comp : comp;
  });

  const isPortfolioEmpty = funds.length === 0 && cashTL === 0;

  return (
    <div className="tab-pane active" id="tab-funds">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Portföy Varlıkları & Nakit Yönetimi</h2>
          <p className="tab-sub">Pozisyonlarınızı, birim maliyetlerinizi ve anlık TEFAS kâr/zarar durumunuzu yönetin.</p>
        </div>

        <div className="action-buttons-group">
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
            <span>📜</span> TaxHarvester (%0 Stopaj Kalkanı Aktif)
          </span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Daha önce kaydedilmiş portföy JSON yedeğini yükle"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <Upload size={14} />
            <span>Yedek Yükle</span>
          </button>

          {!isPortfolioEmpty && (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleExportBackup}
                title="Mevcut portföyünüzü JSON olarak bilgisayarınıza indirin"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <Download size={14} />
                <span>Yedek İndir</span>
              </button>

              <button
                className="btn btn-ghost"
                onClick={handleClearPortfolio}
                title="Tüm fonları ve nakit bakiyesini sıfırla"
                style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <RotateCcw size={14} />
                <span>Sıfırla</span>
              </button>
            </>
          )}

          {isPortfolioEmpty && (
            <button
              className="btn btn-ghost"
              onClick={loadDemoPortfolio}
              title="6 Fonluk Örnek Kurumsal Portföy Yükle"
              style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#C7D2FE' }}
            >
              <Sparkles size={14} />
              <span>Örnek Portföy Yükle</span>
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            id="addFundBtn"
          >
            <Plus size={16} />
            <span>Yeni Fon Ekle</span>
          </button>
        </div>
      </div>

      {/* Nakit Yönetimi Kartı */}
      <div className="card cash-management-card">
        <div className="cash-card-header">
          <div className="cash-icon-title">
            <div className="cash-badge-icon">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="cash-title">Serbest Nakit Bakiyesi (TL)</h3>
              <p className="cash-sub">TCMB %37 gecelik faiz getirisi sunan Para Piyasası ve repo mevduatı</p>
            </div>
          </div>
          <div className="cash-current-val">
            <span className="cash-lbl">Mevcut Nakit:</span>
            <strong className="cash-amount">{formatTRY(cashTL)}</strong>
          </div>
        </div>

        <form className="cash-update-form" onSubmit={handleCashUpdate}>
          <div className="cash-input-group">
            <span className="input-prefix">₺</span>
            <input
              type="number"
              step="any"
              className="cash-input"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button type="submit" className="btn btn-secondary update-cash-btn">
            Nakit Güncelle
          </button>
        </form>
      </div>

      {/* Fonlar Tablosu */}
      <div className="card table-card">
        {isPortfolioEmpty ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#818CF8' }}>
              <FolderPlus size={28} />
            </div>
            <h3 style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '1.05rem', marginBottom: '8px' }}>
              Portföyünüz Temiz ve Boş
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.5' }}>
              Yukarıdaki <strong>"Yeni Fon Ekle"</strong> butonuyla kendi TEFAS pozisyonlarınızı tanımlayabilir veya <strong>"Yedek Yükle"</strong> seçeneğiyle daha önce kaydettiğiniz portföyünüzü geri yükleyebilirsiniz.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>İlk Fonu Ekle</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={loadDemoPortfolio}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <Sparkles size={16} />
                <span>Örnek Kurumsal Portföy Yükle</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }} className="sortable-th">
                    Fon Kodu & Adı <ArrowUpDown size={12} />
                  </th>
                  <th>Kategori</th>
                  <th>Adet</th>
                  <th>Maliyet Fiyatı</th>
                  <th>Güncel Fiyat</th>
                  <th onClick={() => { setSortField('value'); setSortAsc(!sortAsc); }} className="sortable-th">
                    Toplam Değer <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => { setSortField('pnl'); setSortAsc(!sortAsc); }} className="sortable-th">
                    Kâr / Zarar <ArrowUpDown size={12} />
                  </th>
                  <th>Vergi Durumu</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {sortedFunds.map((f) => {
                  const curVal = f.shares * f.currentPrice;
                  const costVal = f.shares * f.costPrice;
                  const pnl = curVal - costVal;
                  const pnlPct = costVal > 0 ? (pnl / costVal) * 100 : 0;
                  const isPos = pnl >= 0;
                  const isTaxExempt = f.category.includes('Hisse');

                  return (
                    <tr key={f.code}>
                      <td>
                        <div className="fund-cell">
                          <span className="fund-code-badge">{f.code}</span>
                          <span className="fund-name-text">{f.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-category">{f.category}</span></td>
                      <td className="font-semibold">{f.shares.toLocaleString('tr-TR')}</td>
                      <td>{f.costPrice.toFixed(4)} TL</td>
                      <td className="font-semibold">{f.currentPrice.toFixed(4)} TL</td>
                      <td className="font-bold">{formatTRY(curVal)}</td>
                      <td className={isPos ? 'text-pos font-bold' : 'text-neg font-bold'}>
                        {isPos ? '+' : ''}{formatTRY(pnl)}
                        <span className="pnl-pct"> ({isPos ? '+' : ''}{formatPercent(pnlPct)})</span>
                      </td>
                      <td>
                        <span className={`badge ${isTaxExempt ? 'badge-primary' : 'badge-category'}`} style={{ fontSize: '0.68rem' }}>
                          {isTaxExempt ? '%0 Stopaj (GVK 67)' : '%17.50 Stopaj'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-icon text-neg"
                          onClick={() => handleRemoveFund(f.code, f.name)}
                          title="Fonu Portföyden Çıkar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddFundModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
