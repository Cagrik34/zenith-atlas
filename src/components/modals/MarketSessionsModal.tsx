import React, { useState, useEffect } from 'react';
import type { MarketSession } from '../../types/market';
import { X, Globe, Clock } from 'lucide-react';

interface MarketSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSessionsModal: React.FC<MarketSessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<MarketSession[]>([]);

  useEffect(() => {
    // 2026 Dünya Borsaları & TEFAS Seans Durumları
    const updateSessions = () => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();
      const timeNum = hour * 100 + min;

      const isBistOpen = timeNum >= 1000 && timeNum <= 1810;
      const isTefasOpen = timeNum >= 1000 && timeNum <= 1815;
      const isUsOpen = timeNum >= 1630 && timeNum <= 2300;
      const isLondonOpen = timeNum >= 1000 && timeNum <= 1830;
      const isTokyoOpen = timeNum >= 300 && timeNum <= 930;

      const list: MarketSession[] = [
        {
          id: 'tefas',
          name: 'TEFAS Fon Piyasası',
          icon: '🏛',
          status: isTefasOpen ? 'Seans Açık' : 'Seans Kapalı (Gün Sonu)',
          badgeClass: isTefasOpen ? 'open' : 'closed',
          hours: '10:00 - 18:15 TSİ',
          countdown: isTefasOpen ? 'Kapanışa Var' : 'Yarın 10:00',
          isImportant: true,
          desc: 'Fon alım/satım ve T+0 valörlü para piyasası fonu işlem seansı.'
        },
        {
          id: 'bist',
          name: 'Borsa İstanbul (BIST)',
          icon: '🇹🇷',
          status: isBistOpen ? 'Sürekli Müzayede Açık' : 'Seans Kapalı',
          badgeClass: isBistOpen ? 'open' : 'closed',
          hours: '10:00 - 18:10 TSİ',
          countdown: isBistOpen ? 'Kapanış: 18:10' : 'Açılış: 10:00',
          isImportant: true,
          desc: 'BIST 100, BIST 30 ve Vadeli İşlem (VİOP) pay piyasası.'
        },
        {
          id: 'nyse',
          name: 'New York (NYSE / NASDAQ)',
          icon: '🇺🇸',
          status: isUsOpen ? 'Canlı İşlem Açık' : 'Kapalı',
          badgeClass: isUsOpen ? 'open' : 'closed',
          hours: '16:30 - 23:00 TSİ',
          countdown: isUsOpen ? 'Kapanış: 23:00' : 'Açılış: 16:30',
          isImportant: true,
          desc: 'S&P 500, Nasdaq ve AFT fonunun dayanak ABD teknoloji hisseleri.'
        },
        {
          id: 'lse',
          name: 'Londra (LSE / Spot Altın)',
          icon: '🇬🇧',
          status: isLondonOpen ? 'Açık' : 'Kapalı',
          badgeClass: isLondonOpen ? 'open' : 'closed',
          hours: '10:00 - 18:30 TSİ',
          countdown: isLondonOpen ? 'Kapanış: 18:30' : 'Açılış: 10:00',
          isImportant: false,
          desc: 'LBMA Spot Altın sabitleme seansı ve FTSE 100 endeksi.'
        },
        {
          id: 'crypto',
          name: 'Kripto Para Piyasaları',
          icon: '🌐',
          status: '7/24 Kesintisiz Canlı',
          badgeClass: 'open',
          hours: '7 Gün 24 Saat',
          countdown: 'Sürekli Açık',
          isImportant: false,
          desc: 'Bitcoin, Ethereum ve küresel dijital varlık akışı.'
        }
      ];

      setSessions(list);
    };

    updateSessions();
    const interval = setInterval(updateSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <div className="modal-title-group">
            <Globe size={20} className="text-accent" />
            <h3 className="modal-title">Dünya Borsaları & TEFAS Seans Takvimi</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="sessions-grid">
          {sessions.map(s => (
            <div key={s.id} className="session-card card">
              <div className="session-card-header">
                <span className="session-icon">{s.icon}</span>
                <div className="session-info-col">
                  <h4 className="session-name">{s.name}</h4>
                  <span className="session-hours">{s.hours}</span>
                </div>
                <span className={`session-badge badge-${s.badgeClass}`}>{s.status}</span>
              </div>
              <p className="session-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
