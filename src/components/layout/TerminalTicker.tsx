import React from 'react';
import { useMarket } from '../../context/MarketContext';
import { escapeHtml } from '../../utils/formatters';

export const TerminalTicker: React.FC = () => {
  const { marketData, instruments } = useMarket();

  // Öne çıkanlar veya varsayılan borsa listesi
  const featuredList = React.useMemo(() => {
    if (marketData?.categories?.featured?.items) {
      return Object.values(marketData.categories.featured.items);
    }
    if (Object.keys(instruments).length > 0) {
      return Object.values(instruments).slice(0, 10);
    }
    return [
      { key: 'XU100', code: 'BIST 100', name: 'BIST 100 Endeksi', rate: 14396.54, changePct: -0.43, unit: 'Puan', source: 'BIST', buying: 14396.54, selling: 14396.54 },
      { key: 'USD', code: 'USD/TRY', name: 'Amerikan Doları', rate: 48.1110, changePct: 0.12, unit: 'TL', source: 'Serbest Piyasa', buying: 48.10, selling: 48.1110 },
      { key: 'EUR', code: 'EUR/TRY', name: 'Euro', rate: 56.0560, changePct: 0.25, unit: 'TL', source: 'Serbest Piyasa', buying: 56.04, selling: 56.0560 },
      { key: 'GA', code: 'Gram Altın', name: '24 Ayar Gram Altın', rate: 6981.16, changePct: 0.65, unit: 'TL', source: 'Harem Altın', buying: 6980.0, selling: 6981.16 },
      { key: 'GAG', code: 'Gümüş/TL', name: 'Gümüş Gram', rate: 98.40, changePct: 0.85, unit: 'TL', source: 'Serbest Piyasa', buying: 98.20, selling: 98.40 },
      { key: 'XU030', code: 'BIST 30', name: 'BIST 30 Endeksi', rate: 16509.05, changePct: -0.44, unit: 'Puan', source: 'BIST', buying: 16509.05, selling: 16509.05 },
      { key: 'XBRUSD', code: 'Brent Petrol', name: 'Brent Petrol', rate: 82.50, changePct: -0.45, unit: '$', source: 'Global', buying: 82.40, selling: 82.50 },
      { key: 'BTC', code: 'BTC/USD', name: 'Bitcoin', rate: 64250.00, changePct: 2.10, unit: '$', source: 'Binance', buying: 64240.0, selling: 64250.00 }
    ];
  }, [marketData, instruments]);

  // Sonsuz akıcı döngü için çift liste
  const doubleList = React.useMemo(() => [...featuredList, ...featuredList], [featuredList]);

  return (
    <div className="terminal-ticker-bar" id="terminalTickerBar">
      <div className="ticker-badge">
        <span className="ticker-pulse-dot"></span>
        <span className="ticker-label">CANLI PİYASA</span>
      </div>

      <div className="ticker-viewport">
        <div className="ticker-track">
          {doubleList.map((item, idx) => {
            const isPos = item.changePct > 0;
            const isNeg = item.changePct < 0;
            const changeClass = isPos ? 'pos' : isNeg ? 'neg' : 'zero';
            const sign = isPos ? '+' : '';
            const isParity = item.unit === 'Parite' || item.key === 'EUR_USD';
            const prefix = isParity ? '' : (item.unit === '$' ? '$' : (item.unit && item.unit.includes('TL') ? '₺' : ''));
            const suffix = item.unit === 'Puan' ? ' P' : '';
            const decimals = isParity || (item.unit && item.unit.includes('TL') && item.rate < 100) ? 4 : 2;
            const formattedPrice = `${prefix}${item.rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: decimals })}${suffix}`;

            return (
              <div key={`${item.code}-${idx}`} className="ticker-item">
                <span className="ticker-symbol">{escapeHtml(item.code || item.name)}:</span>
                <span className="ticker-price">{formattedPrice}</span>
                <span className={`ticker-change ${changeClass}`}>{sign}%{Math.abs(item.changePct).toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ticker-tefas-countdown" title="Piyasa seans durumları">
        <span className="ticker-pulse-dot"></span>
        <span id="tefasCountdownText">📈 BIST: 🟢 Açık - 🏛 TEFAS: 🟢 T+0 Seansı</span>
      </div>
    </div>
  );
};
