import { PublicKey } from "@solana/web3.js";

export interface DaoState {
  admin: PublicKey;
  timeLimit: number;
  baseFee: number;
  aiModeration: boolean;
  depositShare: number;
  lastActivityTimestamp: number;
  totalDeposit: number;
  activeProposalCount: number;
  contentCount: number;
  depositorCount: number;
}

export interface Content {
  author: PublicKey;
  contentHash: string;
  contentUri: string;
  timestamp: number;
  votes: number;
}

export interface Depositor {
  pubkey: PublicKey;
  amount: number;
  lockedUntil: number;
  votingPower: number;
}

export enum ProposalType {
  TimeLimit,
  BaseFee,
  AiModeration,
}

export interface Proposal {
  id: number;
  proposalType: ProposalType;
  newValue: number;
  votingEndTime: number;
  yesVotes: number;
  noVotes: number;
  isExecuted: boolean;
}

// Frontend UI models

export interface Community {
  id: string;
  pubkey: PublicKey;
  name: string;
  description: string;
  timeLimit: number; // seconds
  baseFee: number; // lamports
  aiModeration: boolean;
  depositShare: number; // percentage
  totalDeposit: number; // lamports
  lastActivityTimestamp: number; // unix timestamp
  contentCount: number;
  depositorCount: number;
  admin: PublicKey;
  gradient?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    telegram?: string;
  };
  profileImage?: string;
}

export interface Post {
  id: string;
  communityId: string;
  author: PublicKey;
  authorDisplay: string;
  content: string;
  contentHash: string;
  contentUri: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
}