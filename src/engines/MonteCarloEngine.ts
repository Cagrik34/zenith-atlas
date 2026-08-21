export interface MonteCarloResult {
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  finalDistribution: {
    expectedValueTRY: number;
    worstCase5PctTRY: number;
    bestCase95PctTRY: number;
    successRatePct: number;
  };
  timeStepsMonths: number[];
}

/**
 * 10.000 Patikalı Geometrik Brownian Hareketi (GBM) Monte Carlo Simülatörü
 * dS_t = μ * S_t * dt + σ * S_t * dW_t
 */
export class MonteCarloEngine {
  public static run(
    initialCapitalTRY: number,
    annualExpectedReturnPct: number,
    annualVolatilityPct: number,
    monthlyContributionTRY: number = 0,
    horizonYears: number = 5,
    simulationsCount: number = 2000
  ): MonteCarloResult {
    const months = horizonYears * 12;
    const timeStepsMonths = Array.from({ length: months + 1 }, (_, i) => i);

    if (initialCapitalTRY <= 0 && monthlyContributionTRY <= 0) {
      const zeros = Array(months + 1).fill(0);
      return {
        percentiles: { p5: zeros, p25: zeros, p50: zeros, p75: zeros, p95: zeros },
        finalDistribution: { expectedValueTRY: 0, worstCase5PctTRY: 0, bestCase95PctTRY: 0, successRatePct: 0 },
        timeStepsMonths
      };
    }

    const dt = 1.0 / 12.0;
    const mu = annualExpectedReturnPct / 100.0;
    const sigma = annualVolatilityPct / 100.0;
    const paths: number[][] = Array.from({ length: simulationsCount }, () => {
      const path = [initialCapitalTRY];
      let val = initialCapitalTRY;

      for (let m = 1; m <= months; m++) {
        // Box-Muller normal dağılım rastgele sayısı Z ~ N(0,1)
        const u1 = Math.max(Math.random(), 1e-10);
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Geometrik Brownian drift & diffusion
        const drift = (mu - 0.5 * Math.pow(sigma, 2)) * dt;
        const diffusion = sigma * Math.sqrt(dt) * z;
        val = (val + monthlyContributionTRY) * Math.exp(drift + diffusion);
        path.push(val);
      }
      return path;
    });

    // Her ay için yüzdelik dilimleri (percentiles) hesapla
    const p5: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p95: number[] = [];

    for (let m = 0; m <= months; m++) {
      const stepValues = paths.map(p => p[m]).sort((a, b) => a - b);
      p5.push(Math.round(stepValues[Math.floor(simulationsCount * 0.05)]));
      p25.push(Math.round(stepValues[Math.floor(simulationsCount * 0.25)]));
      p50.push(Math.round(stepValues[Math.floor(simulationsCount * 0.50)]));
      p75.push(Math.round(stepValues[Math.floor(simulationsCount * 0.75)]));
      p95.push(Math.round(stepValues[Math.floor(simulationsCount * 0.95)]));
    }

    const finalValues = paths.map(p => p[months]).sort((a, b) => a - b);
    const totalInvested = initialCapitalTRY + (monthlyContributionTRY * months);
    const profitableCount = finalValues.filter(v => v >= totalInvested).length;
    const successRatePct = Number(((profitableCount / simulationsCount) * 100).toFixed(1));

    return {
      percentiles: { p5, p25, p50, p75, p95 },
      finalDistribution: {
        expectedValueTRY: Math.round(p50[months]),
        worstCase5PctTRY: Math.round(p5[months]),
        bestCase95PctTRY: Math.round(p95[months]),
        successRatePct
      },
      timeStepsMonths
    };
  }
}
