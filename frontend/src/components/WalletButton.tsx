"use client";

import { FC, useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: FC<{ className?: string }> = ({ className }) => {
  // Prevent hydration errors by only rendering on the client
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return a placeholder button that matches the size/style when not mounted
    // This prevents layout shift and hydration errors
    return (
      <div className="flex items-center">
        <button 
          className={`px-4 py-2 rounded-md bg-yellow-400 text-black font-medium ${className || ''}`}
          disabled
        >
          Connect Wallet
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center">
      <WalletMultiButton className={`px-4 py-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-black font-medium ${className || ''}`} />
    </div>
  );
};