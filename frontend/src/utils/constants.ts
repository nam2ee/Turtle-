import { PublicKey } from "@solana/web3.js";

// Program ID from deployed Solana program
export const TURTLE_PROGRAM_ID = new PublicKey("G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP");

// Constants for UI
export const LAMPORTS_PER_SOL = 1000000000; // 1 billion lamports per SOL

// Default time limits
export const DEFAULT_TIME_LIMIT_SECONDS = 1800; // 30 minutes
export const DEFAULT_BASE_FEE_LAMPORTS = 50000000; // 0.05 SOL
export const DEFAULT_DEPOSIT_SHARE_PERCENTAGE = 20; // 20% for quality content