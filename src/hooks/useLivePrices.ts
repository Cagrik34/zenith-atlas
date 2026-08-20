import { useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { useMarket } from '../context/MarketContext';

/**
 * Otomatik Canlı Fiyat & Portföy Eşleştirme Kancası
 */
export function useLivePrices() {
  const { syncLivePrices } = usePortfolio();
  const { instruments } = useMarket();

  useEffect(() => {
    // Market instruments'tan fon fiyatları varsa senkronize et
    const priceMap: Record<string, number> = {};
    Object.entries(instruments).forEach(([code, item]) => {
      if (item.rate > 0) {
        priceMap[code] = item.rate;
      }
    });

    if (Object.keys(priceMap).length > 0) {
      syncLivePrices(priceMap);
    }
  }, [instruments, syncLivePrices]);
}
