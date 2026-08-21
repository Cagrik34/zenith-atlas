/**
 * AgentHiveContext — React 19 Context for Zenith Quant Hive Multi-Agent Network
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AgentDescriptor, HiveMessage, ToolExecutionSpan, CircuitBreakerStatus, MemoryReflectionEntry, AgentRole, MessageAct } from '../types/hive';
import { AgentHiveEngine } from '../engines/AgentHiveEngine';
import { usePortfolio } from './PortfolioContext';
import { useMarket } from './MarketContext';
import initialPricesData from '../data/prices.json';

interface AgentHiveContextType {
  agents: AgentDescriptor[];
  messages: HiveMessage[];
  toolSpans: ToolExecutionSpan[];
  blackboard: Record<string, any>;
  breakerStatus: CircuitBreakerStatus;
  memorySnapshot: MemoryReflectionEntry;
  sendMessage: (from: AgentRole, to: AgentRole | 'BROADCAST', act: MessageAct, subject: string, body: string, data?: Record<string, any>) => void;
  resetBreaker: (reason?: string) => void;
  recordMemoryFact: (fact: string) => void;
  reconnectWebSocket: () => void;
  isBreakerModalOpen: boolean;
  setIsBreakerModalOpen: (open: boolean) => void;
}

const AgentHiveContext = createContext<AgentHiveContextType | null>(null);

export const AgentHiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { funds, cashTL, syncLivePrices } = usePortfolio();
  const { marketData, socketStats, reconnectSocket } = useMarket();

  const [engine] = useState(() => new AgentHiveEngine());
  const [agents, setAgents] = useState<AgentDescriptor[]>(() => engine.getAgents());
  const [messages, setMessages] = useState<HiveMessage[]>(() => engine.getMessages());
  const [toolSpans, setToolSpans] = useState<ToolExecutionSpan[]>(() => engine.getToolSpans());
  const [blackboard, setBlackboard] = useState<Record<string, any>>(() => engine.getBlackboard());
  const [breakerStatus, setBreakerStatus] = useState<CircuitBreakerStatus>(() => engine.breaker.getStatus());
  const [memorySnapshot, setMemorySnapshot] = useState<MemoryReflectionEntry>(() => engine.memory.getMemorySnapshot());
  const [isBreakerModalOpen, setIsBreakerModalOpen] = useState(false);

  // Pre-load static prices on initialization
  useEffect(() => {
    if (initialPricesData && (initialPricesData as any).prices) {
      engine.setTefasPricesCache((initialPricesData as any).prices);
      syncLivePrices((initialPricesData as any).prices, (initialPricesData as any).officialTefasDate);
    }
  }, [engine, syncLivePrices]);

  // Dynamic refresh with relative base URL
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        let res = await fetch(`${cleanBase}data/prices.json?t=${Date.now()}`);
        if (!res.ok) res = await fetch('data/prices.json?t=' + Date.now());
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.prices) {
            engine.setTefasPricesCache(data.prices);
            syncLivePrices(data.prices, data.officialTefasDate);
          }
        }
      } catch (e) {
        console.warn('Fallback loading TEFAS prices cache into Hive Engine:', e);
      }
    };
    loadPrices();
  }, [engine, syncLivePrices]);

  // Background Autonomous Sentinel Heartbeat Loop (smooth and non-flickering)
  useEffect(() => {
    const tick = () => {
      const result = engine.runSentinelTick(funds, cashTL, marketData, socketStats);
      if (result && result.priceCorrections) {
        syncLivePrices(result.priceCorrections);
      }

      setAgents(engine.getAgents());
      setMessages(engine.getMessages());
      setToolSpans(engine.getToolSpans());
      setBlackboard(engine.getBlackboard());
      const bStatus = engine.breaker.getStatus();
      setBreakerStatus(bStatus);
      setMemorySnapshot(engine.memory.getMemorySnapshot());

      if (bStatus.level === 'TRIPPED') {
        setIsBreakerModalOpen(true);
      }
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  }, [engine, funds, cashTL, marketData, socketStats, syncLivePrices]);

  const sendMessage = useCallback((from: AgentRole, to: AgentRole | 'BROADCAST', act: MessageAct, subject: string, body: string, data?: Record<string, any>) => {
    engine.sendMessage(from, to, act, subject, body, data);
    setMessages(engine.getMessages());
    setAgents(engine.getAgents());

    // Listen for queued asynchronous agent replies smoothly
    [250, 500, 750, 1000].forEach(delay => {
      setTimeout(() => {
        setMessages(engine.getMessages());
        setAgents(engine.getAgents());
      }, delay);
    });
  }, [engine]);

  const resetBreaker = useCallback((reason?: string) => {
    engine.breaker.manualReset(reason);
    setBreakerStatus(engine.breaker.getStatus());
    setIsBreakerModalOpen(false);
  }, [engine]);

  const recordMemoryFact = useCallback((fact: string) => {
    engine.memory.addPinnedFact(fact);
    setMemorySnapshot(engine.memory.getMemorySnapshot());
  }, [engine]);

  const handleReconnectWebSocket = useCallback(() => {
    reconnectSocket();
    engine.recordToolSpan('SYNC_SENTINEL', 'WebSocketReconnectCommand', 15.0, 'SUCCESS', 'canlidoviz.com Socket.IO bağlantısı yeniden kuruldu.');
    setToolSpans(engine.getToolSpans());
    sendMessage('SYNC_SENTINEL', 'BROADCAST', 'inform', 'WebSocket Yeniden Başlatıldı', 'canlidoviz.com soketi portföy yöneticisi komutuyla sıfırlandı ve yeniden bağlandı.');
  }, [reconnectSocket, engine, sendMessage]);

  return (
    <AgentHiveContext.Provider
      value={{
        agents,
        messages,
        toolSpans,
        blackboard,
        breakerStatus,
        memorySnapshot,
        sendMessage,
        resetBreaker,
        recordMemoryFact,
        reconnectWebSocket: handleReconnectWebSocket,
        isBreakerModalOpen,
        setIsBreakerModalOpen
      }}
    >
      {children}
    </AgentHiveContext.Provider>
  );
};

export function useAgentHive() {
  const context = useContext(AgentHiveContext);
  if (!context) throw new Error('useAgentHive must be used within an AgentHiveProvider');
  return context;
}
