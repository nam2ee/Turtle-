"use client";

import { useState, useEffect, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

import { SimpleTurtleProgram } from "@/utils/simple-program";
import { LAMPORTS_PER_SOL } from "@/utils/constants";

export function useSimpleTurtleProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Create a memoized instance of the SimpleTurtleProgram
  const simpleTurtleProgram = useMemo(() => {
    if (typeof window === 'undefined' || !connection) {
      return null;
    }
    
    console.log("Creating SimpleTurtleProgram instance");
    return new SimpleTurtleProgram(connection, undefined, wallet);
  }, [connection, wallet]);

  // Function to create a community
  const createCommunity = async (params: {
    name: string;
    description: string;
    bountyAmount: number;
    timeLimit: number;
    baseFee: number;
    depositShare: number;
    aiModeration: boolean;
  }): Promise<string> => {
    try {
      if (!simpleTurtleProgram) {
        throw new Error("SimpleTurtleProgram not initialized");
      }
      
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      
      console.log("Creating community with params:", params);
      
      // Convert time limit from minutes to seconds
      const timeLimitSeconds = params.timeLimit * 60;
      
      // Convert base fee from SOL to lamports
      const baseFeeInLamports = Math.floor(params.baseFee * LAMPORTS_PER_SOL);
      
      // Ensure deposit share is within valid range (0-100)
      const depositShare = Math.min(Math.max(Math.floor(params.depositShare), 0), 100);
      
      console.log("Converted params:", {
        name: params.name,
        timeLimitSeconds,
        baseFeeInLamports,
        aiModeration: params.aiModeration,
        depositShare
      });
      
      // Create the DAO on-chain
      const daoAddress = await simpleTurtleProgram.initializeDao(
        params.name,
        timeLimitSeconds,
        baseFeeInLamports,
        params.aiModeration,
        depositShare
      );
      
      console.log("DAO created successfully:", daoAddress);
      return daoAddress;
    } catch (error) {
      console.error("Error creating community:", error);
      throw error;
    }
  };

  return {
    createCommunity,
    walletStatus: {
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      publicKey: wallet.publicKey?.toString(),
      ready: wallet.connected && !wallet.connecting,
      hasProgram: !!simpleTurtleProgram
    }
  };
}