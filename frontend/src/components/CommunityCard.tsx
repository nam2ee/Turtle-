"use client";

import { Button } from "./Button";

type CommunityCardProps = {
  name: string;
  description: string;
  bountyAmount: number;
  gradient: string;
  onDeposit?: (e: React.MouseEvent) => void;
  isPixelMode?: boolean;
};

export function CommunityCard({
  name,
  description,
  bountyAmount,
  gradient,
  onDeposit,
  isPixelMode = false,
}: CommunityCardProps) {
  if (isPixelMode) {
    return (
      <div className="bg-white border-4 border-black overflow-hidden hover:translate-y-[-4px] transition-all duration-200">
        <div className={`h-40 ${gradient} border-b-4 border-black`}></div>
        <div className="p-5 font-silkscreen">
          <h3 className="text-xl font-bold text-black uppercase">{name}</h3>
          <p className="text-gray-800 text-sm mt-1">
            {description}
          </p>
          <div className="flex justify-between items-center mt-4">
            <span className="text-green-600 font-bold">{bountyAmount} SOL</span>
            <button 
              onClick={onDeposit}
              className="border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-1 text-sm uppercase font-bold flex items-center"
            >
              <span className="mr-1">💰</span> Deposit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`h-40 ${gradient}`}></div>
      <div className="p-5">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          {description}
        </p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-green-600 dark:text-green-400 font-semibold">{bountyAmount} SOL Bounty</span>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onDeposit ? (e) => onDeposit(e as React.MouseEvent) : undefined}
            className="flex items-center gap-1"
          >
            <span>💰</span> Deposit
          </Button>
        </div>
      </div>
    </div>
  );
}