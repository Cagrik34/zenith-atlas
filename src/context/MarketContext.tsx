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

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketDataState | null>(null);
  const [instruments, setInstruments] = useState<Record<string, MarketInstrument>>({});
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // 1. Yerel JSON/JS dosyasından başlangıç verisi yükleme
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
        setInstruments(flat);
      }
    } catch (e) {
      console.warn('Initial markets load error:', e);
    }
  }, []);

  useEffect(() => {
    loadInitialMarkets();
  }, [loadInitialMarkets]);

  // 2. Canlı WebSocket Bağlantısı (s.canlidoviz.com)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://s.canlidoviz.com/socket.io/?EIO=4&transport=websocket');

        ws.onopen = () => {
          setIsSocketConnected(true);
          console.info('Zenith Atlas: Canlı Piyasa WebSocket bağlantısı kuruldu.');
        };

        ws.onmessage = (event) => {
          const msg = event.data;
          if (typeof msg === 'string') {
            if (msg.startsWith('0')) {
              // Socket.io handshake cevabı
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
                        const key = parts[0];
                        const buy = parseFloat(parts[1]) || 0;
                        const sell = parseFloat(parts[2]) || buy;
                        const changePct = parts[3] ? parseFloat(parts[3]) : 0;

                        if (next[key]) {
                          next[key] = {
                            ...next[key],
                            buying: buy,
                            selling: sell,
                            rate: sell,
                            changePct: changePct || next[key].changePct
                          };
                        }
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
