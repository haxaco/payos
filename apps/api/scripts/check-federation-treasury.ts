/**
 * Check Treasury — inspect the EVM wallet used for federation on-chain payouts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import {
  getWalletAddress,
  getUsdcBalance,
  getChainConfig,
  getCurrentChain,
} from '../src/config/blockchain.js';

(async () => {
  try {
    const chain = getCurrentChain();
    const config = getChainConfig();
    const addr = getWalletAddress();
    const bal = await getUsdcBalance(addr);
    console.log('Chain:             ', chain);
    console.log('RPC:               ', config.rpcUrl);
    console.log('USDC contract:     ', config.contracts.usdc);
    console.log('Treasury address:  ', addr);
    console.log('Treasury USDC bal: ', bal);
    console.log('Block explorer:    ', `${config.blockExplorerUrl}/address/${addr}`);
  } catch (err: any) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
