"use client";

import Link from "next/link";
import { WalletButton } from "./WalletButton";
import { Button } from "./Button";
import { useWallet } from "@solana/wallet-adapter-react";
import { ProfileButton } from "./ProfileButton";

type AppHeaderProps = {
  onCreateCommunity?: () => void;
  isPixelMode?: boolean;
};

export function AppHeader({ onCreateCommunity, isPixelMode = false }: AppHeaderProps) {
  const { publicKey } = useWallet();
  
  return (
    <header className={`${isPixelMode ? 'border-b-4 border-black font-silkscreen' : 'shadow-md'} bg-white dark:bg-gray-800`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/app" className="flex items-center">
            <div className={`w-10 h-10 ${isPixelMode ? 'border-2 border-black' : 'rounded-full'} bg-green-600 flex items-center justify-center mr-3`}>
              <span className="text-white text-lg">🐢</span>
            </div>
            <span className={`text-xl font-bold text-green-800 dark:text-green-300 ${isPixelMode ? 'uppercase tracking-wider' : ''}`}>Turtle</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* Wallet Connection Button */}
            <div className={`${isPixelMode ? 'border-2 border-black bg-yellow-400 hover:bg-yellow-500' : ''} overflow-hidden rounded-lg`}>
              <WalletButton className={`${isPixelMode ? '!bg-yellow-400 hover:!bg-yellow-500 !border-0 !text-black !h-auto !py-2 !px-4 font-silkscreen !rounded-none' : ''}`} />
            </div>
            
            {publicKey && (
              <>
                {/* Profile Button */}
                <ProfileButton isPixelMode={isPixelMode} />
                
                {/* Create Community Button */}
                {isPixelMode ? (
                  <button
                    onClick={onCreateCommunity}
                    className="border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 uppercase text-sm font-bold"
                  >
                    Create
                  </button>
                ) : (
                  <Button onClick={onCreateCommunity}>
                    Create Community
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}