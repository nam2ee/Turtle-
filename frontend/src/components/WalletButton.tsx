"use client";

import { FC } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className="flex items-center">
      <WalletMultiButton className={`px-4 py-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-black font-medium ${className || ''}`} />
    </div>
  );
};