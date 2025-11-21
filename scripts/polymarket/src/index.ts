//npm install @polymarket/clob-client
//npm install ethers
//Client initialization example and dumping API Keys

import 'env-loader';
import secrets from 'secret-manager';
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';

const host = 'https://clob.polymarket.com';
const funder = secrets.SECRET_POLYMARKET_ADDRESS; //This is the address listed below your profile picture when using the Polymarket site.
const signer = new Wallet(secrets.SECRET_POLYMARKET_API_KEY); //This is your Private Key. If using email login export from https://reveal.magic.link/polymarket otherwise export from your Web3 Application

//In general don't create a new API key, always derive or createOrDerive
const creds = new ClobClient(host, 137, signer).createOrDeriveApiKey();

//1: Magic/Email Login
//2: Browser Wallet(Metamask, Coinbase Wallet, etc)
//0: EOA (If you don't know what this is you're not using it)

const signatureType = 1;

// Function to fetch token ID for a market by searching for the market question
interface Market {
  id: string;
  question?: string;
  clobTokenIds?: string; // JSON string array
  outcomes?: string; // JSON string array
  bestAsk?: number;
  lastTradePrice?: number;
  orderPriceMinTickSize?: number;
  negRisk?: boolean;
}

interface Event {
  id: string;
  slug?: string;
  markets?: Market[];
}

async function getTokenIdForMarket(
  eventSlug: string,
  marketQuestion: string,
  side: 'YES' | 'NO' = 'YES'
): Promise<{ tokenId: string; price: number; tickSize: string; negRisk: boolean } | null> {
  try {
    const url = new URL('https://gamma-api.polymarket.com/events');
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
      console.error(`Event with slug "${eventSlug}" not found`);
      return null;
    }

    const event = events[0];

    if (!event.markets || event.markets.length === 0) {
      console.error(`No markets found for event "${eventSlug}"`);
      return null;
    }

    // Search for the market by question (case-insensitive, partial match)
    const market = event.markets.find(m => m.question?.toLowerCase().includes(marketQuestion.toLowerCase()));

    if (!market) {
      console.error(`Market "${marketQuestion}" not found in event "${eventSlug}"`);
      return null;
    }

    // Parse clobTokenIds (it's a JSON string array)
    if (!market.clobTokenIds) {
      console.error(`No token IDs found for market "${marketQuestion}"`);
      return null;
    }

    const tokenIds = JSON.parse(market.clobTokenIds) as string[];

    // Determine which token ID corresponds to YES or NO
    let tokenId: string | null = null;
    const sideIndex = side === 'YES' ? 0 : 1;

    if (tokenIds[sideIndex]) {
      tokenId = tokenIds[sideIndex];
    } else {
      console.error(`Token for ${side} side not found for market "${marketQuestion}"`);
      return null;
    }

    // Get current price (prefer bestAsk, fallback to lastTradePrice, or use 0.66 as default)
    const price = market.bestAsk ?? market.lastTradePrice ?? 0.66;
    const tickSize = market.orderPriceMinTickSize?.toString() ?? '0.01';
    const negRisk = market.negRisk ?? false;

    console.log(`Found token ID: ${tokenId} for market: ${market.question} (${side} side)`);
    console.log(`Price: ${price}, TickSize: ${tickSize}, NegRisk: ${negRisk}`);

    return { tokenId, price, tickSize, negRisk };
  } catch (error) {
    console.error('Error fetching token ID:', error);
    return null;
  }
}

(async () => {
  const clobClient = new ClobClient(host, 137, signer, await creds, signatureType, funder);

  // Get token ID for "Abraham" market from the event
  const marketInfo = await getTokenIdForMarket(
    'what-will-trump-say-during-saudi-investment-forum-on-november-19',
    'Radical Left Lunatic',
    'NO'
  );

  if (!marketInfo) {
    console.error('Could not find token ID for Abraham market. Please check the market name or set tokenID manually.');
    process.exit(1);
  }

  // Calculate minimum shares needed to meet $1 minimum order size
  const minOrderValue = 1.0; // $1 minimum
  const minShares = Math.ceil(minOrderValue / marketInfo.price);
  const orderSize = Math.max(1, minShares); // At least 1 share, but meet minimum if needed

  console.log(
    `Order details: ${orderSize} shares at $${marketInfo.price} = $${(orderSize * marketInfo.price).toFixed(2)}`
  );

  // Buy YES shares for Abraham at current market price
  const resp2 = await clobClient.createAndPostOrder(
    {
      tokenID: marketInfo.tokenId,
      price: 95,
      side: Side.BUY,
      size: orderSize, // Buy enough shares to meet minimum order size
      feeRateBps: 0
    },
    { tickSize: marketInfo.tickSize as '0.01' | '0.001' | '0.0001', negRisk: marketInfo.negRisk },
    OrderType.GTC
  );

  console.log('Order created successfully:', resp2);
})();
