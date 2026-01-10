import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from './useMetaMask';
import { CONTRACT_CONFIG, CONTENT_TYPE_MAP, CONTENT_TYPE_PRICE } from '@/config/contracts';
import { CONTENT_PURCHASE_ABI, ERC20_ABI } from '@/contracts/abis';
import { toast } from 'sonner';

export function useContract() {
  const { account, isConnected } = useMetaMask();

  // MetaMask provider 가져오기
  const getProvider = useCallback(() => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask가 설치되어 있지 않습니다.');
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Provider created:', provider);
      return provider;
    } catch (error) {
      console.error('Provider creation failed:', error);
      throw error;
    }
  }, []);

  // 컨트랙트 인스턴스 가져오기
  const getContentPurchaseContract = useCallback(async () => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      console.log('Signer address:', await signer.getAddress());
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        CONTENT_PURCHASE_ABI,
        signer
      );
      console.log('ContentPurchaseContract created:', contract);
      return contract;
    } catch (error) {
      console.error('Failed to create ContentPurchaseContract:', error);
      throw error;
    }
  }, [getProvider]);

  // USDT ERC20 컨트랙트 인스턴스 가져오기
  const getUSDTContract = useCallback(async () => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.USDT_CONTRACT_ADDRESS,
        ERC20_ABI,
        signer
      );
      console.log('USDT Contract created:', contract);
      return contract;
    } catch (error) {
      console.error('Failed to create USDT Contract:', error);
      throw error;
    }
  }, [getProvider]);

  // 가격 조회
  const getContentPrice = useCallback(async (contentType: number) => {
    try {
      const contract = await getContentPurchaseContract();
      const price = await contract.getContentPrice(contentType);
      return price.toString();
    } catch (error) {
      console.error('가격 조회 실패:', error);
      throw error;
    }
  }, [getContentPurchaseContract]);

  // Allowance 확인
  const checkAllowance = useCallback(async (amount: string) => {
    if (!account) throw new Error('지갑이 연결되지 않았습니다.');
    
    try {
      const usdtContract = await getUSDTContract();
      const allowance = await usdtContract.allowance(
        account,
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS
      );
      return allowance.toString();
    } catch (error) {
      console.error('Allowance 확인 실패:', error);
      throw error;
    }
  }, [account, getUSDTContract]);

  // USDT Approve
  const approveUSDT = useCallback(async (amount: string) => {
    if (!account) throw new Error('지갑이 연결되지 않았습니다.');
    
    try {
      console.log('Approving USDT:', { 
        spender: CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS, 
        amount 
      });
      
      // 현재 nonce 확인 (pending 포함)
      const provider = getProvider();
      const latestNonce = await provider.getTransactionCount(account, 'latest');
      const pendingNonce = await provider.getTransactionCount(account, 'pending');
      console.log('Nonce check before approve:', { latest: latestNonce, pending: pendingNonce });
      
      // pending nonce가 더 크면 대기 중인 트랜잭션이 있음을 알림
      if (pendingNonce > latestNonce) {
        console.warn(`Pending transactions detected. Latest: ${latestNonce}, Pending: ${pendingNonce}`);
        toast.warning(`대기 중인 트랜잭션이 ${pendingNonce - latestNonce}개 있습니다. 처리될 때까지 기다려주세요.`, { duration: 4000 });
        // 대기 중인 트랜잭션이 많으면 진행하지 않음
        if (pendingNonce - latestNonce > 5) {
          throw new Error('대기 중인 트랜잭션이 너무 많습니다. 먼저 처리해주세요.');
        }
      }
      
      const usdtContract = await getUSDTContract();
      
      // MetaMask가 nonce를 관리하므로, 여기서는 트랜잭션을 직접 보냅니다
      // MetaMask가 자동으로 올바른 nonce를 사용할 것입니다
      const tx = await usdtContract.approve(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        amount
      );
      console.log('Approve transaction sent with nonce:', tx.nonce, 'hash:', tx.hash);
      toast.info('트랜잭션 전송 중...');
      const receipt = await tx.wait();
      console.log('Approve receipt:', receipt);
      toast.success('Approve 완료!');
      return { receipt, hash: tx.hash };
    } catch (error: any) {
      console.error('Approve 실패:', error);
      console.error('Approve error details:', {
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        data: error?.data,
      });
      
      // Nonce too high 오류 처리
      if (error?.message?.includes('nonce') || error?.message?.includes('Nonce') || error?.message?.toLowerCase().includes('nonce too high')) {
        try {
          const provider = getProvider();
          const latestNonce = await provider.getTransactionCount(account, 'latest').catch(() => null);
          const pendingNonce = await provider.getTransactionCount(account, 'pending').catch(() => null);
          console.error('Nonce error details:', { latestNonce, pendingNonce, error: error.message });
          
          const errorMessage = `Nonce 오류 발생!\n\n체인 상태:\n- Latest nonce: ${latestNonce ?? 'N/A'}\n- Pending nonce: ${pendingNonce ?? 'N/A'}\n\n해결 방법:\n1. MetaMask 설정 > 고급 > 계정 재설정\n   (이 작업은 트랜잭션 히스토리를 지웁니다)\n2. 또는 로컬 체인(nitro-devnode)을 재시작\n3. MetaMask에서 보류 중인 트랜잭션 취소`;
          
          toast.error(errorMessage, { duration: 10000 });
        } catch (nonceCheckError) {
          console.error('Failed to check nonce during error handling:', nonceCheckError);
          toast.error(
            'Nonce 오류 발생! MetaMask 설정 > 고급 > 계정 재설정을 시도해주세요.',
            { duration: 5000 }
          );
        }
      } else if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('사용자가 트랜잭션을 거부했습니다.');
      } else {
        toast.error(`Approve 실패: ${error.message || error.reason || '알 수 없는 오류'}`);
      }
      throw error;
    }
  }, [account, getUSDTContract, getProvider]);

  // 콘텐츠 구매
  const purchaseContent = useCallback(async (contentType: number) => {
    if (!account) throw new Error('지갑이 연결되지 않았습니다.');
    
    try {
      console.log('Purchasing content:', { contentType, contractAddress: CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS });
      
      // 현재 nonce 확인 (pending 포함)
      const provider = getProvider();
      const latestNonce = await provider.getTransactionCount(account, 'latest');
      const pendingNonce = await provider.getTransactionCount(account, 'pending');
      console.log('Nonce check before purchase:', { latest: latestNonce, pending: pendingNonce });
      
      // pending nonce가 더 크면 대기 중인 트랜잭션이 있음을 알림
      if (pendingNonce > latestNonce) {
        console.warn(`Pending transactions detected. Latest: ${latestNonce}, Pending: ${pendingNonce}`);
        toast.warning(`대기 중인 트랜잭션이 ${pendingNonce - latestNonce}개 있습니다. 처리될 때까지 기다려주세요.`, { duration: 4000 });
        // 대기 중인 트랜잭션이 많으면 진행하지 않음
        if (pendingNonce - latestNonce > 5) {
          throw new Error('대기 중인 트랜잭션이 너무 많습니다. 먼저 처리해주세요.');
        }
      }
      
      const contract = await getContentPurchaseContract();
      console.log('Contract instance created');
      
      // MetaMask가 nonce를 관리하므로, 여기서는 트랜잭션을 직접 보냅니다
      // MetaMask가 자동으로 올바른 nonce를 사용할 것입니다
      const tx = await contract.purchaseContent(contentType);
      console.log('Purchase transaction sent with nonce:', tx.nonce, 'hash:', tx.hash);
      toast.info('구매 트랜잭션 전송 중...');
      const receipt = await tx.wait();
      console.log('Purchase receipt:', receipt);
      toast.success('구매 완료!');
      return { receipt, hash: tx.hash };
    } catch (error: any) {
      console.error('구매 실패:', error);
      console.error('Purchase error details:', {
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        data: error?.data,
      });
      
      // Nonce too high 오류 처리
      if (error?.message?.includes('nonce') || error?.message?.includes('Nonce') || error?.message?.toLowerCase().includes('nonce too high')) {
        try {
          const provider = getProvider();
          const latestNonce = await provider.getTransactionCount(account, 'latest').catch(() => null);
          const pendingNonce = await provider.getTransactionCount(account, 'pending').catch(() => null);
          console.error('Nonce error details:', { latestNonce, pendingNonce, error: error.message });
          
          const errorMessage = `Nonce 오류 발생!\n\n체인 상태:\n- Latest nonce: ${latestNonce ?? 'N/A'}\n- Pending nonce: ${pendingNonce ?? 'N/A'}\n\n해결 방법:\n1. MetaMask 설정 > 고급 > 계정 재설정\n   (이 작업은 트랜잭션 히스토리를 지웁니다)\n2. 또는 로컬 체인(nitro-devnode)을 재시작\n3. MetaMask에서 보류 중인 트랜잭션 취소`;
          
          toast.error(errorMessage, { duration: 10000 });
        } catch (nonceCheckError) {
          console.error('Failed to check nonce during error handling:', nonceCheckError);
          toast.error(
            'Nonce 오류 발생! MetaMask 설정 > 고급 > 계정 재설정을 시도해주세요.',
            { duration: 5000 }
          );
        }
      } else if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('사용자가 트랜잭션을 거부했습니다.');
      } else {
        toast.error(`구매 실패: ${error.message || error.reason || '알 수 없는 오류'}`);
      }
      throw error;
    }
  }, [account, getContentPurchaseContract, getProvider]);

  // 가격을 content_type으로 변환
  const getContentTypeFromPrice = useCallback((price: number): number => {
    return CONTENT_TYPE_MAP[price] || 1; // 기본값은 1
  }, []);

  // content_type으로 가격 가져오기 (6자리 소수점)
  const getPriceFromContentType = useCallback((contentType: number): string => {
    return CONTENT_TYPE_PRICE[contentType] || CONTENT_TYPE_PRICE[1];
  }, []);

  // Owner가 가진 Token 개수 조회
  const getOwnerTokenCount = useCallback(async (ownerAddress: string): Promise<number> => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        CONTENT_PURCHASE_ABI,
        provider
      );
      const count = await contract.getOwnerTokenCount(ownerAddress);
      return Number(count.toString());
    } catch (error) {
      console.error('getOwnerTokenCount 실패:', error);
      throw error;
    }
  }, [getProvider]);

  // Owner의 특정 인덱스 Token ID 조회
  const getOwnerTokenAtIndex = useCallback(async (ownerAddress: string, index: number): Promise<string> => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        CONTENT_PURCHASE_ABI,
        provider
      );
      const tokenId = await contract.getOwnerTokenAtIndex(ownerAddress, index);
      return tokenId.toString();
    } catch (error) {
      console.error('getOwnerTokenAtIndex 실패:', error);
      throw error;
    }
  }, [getProvider]);

  // Token ID의 Waypoint 조회
  const getWaypoint = useCallback(async (tokenId: string): Promise<number> => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        CONTENT_PURCHASE_ABI,
        provider
      );
      const waypoint = await contract.getWaypoint(tokenId);
      const waypointNum = Number(waypoint.toString());
      return waypointNum > 0 ? waypointNum : 0; // 0이면 설정되지 않음
    } catch (error) {
      console.error('getWaypoint 실패:', error);
      return 0;
    }
  }, [getProvider]);

  // PurchaseEvent 이벤트 조회
  const getPurchaseEvents = useCallback(async (buyerAddress: string, fromBlock: number = 0): Promise<Array<{
    buyer: string;
    contentType: number;
    purchaseTime: number;
    amount: string;
    tokenId: string;
    transactionHash: string;
    blockNumber: number;
  }>> => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        CONTENT_PURCHASE_ABI,
        provider
      );
      
      // PurchaseEvent 필터 (buyer가 indexed이므로 필터링 가능)
      const filter = contract.filters.PurchaseEvent(buyerAddress);
      const events = await contract.queryFilter(filter, fromBlock);
      
      return events.map(event => ({
        buyer: event.args?.buyer || '',
        contentType: Number(event.args?.contentType?.toString() || '0'),
        purchaseTime: Number(event.args?.purchaseTime?.toString() || '0'),
        amount: event.args?.amount?.toString() || '0',
        tokenId: event.args?.tokenId?.toString() || '0',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      }));
    } catch (error) {
      console.error('getPurchaseEvents 실패:', error);
      return [];
    }
  }, [getProvider]);

  // 전체 구매 프로세스: approve + purchase
  const purchaseWithApprove = useCallback(async (price: number) => {
    console.log('purchaseWithApprove called with price:', price);
    
    if (!isConnected || !account) {
      throw new Error('지갑을 먼저 연결해주세요.');
    }

    const contentType = getContentTypeFromPrice(price);
    const priceAmount = getPriceFromContentType(contentType);
    
    console.log('Price mapping:', { price, contentType, priceAmount });

    try {
      // 1. 현재 allowance 확인
      console.log('Checking allowance...');
      const currentAllowance = await checkAllowance(priceAmount);
      const requiredAmount = BigInt(priceAmount);
      console.log('Allowance check:', { currentAllowance, requiredAmount: requiredAmount.toString() });

      // 2. Allowance가 부족하면 approve
      if (BigInt(currentAllowance) < requiredAmount) {
        console.log('Allowance insufficient, approving...');
        toast.info('USDT 승인 중...');
        await approveUSDT(priceAmount);
        console.log('Approve completed');
      } else {
        console.log('Allowance sufficient, skipping approve');
      }

      // 3. 구매 실행
      console.log('Purchasing content with contentType:', contentType);
      const purchaseResult = await purchaseContent(contentType);
      console.log('Purchase completed:', purchaseResult);
      
      return {
        receipt: purchaseResult.receipt,
        transactionHash: purchaseResult.hash,
        contentType,
        amount: priceAmount,
      };
    } catch (error) {
      console.error('Error in purchaseWithApprove:', error);
      throw error;
    }
  }, [
    isConnected,
    account,
    getContentTypeFromPrice,
    getPriceFromContentType,
    checkAllowance,
    approveUSDT,
    purchaseContent,
  ]);

  return {
    getContentPrice,
    checkAllowance,
    approveUSDT,
    purchaseContent,
    purchaseWithApprove,
    getContentTypeFromPrice,
    getPriceFromContentType,
    getOwnerTokenCount,
    getOwnerTokenAtIndex,
    getWaypoint,
    getPurchaseEvents,
  };
}

