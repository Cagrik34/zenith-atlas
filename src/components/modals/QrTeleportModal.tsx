import React, { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { P2pLiveSyncEngine } from '../../engines/P2pLiveSyncEngine';
import { X, QrCode, Copy, Check, Download, Upload } from 'lucide-react';

interface QrTeleportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrTeleportModal: React.FC<QrTeleportModalProps> = ({ isOpen, onClose }) => {
  const { activePortfolio, syncLivePrices } = usePortfolio();
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  const exportPayload = P2pLiveSyncEngine.generateExportPayload(activePortfolio);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportError('');
      const data = P2pLiveSyncEngine.parseImportPayload(importText);
      if (data && data.funds) {
        alert('Portföy başarıyla içe aktarıldı ve senkronize edildi!');
        onClose();
      }
    } catch (err: any) {
      setImportError(err.message || 'Geçersiz anahtar.');
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-md">
        <div className="modal-header">
          <div className="modal-title-group">
            <QrCode size={20} className="text-accent" />
            <h3 className="modal-title">P2P Mobil Işınlama & QR Teleport</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="teleport-body">
          <div className="teleport-qr-card card">
            <p className="qr-desc">
              Aşağıdaki şifreli anahtarı kopyalayarak mobil cihazınızdaki Zenith Atlas'a tek saniyede portföyünüzü ışınlayabilirsiniz:
            </p>

            <div className="qr-key-box">
              <textarea
                readOnly
                value={exportPayload}
                className="qr-key-textarea"
                rows={3}
              />
              <button className="btn btn-secondary copy-btn" onClick={handleCopy}>
                {copied ? <Check size={16} className="text-pos" /> : <Copy size={16} />}
                <span>{copied ? 'Kopyalandı!' : 'Anahtarı Kopyala'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleImport} className="import-box card mt-3">
            <h4 className="import-title">Teleport Anahtarı İle İçe Aktar</h4>
            <input
              type="text"
              placeholder="Mobilden veya başka cihazdan kopyalanan anahtarı buraya yapıştırın..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="form-input"
            />
            {importError && <p className="text-neg text-sm mt-1">{importError}</p>}
            <button type="submit" className="btn btn-primary mt-2">
              <Upload size={16} />
              <span>İçe Aktar & Senkronize Et</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
