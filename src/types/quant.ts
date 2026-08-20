export interface FamaFrenchResults {
  jensensAlpha: number; // Yıllıklaştırılmış Alfa %
  marketBeta: number;   // BIST 100 Pazar Riski Yükü
  smbBeta: number;      // Small Minus Big (Büyüklük Primi)
  hmlBeta: number;      // High Minus Low (Değer Primi)
  rmwBeta: number;      // Robust Minus Weak (Kârlılık)
  cmaBeta: number;      // Conservative Minus Aggressive (Yatırım)
  rSquared: number;     // Açıklayıcılık Katsayısı %
  activeShare: number;  // Aktif Pay Oranı %
  interpretation: string;
}

export interface CorrelationMatrixData {
  assets: string[];
  matrix: number[][];
  windowDays: number;
  pcaAbsorptionRatio: number;
  diversificationRatio: number;
}

export interface StressScenarioResult {
  scenarioName: string;
  usdTryShockPct: number;
  tcmbRateShockBps: number;
  bistShockPct: number;
  goldShockPct: number;
  portfolioLossPct: number;
  portfolioLossTRY: number;
  resilienceScore: number;
  topDefensiveAsset: string;
  hedgeRecommendations: string[];
}

export interface TaxLotHarvestCandidate {
  fundCode: string;
  fundName: string;
  lotId: string;
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
  shares: number;
  unrealizedLossTRY: number;
  lossPct: number;
  taxShieldTRY: number; // 2026 %17.5 / %0 yasal stopaj tasarrufu
  holdingDays: number;
  surrogateFunds: Array<{ code: string; name: string; correlation: number; reason: string }>;
}

export interface TaxHarvestSummary {
  totalHarvestableLossTRY: number;
  totalTaxSavingsTRY: number;
  hifoAdvantageTRY: number;
  lots: TaxLotHarvestCandidate[];
}

export interface TreemapNode {
  id: string;
  name: string;
  code: string;
  category: string;
  value: number; // Boyut (Portföy Büyüklüğü veya TL Ağırlık)
  changePct: number; // Renk (Günlük/1Y Değişim)
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}
