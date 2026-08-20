import type { PortfolioFund, PendingOrder, PortfolioAccount } from '../types/portfolio';

const STORAGE_KEY = 'zenithatlas_v2_data';
const DB_NAME = 'ZenithAtlasDB_v2';
const DB_STORE = 'portfolios';

export const DEMO_FUNDS: PortfolioFund[] = [
  { code: 'AIS', name: 'Ak Portföy Para Piyasası Fonu', category: 'Para Piyasası', shares: 500000, costPrice: 0.1020, currentPrice: 0.107304, performance1Y: 53.4, ter: 0.95 },
  { code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse', category: 'Fon Sepeti', shares: 85000, costPrice: 0.8950, currentPrice: 0.976141, performance1Y: 78.2, ter: 2.20 },
  { code: 'IJC', name: 'İş Portföy BIST 100 Dışı Şirketler Hisse', category: 'Hisse Senedi', shares: 4500, costPrice: 14.80, currentPrice: 16.264412, performance1Y: 92.5, ter: 2.50 },
  { code: 'KZL', name: 'Kuveyt Türk Altın Katılım Fonu', category: 'Kıymetli Madenler', shares: 3200, costPrice: 24.50, currentPrice: 28.004674, performance1Y: 64.1, ter: 1.50 },
  { code: 'MAC', name: 'Marmara Capital Hisse Senedi Fonu', category: 'Hisse Senedi', shares: 120000, costPrice: 0.690, currentPrice: 0.763875, performance1Y: 104.8, ter: 2.90 },
  { code: 'TP2', name: 'Tera Portföy Para Piyasası Fonu', category: 'Para Piyasası', shares: 40000, costPrice: 2.050, currentPrice: 2.167477, performance1Y: 55.8, ter: 0.85 }
];

export async function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function savePortfolioToIndexedDB(account: PortfolioAccount): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put(account);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function loadStoredPortfolios(): {
  activeId: string;
  portfolios: PortfolioAccount[];
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.portfolios) && parsed.portfolios.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Storage read error:', e);
  }

  // Varsayılan Temiz & Sıfır Portföy (Statik Mock İçermez)
  const cleanAccount: PortfolioAccount = {
    id: 'port-main',
    name: 'Ana Portföy',
    isMain: true,
    funds: [],
    cashTL: 0,
    pendingOrders: [],
    createdAt: new Date().toISOString()
  };

  return {
    activeId: cleanAccount.id,
    portfolios: [cleanAccount]
  };
}

export function savePortfoliosToStorage(activeId: string, portfolios: PortfolioAccount[]): void {
  try {
    const payload = { activeId, portfolios };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const active = portfolios.find(p => p.id === activeId);
    if (active) {
      savePortfolioToIndexedDB(active);
    }
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}
