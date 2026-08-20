export interface MarketInstrument {
  key: string;
  code: string;
  name: string;
  flag?: string;
  buying: number;
  selling: number;
  rate: number;
  changePct: number;
  decimals?: number;
  unit: string;
  source: string;
}

export interface MarketCategory {
  title: string;
  sourceLabel: string;
  items: Record<string, MarketInstrument>;
}

export interface MarketDataState {
  source: string;
  updateDate: string;
  lastUpdate: string;
  categories: {
    featured?: MarketCategory;
    harem?: MarketCategory;
    bigpara?: MarketCategory;
    bist?: MarketCategory;
  };
}

export interface MarketSession {
  id: string;
  name: string;
  icon: string;
  status: string;
  badgeClass: 'open' | 'closed' | 'premarket' | 'warning';
  hours: string;
  countdown: string;
  isImportant: boolean;
  desc: string;
}
