import { describe, it, expect } from 'vitest';
import { AgentHiveEngine } from '../../src/engines/AgentHiveEngine';
import { FinancialMemoryReflector } from '../../src/engines/FinancialMemoryReflector';
import { ZenithAiEngine } from '../../src/engines/ZenithAiEngine';
import type { PortfolioFund } from '../../src/types/portfolio';

const mockFunds: PortfolioFund[] = [
  {
    code: 'TI3',
    name: 'İş Portföy BIST 100 Dışı Şirketler',
    category: 'Hisse',
    shares: 1000,
    costPrice: 10.0,
    currentPrice: 12.5,
    dailyChange: 2.5,
    volatility: 26.0,
    sharpe: 1.5,
    alpha: 3.2,
    beta: 1.1
  }
];

describe('Multi-Agent Hive & AI Engine Suite', () => {
  describe('AgentHiveEngine', () => {
    it('initializes 5 specialized autonomous agents in roster', () => {
      const hive = new AgentHiveEngine();
      const agents = hive.getAgents();
      expect(agents).toHaveLength(5);
      const roles = agents.map(a => a.role);
      expect(roles).toContain('SYNC_SENTINEL');
      expect(roles).toContain('RISK_BREAKER');
      expect(roles).toContain('TAX_HARVESTER');
      expect(roles).toContain('MACRO_STRATEGIST');
      expect(roles).toContain('LEAD_QUANT');
    });

    it('boots with initialized mailbox queue and blackboard state', () => {
      const hive = new AgentHiveEngine();
      const messages = hive.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(hive.breaker).toBeDefined();
      expect(hive.memory).toBeDefined();
    });
  });

  describe('FinancialMemoryReflector', () => {
    it('stores and retrieves memory items with recency and relevance', () => {
      const memory = new FinancialMemoryReflector();
      const snapshot = memory.getMemorySnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.pinnedFacts.length).toBeGreaterThan(0);

      memory.recordObservation('Piyasa Riski', 'BIST 100 volatilite seviyesi %24.5 olarak kaydedildi');
      const updated = memory.getMemorySnapshot();
      expect(updated.recentObservations.length).toBeGreaterThan(0);
    });
  });

  describe('ZenithAiEngine', () => {
    it('generates structured response for tax / withholding queries', () => {
      const response = ZenithAiEngine.generateResponse(
        'stopaj nedir ve vergi avantajı var mı?',
        mockFunds,
        5000,
        17500,
        '24.08.2026'
      );
      expect(response).toBeDefined();
      expect(response.title).toBeDefined();
      expect(response.content.length).toBeGreaterThan(20);
    });

    it('generates portfolio performance and risk assessment', () => {
      const response = ZenithAiEngine.generateResponse(
        'portföyüm nasıl, risk durumum nedir?',
        mockFunds,
        5000,
        17500,
        '24.08.2026'
      );
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });
});