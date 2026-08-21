import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { P2pLiveSyncEngine } from '../../engines/P2pLiveSyncEngine';
import { X, QrCode, Copy, Check, Upload, Smartphone, ShieldCheck, Zap, RefreshCw, Globe, KeyRound, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

interface QrTeleportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GITHUB_PAGES_LIVE_URL = 'https://cagrik34.github.io/zenith-atlas';

export const QrTeleportModal: React.FC<QrTeleportModalProps> = ({ isOpen, onClose }) => {
  const { activePortfolio, importAccount } = usePortfolio();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [salt, setSalt] = useState<number>(0);
  const [qrMode, setQrMode] = useState<'URL' | 'RAW'>('URL');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate session-fresh raw export payload
  const rawPayload = useMemo(() => {
    return P2pLiveSyncEngine.generateExportPayload(activePortfolio, salt || undefined);
  }, [activePortfolio, salt]);

  // Generate web deep-link URL (If running on localhost, intelligently uses the live GitHub Pages domain so mobile phones connect seamlessly from anywhere!)
  const teleportUrl = useMemo(() => {
    if (typeof window === 'undefined') return `${GITHUB_PAGES_LIVE_URL}/#import=${rawPayload}`;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? GITHUB_PAGES_LIVE_URL : `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`;
    return `${baseUrl}/#import=${rawPayload}`;
  }, [rawPayload]);

  const qrDataToEncode = qrMode === 'URL' ? teleportUrl : rawPayload;

  // Render high-contrast crisp QR Code canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && qrDataToEncode) {
      QRCode.toCanvas(
        canvasRef.current,
        qrDataToEncode,
        {
          width: 210,
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
  }, [isOpen, qrDataToEncode]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(rawPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(teleportUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateKey = () => {
    setSalt(Date.now());
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportError('');
      let text = importText.trim();
      if (text.includes('#import=')) {
        text = text.split('#import=')[1];
      } else if (text.includes('import=')) {
        text = new URLSearchParams(text.split('?')[1] || text).get('import') || text;
      }

      const importedAccount = P2pLiveSyncEngine.parseImportPayload(text);
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
      <div className="modal-content modal-md" style={{ maxWidth: '540px' }}>
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
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', gap: '4px' }}>
            <button
              className={`btn btn-sm ${qrMode === 'URL' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setQrMode('URL')}
              style={{ flex: 1, fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Globe size={14} />
              <span>🌐 Canlı Web Linki (GitHub Pages)</span>
            </button>
            <button
              className={`btn btn-sm ${qrMode === 'RAW' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setQrMode('RAW')}
              style={{ flex: 1, fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <KeyRound size={14} />
              <span>🔑 Ham Anahtar Modu (Safe)</span>
            </button>
          </div>

          {/* QR Code Container */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '18px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'inline-block' }}>
              <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.84rem', fontWeight: 600 }}>
              <Smartphone size={16} />
              <span>
                {qrMode === 'URL' ? 'Telefonunuzun kamerası ile okutup çıkan canlı linke tıklayın' : 'Ham anahtarı mobildeki terminale yapıştırın'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.4 }}>
              {qrMode === 'URL' 
                ? 'Telefon kamerası doğrudan resmi GitHub Pages canlı sitesini açar; portföyünüz saniyesinde mobilde açılır.'
                : 'Mobilde veya başka bir tarayıcıda açık olan Zenith Atlas terminaline yapıştırarak doğrudan içe aktarın.'}
            </p>
          </div>

          {/* Stable Session Key & Link Copy Box */}
          <div className="card" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} className="text-pos" />
                <span>Işınlama Verisi ({activePortfolio.funds.length} Fon)</span>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleRegenerateKey} title="Yeni Oturum Anahtarı Üret" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>
                  <RefreshCw size={13} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyLink} title="Işınlama Linkini Kopyala" style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {copiedLink ? <Check size={14} className="text-pos" /> : <Globe size={14} />}
                  <span>{copiedLink ? 'Link Kopyalandı!' : 'Canlı Linki Kopyala'}</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyKey} title="Ham Anahtarı Kopyala" style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {copied ? <Check size={14} className="text-pos" /> : <Copy size={14} />}
                  <span>{copied ? 'Kopyalandı!' : 'Ham Anahtarı Kopyala'}</span>
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={qrDataToEncode}
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
              <span>Teleport Anahtarı / Link İle İçe Aktar</span>
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Mobilden veya başka cihazdan kopyalanan anahtar veya linki buraya yapıştırın..."
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
