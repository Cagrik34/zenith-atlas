export interface FundLot {
  id: string;
  buyDate: string;
  buyPrice: number;
  shares: number;
  totalCost: number;
}

export interface PortfolioFund {
  code: string;
  name: string;
  category: string;
  shares: number;
  costPrice: number;
  currentPrice: number;
  dailyReturnPct?: number;
  performance1Y?: number;
  benchmark?: string;
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  ter?: number;
  lots?: FundLot[];
  notes?: string;
}

export interface PendingOrder {
  id: string;
  fundCode: string;
  orderType: 'BUY' | 'SELL';
  shares: number;
  targetPrice: number;
  totalAmount: number;
  createdAt: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

export interface PortfolioAccount {
  id: string;
  name: string;
  isMain: boolean;
  funds: PortfolioFund[];
  cashTL: number;
  pendingOrders: PendingOrder[];
  createdAt: string;
}

export interface MultiPortfolioState {
  activePortfolioId: string;
  portfolios: PortfolioAccount[];
}
