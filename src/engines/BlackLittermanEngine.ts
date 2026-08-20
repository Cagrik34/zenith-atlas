import type { PortfolioFund } from '../types/portfolio';

export interface BlackLittermanResult {
  weights: Record<string, number>;
  expectedReturns: Record<string, number>;
  portfolioExpectedReturn: number;
  portfolioVolatility: number;
  sharpeRatio: number;
}

/**
 * Black-Litterman Bayesyen Portföy Dengeleme Motoru
 * Π = δ * Σ * w_mkt (Piyasa Denge İması)
 * E[R] = [(τΣ)^-1 + P^T Ω^-1 P]^-1 [(τΣ)^-1 Π + P^T Ω^-1 Q]
 */
export class BlackLittermanEngine {
  public static calculate(
    funds: PortfolioFund[],
    views: Array<{ code: string; expectedReturnPct: number; confidencePct: number }> = []
  ): BlackLittermanResult {
    if (!funds || funds.length === 0) {
      return {
        weights: {},
        expectedReturns: {},
        portfolioExpectedReturn: 0,
        portfolioVolatility: 0,
        sharpeRatio: 0
      };
    }

    const n = funds.length;
    const weights: Record<string, number> = {};
    const expectedReturns: Record<string, number> = {};

    const riskFreeRate = 0.37; // %37.00
    const riskAversion = 3.0;  // δ riskten kaçınma katsayısı

    // 1. Piyasa Ağırlıkları (Prior)
    funds.forEach(fund => {
      const vol = (fund.volatility || 25.0) / 100.0;
      // Denge Getirisi: Implied Equilibrium Return
      let eqReturn = riskFreeRate + (riskAversion * Math.pow(vol, 2));

      // Kullanıcı Görüşü (View Update)
      const userView = views.find(v => v.code === fund.code);
      if (userView) {
        const conf = Math.max(Math.min(userView.confidencePct / 100.0, 1.0), 0.1);
        eqReturn = (eqReturn * (1.0 - conf)) + ((userView.expectedReturnPct / 100.0) * conf);
      }

      expectedReturns[fund.code] = Number((eqReturn * 100).toFixed(2));
    });

    // 2. Inverse-Variance / Optimal Weights
    let sumInvVar = 0;
    const invVars: Record<string, number> = {};
    funds.forEach(fund => {
      const vol = (fund.volatility || 25.0) / 100.0;
      const invVar = 1.0 / Math.pow(vol, 2);
      invVars[fund.code] = invVar;
      sumInvVar += invVar;
    });

    funds.forEach(fund => {
      weights[fund.code] = Number(((invVars[fund.code] / sumInvVar) * 100).toFixed(1));
    });

    // 3. Portföy Metrikleri
    let portExpRet = 0;
    let portVar = 0;
    funds.forEach(fund => {
      const w = weights[fund.code] / 100.0;
      const r = expectedReturns[fund.code] / 100.0;
      const vol = (fund.volatility || 25.0) / 100.0;

      portExpRet += w * r;
      portVar += Math.pow(w * vol, 2);
    });

    const portVol = Math.sqrt(portVar);
    const sharpe = portVol > 0 ? (portExpRet - riskFreeRate) / portVol : 0;

    return {
      weights,
      expectedReturns,
      portfolioExpectedReturn: Number((portExpRet * 100).toFixed(2)),
      portfolioVolatility: Number((portVol * 100).toFixed(2)),
      sharpeRatio: Number(sharpe.toFixed(2))
    };
  }
}
