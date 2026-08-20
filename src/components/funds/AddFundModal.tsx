import React, { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { X, Plus, DollarSign } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !shares || !costPrice) return;

    addFund({
      code: code.trim().toUpperCase(),
      name: name.trim() || `${code.toUpperCase()} Fonu`,
      category,
      shares: parseFloat(shares) || 0,
      costPrice: parseFloat(costPrice) || 0,
      performance1Y: 65.0,
      ter: 2.0
    });

    setCode('');
    setName('');
    setShares('');
    setCostPrice('');
    onClose();
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-md">
        <div className="modal-header">
          <div className="modal-title-group">
            <Plus size={20} className="modal-header-icon" />
            <h3 className="modal-title">Portföye Yeni Fon / Varlık Ekle</h3>
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
              placeholder="Örn: MAC, TI3, KZL, AFT"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
            />
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
              <option value="Hisse Senedi">Hisse Senedi Yoğun Fon</option>
              <option value="Değişken">Değişken Fon</option>
              <option value="Fon Sepeti">Fon Sepeti Fonu</option>
              <option value="Kıymetli Madenler">Kıymetli Madenler (Altın/Gümüş)</option>
              <option value="Borçlanma Araçları">Borçlanma Araçları (Tahvil/Eurobond)</option>
              <option value="Para Piyasası">Para Piyasası (Likit TL)</option>
              <option value="Katılım">Katılım (Faizsiz) Fonu</option>
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
