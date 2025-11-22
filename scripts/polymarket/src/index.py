# pip install eth-account requests web3
# Client initialization example and dumping API Keys

import asyncio
import json
import math
import time
from typing import Optional, Literal
from dataclasses import dataclass
from eth_account import Account
from eth_account.messages import encode_defunct
import requests
from web3 import Web3

# Hardcoded secrets (replace with actual values)
SECRET_POLYMARKET_ADDRESS = "TEST_ADDRESS"  # This is the address listed below your profile picture when using the Polymarket site.
SECRET_POLYMARKET_API_KEY = "TEST_API_KEY"  # This is your Private Key. If using email login export from https://reveal.magic.link/polymarket otherwise export from your Web3 Application

host = 'https://clob.polymarket.com'
funder = SECRET_POLYMARKET_ADDRESS
signer = Account.from_key(SECRET_POLYMARKET_API_KEY)

# In general don't create a new API key, always derive or createOrDerive
# Note: This is a simplified version - the actual ClobClient.createOrDeriveApiKey() 
# would need to be implemented or use the Polymarket Python SDK if available
# For now, we'll assume the API key is already derived

# 1: Magic/Email Login
# 2: Browser Wallet(Metamask, Coinbase Wallet, etc)
# 0: EOA (If you don't know what this is you're not using it)

signature_type = 1


@dataclass
class Market:
    id: str
    question: Optional[str] = None
    clobTokenIds: Optional[str] = None  # JSON string array
    outcomes: Optional[str] = None  # JSON string array
    bestAsk: Optional[float] = None
    lastTradePrice: Optional[float] = None
    orderPriceMinTickSize: Optional[float] = None
    negRisk: Optional[bool] = None


@dataclass
class Event:
    id: str
    slug: Optional[str] = None
    markets: Optional[list[Market]] = None


class ClobClient:
    def __init__(self, host: str, chain_id: int, signer: Account, api_key: dict, signature_type: int, funder: str):
        self.host = host
        self.chain_id = chain_id
        self.signer = signer
        self.api_key = api_key
        self.signature_type = signature_type
        self.funder = funder
        self.w3 = Web3()

    def _sign_message(self, message: str) -> str:
        """Sign a message using the wallet"""
        message_hash = encode_defunct(text=message)
        signed_message = self.signer.sign_message(message_hash)
        return signed_message.signature.hex()

    def _get_headers(self) -> dict:
        """Get headers for API requests with authentication"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        # Add API key authentication if available
        if self.api_key and self.api_key.get('key'):
            headers['Authorization'] = f"Bearer {self.api_key['key']}"
        
        return headers

    @staticmethod
    def createOrDeriveApiKey(host: str, signer: Account, signature_type: int) -> dict:
        """Create or derive an API key for authentication"""
        url = f"{host}/api-keys"
        
        # Create a message to sign for API key creation
        timestamp = str(int(time.time() * 1000))
        message = f"Create API key\nTimestamp: {timestamp}"
        
        # Sign the message
        message_hash = encode_defunct(text=message)
        signed_message = signer.sign_message(message_hash)
        signature = signed_message.signature.hex()
        
        # Prepare the request payload
        payload = {
            "signature": signature,
            "signatureType": signature_type,
            "timestamp": timestamp
        }
        
        # Make the request
        response = requests.post(url, json=payload, headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        })
        
        if not response.ok:
            # If API key already exists, try to get it
            if response.status_code == 409:
                # Try to get existing API keys
                get_url = f"{host}/api-keys"
                get_response = requests.get(get_url, headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                })
                if get_response.ok:
                    keys = get_response.json()
                    if keys and len(keys) > 0:
                        return keys[0]
            
            raise Exception(f'Failed to create/derive API key: {response.status_code} {response.text}')
        
        return response.json()

    async def createAndPostOrder(
        self,
        order_params: dict,
        market_params: dict,
        order_type: str
    ) -> dict:
        """Create and post an order to Polymarket"""
        # This is a simplified implementation
        # The actual ClobClient would handle the full order creation flow
        # including signing, nonce management, etc.
        
        url = f"{self.host}/order"
        
        # Construct the order payload
        payload = {
            "tokenID": order_params["tokenID"],
            "price": str(order_params["price"]),
            "side": order_params["side"],
            "size": str(order_params["size"]),
            "feeRateBps": str(order_params.get("feeRateBps", 0)),
            "tickSize": market_params.get("tickSize", "0.01"),
            "negRisk": market_params.get("negRisk", False),
            "orderType": order_type
        }
        
        # In a real implementation, you would:
        # 1. Get the order ID from the API
        # 2. Sign the order
        # 3. Post the signed order
        
        # For now, this is a placeholder that shows the structure
        # You would need to implement the full Polymarket CLOB API integration
        response = requests.post(url, json=payload, headers=self._get_headers())
        response.raise_for_status()
        return response.json()


async def getTokenIdForMarket(
    event_slug: str,
    market_question: str,
    side: Literal['YES', 'NO'] = 'YES'
) -> Optional[dict]:
    """Fetch token ID for a market by searching for the market question"""
    try:
        url = 'https://gamma-api.polymarket.com/events'
        params = {
            'slug': event_slug,
            'limit': '10',
            'offset': '0'
        }

        response = requests.get(url, params=params, headers={'Accept': 'application/json'})

        if not response.ok:
            raise Exception(f'Failed to fetch event: {response.reason}')

        events = response.json()

        if len(events) == 0:
            print(f'Event with slug "{event_slug}" not found')
            return None

        event = events[0]

        if not event.get('markets') or len(event['markets']) == 0:
            print(f'No markets found for event "{event_slug}"')
            return None

        # Search for the market by question (case-insensitive, partial match)
        market = None
        for m in event['markets']:
            if m.get('question') and market_question.lower() in m['question'].lower():
                market = m
                break

        if not market:
            print(f'Market "{market_question}" not found in event "{event_slug}"')
            return None

        # Parse clobTokenIds (it's a JSON string array)
        if not market.get('clobTokenIds'):
            print(f'No token IDs found for market "{market_question}"')
            return None

        token_ids = json.loads(market['clobTokenIds'])

        # Determine which token ID corresponds to YES or NO
        token_id = None
        side_index = 0 if side == 'YES' else 1

        if side_index < len(token_ids):
            token_id = token_ids[side_index]
        else:
            print(f'Token for {side} side not found for market "{market_question}"')
            return None

        # Get current price (prefer bestAsk, fallback to lastTradePrice, or use 0.66 as default)
        price = market.get('bestAsk') or market.get('lastTradePrice') or 0.66
        tick_size = str(market.get('orderPriceMinTickSize') or 0.01)
        neg_risk = market.get('negRisk', False)

        print(f'Found token ID: {token_id} for market: {market.get("question")} ({side} side)')
        print(f'Price: {price}, TickSize: {tick_size}, NegRisk: {neg_risk}')

        return {'tokenId': token_id, 'price': price, 'tickSize': tick_size, 'negRisk': neg_risk}
    except Exception as error:
        print(f'Error fetching token ID: {error}')
        return None


async def main():
    # Create or derive API key for authentication
    print('Creating/deriving API key...')
    api_key_creds = ClobClient.createOrDeriveApiKey(host, signer, signature_type)
    print(f'API key obtained: {api_key_creds.get("key", "N/A")[:20]}...')
    
    clob_client = ClobClient(host, 137, signer, api_key_creds, signature_type, funder)

    # Get token ID for "Abraham" market from the event
    market_info = await getTokenIdForMarket(
        'what-will-trump-say-during-saudi-investment-forum-on-november-19',
        'Abraham',
        'YES'
    )

    if not market_info:
        print('Could not find token ID for Abraham market. Please check the market name or set tokenID manually.')
        exit(1)

    # Calculate minimum shares needed to meet $1 minimum order size
    min_order_value = 1.0  # $1 minimum
    min_shares = math.ceil(min_order_value / market_info['price'])
    order_size = max(1, min_shares)  # At least 1 share, but meet minimum if needed

    print(
        f'Order details: {order_size} shares at ${market_info["price"]} = ${(order_size * market_info["price"]):.2f}'
    )

    # Buy YES shares for Abraham at current market price
    resp2 = await clob_client.createAndPostOrder(
        {
            'tokenID': market_info['tokenId'],
            'price': market_info['price'],
            'side': 'BUY',
            'size': order_size,  # Buy enough shares to meet minimum order size
            'feeRateBps': 0
        },
        {'tickSize': market_info['tickSize'], 'negRisk': market_info['negRisk']},
        'GTC'
    )

    print('Order created successfully:', resp2)


if __name__ == '__main__':
    asyncio.run(main())

