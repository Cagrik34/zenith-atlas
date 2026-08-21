import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { PortfolioFund, PortfolioAccount, PendingOrder, FundLot } from '../types/portfolio';
import { loadStoredPortfolios, savePortfoliosToStorage, DEMO_FUNDS } from '../utils/storage';

interface PortfolioContextType {
  portfolios: PortfolioAccount[];
  activePortfolio: PortfolioAccount;
  activePortfolioId: string;
  setActivePortfolioId: (id: string) => void;
  funds: PortfolioFund[];
  cashTL: number;
  pendingOrders: PendingOrder[];
  addFund: (fund: Omit<PortfolioFund, 'currentPrice'> & { currentPrice?: number }) => void;
  updateFund: (code: string, updates: Partial<PortfolioFund>) => void;
  removeFund: (code: string) => void;
  addLot: (fundCode: string, lot: Omit<FundLot, 'id' | 'totalCost'>) => void;
  removeLot: (fundCode: string, lotId: string) => void;
  setCashTL: (amount: number) => void;
  addPendingOrder: (order: Omit<PendingOrder, 'id' | 'createdAt' | 'status'>) => void;
  removePendingOrder: (id: string) => void;
  createNewPortfolio: (name: string) => void;
  deletePortfolio: (id: string) => void;
  loadDemoPortfolio: () => void;
  clearPortfolio: () => void;
  importAccount: (account: PortfolioAccount) => void;
  importPortfolioJson: (jsonStr: string) => boolean;
  exportPortfolioJson: () => string;
  totalFundValue: number;
  totalPortfolioValue: number;
  totalCost: number;
  totalProfitLossTRY: number;
  totalProfitLossPct: number;
  dailyProfitLossTRY: number;
  dailyProfitLossPct: number;
  syncLivePrices: (prices: Record<string, number>, officialTefasDate?: string) => void;
  lastUpdateStr: string;
  officialTefasDate: string;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedData, setStoredData] = useState(() => loadStoredPortfolios());
  const [lastUpdateStr, setLastUpdateStr] = useState<string>(() => new Date().toLocaleTimeString('tr-TR'));
  const [officialTefasDate, setOfficialTefasDate] = useState<string>('20.08.2026');

  const { activeId, portfolios } = storedData;

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activeId) || portfolios[0] || {
      id: 'port-main',
      name: 'Ana Portföy',
      isMain: true,
      funds: [],
      cashTL: 0,
      pendingOrders: [],
      createdAt: new Date().toISOString()
    };
  }, [activeId, portfolios]);

  // Kalıcı depolamaya kaydet
  useEffect(() => {
    savePortfoliosToStorage(activeId, portfolios);
  }, [activeId, portfolios]);

  const updateActiveAccount = useCallback((updater: (acc: PortfolioAccount) => PortfolioAccount) => {
    setStoredData(prev => {
      const updatedPortfolios = prev.portfolios.map(p => {
        if (p.id === prev.activeId) {
          return updater(p);
        }
        return p;
      });
      return { ...prev, portfolios: updatedPortfolios };
    });
  }, []);

  const addFund = useCallback((newFundData: Omit<PortfolioFund, 'currentPrice'> & { currentPrice?: number }) => {
    updateActiveAccount(acc => {
      const existsIndex = acc.funds.findIndex(f => f.code === newFundData.code);
      if (existsIndex >= 0) {
        const existing = acc.funds[existsIndex];
        const newShares = existing.shares + newFundData.shares;
        const totalOldCost = existing.shares * existing.costPrice;
        const totalNewCost = newFundData.shares * newFundData.costPrice;
        const avgCost = newShares > 0 ? (totalOldCost + totalNewCost) / newShares : newFundData.costPrice;

        const updatedFunds = [...acc.funds];
        updatedFunds[existsIndex] = {
          ...existing,
          shares: newShares,
          costPrice: avgCost,
          currentPrice: newFundData.currentPrice || existing.currentPrice || newFundData.costPrice
        };
        return { ...acc, funds: updatedFunds };
      } else {
        const created: PortfolioFund = {
          ...newFundData,
          currentPrice: newFundData.currentPrice || newFundData.costPrice
        };
        return { ...acc, funds: [...acc.funds, created] };
      }
    });
  }, [updateActiveAccount]);

  const updateFund = useCallback((code: string, updates: Partial<PortfolioFund>) => {
    updateActiveAccount(acc => ({
      ...acc,
      funds: acc.funds.map(f => f.code === code ? { ...f, ...updates } : f)
    }));
  }, [updateActiveAccount]);

  const removeFund = useCallback((code: string) => {
    updateActiveAccount(acc => ({
      ...acc,
      funds: acc.funds.filter(f => f.code !== code)
    }));
  }, [updateActiveAccount]);

  const addLot = useCallback((fundCode: string, lotData: Omit<FundLot, 'id' | 'totalCost'>) => {
    updateActiveAccount(acc => {
      return {
        ...acc,
        funds: acc.funds.map(f => {
          if (f.code !== fundCode) return f;
          const newLot: FundLot = {
            ...lotData,
            id: `LOT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            totalCost: lotData.shares * lotData.buyPrice
          };
          const lots = [...(f.lots || []), newLot];
          const totalShares = lots.reduce((s, l) => s + l.shares, 0);
          const totalCost = lots.reduce((s, l) => s + l.totalCost, 0);
          const avgCost = totalShares > 0 ? totalCost / totalShares : f.costPrice;
          return {
            ...f,
            shares: totalShares,
            costPrice: avgCost,
            lots
          };
        })
      };
    });
  }, [updateActiveAccount]);

  const removeLot = useCallback((fundCode: string, lotId: string) => {
    updateActiveAccount(acc => {
      return {
        ...acc,
        funds: acc.funds.map(f => {
          if (f.code !== fundCode || !f.lots) return f;
          const lots = f.lots.filter(l => l.id !== lotId);
          const totalShares = lots.reduce((s, l) => s + l.shares, 0);
          const totalCost = lots.reduce((s, l) => s + l.totalCost, 0);
          const avgCost = totalShares > 0 ? totalCost / totalShares : f.costPrice;
          return {
            ...f,
            shares: totalShares,
            costPrice: avgCost,
            lots
          };
        })
      };
    });
  }, [updateActiveAccount]);

  const setCashTL = useCallback((amount: number) => {
    updateActiveAccount(acc => ({
      ...acc,
      cashTL: Math.max(0, amount)
    }));
  }, [updateActiveAccount]);

  const addPendingOrder = useCallback((orderData: Omit<PendingOrder, 'id' | 'createdAt' | 'status'>) => {
    updateActiveAccount(acc => {
      const order: PendingOrder = {
        ...orderData,
        id: `ORD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };
      return { ...acc, pendingOrders: [...(acc.pendingOrders || []), order] };
    });
  }, [updateActiveAccount]);

  const removePendingOrder = useCallback((id: string) => {
    updateActiveAccount(acc => ({
      ...acc,
      pendingOrders: (acc.pendingOrders || []).filter(o => o.id !== id)
    }));
  }, [updateActiveAccount]);

  const createNewPortfolio = useCallback((name: string) => {
    const newPort: PortfolioAccount = {
      id: `port-${Date.now()}`,
      name: name.trim() || 'Yeni Portföy',
      isMain: false,
      funds: [],
      cashTL: 0,
      pendingOrders: [],
      createdAt: new Date().toISOString()
    };
    setStoredData(prev => ({
      activeId: newPort.id,
      portfolios: [...prev.portfolios, newPort]
    }));
  }, []);

  const deletePortfolio = useCallback((id: string) => {
    setStoredData(prev => {
      if (prev.portfolios.length <= 1) return prev;
      const remaining = prev.portfolios.filter(p => p.id !== id);
      const newActive = prev.activeId === id ? remaining[0].id : prev.activeId;
      return { activeId: newActive, portfolios: remaining };
    });
  }, []);

  // Örnek / Demo Portföyü Yükle
  const loadDemoPortfolio = useCallback(() => {
    updateActiveAccount(acc => ({
      ...acc,
      funds: [...DEMO_FUNDS],
      cashTL: 25000
    }));
  }, [updateActiveAccount]);

  // Portföyü Tamamen Temizle (Sıfırla)
  const clearPortfolio = useCallback(() => {
    updateActiveAccount(acc => ({
      ...acc,
      funds: [],
      cashTL: 0,
      pendingOrders: []
    }));
  }, [updateActiveAccount]);

  // Portföy Hesabını Doğrudan Yükle (P2P Teleport / QR)
  const importAccount = useCallback((account: PortfolioAccount) => {
    setStoredData(prev => {
      const existsIndex = prev.portfolios.findIndex(p => p.id === account.id);
      let updatedPortfolios: PortfolioAccount[];
      if (existsIndex >= 0) {
        updatedPortfolios = [...prev.portfolios];
        updatedPortfolios[existsIndex] = account;
      } else {
        updatedPortfolios = [...prev.portfolios, account];
      }
      return { activeId: account.id, portfolios: updatedPortfolios };
    });
  }, []);

  // JSON Yedeğini Geri Yükle
  const importPortfolioJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.funds)) {
        updateActiveAccount(acc => ({
          ...acc,
          name: parsed.name || acc.name,
          funds: parsed.funds,
          cashTL: typeof parsed.cashTL === 'number' ? parsed.cashTL : 0
        }));
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }, [updateActiveAccount]);

  // JSON Olarak Dışa Aktar
  const exportPortfolioJson = useCallback((): string => {
    const payload = {
      version: '2.2.0',
      exportedAt: new Date().toISOString(),
      name: activePortfolio.name,
      funds: activePortfolio.funds,
      cashTL: activePortfolio.cashTL
    };
    return JSON.stringify(payload, null, 2);
  }, [activePortfolio]);

  const syncLivePrices = useCallback((prices: Record<string, number>, tefasDate?: string) => {
    if (!prices || Object.keys(prices).length === 0) return;
    setStoredData(prev => ({
      ...prev,
      portfolios: prev.portfolios.map(acc => ({
        ...acc,
        funds: acc.funds.map(f => {
          if (prices[f.code] && prices[f.code] > 0) {
            return { ...f, currentPrice: prices[f.code] };
          }
          return f;
        })
      }))
    }));
    setLastUpdateStr(new Date().toLocaleTimeString('tr-TR'));
    if (tefasDate) setOfficialTefasDate(tefasDate);
  }, []);

  // Finansal Portföy Metrikleri
  const totalFundValue = useMemo(() => {
    return activePortfolio.funds.reduce((sum, f) => sum + (f.shares * f.currentPrice), 0);
  }, [activePortfolio.funds]);

  const totalPortfolioValue = useMemo(() => {
    return totalFundValue + activePortfolio.cashTL;
  }, [totalFundValue, activePortfolio.cashTL]);

  const totalCost = useMemo(() => {
    return activePortfolio.funds.reduce((sum, f) => sum + (f.shares * f.costPrice), 0) + activePortfolio.cashTL;
  }, [activePortfolio.funds, activePortfolio.cashTL]);

  const totalProfitLossTRY = useMemo(() => {
    return totalPortfolioValue - totalCost;
  }, [totalPortfolioValue, totalCost]);

  const totalProfitLossPct = useMemo(() => {
    return totalCost > 0 ? (totalProfitLossTRY / totalCost) * 100 : 0;
  }, [totalProfitLossTRY, totalCost]);

  const dailyProfitLossTRY = useMemo(() => {
    return activePortfolio.funds.reduce((sum, f) => {
      const dailyPct = (f.dailyReturnPct || 0) / 100;
      const prevVal = (f.shares * f.currentPrice) / (1 + dailyPct);
      return sum + ((f.shares * f.currentPrice) - prevVal);
    }, 0);
  }, [activePortfolio.funds]);

  const dailyProfitLossPct = useMemo(() => {
    return totalPortfolioValue > 0 ? (dailyProfitLossTRY / totalPortfolioValue) * 100 : 0;
  }, [dailyProfitLossTRY, totalPortfolioValue]);

  return (
    <PortfolioContext.Provider
      value={{
        portfolios,
        activePortfolio,
        activePortfolioId: activeId,
        setActivePortfolioId: (id) => setStoredData(prev => ({ ...prev, activeId: id })),
        funds: activePortfolio.funds,
        cashTL: activePortfolio.cashTL,
        pendingOrders: activePortfolio.pendingOrders || [],
        addFund,
        updateFund,
        removeFund,
        addLot,
        removeLot,
        setCashTL,
        addPendingOrder,
        removePendingOrder,
        createNewPortfolio,
        deletePortfolio,
        loadDemoPortfolio,
        clearPortfolio,
        importAccount,
        importPortfolioJson,
        exportPortfolioJson,
        totalFundValue,
        totalPortfolioValue,
        totalCost,
        totalProfitLossTRY,
        totalProfitLossPct,
        dailyProfitLossTRY,
        dailyProfitLossPct,
        syncLivePrices,
        lastUpdateStr,
        officialTefasDate
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within a PortfolioProvider');
  return context;
}
