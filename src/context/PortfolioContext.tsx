import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { PortfolioFund, PortfolioAccount, PendingOrder, FundLot } from '../types/portfolio';
import { loadStoredPortfolios, savePortfoliosToStorage } from '../utils/storage';

interface PortfolioContextType {
  portfolios: PortfolioAccount[];
  activePortfolio: PortfolioAccount;
  activePortfolioId: string;
  setActivePortfolioId: (id: string) => void;
  funds: PortfolioFund[];
  cashTL: number;
  pendingOrders: PendingOrder[];
  addFund: (fund: Omit<PortfolioFund, 'currentPrice'>) => void;
  updateFund: (code: string, updates: Partial<PortfolioFund>) => void;
  removeFund: (code: string) => void;
  addLot: (fundCode: string, lot: Omit<FundLot, 'id' | 'totalCost'>) => void;
  removeLot: (fundCode: string, lotId: string) => void;
  setCashTL: (amount: number) => void;
  addPendingOrder: (order: Omit<PendingOrder, 'id' | 'createdAt' | 'status'>) => void;
  removePendingOrder: (id: string) => void;
  createNewPortfolio: (name: string) => void;
  deletePortfolio: (id: string) => void;
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

  const addFund = useCallback((newFundData: Omit<PortfolioFund, 'currentPrice'>) => {
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
          costPrice: avgCost
        };
        return { ...acc, funds: updatedFunds };
      } else {
        const created: PortfolioFund = {
          ...newFundData,
          currentPrice: newFundData.costPrice
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
    updateActiveAccount(acc => ({
      ...acc,
      funds: acc.funds.map(f => {
        if (f.code === fundCode) {
          const newLot: FundLot = {
            ...lotData,
            id: `LOT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            totalCost: lotData.shares * lotData.buyPrice
          };
          const existingLots = f.lots || [];
          return { ...f, lots: [...existingLots, newLot] };
        }
        return f;
      })
    }));
  }, [updateActiveAccount]);

  const removeLot = useCallback((fundCode: string, lotId: string) => {
    updateActiveAccount(acc => ({
      ...acc,
      funds: acc.funds.map(f => {
        if (f.code === fundCode && f.lots) {
          return { ...f, lots: f.lots.filter(l => l.id !== lotId) };
        }
        return f;
      })
    }));
  }, [updateActiveAccount]);

  const setCashTL = useCallback((amount: number) => {
    updateActiveAccount(acc => ({ ...acc, cashTL: Math.max(0, amount) }));
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
