import React, { useRef, useEffect, useState, memo } from 'react';
import { useMarket } from '../../context/MarketContext';

interface TickerItemData {
  key: string;
  code: string;
  name: string;
  rate: number;
  changePct: number;
  unit: string;
}

// Performans Optimize Edilmiş & Canlı Renk Dalgası Destekli Ticker Elemanı
const TickerItem: React.FC<{ item: TickerItemData }> = memo(({ item }) => {
  const prevRateRef = useRef<number>(item.rate);
  const [flashClass, setFlashClass] = useState<string>('');

  useEffect(() => {
    if (prevRateRef.current !== item.rate && prevRateRef.current > 0) {
      if (item.rate > prevRateRef.current) {
        setFlashClass('price-flash-up');
      } else if (item.rate < prevRateRef.current) {
        setFlashClass('price-flash-down');
      }

      prevRateRef.current = item.rate;

      const timer = setTimeout(() => {
        setFlashClass('');
      }, 1400);

      return () => clearTimeout(timer);
    } else {
      prevRateRef.current = item.rate;
    }
  }, [item.rate]);

  const isPos = item.changePct > 0;
  const isNeg = item.changePct < 0;
  const changeClass = isPos ? 'pos' : isNeg ? 'neg' : 'zero';
  const sign = isPos ? '+' : '';

  return (
    <div className={`ticker-item ${flashClass}`}>
      <span className="ticker-symbol">{item.code}:</span>
      <span className="ticker-price">
        {item.unit === 'TL' ? `₺${item.rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` :
         item.unit === '$' ? `$${item.rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
         item.rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className={`ticker-change ${changeClass}`}>
        {sign}%{Math.abs(item.changePct).toFixed(2)}
      </span>
    </div>
  );
});

TickerItem.displayName = 'TickerItem';

export const TerminalTicker: React.FC = () => {
  const { instruments, marketData, isSocketConnected } = useMarket();

  // Canlı WebSocket ve Piyasa Enstrümanları Listesi (Stabil Reaktif Akış)
  const liveList: TickerItemData[] = React.useMemo(() => {
    const baseItems = [
      { key: 'USD', code: 'USD/TRY', name: 'Amerikan Doları', rate: 48.1110, changePct: 0.12, unit: 'TL' },
      { key: 'EUR', code: 'EUR/TRY', name: 'Euro', rate: 56.0560, changePct: 0.25, unit: 'TL' },
      { key: 'GBP', code: 'GBP/TRY', name: 'İngiliz Sterlini', rate: 65.7986, changePct: 0.18, unit: 'TL' },
      { key: 'GA', code: 'Gram Altın', name: '24 Ayar Gram Altın', rate: 6981.16, changePct: 0.65, unit: 'TL' },
      { key: 'XAU/USD', code: 'Ons Altın', name: 'Spot Ons Altın', rate: 4520.00, changePct: 0.53, unit: '$' },
      { key: 'XU100', code: 'BIST 100', name: 'BIST 100 Endeksi', rate: 14396.54, changePct: -0.43, unit: 'Puan' },
      { key: 'GAG', code: 'Gümüş/TL', name: 'Gümüş Gram', rate: 98.40, changePct: 0.85, unit: 'TL' },
      { key: 'BTC', code: 'BTC/USD', name: 'Bitcoin', rate: 64250.00, changePct: 2.10, unit: '$' }
    ];

    return baseItems.map(item => {
      const live = instruments[item.key] || instruments[item.code];
      if (live && live.selling > 0) {
        return {
          ...item,
          rate: live.selling,
          changePct: live.changePct !== undefined ? live.changePct : item.changePct
        };
      }
      return item;
    });
  }, [instruments, marketData]);

  // Kesintisiz Sonsuz Döngü İçin Çift Liste
  const trackItems = React.useMemo(() => {
    return [...liveList, ...liveList];
  }, [liveList]);

  return (
    <div className="terminal-ticker-bar" id="terminalTickerBar">
      <div className="ticker-countdown-badge" id="tefasCountdownBadge">
        <span className={`ticker-pulse-dot ${isSocketConnected ? 'connected' : ''}`}></span>
        <span className="ticker-countdown-text">
          {isSocketConnected ? 'CANLI' : 'PİYASA'}
        </span>
      </div>

      <div className="ticker-track-wrapper">
        <div className="ticker-track" id="tickerTrack">
          {trackItems.map((item, idx) => (
            <TickerItem
              key={`${item.key}-${idx < liveList.length ? 'a' : 'b'}`}
              item={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
