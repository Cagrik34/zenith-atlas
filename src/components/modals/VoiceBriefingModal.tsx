import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useMarket } from '../../context/MarketContext';
import { VoiceBriefingEngine } from '../../engines/VoiceBriefingEngine';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { X, Play, Square, Volume2, Sparkles } from 'lucide-react';

interface VoiceBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceBriefingModal: React.FC<VoiceBriefingModalProps> = ({ isOpen, onClose }) => {
  const { funds, cashTL } = usePortfolio();
  const { marketData } = useMarket();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scriptText, setScriptText] = useState<string>('');

  const ff = FactorAttributionEngine.calculate(funds);

  useEffect(() => {
    if (isOpen) {
      const generated = VoiceBriefingEngine.generateScript(funds, cashTL, marketData, ff.jensensAlpha);
      setScriptText(generated);
    } else {
      VoiceBriefingEngine.stop();
      setIsPlaying(false);
    }
  }, [isOpen, funds, cashTL, marketData, ff.jensensAlpha]);

  if (!isOpen) return null;

  const togglePlayback = () => {
    if (isPlaying) {
      VoiceBriefingEngine.stop();
      setIsPlaying(false);
    } else {
      VoiceBriefingEngine.speak(
        scriptText,
        () => setIsPlaying(true),
        () => setIsPlaying(false),
        () => setIsPlaying(false)
      );
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-md">
        <div className="modal-header">
          <div className="modal-title-group">
            <Volume2 size={20} className="text-accent" />
            <h3 className="modal-title">Zenith Voice AI — Türkçe Sabah Bülteni</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="voice-player-container">
          <div className="waveform-visualizer">
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
            <div className={`waveform-bar ${isPlaying ? 'active' : ''}`}></div>
          </div>

          <div className="voice-controls-row">
            <button
              className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'} voice-play-btn`}
              onClick={togglePlayback}
            >
              {isPlaying ? <Square size={18} /> : <Play size={18} />}
              <span>{isPlaying ? 'Durdur' : 'Bülteni Seslendir'}</span>
            </button>
          </div>

          <div className="voice-script-box">
            <h4 className="script-title">Seslendirilecek Bülten Metni:</h4>
            <p className="script-content" style={{ whiteSpace: 'pre-line' }}>{scriptText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
