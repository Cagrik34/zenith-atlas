import { useEffect, useCallback, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { useMarket } from '../context/MarketContext';

/**
 * Sıfır-Müdahale Arka Plan Otomatik Senkronizasyon Kancası
 * Sayfa açılışında ve her 60 saniyede bir resmi verileri tazeler
 */
export function useAutoSync() {
  const { syncLivePrices } = usePortfolio();
  const { refreshMarkets } = useMarket();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // 1. prices.json'dan resmi TEFAS fiyatlarını çek
      let res = await fetch('/data/prices.json?t=' + Date.now());
      if (!res.ok) res = await fetch('src/data/prices.json?t=' + Date.now());
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.prices) {
          syncLivePrices(data.prices, data.officialTefasDate);
        }
      }

      // 2. Canlı WebSocket ve Piyasa Fiyatlarını tazele
      await refreshMarkets();
    } catch (e) {
      console.warn('Otomatik senkronizasyon uyarısı:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncLivePrices, refreshMarkets]);

  useEffect(() => {
    // Açılışta ilk çalıştırma
    performSync();

    // 60 saniyede bir periyodik döngü
    const interval = setInterval(performSync, 60000);
    return () => clearInterval(interval);
  }, [performSync]);

  return { isSyncing, triggerSync: performSync };
}
