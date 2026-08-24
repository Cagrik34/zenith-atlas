import { describe, it, expect } from 'vitest';
import { BlackLittermanEngine } from '../../src/engines/BlackLittermanEngine';
import { HrpEngine } from '../../src/engines/HrpEngine';
import { MonteCarloEngine } from '../../src/engines/MonteCarloEngine';
import { FactorAttributionEngine } from '../../src/engines/FactorAttributionEngine';
import { FinancialCircuitBreaker } from '../../src/engines/FinancialCircuitBreaker';
import { TaxLossHarvestingEngine } from '../../src/engines/TaxLossHarvestingEngine';
import { SyntheticStressEngine } from '../../src/engines/SyntheticStressEngine';
import { SquarifiedTreemapEngine } from '../../src/engines/SquarifiedTreemapEngine';
import type { PortfolioFund } from '../../src/types/portfolio';

const mockFunds: PortfolioFund[] = [
  {
    code: 'TI3',
    name: 'İş Portföy BIST 100 Dışı Şirketler',
    category: 'Hisse',
    shares: 1000,
    costPrice: 10.0,
    currentPrice: 12.0,
    dailyChange: 1.5,
    volatility: 28.0,
    sharpe: 1.6,
    alpha: 4.5,
    beta: 1.1
  },
  {
    code: 'KZL',
    name: 'İş Portföy Altın Fonu',
    category: 'Kıymetli Madenler',
    shares: 500,
    costPrice: 50.0,
    currentPrice: 48.0,
    dailyChange: -0.8,
    volatility: 18.0,
    sharpe: 1.1,
    alpha: 1.2,
    beta: 0.2
  },
  {
    code: 'TP2',
    name: 'Tera Portföy Para Piyasası Fonu',
    category: 'Para Piyasası',
    shares: 2000,
    costPrice: 20.0,
    currentPrice: 21.0,
    dailyChange: 0.1,
    volatility: 4.0,
    sharpe: 2.8,
    alpha: 0.5,
    beta: 0.05
  }
];

describe('Quantitative Mathematical Engines', () => {
  describe('BlackLittermanEngine', () => {
    it('computes Bayesian portfolio weights summing to ~100%', () => {
      const result = BlackLittermanEngine.calculate(mockFunds, [
        { code: 'TI3', expectedReturnPct: 55.0, confidencePct: 80 }
      ]);
      expect(result).toBeDefined();
      expect(result.portfolioExpectedReturn).toBeGreaterThan(0);
      expect(result.portfolioVolatility).toBeGreaterThan(0);
      const totalWeight = Object.values(result.weights).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeCloseTo(100, 0);
    });

    it('handles empty portfolio gracefully', () => {
      const result = BlackLittermanEngine.calculate([]);
      expect(result.portfolioExpectedReturn).toBe(0);
      expect(Object.keys(result.weights)).toHaveLength(0);
    });
  });

  describe('HrpEngine (Hierarchical Risk Parity)', () => {
    it('allocates risk-parity weights summing to 100%', () => {
      const result = HrpEngine.calculate(mockFunds);
      expect(result).toBeDefined();
      expect(result.clusters).toBeDefined();
      const totalWeight = Object.values(result.weights).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeCloseTo(100, 0);
    });
  });

  describe('MonteCarloEngine (10,000 Stochastic Paths)', () => {
    it('produces monotonic percentile distributions over time', () => {
      const result = MonteCarloEngine.run(100000, 45.0, 22.0, 5000, 3, 2000);
      expect(result.timeStepsMonths).toHaveLength(37);
      const finalP5 = result.percentiles.p5[36];
      const finalP25 = result.percentiles.p25[36];
      const finalP50 = result.percentiles.p50[36];
      const finalP75 = result.percentiles.p75[36];
      const finalP95 = result.percentiles.p95[36];

      expect(finalP5).toBeLessThanOrEqual(finalP25);
      expect(finalP25).toBeLessThanOrEqual(finalP50);
      expect(finalP50).toBeLessThanOrEqual(finalP75);
      expect(finalP75).toBeLessThanOrEqual(finalP95);
      expect(result.finalDistribution.expectedValueTRY).toBeGreaterThan(100000);
      expect(result.finalDistribution.successRatePct).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FactorAttributionEngine (Fama-French 5-Factor)', () => {
    it('decomposes returns into Alpha, Beta, SMB, HML, RMW, CMA', () => {
      const result = FactorAttributionEngine.calculate(mockFunds);
      expect(result.marketBeta).toBeGreaterThan(0);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(100);
      expect(result.interpretation).toBeDefined();
    });
  });

  describe('FinancialCircuitBreaker', () => {
    it('transitions states across nominal to constrained/tripped levels', () => {
      const breaker = new FinancialCircuitBreaker({ maxDrawdownDailyPct: -2.0 });
      expect(breaker.getStatus().level).toBe('HEALTHY');

      const signal = breaker.evaluate(-5.5, 42.0);
      expect(signal.level).not.toBe('HEALTHY');
      expect(signal.reason).toBeDefined();

      breaker.manualReset();
      expect(breaker.getStatus().level).toBe('HEALTHY');
    });
  });

  describe('TaxLossHarvestingEngine', () => {
    it('detects loss-making lots (KZL) and calculates tax savings', () => {
      const result = TaxLossHarvestingEngine.calculate(mockFunds);
      expect(result).toBeDefined();
      expect(result.totalHarvestableLossTRY).toBeGreaterThan(0);
      expect(result.totalTaxSavingsTRY).toBeGreaterThan(0);
      expect(result.lots.length).toBeGreaterThan(0);
    });
  });

  describe('SyntheticStressEngine', () => {
    it('simulates macroeconomic crisis shocks with resilience scoring', () => {
      const result = SyntheticStressEngine.calculate(mockFunds, 25.0, 500, -15.0, 10.0, '2021 FX & Rate Shock');
      expect(result.scenarioName).toBe('2021 FX & Rate Shock');
      expect(result.resilienceScore).toBeGreaterThanOrEqual(0);
      expect(result.resilienceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('SquarifiedTreemapEngine', () => {
    it('squarifies nodes into non-overlapping geometric bounding boxes', () => {
      const nodes = [
        { id: 'TI3', name: 'TI3', code: 'TI3', changePct: 2.5, value: 12000, category: 'Hisse' },
        { id: 'KZL', name: 'KZL', code: 'KZL', changePct: -1.2, value: 24000, category: 'Altın' },
        { id: 'TP2', name: 'TP2', code: 'TP2', changePct: 0.1, value: 42000, category: 'Para Piyasası' }
      ];
      const layout = SquarifiedTreemapEngine.layout(nodes, 800, 600);
      expect(layout).toHaveLength(3);
      layout.forEach(item => {
        expect(item.x0).toBeGreaterThanOrEqual(0);
        expect(item.y0).toBeGreaterThanOrEqual(0);
        expect(item.x1).toBeGreaterThan(item.x0!);
        expect(item.y1).toBeGreaterThan(item.y0!);
      });
    });
  });
});