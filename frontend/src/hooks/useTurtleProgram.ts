"use client";

import { useState, useEffect, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

import { TurtleProgram } from "@/utils/program";
import { Community, Post } from "@/utils/models";
import { DaoStateAccount, ContentAccount } from "@/utils/borsh";
import { LAMPORTS_PER_SOL } from "@/utils/constants";

export function useTurtleProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Create a memoized instance of the TurtleProgram class even if the wallet isn't connected
  // This ensures we always have an instance, even if the wallet isn't fully connected yet
  const turtleProgram = useMemo(() => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined' || !connection) {
      console.log("Cannot create TurtleProgram - environment not ready", { 
        isBrowser: typeof window !== 'undefined',
        hasConnection: !!connection
      });
      return null;
    }
    
    // Log wallet status - helps debug connection issues
    console.log("Wallet status:", {
      connected: wallet.connected,
      connecting: wallet.connecting,
      publicKey: wallet.publicKey?.toString() || 'not connected',
      connectionEndpoint: connection.rpcEndpoint
    });
    
    // Create program instance regardless of wallet connection status
    // The actual wallet operations will check connection status when needed
    const program = new TurtleProgram(connection, undefined, wallet);
    console.log("TurtleProgram instance created");
    
    return program;
  }, [connection, wallet.connected, wallet.publicKey]);

  // Convert DAO state account to frontend Community model
  const convertToCommunitiesModel = async (
    daoAddress: PublicKey,
    state: DaoStateAccount
  ): Promise<Community> => {
    // Generate a random gradient for UI
    const gradients = [
      "bg-gradient-to-r from-blue-400 to-purple-500",
      "bg-gradient-to-r from-yellow-400 to-orange-500",
      "bg-gradient-to-r from-green-400 to-teal-500",
      "bg-gradient-to-r from-pink-400 to-red-500",
      "bg-gradient-to-r from-indigo-400 to-blue-500",
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    return {
      id: daoAddress.toString(),
      pubkey: daoAddress,
      name: `Community ${daoAddress.toString().slice(0, 6)}`,
      description: "A community for Turtle DAO users",
      timeLimit: state.time_limit,
      baseFee: state.base_fee,
      aiModeration: state.ai_moderation,
      depositShare: state.deposit_share,
      totalDeposit: state.total_deposit,
      lastActivityTimestamp: state.last_activity_timestamp,
      contentCount: state.content_count,
      depositorCount: state.depositor_count,
      admin: state.admin,
      gradient: randomGradient,
    };
  };

  // Convert content account to frontend Post model
  const convertToPostModel = async (
    contentAddress: PublicKey,
    content: ContentAccount,
    communityId: string
  ): Promise<Post> => {
    return {
      id: contentAddress.toString(),
      communityId,
      author: content.author,
      authorDisplay: content.author.toString().slice(0, 6) + "..." + content.author.toString().slice(-4),
      content: content.content_uri.replace("turtle://content/", ""),
      contentHash: content.content_hash,
      contentUri: content.content_uri,
      timestamp: content.timestamp,
      likes: content.votes,
      likedBy: [],
    };
  };

  // Create a new community (DAO)
  const createCommunity = async (params: {
    name: string;
    description: string;
    bountyAmount: number;
    timeLimit: number;
    baseFee: number;
    depositShare: number;
    aiModeration: boolean;
    socialLinks?: {
      github?: string;
      twitter?: string;
      telegram?: string;
    };
    profileImage?: string;
  }): Promise<string> => {
    try {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected - please connect your wallet first");
      }
      
      console.log("Starting community creation with wallet:", wallet.publicKey.toString());
      console.log("Wallet connection status:", {
        connected: wallet.connected,
        connecting: wallet.connecting,
        disconnecting: wallet.disconnecting,
        ready: wallet.connected && !wallet.connecting,
        hasTurtleProgram: !!turtleProgram
      });
      
      // Sanitize the name - using only alphanumeric characters for best compatibility
      const sanitizedName = params.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
      console.log("Using sanitized name for DAO:", sanitizedName);
      
      // Prepare EXACT parameters required by the Solana program:
      
      // 1. time_limit (u64): Convert minutes to seconds for time limit
      const timeLimitSeconds = params.timeLimit * 60;
      
      // 2. base_fee (u64): Convert SOL to lamports (smallest unit)
      const baseFeeInLamports = Math.floor(params.baseFee * LAMPORTS_PER_SOL);
      
      // 3. ai_moderation (bool): Use directly 
      // Already a boolean, no conversion needed
      
      // 4. deposit_share (u8): Ensure it's a valid u8 (0-255, but we limit to 0-100 for percentage)
      const depositShareValue = Math.min(Math.max(Math.floor(params.depositShare), 0), 100);

      console.log("Preparing exact parameters for Solana transaction:", {
        // Only showing the fields that will be sent to Solana:
        dao_name: sanitizedName, // Used for PDA derivation only
        time_limit: timeLimitSeconds,
        base_fee: baseFeeInLamports,
        ai_moderation: params.aiModeration,
        deposit_share: depositShareValue
      });

      // Make sure we have a wallet and program instance
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not fully connected or doesn't support signing");
      }
      
      if (!turtleProgram) {
        throw new Error("TurtleProgram not initialized properly - check connection");
      }
      
      // Actually create the DAO - this will trigger a wallet transaction
      console.log("Now initializing DAO on Solana blockchain...");
      
      // Use a try/catch specific for the blockchain operation
      try {
        // This will trigger a wallet transaction popup
        const daoAddress = await turtleProgram.initializeDao(
          sanitizedName,
          timeLimitSeconds,
          baseFeeInLamports,
          params.aiModeration,
          depositShareValue
        );
        
        console.log("Successfully created DAO on blockchain with address:", daoAddress);
        
        // If the user specified a bounty amount, make a deposit too
        if (params.bountyAmount > 0) {
          try {
            console.log(`Making initial deposit of ${params.bountyAmount} SOL to DAO ${daoAddress}`);
            
            // Add a small delay to make sure the DAO account is fully confirmed
            // This can help prevent transaction errors
            console.log("Waiting for DAO account to be fully confirmed...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Convert from SOL to lamports
            const amountInLamports = Math.floor(params.bountyAmount * LAMPORTS_PER_SOL);
            console.log(`Deposit amount in lamports: ${amountInLamports}`);
            
            // Make sure the amount is reasonable (not too small, not too large)
            const minAmount = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL in lamports
            const safeAmount = Math.max(minAmount, Math.min(amountInLamports, 10 * LAMPORTS_PER_SOL)); // Between 0.01 and 10 SOL
            
            // Make the deposit directly to ensure proper lamport amount
            try {
              // Make the initial deposit with turtleProgram.deposit directly
              const depositorAddress = await turtleProgram.deposit(
                new PublicKey(daoAddress),
                safeAmount
              );
              
              console.log("Initial deposit successful with depositor address:", depositorAddress);
            } catch (innerDepositError) {
              console.error("Inner deposit error:", innerDepositError);
              
              // Try with the depositToCommunity function as fallback
              console.log("Trying alternate deposit method...");
              const depositorAddress = await depositToCommunity(
                daoAddress, // The DAO address as string
                params.bountyAmount // Amount in SOL
              );
              
              console.log("Fallback deposit successful with depositor address:", depositorAddress);
            }
          } catch (depositError) {
            console.error("Error making initial deposit:", depositError);
            // Continue even if deposit fails - we still created the community
          }
        }
        
        return daoAddress;
      } catch (blockchainError) {
        console.error("Blockchain error creating DAO:", blockchainError);
        
        // If there was a blockchain error, find out if it's something specific
        let errorMessage = "Unknown error";
        if (blockchainError instanceof Error) {
          errorMessage = blockchainError.message;
          
          // Check if this is a user rejection
          if (errorMessage.includes("User rejected") || 
              errorMessage.includes("Transaction was not confirmed") ||
              errorMessage.includes("cancelled")) {
            throw new Error("Transaction cancelled by user. Please try again.");
          }
          
          // Check if this might be a network issue
          if (errorMessage.includes("failed to fetch") || 
              errorMessage.includes("network") ||
              errorMessage.includes("timeout")) {
            throw new Error("Network issue detected. Please check your internet connection and try again.");
          }
          
          // Otherwise it's probably a blockchain constraint or program issue
          throw new Error(`Blockchain error: ${errorMessage}`);
        }
        
        throw blockchainError; // Re-throw the original error if we couldn't extract details
      }
    } catch (error) {
      console.error("Error creating community:", error);
      
      // Log more detailed error information for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Don't generate mock addresses on error - this hides the real problem
      // Instead, propagate the error so the UI can handle it
      throw error;
    }
  };

  // Submit content to a community
  const submitContent = async (
    communityId: string,
    content: string
  ): Promise<string> => {
    try {
      const daoAddress = new PublicKey(communityId);
      const contentAddress = await turtleProgram.submitContent(daoAddress, content);
      console.log("Content submitted with address:", contentAddress);
      return contentAddress;
    } catch (error) {
      console.error("Error submitting content:", error);
      throw error;
    }
  };

  // Deposit SOL to a community
  const depositToCommunity = async (
    communityId: string,
    amountInSol: number
  ): Promise<string> => {
    try {
      if (!turtleProgram) {
        throw new Error("TurtleProgram not initialized properly");
      }
      
      console.log(`Depositing ${amountInSol} SOL to community ${communityId}`);
      
      // Convert from SOL to lamports (the Solana program expects lamports)
      const amountInLamports = Math.floor(amountInSol * LAMPORTS_PER_SOL);
      console.log(`Amount in lamports: ${amountInLamports}`);
      
      // Convert string DAO address to PublicKey
      const daoAddress = new PublicKey(communityId);
      
      // Call the deposit method with correct parameters
      const depositorAddress = await turtleProgram.deposit(daoAddress, amountInLamports);
      console.log("Deposit successful! Depositor address:", depositorAddress);
      return depositorAddress;
    } catch (error) {
      console.error("Error depositing to community:", error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("insufficient")) {
          throw new Error("Insufficient balance to make deposit. Please add more SOL to your wallet.");
        } else if (error.message.includes("not connected")) {
          throw new Error("Your wallet is not connected. Please connect your wallet first.");
        }
      }
      
      throw error;
    }
  };

  // Claim reward as the last content submitter
  const claimReward = async (
    communityId: string,
    contentId: string
  ): Promise<string> => {
    try {
      const daoAddress = new PublicKey(communityId);
      const contentAddress = new PublicKey(contentId);
      const signature = await turtleProgram.claimReward(daoAddress, contentAddress);
      console.log("Claimed reward with signature:", signature);
      return signature;
    } catch (error) {
      console.error("Error claiming reward:", error);
      throw error;
    }
  };

  // Get all communities
  const getCommunities = async (): Promise<Community[]> => {
    try {
      if (!turtleProgram) {
        console.warn("TurtleProgram not initialized, cannot fetch communities");
        return [];
      }

      console.log("Fetching all communities from blockchain...");
      console.log("TurtleProgram instance:", {
        hasWallet: !!turtleProgram.wallet,
        isWalletConnected: !!turtleProgram.wallet.publicKey,
        connection: turtleProgram.connection.rpcEndpoint,
        programId: turtleProgram.programId.toString()
      });
      
      // Check if getAllDAOs method exists
      if (typeof turtleProgram.getAllDAOs !== 'function') {
        console.error("getAllDAOs method not found on TurtleProgram instance:", turtleProgram);
        console.log("Cannot fetch communities without getAllDAOs method");
        return [];
      }
      
      const daos = await turtleProgram.getAllDAOs();
      console.log(`Retrieved ${daos.length} DAOs from blockchain:`, daos);
      
      if (daos.length === 0) {
        console.log("No DAOs found, you might need to create one first");
      }
      
      const communities = await Promise.all(
        daos.map(async (dao) => {
          console.log("Converting DAO to community model:", dao);
          return await convertToCommunitiesModel(dao.address, dao.state);
        })
      );
      
      console.log(`Successfully converted ${communities.length} DAOs to community models:`, communities);
      return communities;
    } catch (error) {
      console.error("Error getting communities:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      console.log("Returning empty communities array due to error");
      return [];
    }
  };

  // Get community by ID
  const getCommunityById = async (id: string): Promise<Community | null> => {
    try {
      if (!turtleProgram) {
        console.warn("TurtleProgram not initialized, cannot fetch community");
        return null;
      }
      
      console.log(`Fetching community with ID: ${id}`);
      let daoAddress: PublicKey;
      
      try {
        daoAddress = new PublicKey(id);
      } catch (error) {
        console.error(`Invalid public key format: ${id}`);
        return null;
      }
      
      console.log(`Fetching DAO state for ${daoAddress.toString()}`);
      
      // Check if getDaoState method exists
      if (typeof turtleProgram.getDaoState !== 'function') {
        console.error("getDaoState method not found on TurtleProgram instance:", turtleProgram);
        console.log("Cannot fetch community data without getDaoState method");
        return null;
      }
      
      const daoState = await turtleProgram.getDaoState(daoAddress);
      console.log(`DAO state for ${daoAddress.toString()}:`, daoState);
      
      if (!daoState) {
        console.log(`No DAO state found for ${daoAddress.toString()}`);
        console.log("Cannot proceed without DAO state data");
        return null;
      }
      
      console.log(`Converting DAO state to community model`);
      return await convertToCommunitiesModel(daoAddress, daoState);
    } catch (error) {
      console.error(`Error getting community by ID ${id}:`, error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      console.log("Failed to retrieve community data");
      return null;
    }
  };

  // Get all posts for a community
  const getPosts = async (communityId: string): Promise<Post[]> => {
    try {
      if (!turtleProgram) {
        console.warn("TurtleProgram not initialized, cannot fetch posts");
        return [];
      }
      
      console.log(`Fetching posts for community ID: ${communityId}`);
      let daoAddress: PublicKey;
      
      try {
        daoAddress = new PublicKey(communityId);
      } catch (error) {
        console.error(`Invalid public key format: ${communityId}`);
        return [];
      }
      
      console.log(`Retrieving content for DAO: ${daoAddress.toString()}`);
      
      // Check if getAllContent method exists
      if (typeof turtleProgram.getAllContent !== 'function') {
        console.error("getAllContent method not found on TurtleProgram instance:", turtleProgram);
        console.log("Cannot fetch posts without getAllContent method");
        return [];
      }
      
      const contentAccounts = await turtleProgram.getAllContent(daoAddress);
      console.log(`Retrieved ${contentAccounts.length} content accounts:`, contentAccounts);
      
      if (contentAccounts.length === 0) {
        console.log("No posts found for this community");
        return [];
      }
      
      console.log("Converting content accounts to post models...");
      const posts = await Promise.all(
        contentAccounts.map(async (content) => {
          try {
            console.log("Converting content to post model:", content);
            return await convertToPostModel(
              content.address,
              content.content,
              communityId
            );
          } catch (error) {
            console.error(`Error converting content at ${content.address.toString()}:`, error);
            return null;
          }
        })
      );
      
      // Filter out any null entries from conversion errors
      const validPosts = posts.filter(post => post !== null) as Post[];
      console.log(`Successfully converted ${validPosts.length} content accounts to posts:`, validPosts);
      
      // If we have no valid posts after conversion, return empty array
      if (validPosts.length === 0) {
        console.log("No valid posts after conversion");
        return [];
      }
      
      // Sort by timestamp, most recent first
      return validPosts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(`Error getting posts for community ${communityId}:`, error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      console.log("Returning empty array due to error");
      return [];
    }
  };

  return {
    createCommunity,
    submitContent,
    depositToCommunity,
    claimReward,
    getCommunities,
    getCommunityById,
    getPosts,
    // Add wallet status for easier debugging
    walletStatus: {
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      publicKey: wallet.publicKey?.toString(),
      ready: wallet.connected && !wallet.connecting,
      hasProgram: !!turtleProgram
    }
  };
}