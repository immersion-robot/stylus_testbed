// 컨트랙트 주소 및 설정
// 환경 변수에서 가져오거나 기본값 사용
export const CONTRACT_CONFIG = {
  // Stylus 컨트랙트 주소
  STYLUS_CONTRACT_ADDRESS: import.meta.env.VITE_STYLUS_CONTRACT_ADDRESS || '0x4a2ba922052ba54e29c5417bc979daaf7d5fe4f4',
  
  // USDT ERC20 토큰 주소
  USDT_CONTRACT_ADDRESS: import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0x525c2aba45f66987217323e8a05ea400c65d06dc',
  
  // RPC URL
  RPC_URL: import.meta.env.VITE_RPC_URL || 'http://localhost:8547',
};

// Content Type 매핑 (location price를 content_type으로 변환)
// 컨트랙트의 가격: 1=45, 2=50, 3=55 USDT
export const CONTENT_TYPE_MAP: Record<number, number> = {
  45: 1, // 45 USDT -> content_type 1
  50: 2, // 50 USDT -> content_type 2
  55: 3, // 55 USDT -> content_type 3
};

// 역매핑: content_type -> USDT 가격 (6자리 소수점)
export const CONTENT_TYPE_PRICE: Record<number, string> = {
  1: '45000000', // 45 USDT (6자리 소수점)
  2: '50000000', // 50 USDT
  3: '55000000', // 55 USDT
};

