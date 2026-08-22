import { useEffect, useCallback, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { useMarket } from '../context/MarketContext';
import initialPricesData from '../data/prices.json';

/**
 * Background Automatic Synchronization Hook
 * Manages periodic 60-second synchronization for TEFAS prices and live market rates.
 */
export function useAutoSync() {
  const { syncLivePrices } = usePortfolio();
  const { refreshMarkets } = useMarket();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const performSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Statik veritabanını anında uygula (sıfır gecikme)
      if (initialPricesData && (initialPricesData as any).prices) {
        syncLivePrices((initialPricesData as any).prices, (initialPricesData as any).officialTefasDate);
      }

      // 2. prices.json'dan resmi TEFAS fiyatlarını göreli URL ile dinamik çek
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      let res = await fetch(`${cleanBase}data/prices.json?t=${Date.now()}`);
      if (!res.ok) res = await fetch('data/prices.json?t=' + Date.now());
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.prices) {
          syncLivePrices(data.prices, data.officialTefasDate);
        }
      }

      // 3. Canlı WebSocket ve Piyasa Fiyatlarını tazele
      await refreshMarkets();
    } catch (e) {
      console.warn('Otomatik senkronizasyon uyarısı:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [syncLivePrices, refreshMarkets]);

  useEffect(() => {
    // Açılışta tek seferlik tetikleme
    performSync();

    // 60 saniyede bir periyodik döngü
    const interval = setInterval(() => {
      performSync();
    }, 60000);

    return () => clearInterval(interval);
  }, []); // Kesinlikle boş dependency array; infinite loop & jitter engellendi

  return { isSyncing, triggerSync: performSync };
}
