import React, { useState, useEffect, useMemo } from 'react';
import type { TefasFund } from '../../types/tefas';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Search, Filter, Plus, ArrowUpDown, TrendingUp } from 'lucide-react';

export const FundSearchTab: React.FC = () => {
  const { addFund } = usePortfolio();
  const [fundsDb, setFundsDb] = useState<TefasFund[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortField, setSortField] = useState<'daily' | '1y' | 'size' | 'name'>('1y');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const loadDb = async () => {
      try {
        let res = await fetch('/data/funds_db.json?t=' + Date.now());
        if (!res.ok) res = await fetch('src/data/funds_db.json?t=' + Date.now());
        if (res && res.ok) {
          const raw = await res.json();
          const list = raw.funds || (Array.isArray(raw) ? raw : []);
          setFundsDb(list);
        }
      } catch (e) {
        console.warn('funds_db load error:', e);
      }
    };
    loadDb();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    fundsDb.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set).sort();
  }, [fundsDb]);

  const filteredFunds = useMemo(() => {
    return fundsDb.filter(f => {
      const matchSearch = searchTerm === '' ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'daily') comp = (b.dailyReturnPct || 0) - (a.dailyReturnPct || 0);
      else if (sortField === '1y') comp = (b.performance1Y || 0) - (a.performance1Y || 0);
      else if (sortField === 'size') comp = (b.portfolioSize || 0) - (a.portfolioSize || 0);
      else if (sortField === 'name') comp = a.code.localeCompare(b.code);
      return sortAsc ? -comp : comp;
    });
  }, [fundsDb, searchTerm, selectedCategory, sortField, sortAsc]);

  const handleQuickAdd = (fund: TefasFund) => {
    addFund({
      code: fund.code,
      name: fund.name,
      category: fund.category,
      shares: 1000,
      costPrice: fund.price,
      performance1Y: fund.performance1Y || 65.0,
      ter: fund.managementFee || 2.0
    });
  };

  return (
    <div className="tab-pane active" id="tab-add-fund">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>1.051 TEFAS Fonu Filtreleme & Arama Masası</h2>
          <p className="tab-sub">Tüm resmi TEFAS fonlarını getiri, kategori, fon büyüklüğü ve risk skoruna göre filtreleyin.</p>
        </div>

        <div className="screener-count-badge">
          Toplam <strong>{filteredFunds.length}</strong> / {fundsDb.length} Fon Listeleniyor
        </div>
      </div>

      <div className="screener-filter-bar card">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Fon Kodu veya Adı Ara (Örn: MAC, TI3, AFT, Altın, Teknoloji)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-select-wrapper">
          <Filter size={16} className="filter-icon" />
          <select
            className="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">Tüm Kategoriler ({fundsDb.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }} className="sortable-th">
                  Fon Kodu & Adı <ArrowUpDown size={12} />
                </th>
                <th>Kategori</th>
                <th>Birim Fiyat</th>
                <th onClick={() => { setSortField('daily'); setSortAsc(!sortAsc); }} className="sortable-th">
                  Günlük Getiri <ArrowUpDown size={12} />
                </th>
                <th onClick={() => { setSortField('1y'); setSortAsc(!sortAsc); }} className="sortable-th">
                  1 Yıllık Getiri <ArrowUpDown size={12} />
                </th>
                <th onClick={() => { setSortField('size'); setSortAsc(!sortAsc); }} className="sortable-th">
                  Fon Büyüklüğü <ArrowUpDown size={12} />
                </th>
                <th>Yönetim Ücreti</th>
                <th>Portföye Ekle</th>
              </tr>
            </thead>
            <tbody>
              {filteredFunds.slice(0, 100).map(f => {
                const isDailyPos = (f.dailyReturnPct || 0) >= 0;
                const is1YPos = (f.performance1Y || 0) >= 0;

                return (
                  <tr key={f.code}>
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge">{f.code}</span>
                        <span className="fund-name-text">{f.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-category">{f.category}</span></td>
                    <td className="font-semibold">{f.price.toFixed(4)} TL</td>
                    <td className={isDailyPos ? 'text-pos font-semibold' : 'text-neg font-semibold'}>
                      {formatPercent(f.dailyReturnPct || 0)}
                    </td>
                    <td className={is1YPos ? 'text-pos font-semibold' : 'text-neg font-semibold'}>
                      {formatPercent(f.performance1Y || 0)}
                    </td>
                    <td>
                      {f.portfolioSize ? `₺${(f.portfolioSize / 1e6).toFixed(1)}M` : '-'}
                    </td>
                    <td>%{f.managementFee?.toFixed(2) || '2.00'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary add-quick-btn"
                        onClick={() => handleQuickAdd(f)}
                        title="Portföye Hızlı Ekle (1000 Adet)"
                      >
                        <Plus size={14} />
                        <span>Ekle</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
