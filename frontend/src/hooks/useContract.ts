import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from './useMetaMask';
import { CONTRACT_CONFIG, CONTENT_TYPE_MAP, CONTENT_TYPE_PRICE } from '@/config/contracts';
import { CONTENT_PURCHASE_ABI, ERC20_ABI } from '@/contracts/abis';
import { toast } from 'sonner';

export function useContract() {
  const { account, isConnected } = useMetaMask();

  // Get MetaMask provider
  const getProvider = useCallback(() => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed.');
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

  // Get contract instance
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

  // Get USDT ERC20 contract instance
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

  // Get price
  const getContentPrice = useCallback(async (contentType: number) => {
    try {
      const contract = await getContentPurchaseContract();
      const price = await contract.getContentPrice(contentType);
      return price.toString();
    } catch (error) {
      console.error('Failed to get price:', error);
      throw error;
    }
  }, [getContentPurchaseContract]);

  // Check allowance
  const checkAllowance = useCallback(async (amount: string) => {
    if (!account) throw new Error('Wallet is not connected.');
    
    try {
      const usdtContract = await getUSDTContract();
      const allowance = await usdtContract.allowance(
        account,
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS
      );
      return allowance.toString();
    } catch (error) {
      console.error('Failed to check allowance:', error);
      throw error;
    }
  }, [account, getUSDTContract]);

  // USDT Approve
  const approveUSDT = useCallback(async (amount: string) => {
    if (!account) throw new Error('Wallet is not connected.');
    
    try {
      console.log('Approving USDT:', { 
        spender: CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS, 
        amount 
      });
      
      // Check current nonce (including pending)
      const provider = getProvider();
      const latestNonce = await provider.getTransactionCount(account, 'latest');
      const pendingNonce = await provider.getTransactionCount(account, 'pending');
      console.log('Nonce check before approve:', { latest: latestNonce, pending: pendingNonce });
      
      // Warn if pending nonce is greater (pending transactions exist)
      if (pendingNonce > latestNonce) {
        console.warn(`Pending transactions detected. Latest: ${latestNonce}, Pending: ${pendingNonce}`);
        toast.warning(`There are ${pendingNonce - latestNonce} pending transactions. Please wait until they are processed.`, { duration: 4000 });
        // Don't proceed if there are too many pending transactions
        if (pendingNonce - latestNonce > 5) {
          throw new Error('Too many pending transactions. Please process them first.');
        }
      }
      
      const usdtContract = await getUSDTContract();
      
      // MetaMask manages nonce, so we send the transaction directly here
      // MetaMask will automatically use the correct nonce
      const tx = await usdtContract.approve(
        CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS,
        amount
      );
      console.log('Approve transaction sent with nonce:', tx.nonce, 'hash:', tx.hash);
      toast.info('Sending transaction...');
      const receipt = await tx.wait();
      console.log('Approve receipt:', receipt);
      toast.success('Approve completed!');
      return { receipt, hash: tx.hash };
    } catch (error: any) {
      console.error('Approve failed:', error);
      console.error('Approve error details:', {
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        data: error?.data,
      });
      
      // Handle nonce too high error
      if (error?.message?.includes('nonce') || error?.message?.includes('Nonce') || error?.message?.toLowerCase().includes('nonce too high')) {
        try {
          const provider = getProvider();
          const latestNonce = await provider.getTransactionCount(account, 'latest').catch(() => null);
          const pendingNonce = await provider.getTransactionCount(account, 'pending').catch(() => null);
          console.error('Nonce error details:', { latestNonce, pendingNonce, error: error.message });
          
          const errorMessage = `Nonce error occurred!\n\nChain status:\n- Latest nonce: ${latestNonce ?? 'N/A'}\n- Pending nonce: ${pendingNonce ?? 'N/A'}\n\nSolution:\n1. MetaMask Settings > Advanced > Reset Account\n   (This will clear transaction history)\n2. Or restart local chain (nitro-devnode)\n3. Cancel pending transactions in MetaMask`;
          
          toast.error(errorMessage, { duration: 10000 });
        } catch (nonceCheckError) {
          console.error('Failed to check nonce during error handling:', nonceCheckError);
          toast.error(
            'Nonce error occurred! Please try MetaMask Settings > Advanced > Reset Account.',
            { duration: 5000 }
          );
        }
      } else if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('Transaction rejected by user.');
      } else {
        toast.error(`Approve failed: ${error.message || error.reason || 'Unknown error'}`);
      }
      throw error;
    }
  }, [account, getUSDTContract, getProvider]);

  // Purchase content
  const purchaseContent = useCallback(async (contentType: number) => {
    if (!account) throw new Error('Wallet is not connected.');
    
    try {
      console.log('Purchasing content:', { contentType, contractAddress: CONTRACT_CONFIG.STYLUS_CONTRACT_ADDRESS });
      
      // Check current nonce (including pending)
      const provider = getProvider();
      const latestNonce = await provider.getTransactionCount(account, 'latest');
      const pendingNonce = await provider.getTransactionCount(account, 'pending');
      console.log('Nonce check before purchase:', { latest: latestNonce, pending: pendingNonce });
      
      // Warn if pending nonce is greater (pending transactions exist)
      if (pendingNonce > latestNonce) {
        console.warn(`Pending transactions detected. Latest: ${latestNonce}, Pending: ${pendingNonce}`);
        toast.warning(`There are ${pendingNonce - latestNonce} pending transactions. Please wait until they are processed.`, { duration: 4000 });
        // Don't proceed if there are too many pending transactions
        if (pendingNonce - latestNonce > 5) {
          throw new Error('Too many pending transactions. Please process them first.');
        }
      }
      
      const contract = await getContentPurchaseContract();
      console.log('Contract instance created');
      
      // MetaMask manages nonce, so we send the transaction directly here
      // MetaMask will automatically use the correct nonce
      const tx = await contract.purchaseContent(contentType);
      console.log('Purchase transaction sent with nonce:', tx.nonce, 'hash:', tx.hash);
      toast.info('Sending purchase transaction...');
      const receipt = await tx.wait();
      console.log('Purchase receipt:', receipt);
      toast.success('Purchase completed!');
      return { receipt, hash: tx.hash };
    } catch (error: any) {
      console.error('Purchase failed:', error);
      console.error('Purchase error details:', {
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        data: error?.data,
      });
      
      // Handle nonce too high error
      if (error?.message?.includes('nonce') || error?.message?.includes('Nonce') || error?.message?.toLowerCase().includes('nonce too high')) {
        try {
          const provider = getProvider();
          const latestNonce = await provider.getTransactionCount(account, 'latest').catch(() => null);
          const pendingNonce = await provider.getTransactionCount(account, 'pending').catch(() => null);
          console.error('Nonce error details:', { latestNonce, pendingNonce, error: error.message });
          
          const errorMessage = `Nonce error occurred!\n\nChain status:\n- Latest nonce: ${latestNonce ?? 'N/A'}\n- Pending nonce: ${pendingNonce ?? 'N/A'}\n\nSolution:\n1. MetaMask Settings > Advanced > Reset Account\n   (This will clear transaction history)\n2. Or restart local chain (nitro-devnode)\n3. Cancel pending transactions in MetaMask`;
          
          toast.error(errorMessage, { duration: 10000 });
        } catch (nonceCheckError) {
          console.error('Failed to check nonce during error handling:', nonceCheckError);
          toast.error(
            'Nonce error occurred! Please try MetaMask Settings > Advanced > Reset Account.',
            { duration: 5000 }
          );
        }
      } else if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error?.message?.includes('rejected')) {
        toast.error('Transaction rejected by user.');
      } else {
        toast.error(`Purchase failed: ${error.message || error.reason || 'Unknown error'}`);
      }
      throw error;
    }
  }, [account, getContentPurchaseContract, getProvider]);

  // Convert price to content_type
  const getContentTypeFromPrice = useCallback((price: number): number => {
    return CONTENT_TYPE_MAP[price] || 1; // Default is 1
  }, []);

  // Get price from content_type (6 decimal places)
  const getPriceFromContentType = useCallback((contentType: number): string => {
    return CONTENT_TYPE_PRICE[contentType] || CONTENT_TYPE_PRICE[1];
  }, []);

  // Get token count owned by owner
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
      console.error('Failed to get owner token count:', error);
      throw error;
    }
  }, [getProvider]);

  // Get token ID at specific index for owner
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
      console.error('Failed to get owner token at index:', error);
      throw error;
    }
  }, [getProvider]);

  // Get waypoint for token ID
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
      return waypointNum > 0 ? waypointNum : 0; // 0 means not set
    } catch (error) {
      console.error('Failed to get waypoint:', error);
      return 0;
    }
  }, [getProvider]);

  // Query PurchaseEvent events
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
      
      // PurchaseEvent filter (buyer is indexed, so filtering is possible)
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
      console.error('Failed to get purchase events:', error);
      return [];
    }
  }, [getProvider]);

  // Full purchase process: approve + purchase
  const purchaseWithApprove = useCallback(async (price: number) => {
    console.log('purchaseWithApprove called with price:', price);
    
    if (!isConnected || !account) {
      throw new Error('Please connect wallet first.');
    }

    const contentType = getContentTypeFromPrice(price);
    const priceAmount = getPriceFromContentType(contentType);
    
    console.log('Price mapping:', { price, contentType, priceAmount });

    try {
      // 1. Check current allowance
      console.log('Checking allowance...');
      const currentAllowance = await checkAllowance(priceAmount);
      const requiredAmount = BigInt(priceAmount);
      console.log('Allowance check:', { currentAllowance, requiredAmount: requiredAmount.toString() });

      // 2. Approve if allowance is insufficient
      if (BigInt(currentAllowance) < requiredAmount) {
        console.log('Allowance insufficient, approving...');
        toast.info('Approving USDT...');
        await approveUSDT(priceAmount);
        console.log('Approve completed');
      } else {
        console.log('Allowance sufficient, skipping approve');
      }

      // 3. Execute purchase
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

