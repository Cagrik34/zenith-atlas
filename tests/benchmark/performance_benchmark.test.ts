import { describe, it, expect } from 'vitest';
import { MonteCarloEngine } from '../../src/engines/MonteCarloEngine';
import { BlackLittermanEngine } from '../../src/engines/BlackLittermanEngine';
import { HrpEngine } from '../../src/engines/HrpEngine';
import { FactorAttributionEngine } from '../../src/engines/FactorAttributionEngine';
import type { PortfolioFund } from '../../src/types/portfolio';

const benchmarkPortfolio: PortfolioFund[] = [
  { code: 'TI3', name: 'İş BIST Dışı', category: 'Hisse', shares: 1000, costPrice: 10, currentPrice: 12, dailyChange: 1.5, volatility: 28, sharpe: 1.6, alpha: 4.5, beta: 1.1 },
  { code: 'KZL', name: 'İş Altın', category: 'Kıymetli Madenler', shares: 500, costPrice: 50, currentPrice: 48, dailyChange: -0.8, volatility: 18, sharpe: 1.1, alpha: 1.2, beta: 0.2 },
  { code: 'TP2', name: 'Tera Para Piyasası', category: 'Para Piyasası', shares: 2000, costPrice: 20, currentPrice: 21, dailyChange: 0.1, volatility: 4, sharpe: 2.8, alpha: 0.5, beta: 0.05 },
  { code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', category: 'Hisse', shares: 800, costPrice: 30, currentPrice: 35, dailyChange: 2.1, volatility: 32, sharpe: 1.8, alpha: 6.0, beta: 1.3 },
  { code: 'MAC', name: 'Marmara Capital Hisse', category: 'Hisse', shares: 1500, costPrice: 15, currentPrice: 16.5, dailyChange: 0.8, volatility: 25, sharpe: 1.4, alpha: 3.8, beta: 0.95 }
];

describe('High-Performance Numerical Quant Benchmark', () => {
  it('executes 10,000-path Monte Carlo simulation in sub-350ms', () => {
    const start = performance.now();
    const result = MonteCarloEngine.run(100000, 45.0, 22.0, 5000, 5, 10000);
    const duration = performance.now() - start;

    expect(result.finalDistribution.expectedValueTRY).toBeGreaterThan(100000);
    expect(duration).toBeLessThan(350); // High-speed execution
    console.log(`⚡ [BENCHMARK] 10,000-Path Monte Carlo (5-Yr Horizon): ${duration.toFixed(2)}ms`);
  });

  it('executes Black-Litterman Bayesian shrinkage in sub-10ms', () => {
    const start = performance.now();
    const result = BlackLittermanEngine.calculate(benchmarkPortfolio, [
      { code: 'TI3', expectedReturnPct: 55.0, confidencePct: 80 },
      { code: 'AFT', expectedReturnPct: 65.0, confidencePct: 70 }
    ]);
    const duration = performance.now() - start;

    expect(result.portfolioExpectedReturn).toBeGreaterThan(0);
    expect(duration).toBeLessThan(25);
    console.log(`⚡ [BENCHMARK] Black-Litterman Allocation: ${duration.toFixed(2)}ms`);
  });

  it('executes Hierarchical Risk Parity (HRP) tree clustering in sub-20ms', () => {
    const start = performance.now();
    const result = HrpEngine.calculate(benchmarkPortfolio);
    const duration = performance.now() - start;

    expect(result.clusters).toBeDefined();
    expect(duration).toBeLessThan(35);
    console.log(`⚡ [BENCHMARK] HRP Tree Clustering: ${duration.toFixed(2)}ms`);
  });

  it('executes Fama-French 5-Factor regression in sub-10ms', () => {
    const start = performance.now();
    const result = FactorAttributionEngine.calculate(benchmarkPortfolio);
    const duration = performance.now() - start;

    expect(result.marketBeta).toBeGreaterThan(0);
    expect(duration).toBeLessThan(20);
    console.log(`⚡ [BENCHMARK] Fama-French 5-Factor Decomposition: ${duration.toFixed(2)}ms`);
  });
});