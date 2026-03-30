/**
 * Coinbase Onramp Session Token Service
 * Generates session tokens for the Coinbase Onramp widget.
 * Handles fiat → USDC conversion and direct delivery to wallet address.
 */

import { CoinbaseAuthenticator } from '@coinbase/coinbase-sdk/dist/coinbase/authenticator.js';

const CDP_API_KEY = () => process.env.CDP_API_KEY_NAME || '';
const CDP_API_SECRET = () => process.env.CDP_API_KEY_PRIVATE_KEY || '';

// Map wallet blockchain field to Coinbase network names
export const BLOCKCHAIN_TO_COINBASE: Record<string, string> = {
  base: 'base',
  eth: 'ethereum',
  ethereum: 'ethereum',
  polygon: 'polygon',
  sol: 'solana',
  solana: 'solana',
  avax: 'avalanche',
};

export interface CreateOnrampTokenInput {
  wallet_address: string;
  blockchain: string;
}

export interface OnrampTokenResult {
  token: string;
}

/**
 * Create a Coinbase Onramp session token.
 */
export async function createOnrampToken(
  input: CreateOnrampTokenInput
): Promise<OnrampTokenResult> {
  const apiKey = CDP_API_KEY();
  const apiSecret = CDP_API_SECRET();

  if (!apiKey || !apiSecret) {
    return { token: `mock_token_${Date.now()}` };
  }

  const network = BLOCKCHAIN_TO_COINBASE[input.blockchain] || 'base';

  // Use Coinbase's own authenticator to build the JWT
  const auth = new CoinbaseAuthenticator(apiKey, apiSecret, 'sly');
  const jwt = await auth.buildJWT('https://api.developer.coinbase.com/onramp/v1/token', 'POST');

  const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      addresses: [{ address: input.wallet_address, blockchains: [network] }],
      assets: ['USDC'],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Coinbase Onramp] API error: ${response.status}`, errorBody);
    throw new Error(`Coinbase API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return { token: data.token };
}
