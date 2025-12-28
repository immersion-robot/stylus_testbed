import { useState, useCallback, useEffect } from 'react';

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
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    account: null,
    chainId: null,
    isMetaMaskInstalled: false,
  });

  useEffect(() => {
    const checkMetaMask = async () => {
      const isInstalled = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
      setState(prev => ({ ...prev, isMetaMaskInstalled: !!isInstalled }));

      if (isInstalled && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
          
          if (accounts.length > 0) {
            setState(prev => ({
              ...prev,
              isConnected: true,
              account: accounts[0],
              chainId,
            }));
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
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;

      setState(prev => ({
        ...prev,
        isConnected: true,
        account: accounts[0],
        chainId,
      }));
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      account: null,
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
