import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { X, Plus, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';
import type { TefasFund } from '../../types/tefas';
import initialFundsData from '../../data/funds_db.json';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundModal: React.FC<AddFundModalProps> = ({ isOpen, onClose }) => {
  const { addFund } = usePortfolio();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hisse Senedi');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [fundsDb, setFundsDb] = useState<Record<string, TefasFund>>(() => {
    const raw = initialFundsData as any;
    const list: TefasFund[] = raw.funds || (Array.isArray(raw) ? raw : []);
    const map: Record<string, TefasFund> = {};
    list.forEach(f => {
      map[f.code.toUpperCase()] = f;
    });
    return map;
  });
  const [matchedFund, setMatchedFund] = useState<TefasFund | null>(null);

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
            const map: Record<string, TefasFund> = {};
            list.forEach(f => {
              map[f.code.toUpperCase()] = f;
            });
            setFundsDb(map);
          }
        }
      } catch (e) {
        console.warn('funds_db fallback notice in AddFundModal:', e);
      }
    };
    loadDb();
  }, []);

  // Auto-lookup TEFAS database on code change
  const handleCodeChange = (rawCode: string) => {
    const upper = rawCode.trim().toUpperCase();
    setCode(upper);

    if (fundsDb[upper]) {
      const found = fundsDb[upper];
      setMatchedFund(found);
      setName(found.title || found.name || `${upper} Fonu`);
      setCategory(found.category || 'Hisse Senedi');
      if (!costPrice) {
        setCostPrice(found.price.toFixed(6));
      }
    } else {
      setMatchedFund(null);
    }
  };

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
      <div className="modal-content modal-md">
        <div className="modal-header">
          <div className="modal-title-group">
            <Plus size={20} className="modal-header-icon" />
            <h3 className="modal-title">Portföye Yeni TEFAS Fonu Ekle</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">TEFAS Fon Kodu *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: MAC, TI3, KZL, AFT, IIH, BIO"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              required
              maxLength={6}
            />
            {matchedFund && (
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} />
                <span>Takasbank TEFAS Resmi Fiyatı: <strong>{matchedFund.price.toFixed(6)} TL</strong> ({matchedFund.category})</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Fon Adı</label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: Marmara Capital Hisse Senedi Fonu"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fon Kategorisi</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Hisse Senedi Yoğun">Hisse Senedi Yoğun Fon (%0 Stopaj)</option>
              <option value="Hisse Senedi">Hisse Senedi Fonu</option>
              <option value="Değişken">Değişken Fon</option>
              <option value="Fon Sepeti">Fon Sepeti Fonu</option>
              <option value="Kıymetli Madenler">Kıymetli Madenler (Altın/Gümüş)</option>
              <option value="Borçlanma Araçları">Borçlanma Araçları (Tahvil/Eurobond)</option>
              <option value="Para Piyasası">Para Piyasası (Likit TL)</option>
              <option value="Katılım">Katılım (Faizsiz) Fonu</option>
              <option value="Serbest Fon">Serbest Fon</option>
            </select>
          </div>

          <div className="form-row-2">
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Birim Alış Maliyeti (TL) *</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Örn: 0.7500"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} />
              <span>Portföye Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
