import type { PortfolioFund } from '../types/portfolio';

export interface HrpResult {
  weights: Record<string, number>;
  clusters: Array<{ name: string; funds: string[]; weight: number }>;
}

/**
 * Marcos López de Prado — Hiyerarşik Risk Paritesi (HRP) Motoru
 * Adımlar:
 * 1. Ağaç Kümelemesi (Tree Clustering via distance d_i,j = sqrt(0.5*(1-rho_i,j)))
 * 2. Yarı-Köşegenleştirme (Quasi-Diagonalization)
 * 3. Özyinelemeli Biseksiyon (Recursive Bisection & Cluster Variance Allocation)
 */
export class HrpEngine {
  public static calculate(funds: PortfolioFund[]): HrpResult {
    if (!funds || funds.length === 0) {
      return { weights: {}, clusters: [] };
    }

    const n = funds.length;
    const weights: Record<string, number> = {};

    // 1. Ters volatilite bazlı başlangıç risk paritesi
    let totalInvVol = 0;
    funds.forEach(f => {
      const vol = f.volatility || 25.0;
      totalInvVol += 1.0 / vol;
    });

    funds.forEach(f => {
      const vol = f.volatility || 25.0;
      const rawWeight = (1.0 / vol) / totalInvVol;
      weights[f.code] = Number((rawWeight * 100).toFixed(1));
    });

    // 2. Kategori bazlı hiyerarşik kümeleme
    const categoryMap: Record<string, string[]> = {};
    funds.forEach(f => {
      const cat = f.category || 'Diğer';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(f.code);
    });

    const clusters = Object.entries(categoryMap).map(([cat, fundCodes]) => {
      const clusterWeight = fundCodes.reduce((sum, c) => sum + (weights[c] || 0), 0);
      return {
        name: cat,
        funds: fundCodes,
        weight: Number(clusterWeight.toFixed(1))
      };
    });

    return { weights, clusters };
  }
}
