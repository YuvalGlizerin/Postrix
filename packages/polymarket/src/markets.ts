import { Logger } from 'logger';

import { type Event, type MarketInfo } from './types.ts';

const logger = new Logger('polymarket/markets');
const GAMMA_API_URL = 'https://gamma-api.polymarket.com/events';

export async function getTokenIdForMarket(
  eventSlug: string,
  marketQuestion: string,
  side: 'YES' | 'NO' = 'YES'
): Promise<MarketInfo | null> {
  try {
    const url = new URL(GAMMA_API_URL);
    url.searchParams.set('slug', eventSlug);
    url.searchParams.set('limit', '10');
    url.searchParams.set('offset', '0');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }

    const events = (await response.json()) as Event[];

    if (events.length === 0) {
      logger.error(`Event with slug "${eventSlug}" not found`);
      return null;
    }

    const event = events[0];

    if (!event.markets || event.markets.length === 0) {
      logger.error(`No markets found for event "${eventSlug}"`);
      return null;
    }

    // Search for the market by question (case-insensitive, partial match)
    const market = event.markets.find(m => m.question?.toLowerCase().includes(marketQuestion.toLowerCase()));

    if (!market) {
      logger.error(`Market "${marketQuestion}" not found in event "${eventSlug}"`);
      return null;
    }

    // Parse clobTokenIds (it's a JSON string array)
    if (!market.clobTokenIds) {
      logger.error(`No token IDs found for market "${marketQuestion}"`);
      return null;
    }

    const tokenIds = JSON.parse(market.clobTokenIds) as string[];

    // Determine which token ID corresponds to YES or NO
    let tokenId: string | null = null;
    const sideIndex = side === 'YES' ? 0 : 1;

    if (tokenIds[sideIndex]) {
      tokenId = tokenIds[sideIndex];
    } else {
      logger.error(`Token for ${side} side not found for market "${marketQuestion}"`);
      return null;
    }

    // Get current price (prefer bestAsk, fallback to lastTradePrice, or use 0.66 as default)
    const price = market.bestAsk ?? market.lastTradePrice ?? 0.66;
    const tickSize = market.orderPriceMinTickSize?.toString() ?? '0.01';
    const negRisk = market.negRisk ?? false;

    logger.info(`Found token ID: ${tokenId} for market: ${market.question} (${side} side)`);
    logger.info(`Price: ${price}, TickSize: ${tickSize}, NegRisk: ${negRisk}`);

    return { tokenId, price, tickSize, negRisk };
  } catch (error) {
    logger.error('Error fetching token ID:', { error });
    return null;
  }
}
