import { OrderType, Side } from '@polymarket/clob-client';

import { type MarketInfo } from './types.ts';
import { getPolymarketClient } from './client.ts';

export type OrderSide = 'BUY' | 'SELL';

export async function placeOrder(
  tokenId: string,
  side: OrderSide,
  size: number,
  price: number,
  tickSize: string = '0.01',
  negRisk: boolean = false
) {
  const client = await getPolymarketClient();

  return client.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
      size,
      feeRateBps: 0
    },
    {
      tickSize: tickSize as '0.01' | '0.001' | '0.0001',
      negRisk
    },
    OrderType.GTC
  );
}

export async function buy(marketInfo: MarketInfo, size: number, price: number) {
  return placeOrder(marketInfo.tokenId, 'BUY', size, price, marketInfo.tickSize, marketInfo.negRisk);
}

export async function sell(marketInfo: MarketInfo, size: number, price: number) {
  return placeOrder(marketInfo.tokenId, 'SELL', size, price, marketInfo.tickSize, marketInfo.negRisk);
}
