/**
 * AgentHiveContext — React 19 Context for Zenith Quant Hive Multi-Agent Network
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AgentDescriptor, HiveMessage, ToolExecutionSpan, CircuitBreakerStatus, MemoryReflectionEntry, AgentRole, MessageAct } from '../types/hive';
import { AgentHiveEngine } from '../engines/AgentHiveEngine';
import { usePortfolio } from './PortfolioContext';
import { useMarket } from './MarketContext';

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
  isBreakerModalOpen: boolean;
  setIsBreakerModalOpen: (open: boolean) => void;
}

const AgentHiveContext = createContext<AgentHiveContextType | null>(null);

export const AgentHiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { funds, cashTL } = usePortfolio();
  const { marketData } = useMarket();

  const [engine] = useState(() => new AgentHiveEngine());
  const [agents, setAgents] = useState<AgentDescriptor[]>(() => engine.getAgents());
  const [messages, setMessages] = useState<HiveMessage[]>(() => engine.getMessages());
  const [toolSpans, setToolSpans] = useState<ToolExecutionSpan[]>(() => engine.getToolSpans());
  const [blackboard, setBlackboard] = useState<Record<string, any>>(() => engine.getBlackboard());
  const [breakerStatus, setBreakerStatus] = useState<CircuitBreakerStatus>(() => engine.breaker.getStatus());
  const [memorySnapshot, setMemorySnapshot] = useState<MemoryReflectionEntry>(() => engine.memory.getMemorySnapshot());
  const [isBreakerModalOpen, setIsBreakerModalOpen] = useState(false);

  // Background Autonomous Sentinel Heartbeat Loop (every 10 seconds)
  useEffect(() => {
    const tick = () => {
      engine.runSentinelTick(funds, cashTL, marketData);
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
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [engine, funds, cashTL, marketData]);

  const sendMessage = useCallback((from: AgentRole, to: AgentRole | 'BROADCAST', act: MessageAct, subject: string, body: string, data?: Record<string, any>) => {
    engine.sendMessage(from, to, act, subject, body, data);
    setMessages(engine.getMessages());
    setAgents(engine.getAgents());
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
