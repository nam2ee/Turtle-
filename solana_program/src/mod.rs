pub mod instruction;
pub mod error;
#[cfg(test)]
pub mod test;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

// Re-export the relevant types for external use
pub use crate::error::TurtleError;
pub use instruction::turtle_instruction;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum TurtleInstruction {
    // Initialize a new DAO with parameters
    InitializeDao {
        time_limit: u64,        // Time limit in seconds
        base_fee: u64,          // Base fee in lamports
        ai_moderation: bool,    // Whether AI moderation is enabled
        deposit_share: u8,      // Percentage of deposit shared to quality content (0-100)
    },
    
    // Submit content to the community
    SubmitContent {
        content_hash: String,   // Hash of the content (text + image reference)
        content_uri: String,    // URI to content details (e.g., IPFS link)
    },
    
    // Deposit funds to the community bounty
    Deposit {
        amount: u64,            // Amount in lamports
    },
    
    // Claim reward as the last submitter after time limit
    ClaimReward {},
    
    // Create governance vote
    CreateVote {
        proposal_type: ProposalType,
        new_value: u64,         // New value for the parameter
        voting_period: u64,     // Voting period in seconds
    },
    
    // Vote on a governance proposal
    Vote {
        proposal_id: u64,
        approve: bool,          // True for approval, false for rejection
    },
    
    // Distribute rewards to high-quality content creators
    DistributeQualityRewards {
        creator_pubkeys: Vec<Pubkey>,
        distribution_weights: Vec<u8>, // Distribution weights (must sum to 100)
    },
}

#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum ProposalType {
    TimeLimit,
    BaseFee,
    AiModeration,
}

// Program state stored on-chain
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct DaoState {
    pub admin: Pubkey,
    pub time_limit: u64,
    pub base_fee: u64,
    pub ai_moderation: bool,
    pub deposit_share: u8,
    pub last_activity_timestamp: u64,
    pub total_deposit: u64,
    pub active_proposal_count: u64,
    pub content_count: u64,
    pub depositor_count: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Content {
    pub author: Pubkey,
    pub content_hash: String,
    pub content_uri: String,
    pub timestamp: u64,
    pub votes: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Depositor {
    pub pubkey: Pubkey,
    pub amount: u64,
    pub locked_until: u64,
    pub voting_power: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposal_type: ProposalType,
    pub new_value: u64,
    pub voting_end_time: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub is_executed: bool,
}