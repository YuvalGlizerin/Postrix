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
    'what-will-keir-starmer-say-at-the-next-prime-ministers-questions-event-354',
    'Footing',
    'YES'
  );

  if (!marketInfo) {
    logger.error('Could not find token ID for Abraham market. Please check the market name or set tokenID manually.');
    process.exit(1);
  }

  const orderSize = 10; // 10 shares hardcoded
  const price = 0.95; // 95 cents hardcoded

  logger.info(
    `Order details: ${orderSize} shares at $${marketInfo.price} = $${(orderSize * marketInfo.price).toFixed(2)}`
  );

  // Buy YES shares for Abraham at current market price
  const resp2 = await polymarket.placeOrder(marketInfo.tokenId, 'BUY', orderSize, price);

  logger.info('Order created successfully:', resp2);
})();
