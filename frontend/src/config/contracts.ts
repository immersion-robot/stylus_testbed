// Contract addresses and configuration
// Get from environment variables or use default values
export const CONTRACT_CONFIG = {
  // Stylus contract address
  STYLUS_CONTRACT_ADDRESS: import.meta.env.VITE_STYLUS_CONTRACT_ADDRESS || '0x4a2ba922052ba54e29c5417bc979daaf7d5fe4f4',
  
  // USDT ERC20 token address
  USDT_CONTRACT_ADDRESS: import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0x525c2aba45f66987217323e8a05ea400c65d06dc',
  
  // RPC URL
  RPC_URL: import.meta.env.VITE_RPC_URL || 'http://localhost:8547',
  
  // API Base URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888',
};

// Content Type mapping (convert location price to content_type)
// Contract prices: 1=45, 2=50, 3=55 USDT
export const CONTENT_TYPE_MAP: Record<number, number> = {
  45: 1, // 45 USDT -> content_type 1
  50: 2, // 50 USDT -> content_type 2
  55: 3, // 55 USDT -> content_type 3
};

// Reverse mapping: content_type -> USDT price (6 decimal places)
export const CONTENT_TYPE_PRICE: Record<number, string> = {
  1: '45000000', // 45 USDT (6 decimal places)
  2: '50000000', // 50 USDT
  3: '55000000', // 55 USDT
};

