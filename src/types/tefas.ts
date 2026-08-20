export interface TefasFund {
  code: string;
  name: string;
  category: string;
  price: number;
  dailyReturnPct: number;
  weeklyReturnPct?: number;
  monthlyReturnPct?: number;
  return3M?: number;
  return6M?: number;
  performance1Y?: number;
  return3Y?: number;
  return5Y?: number;
  portfolioSize?: number;
  investorCount?: number;
  managementFee?: number;
  riskValue?: number;
  currency?: string;
  benchmark?: string;
}

export interface TefasCategorySummary {
  category: string;
  count: number;
  avgReturn1Y: number;
  totalSize: number;
}
