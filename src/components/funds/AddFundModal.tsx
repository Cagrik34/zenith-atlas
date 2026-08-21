import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { X, Plus, DollarSign, Sparkles, CheckCircle2, Search, Building2, Tag, Layers } from 'lucide-react';
import type { TefasFund } from '../../types/tefas';
import initialFundsData from '../../data/funds_db.json';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function normalizeFundCode(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
}

export const AddFundModal: React.FC<AddFundModalProps> = ({ isOpen, onClose }) => {
  const { addFund } = usePortfolio();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hisse Senedi');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [matchedFund, setMatchedFund] = useState<TefasFund | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Raw funds array from bundled 1,051 TEFAS database
  const [rawFundsList, setRawFundsList] = useState<TefasFund[]>(() => {
    const raw = initialFundsData as any;
    return (raw.funds || (Array.isArray(raw) ? raw : [])) as TefasFund[];
  });

  // Fast O(1) Lookup Map
  const fundsDbMap = useMemo(() => {
    const map: Record<string, TefasFund> = {};
    rawFundsList.forEach(f => {
      if (f.code) {
        map[normalizeFundCode(f.code)] = f;
        map[f.code.toUpperCase()] = f;
      }
    });
    return map;
  }, [rawFundsList]);

  // Dynamic refresh with relative base URL
  useEffect(() => {
    const loadDb = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        let res = await fetch(`${cleanBase}data/funds_db.json?t=${Date.now()}`);
        if (!res.ok) res = await fetch('data/funds_db.json?t=' + Date.now());
        if (res && res.ok) {
          const raw = await res.json();
          const list: TefasFund[] = raw.funds || (Array.isArray(raw) ? raw : []);
          if (list.length > 0) {
            setRawFundsList(list);
          }
        }
      } catch (e) {
        console.warn('funds_db fallback notice in AddFundModal:', e);
      }
    };
    loadDb();
  }, []);

  // Filtered live suggestions for instant search
  const suggestions = useMemo(() => {
    const query = code.trim().toLowerCase();
    if (!query || query.length === 0) return [];
    
    const normQuery = normalizeFundCode(query).toLowerCase();
    return rawFundsList
      .filter(f => {
        const fCode = f.code.toLowerCase();
        const fName = (f.name || f.title || '').toLowerCase();
        const fNorm = normalizeFundCode(f.code).toLowerCase();
        return fCode.startsWith(query) || fNorm.startsWith(normQuery) || fCode.includes(query) || fName.includes(query);
      })
      .slice(0, 6);
  }, [code, rawFundsList]);

  // Apply selected fund to all form fields
  const applyFund = (fund: TefasFund) => {
    const upperCode = fund.code.toUpperCase();
    setCode(upperCode);
    setMatchedFund(fund);
    setName(fund.title || fund.name || `${upperCode} Fonu`);
    setCategory(fund.category || 'Hisse Senedi');
    setCostPrice(fund.price.toFixed(6));
    setShowSuggestions(false);
  };

  // Auto-lookup TEFAS database on code change
  const handleCodeChange = (rawVal: string) => {
    const val = rawVal.toUpperCase();
    setCode(val);
    setShowSuggestions(true);

    const norm = normalizeFundCode(val);
    const found = fundsDbMap[norm] || fundsDbMap[val];

    if (found) {
      setMatchedFund(found);
      setName(found.title || found.name || `${val} Fonu`);
      setCategory(found.category || 'Hisse Senedi');
      if (!costPrice || (matchedFund && costPrice === matchedFund.price.toFixed(6))) {
        setCostPrice(found.price.toFixed(6));
      }
    } else {
      setMatchedFund(null);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !shares || !costPrice) return;

    const currentOfficialPrice = matchedFund?.price || parseFloat(costPrice) || 1.0;

    addFund({
      code: code.trim().toUpperCase(),
      name: name.trim() || `${code.toUpperCase()} Fonu`,
      category,
      shares: parseFloat(shares) || 0,
      costPrice: parseFloat(costPrice) || 0,
      currentPrice: currentOfficialPrice,
      performance1Y: matchedFund?.performance1Y || 65.0,
      ter: matchedFund?.managementFee || 2.0
    });

    setCode('');
    setName('');
    setShares('');
    setCostPrice('');
    setMatchedFund(null);
    onClose();
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-md" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Plus size={20} className="modal-header-icon" />
            <h3 className="modal-title">Portföye Yeni TEFAS Fonu Ekle</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TEFAS Fon Kodu + Canlı Öneri Listesi */}
          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TEFAS Fon Kodu *</span>
              <span style={{ fontSize: '0.70rem', color: '#10B981', fontWeight: 500 }}>
                1.051 Fon Otomatik Tanıma Aktif
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: AAL, MAC, TI3, AFT, KZL, IIH, TCD, BIO..."
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                required
                autoComplete="off"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
              />
              {code && (
                <button
                  type="button"
                  onClick={() => { setCode(''); setMatchedFund(null); setName(''); setCostPrice(''); }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 999,
                background: '#0F172A',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '8px',
                marginTop: '4px',
                maxHeight: '220px',
                overflowY: 'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}>
                {suggestions.map(s => (
                  <div
                    key={s.code}
                    onClick={() => applyFund(s)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span className="fund-code-badge" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{s.code}</span>
                      <span style={{ fontSize: '0.76rem', color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {s.name || s.title}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10B981' }}>
                        ₺{s.price.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Matched Fund Verified Banner */}
            {matchedFund && (
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <CheckCircle2 size={14} />
                <span>TEFAS Takasbank Fiyatı: <strong>{matchedFund.price.toFixed(6)} TL</strong> • Kategori: <strong>{matchedFund.category}</strong></span>
              </div>
            )}
          </div>

          {/* Fon Adı (Otomatik Gelir / Düzenlenebilir) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Fon Adı</span>
              {matchedFund && <span style={{ fontSize: '0.68rem', color: '#818CF8' }}>Otomatik Dolduruldu ✨</span>}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: ATA Portföy İkinci Hisse Senedi Fonu"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Fon Kategorisi (Otomatik Seçilir) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Fon Kategorisi</span>
              {matchedFund && <span style={{ fontSize: '0.68rem', color: '#818CF8' }}>Otomatik Seçildi ✨</span>}
            </label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Hisse Senedi Yoğun">Hisse Senedi Yoğun Fon (%0 Stopaj)</option>
              <option value="Hisse Senedi">Hisse Senedi Fonu</option>
              <option value="Değişken Fon">Değişken Fon</option>
              <option value="Fon Sepeti">Fon Sepeti Fonu</option>
              <option value="Altın Fonu">Altın Fonu (Kıymetli Madenler)</option>
              <option value="Altın Katılım">Altın Katılım Fonu</option>
              <option value="Borçlanma Araçları">Borçlanma Araçları (Tahvil/Eurobond)</option>
              <option value="Para Piyasası">Para Piyasası (Likit TL)</option>
              <option value="Katılım Para Piyasası">Katılım Para Piyasası</option>
              <option value="Karma Fon">Karma Fon</option>
              <option value="Yabancı Hisse">Yabancı Hisse Senedi</option>
              <option value="Enerji">Enerji Fonu</option>
              <option value="Serbest Fon">Serbest Fon</option>
              <option value="Serbest (Döviz)">Serbest Fon (Döviz)</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          {/* Pay Adedi & Birim Alış Maliyeti */}
          <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Alınan Pay Adedi *</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Örn: 10000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Alış Fiyatı (TL) *</span>
                {matchedFund && <span style={{ fontSize: '0.66rem', color: '#10B981' }}>Takasbank</span>}
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Örn: 0.7500"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} />
              <span>Portföye Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
