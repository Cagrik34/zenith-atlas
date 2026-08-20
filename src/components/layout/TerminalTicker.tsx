import React from 'react';
import { useMarket } from '../../context/MarketContext';
import { formatTRY, formatPercent } from '../../utils/formatters';

export const TerminalTicker: React.FC = () => {
  const { marketData, instruments } = useMarket();

  const featuredList: any[] = React.useMemo(() => {
    const list = marketData?.categories?.featured;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    if (Object.keys(instruments).length > 0) {
      return Object.values(instruments).slice(0, 10);
    }
    return [
      { key: 'USD', code: 'USD/TRY', name: 'Amerikan Doları', rate: 48.1110, changePct: 0.12, unit: 'TL', source: 'Serbest Piyasa', buying: 48.10, selling: 48.1110 },
      { key: 'EUR', code: 'EUR/TRY', name: 'Euro', rate: 56.0560, changePct: 0.25, unit: 'TL', source: 'Serbest Piyasa', buying: 56.04, selling: 56.0560 },
      { key: 'GBP', code: 'GBP/TRY', name: 'İngiliz Sterlini', rate: 65.7986, changePct: 0.18, unit: 'TL', source: 'Serbest Piyasa', buying: 65.75, selling: 65.7986 },
      { key: 'GA', code: 'Gram Altın', name: '24 Ayar Gram Altın', rate: 6981.16, changePct: 0.65, unit: 'TL', source: 'Harem Altın', buying: 6980.0, selling: 6981.16 },
      { key: 'XAU', code: 'Ons Altın', name: 'Spot Ons Altın', rate: 4520.00, changePct: 0.53, unit: '$', source: 'LBMA', buying: 4518.0, selling: 4520.00 },
      { key: 'XU100', code: 'BIST 100', name: 'BIST 100 Endeksi', rate: 14396.54, changePct: -0.43, unit: 'Puan', source: 'BIST', buying: 14396.54, selling: 14396.54 },
      { key: 'GAG', code: 'Gümüş/TL', name: 'Gümüş Gram', rate: 98.40, changePct: 0.85, unit: 'TL', source: 'Serbest Piyasa', buying: 98.20, selling: 98.40 },
      { key: 'BTC', code: 'BTC/USD', name: 'Bitcoin', rate: 64250.00, changePct: 2.10, unit: '$', source: 'Binance', buying: 64240.0, selling: 64250.00 }
    ];
  }, [marketData, instruments]);

  return (
    <div className="terminal-ticker-bar" id="terminalTickerBar">
      <div className="ticker-countdown-badge" id="tefasCountdownBadge">
        <span className="ticker-pulse-dot"></span>
        <span className="ticker-countdown-text">🟢 BIST: Açık — 🏛️ TEFAS: T+0 Seansı</span>
        <span className="ticker-badge-arrow">▾</span>
      </div>

      <div className="ticker-track-wrapper">
        <div className="ticker-track" id="tickerTrack">
          {featuredList.concat(featuredList).map((item, idx) => {
            const isPos = item.changePct > 0;
            const isNeg = item.changePct < 0;
            const changeClass = isPos ? 'pos' : isNeg ? 'neg' : 'zero';
            const sign = isPos ? '+' : '';

            return (
              <div key={`${item.code || item.name}-${idx}`} className="ticker-item">
                <span className="ticker-symbol">{item.code || item.name}:</span>
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
          })}
        </div>
      </div>
    </div>
  );
};
