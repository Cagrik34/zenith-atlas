export interface PolicyIndicator {
  name: string;
  rate: number;
  source: string;
  sourceUrl: string;
}

export interface MacroBulletin {
  id: string;
  category: 'all' | 'tcmb' | 'spk' | 'kap' | 'tuik' | 'global';
  categoryLabel: string;
  title: string;
  summary: string;
  date: string;
  source: string;
  sourceUrl: string;
  badge: string;
  impact: 'high' | 'medium' | 'info';
  impactLabel: string;
}

export interface MacroNewsData {
  policyIndicators: {
    tcmbPolicyRate?: PolicyIndicator;
    tuikInflation?: PolicyIndicator;
    realInterestRate?: PolicyIndicator;
    fundWithholdingTax?: {
      generalRate: number;
      equityRate: number;
      source: string;
      sourceUrl: string;
    };
    fedRate?: {
      name: string;
      rate: string;
      source: string;
      sourceUrl: string;
    };
  };
  bulletins: MacroBulletin[];
}
