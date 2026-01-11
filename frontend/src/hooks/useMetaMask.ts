import { useState, useCallback, useEffect } from 'react';
import { CONTRACT_CONFIG } from '@/config/contracts';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export interface MetaMaskState {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  isMetaMaskInstalled: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

interface WalletLoginResponse {
  accessToken: string;
  refreshToken: string;
}

// Wallet login API call
async function walletLogin(walletAddress: string, chainId: string): Promise<WalletLoginResponse> {
  const response = await fetch(`${CONTRACT_CONFIG.API_BASE_URL}/api/v1/auth/login/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      chainID: chainId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Wallet login failed: ${response.statusText}`);
  }

  return response.json();
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    account: null,
    chainId: null,
    isMetaMaskInstalled: false,
    accessToken: null,
    refreshToken: null,
  });

  // Restore tokens from localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      setState(prev => ({
        ...prev,
        accessToken,
        refreshToken,
      }));
    }
  }, []);

  useEffect(() => {
    const checkMetaMask = async () => {
      const isInstalled = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
      setState(prev => ({ ...prev, isMetaMaskInstalled: !!isInstalled }));

      if (isInstalled && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
          
          if (accounts.length > 0) {
            const walletAddress = accounts[0];
            
            setState(prev => ({
              ...prev,
              isConnected: true,
              account: walletAddress,
              chainId: chainIdHex,
            }));

            // Call API if wallet is already connected but token is missing
            const existingToken = localStorage.getItem('accessToken');
            if (!existingToken) {
              try {
                const chainId = parseInt(chainIdHex, 16).toString();
                const loginResponse = await walletLogin(walletAddress, chainId);
                
                localStorage.setItem('accessToken', loginResponse.accessToken);
                localStorage.setItem('refreshToken', loginResponse.refreshToken);
                
                setState(prev => ({
                  ...prev,
                  accessToken: loginResponse.accessToken,
                  refreshToken: loginResponse.refreshToken,
                }));
              } catch (error) {
                console.error('Wallet login API error on initial load:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error checking MetaMask:', error);
        }
      }
    };

    checkMetaMask();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        setState(prev => ({ ...prev, isConnected: false, account: null }));
      } else {
        setState(prev => ({ ...prev, isConnected: true, account: accs[0] }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      setState(prev => ({ ...prev, chainId: chainId as string }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      
      // Convert chainId from hex to decimal
      const chainId = parseInt(chainIdHex, 16).toString();
      const walletAddress = accounts[0];

      setState(prev => ({
        ...prev,
        isConnected: true,
        account: walletAddress,
        chainId: chainIdHex, // Keep original hex value
      }));

      // Call wallet login API
      try {
        const loginResponse = await walletLogin(walletAddress, chainId);
        
        // Save tokens to localStorage
        localStorage.setItem('accessToken', loginResponse.accessToken);
        localStorage.setItem('refreshToken', loginResponse.refreshToken);
        
        setState(prev => ({
          ...prev,
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
        }));
        
        console.log('Wallet login successful');
      } catch (error) {
        console.error('Wallet login API error:', error);
        // Keep wallet connection even if API call fails
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Remove tokens from localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      account: null,
      chainId: null,
      accessToken: null,
      refreshToken: null,
    }));
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    ...state,
    connect,
    disconnect,
    formatAddress,
  };
}
