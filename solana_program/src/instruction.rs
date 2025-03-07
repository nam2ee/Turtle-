use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_program,
};

use crate::{ProposalType, TurtleInstruction};

/// Helper functions for creating instructions for the Turtle DAO program
pub mod turtle_instruction {
    use super::*;

    /// Creates an instruction to initialize a new DAO
    pub fn initialize_dao(
        program_id: &Pubkey,
        payer: &Pubkey,
        dao_account: &Pubkey,
        time_limit: u64,
        base_fee: u64,
        ai_moderation: bool,
        deposit_share: u8,
    ) -> Instruction {
        let data = TurtleInstruction::InitializeDao {
            time_limit,
            base_fee,
            ai_moderation,
            deposit_share,
        }
        .try_to_vec()
        .unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new_readonly(*payer, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            data,
        }
    }

    /// Creates an instruction to submit content to the community
    pub fn submit_content(
        program_id: &Pubkey,
        submitter: &Pubkey,
        dao_account: &Pubkey,
        content_account: &Pubkey,
        content_hash: String,
        content_uri: String,
    ) -> Instruction {
        let data = TurtleInstruction::SubmitContent {
            content_hash,
            content_uri,
        }
        .try_to_vec()
        .unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*submitter, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new(*content_account, false),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            data,
        }
    }

    /// Creates an instruction to deposit funds to the DAO
    pub fn deposit(
        program_id: &Pubkey,
        depositor: &Pubkey,
        dao_account: &Pubkey,
        depositor_state_account: &Pubkey,
        amount: u64,
    ) -> Instruction {
        let data = TurtleInstruction::Deposit { amount }.try_to_vec().unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*depositor, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new(*depositor_state_account, false),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            data,
        }
    }

    /// Creates an instruction to claim reward as the last content submitter
    pub fn claim_reward(
        program_id: &Pubkey,
        claimer: &Pubkey,
        dao_account: &Pubkey,
        content_account: &Pubkey,
    ) -> Instruction {
        let data = TurtleInstruction::ClaimReward {}.try_to_vec().unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*claimer, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new(*content_account, false),
            ],
            data,
        }
    }

    /// Creates an instruction to create a governance vote
    pub fn create_vote(
        program_id: &Pubkey,
        proposer: &Pubkey,
        dao_account: &Pubkey,
        depositor_state_account: &Pubkey,
        proposal_account: &Pubkey,
        proposal_type: ProposalType,
        new_value: u64,
        voting_period: u64,
    ) -> Instruction {
        let data = TurtleInstruction::CreateVote {
            proposal_type,
            new_value,
            voting_period,
        }
        .try_to_vec()
        .unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*proposer, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new(*depositor_state_account, false),
                AccountMeta::new(*proposal_account, false),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            data,
        }
    }

    /// Creates an instruction to vote on a governance proposal
    pub fn vote(
        program_id: &Pubkey,
        voter: &Pubkey,
        dao_account: &Pubkey,
        depositor_state_account: &Pubkey,
        proposal_account: &Pubkey,
        proposal_id: u64,
        approve: bool,
    ) -> Instruction {
        let data = TurtleInstruction::Vote { proposal_id, approve }
            .try_to_vec()
            .unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*voter, true),
                AccountMeta::new(*dao_account, false),
                AccountMeta::new(*depositor_state_account, false),
                AccountMeta::new(*proposal_account, false),
            ],
            data,
        }
    }

    /// Creates an instruction to distribute rewards to high-quality content creators
    pub fn distribute_quality_rewards(
        program_id: &Pubkey,
        admin: &Pubkey,
        dao_account: &Pubkey,
        creator_pubkeys: Vec<Pubkey>,
        distribution_weights: Vec<u8>,
    ) -> Instruction {
        let data = TurtleInstruction::DistributeQualityRewards {
            creator_pubkeys: creator_pubkeys.clone(),
            distribution_weights,
        }
        .try_to_vec()
        .unwrap();

        // First include admin and dao accounts
        let mut accounts = vec![
            AccountMeta::new(*admin, true),
            AccountMeta::new(*dao_account, false),
        ];

        // Then add all creator accounts
        for pubkey in creator_pubkeys {
            accounts.push(AccountMeta::new(pubkey, false));
        }

        Instruction {
            program_id: *program_id,
            accounts,
            data,
        }
    }
}