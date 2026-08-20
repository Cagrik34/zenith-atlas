import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { MarketDataState, MarketInstrument } from '../types/market';

interface MarketContextType {
  marketData: MarketDataState | null;
  instruments: Record<string, MarketInstrument>;
  isSocketConnected: boolean;
  bist100: MarketInstrument | null;
  usdTry: MarketInstrument | null;
  eurTry: MarketInstrument | null;
  gramGold: MarketInstrument | null;
  refreshMarkets: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | null>(null);

// canlidoviz.com Canlı WebSocket Kod & Sembol Eşleme Haritası
const CANLI_DOVIZ_ID_MAP: Record<string, string[]> = {
  '1': ['USD', 'USD/TRY'],
  '1114': ['USD', 'USD/TRY'],
  '50': ['EUR', 'EUR/TRY'],
  '1194': ['EUR', 'EUR/TRY'],
  '1195': ['GBP', 'GBP/TRY'],
  '1115': ['GA', 'Gram Altın'],
  '1179': ['GA', 'Gram Altın'],
  '32': ['GA', 'Gram Altın'],
  '12': ['XAU/USD', 'Ons Altın', 'XAU'],
  '1014': ['GAG', 'Gümüş/TL'],
  '62': ['BTC', 'BTC/USD'],
  'XU100': ['XU100', 'BIST 100'],
  'XU030': ['XU030', 'BIST 30']
};

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketDataState | null>(null);
  const [instruments, setInstruments] = useState<Record<string, MarketInstrument>>({
    'USD': { key: 'USD', code: 'USD/TRY', name: 'Amerikan Doları', buying: 48.012, selling: 48.114, rate: 48.114, changePct: 0.12, unit: 'TL', source: 'Serbest Piyasa' },
    'EUR': { key: 'EUR', code: 'EUR/TRY', name: 'Euro', buying: 55.808, selling: 56.08, rate: 56.08, changePct: 0.25, unit: 'TL', source: 'Serbest Piyasa' },
    'GBP': { key: 'GBP', code: 'GBP/TRY', name: 'İngiliz Sterlini', buying: 65.126, selling: 65.501, rate: 65.501, changePct: 0.18, unit: 'TL', source: 'Serbest Piyasa' },
    'GA': { key: 'GA', code: 'Gram Altın', name: '24 Ayar Gram Altın', buying: 6879.11, selling: 6977.45, rate: 6977.45, changePct: 0.65, unit: 'TL', source: 'Harem Altın' },
    'XAU/USD': { key: 'XAU/USD', code: 'Ons Altın', name: 'Spot Ons Altın', buying: 4524.03, selling: 4524.65, rate: 4524.65, changePct: 0.53, unit: '$', source: 'LBMA' },
    'XU100': { key: 'XU100', code: 'BIST 100', name: 'BIST 100 Endeksi', buying: 14396.54, selling: 14396.54, rate: 14396.54, changePct: -0.43, unit: 'Puan', source: 'BIST' },
    'GAG': { key: 'GAG', code: 'Gümüş/TL', name: 'Gümüş Gram', buying: 66.31, selling: 66.31, rate: 66.31, changePct: 0.85, unit: 'TL', source: 'Serbest Piyasa' },
    'BTC': { key: 'BTC', code: 'BTC/USD', name: 'Bitcoin', buying: 72681.93, selling: 72688.50, rate: 72688.50, changePct: 2.10, unit: '$', source: 'Binance' }
  });
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // 1. Yerel JSON dosyasından başlangıç verisi yükleme
  const loadInitialMarkets = useCallback(async () => {
    try {
      let res = await fetch('/data/markets.json?t=' + Date.now());
      if (!res.ok) res = await fetch('src/data/markets.json?t=' + Date.now());
      if (res && res.ok) {
        const data: MarketDataState = await res.json();
        setMarketData(data);

        const flat: Record<string, MarketInstrument> = {};
        if (data.categories) {
          Object.values(data.categories).forEach(cat => {
            if (cat && cat.items) {
              Object.entries(cat.items).forEach(([k, item]) => {
                flat[k] = item;
                if (item.code) flat[item.code] = item;
              });
            }
          });
        }
        setInstruments(prev => ({ ...flat, ...prev }));
      }
    } catch (e) {
      console.warn('Initial markets load error:', e);
    }
  }, []);

  useEffect(() => {
    loadInitialMarkets();
  }, [loadInitialMarkets]);

  // 2. Canlı WebSocket Bağlantısı & Kod Çözümleyici (s.canlidoviz.com)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://s.canlidoviz.com/socket.io/?EIO=4&transport=websocket');

        ws.onopen = () => {
          setIsSocketConnected(true);
        };

        ws.onmessage = (event) => {
          const msg = event.data;
          if (typeof msg === 'string') {
            if (msg.startsWith('0')) {
              // Socket.io handshake cevabı -> Kanal aboneliği
              ws?.send('40');
              const subPayload = {
                t: ['CURRENCY', 'GOLD', 'COIN', 'EMTIA', 'PARITY', 'STOCK'],
                c: ['USD', 'EUR', 'GA', 'EUR/USD', 'GBP', 'CAD', 'CHF', 'AUD', 'JPY', 'SAR', 'GAG', 'XAU/USD', 'XBRUSD', 'BTC', 'XU100', 'XU030', 'XBANK', 'XUSIN'],
                m: false
              };
              ws?.send(`42["us",${JSON.stringify(subPayload)}]`);
            } else if (msg.startsWith('42')) {
              try {
                const parsed = JSON.parse(msg.slice(2));
                if (parsed[0] === 'c' && Array.isArray(parsed[1])) {
                  setInstruments(prev => {
                    const next = { ...prev };
                    parsed[1].forEach((itemStr: string) => {
                      const parts = itemStr.split('|');
                      if (parts.length >= 3) {
                        const rawCode = parts[0];
                        const buy = parseFloat(parts[1]) || 0;
                        const sell = parseFloat(parts[2]) || buy;
                        const changePct = parts[3] ? parseFloat(parts[3]) : undefined;

                        const targetKeys = CANLI_DOVIZ_ID_MAP[rawCode] || [rawCode];

                        targetKeys.forEach(targetKey => {
                          const existing = next[targetKey] || {
                            key: targetKey,
                            code: targetKey,
                            name: targetKey,
                            unit: targetKey.includes('BTC') || targetKey.includes('XAU') ? '$' : 'TL'
                          };

                          next[targetKey] = {
                            ...existing,
                            buying: buy > 0 ? buy : existing.buying,
                            selling: sell > 0 ? sell : existing.selling,
                            rate: sell > 0 ? sell : existing.rate,
                            changePct: changePct !== undefined && !isNaN(changePct) ? changePct : existing.changePct
                          };
                        });
                      }
                    });
                    return next;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            } else if (msg === '2') {
              ws?.send('3'); // Ping/Pong heartbeat
            }
          }
        };

        ws.onclose = () => {
          setIsSocketConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setIsSocketConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const bist100 = instruments['XU100'] || instruments['BIST 100'] || null;
  const usdTry = instruments['USD'] || instruments['USD/TRY'] || null;
  const eurTry = instruments['EUR'] || instruments['EUR/TRY'] || null;
  const gramGold = instruments['GA'] || instruments['Gram Altın'] || null;

  return (
    <MarketContext.Provider
      value={{
        marketData,
        instruments,
        isSocketConnected,
        bist100,
        usdTry,
        eurTry,
        gramGold,
        refreshMarkets: loadInitialMarkets
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within a MarketProvider');
  return context;
}
