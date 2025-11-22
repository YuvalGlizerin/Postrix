import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';
import secrets from 'secret-manager';

const POLYMARKET_HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon

let cachedClient: ClobClient | null = null;

export async function getPolymarketClient(): Promise<ClobClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const address = secrets.SECRET_POLYMARKET_ADDRESS;
  if (!address) {
    throw new Error('SECRET_POLYMARKET_ADDRESS not found in secret-manager');
  }

  const privateKey = secrets.SECRET_POLYMARKET_API_KEY;
  if (!privateKey) {
    throw new Error('SECRET_POLYMARKET_API_KEY not found in secret-manager');
  }

  const signer = new Wallet(privateKey);

  // Derive API credentials
  const credentials = await new ClobClient(POLYMARKET_HOST, CHAIN_ID, signer).createOrDeriveApiKey();

  // Signature type 1: Magic/Email Login, 2: Browser Wallet, 0: EOA
  const signatureType = 1;

  cachedClient = new ClobClient(POLYMARKET_HOST, CHAIN_ID, signer, credentials, signatureType, address);

  return cachedClient;
}
