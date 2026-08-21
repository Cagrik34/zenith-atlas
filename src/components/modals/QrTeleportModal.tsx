import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { P2pLiveSyncEngine } from '../../engines/P2pLiveSyncEngine';
import { X, QrCode, Copy, Check, Upload, Smartphone, ShieldCheck, Zap } from 'lucide-react';
import QRCode from 'qrcode';

interface QrTeleportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrTeleportModal: React.FC<QrTeleportModalProps> = ({ isOpen, onClose }) => {
  const { activePortfolio, importAccount } = usePortfolio();
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate stable export payload memoized only when portfolio content changes (Zero-flicker key)
  const exportPayload = useMemo(() => {
    return P2pLiveSyncEngine.generateExportPayload(activePortfolio);
  }, [activePortfolio]);

  // Render high-contrast crisp QR Code canvas whenever exportPayload or modal visibility changes
  useEffect(() => {
    if (isOpen && canvasRef.current && exportPayload) {
      QRCode.toCanvas(
        canvasRef.current,
        exportPayload,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        (err) => {
          if (err) {
            console.error('QR code generation error:', err);
          }
        }
      );
    }
  }, [isOpen, exportPayload]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportError('');
      const importedAccount = P2pLiveSyncEngine.parseImportPayload(importText);
      if (importedAccount && importedAccount.funds && importedAccount.funds.length > 0) {
        importAccount(importedAccount);
        setImportSuccess(true);
        setTimeout(() => {
          setImportSuccess(false);
          setImportText('');
          onClose();
        }, 1200);
      } else {
        setImportError('Portföy içinde geçerli fon bulunamadı.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Geçersiz veya bozuk ışınlama anahtarı.');
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-md" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <QrCode size={22} className="text-accent" />
            <h3 className="modal-title">P2P Mobil Işınlama & QR Teleport</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="teleport-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0 8px' }}>
          {/* QR Code Container */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'inline-block' }}>
              <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.84rem', fontWeight: 600 }}>
              <Smartphone size={16} />
              <span>Telefonunuzun kamerası ile okutun</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Mobil tarayıcınızdaki Zenith Atlas'a portföyünüzü sıfır-bilgi (zero-knowledge) şifrelemeyle saniyesinde aktarır.
            </p>
          </div>

          {/* Stable Key Copy Box */}
          <div className="card" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} className="text-pos" />
                <span>Sabit Şifreli Işınlama Anahtarı (Base64)</span>
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {copied ? <Check size={14} className="text-pos" /> : <Copy size={14} />}
                <span>{copied ? 'Kopyalandı!' : 'Anahtarı Kopyala'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={exportPayload}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                resize: 'none',
                wordBreak: 'break-all'
              }}
              rows={2}
            />
          </div>

          {/* Import Section */}
          <form onSubmit={handleImport} className="card" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} className="text-accent" />
              <span>Teleport Anahtarı İle İçe Aktar</span>
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Başka cihazdan kopyalanan anahtarı buraya yapıştırın..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="form-input"
                style={{ flex: 1, fontSize: '0.78rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={15} />
                <span>{importSuccess ? 'İçe Aktarıldı! ✅' : 'Işınla'}</span>
              </button>
            </div>
            {importError && <p style={{ margin: '6px 0 0', color: '#EF4444', fontSize: '0.74rem' }}>{importError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};
