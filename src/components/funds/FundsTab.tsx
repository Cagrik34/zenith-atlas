import React, { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { AddFundModal } from './AddFundModal';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Plus, Trash2, Edit3, DollarSign, ArrowUpDown } from 'lucide-react';

export const FundsTab: React.FC = () => {
  const { funds, cashTL, setCashTL, removeFund, totalFundValue, totalPortfolioValue } = usePortfolio();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashTL));
  const [sortField, setSortField] = useState<'value' | 'pnl' | 'pnlPct' | 'name'>('value');
  const [sortAsc, setSortAsc] = useState(false);

  const handleCashUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput) || 0;
    setCashTL(val);
  };

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

        <div className="action-buttons-row">
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
        </div>
      </div>

      <div className="card table-card">
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
                        title="Fonı Portföyden Çıkar"
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
      </div>

      <AddFundModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
