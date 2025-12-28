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
      const usdtContract = await getUSDTContract();
      const tx = await usdtContract.approve(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        amount
      );
      console.log('Approve transaction sent:', tx.hash);
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
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('사용자가 트랜잭션을 거부했습니다.');
      } else {
        toast.error(`Approve 실패: ${error.message || error.reason || '알 수 없는 오류'}`);
      }
      throw error;
    }
  }, [account, getUSDTContract]);

  // 콘텐츠 구매
  const purchaseContent = useCallback(async (contentType: number) => {
    if (!account) throw new Error('지갑이 연결되지 않았습니다.');
    
    try {
      console.log('Purchasing content:', { contentType, contractAddress: CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS });
      const contract = await getContentPurchaseContract();
      console.log('Contract instance created');
      const tx = await contract.purchaseContent(contentType);
      console.log('Purchase transaction sent:', tx.hash);
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
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('사용자가 트랜잭션을 거부했습니다.');
      } else {
        toast.error(`구매 실패: ${error.message || error.reason || '알 수 없는 오류'}`);
      }
      throw error;
    }
  }, [account, getContentPurchaseContract]);

  // 가격을 content_type으로 변환
  const getContentTypeFromPrice = useCallback((price: number): number => {
    return CONTENT_TYPE_MAP[price] || 1; // 기본값은 1
  }, []);

  // content_type으로 가격 가져오기 (6자리 소수점)
  const getPriceFromContentType = useCallback((contentType: number): string => {
    return CONTENT_TYPE_PRICE[contentType] || CONTENT_TYPE_PRICE[1];
  }, []);

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
  };
}

