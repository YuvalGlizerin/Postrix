//npm install @polymarket/clob-client
//npm install ethers
//Client initialization example and dumping API Keys

import 'env-loader';
import * as polymarket from 'polymarket';
import { Logger } from 'logger';

const logger = new Logger('polymarket-script');

(async () => {
  // Get token ID for "Abraham" market from the event
  const marketInfo = await polymarket.getTokenIdForMarket(
    'what-will-trump-say-during-saudi-investment-forum-on-november-19',
    'Radical Left Lunatic',
    'NO'
  );

  if (!marketInfo) {
    logger.error('Could not find token ID for Abraham market. Please check the market name or set tokenID manually.');
    process.exit(1);
  }

  // Calculate minimum shares needed to meet $1 minimum order size
  const minOrderValue = 1.0; // $1 minimum
  const minShares = Math.ceil(minOrderValue / marketInfo.price);
  const orderSize = Math.max(1, minShares); // At least 1 share, but meet minimum if needed

  logger.info(
    `Order details: ${orderSize} shares at $${marketInfo.price} = $${(orderSize * marketInfo.price).toFixed(2)}`
  );

  // Buy YES shares for Abraham at current market price
  const resp2 = await polymarket.placeOrder(marketInfo.tokenId, 'BUY', orderSize, marketInfo.price);

  logger.info('Order created successfully:', resp2);
})();
