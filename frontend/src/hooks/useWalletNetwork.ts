"use client";

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { clusterApiUrl } from '@solana/web3.js';

export function useWalletNetwork() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const [isDevnet, setIsDevnet] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!connected || !publicKey) {
        setIsDevnet(null);
        return;
      }

      try {
        setIsChecking(true);
        
        // Get genesis hash to identify network
        const genesisHash = await connection.getGenesisHash();
        
        // Get devnet genesis hash for comparison
        const devnetConnection = connection.rpcEndpoint === clusterApiUrl('devnet') 
          ? connection 
          : new connection.constructor(clusterApiUrl('devnet'));
          
        const devnetGenesisHash = await devnetConnection.getGenesisHash();
        
        // Compare if we're on devnet
        setIsDevnet(genesisHash === devnetGenesisHash);
        
        console.log("Wallet network check:", {
          connected,
          publicKey: publicKey.toString(),
          isDevnet: genesisHash === devnetGenesisHash,
          connectionUrl: connection.rpcEndpoint,
          genesisHash,
          devnetGenesisHash
        });
      } catch (error) {
        console.error("Error checking wallet network:", error);
        setIsDevnet(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkNetwork();
  }, [connected, publicKey, connection]);

  return { isDevnet, isChecking };
}

export default useWalletNetwork;