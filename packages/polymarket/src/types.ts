export interface Market {
  id: string;
  question?: string;
  clobTokenIds?: string; // JSON string array
  outcomes?: string; // JSON string array
  bestAsk?: number;
  lastTradePrice?: number;
  orderPriceMinTickSize?: number;
  negRisk?: boolean;
}

export interface Event {
  id: string;
  slug?: string;
  markets?: Market[];
}

export interface MarketInfo {
  tokenId: string;
  price: number;
  tickSize: string;
  negRisk: boolean;
}
