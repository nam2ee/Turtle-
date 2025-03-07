use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    clock::Clock,
    sysvar::Sysvar,
    program::{invoke, invoke_signed},
    system_instruction,
};

// Program entrypoint
entrypoint!(process_instruction);

// Program instructions
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

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = TurtleInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
        
    match instruction {
        TurtleInstruction::InitializeDao { time_limit, base_fee, ai_moderation, deposit_share } => {
            process_initialize_dao(program_id, accounts, time_limit, base_fee, ai_moderation, deposit_share)
        },
        TurtleInstruction::SubmitContent { content_hash, content_uri } => {
            process_submit_content(program_id, accounts, content_hash, content_uri)
        },
        TurtleInstruction::Deposit { amount } => {
            process_deposit(program_id, accounts, amount)
        },
        TurtleInstruction::ClaimReward {} => {
            process_claim_reward(program_id, accounts)
        },
        TurtleInstruction::CreateVote { proposal_type, new_value, voting_period } => {
            process_create_vote(program_id, accounts, proposal_type, new_value, voting_period)
        },
        TurtleInstruction::Vote { proposal_id, approve } => {
            process_vote(program_id, accounts, proposal_id, approve)
        },
        TurtleInstruction::DistributeQualityRewards { creator_pubkeys, distribution_weights } => {
            process_distribute_quality_rewards(program_id, accounts, creator_pubkeys, distribution_weights)
        },
    }
}

fn process_initialize_dao(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    time_limit: u64,
    base_fee: u64,
    ai_moderation: bool,
    deposit_share: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let initializer_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !initializer_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Check that deposit_share is valid (0-100%)
    if deposit_share > 100 {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Create DAO account
    let rent = solana_program::sysvar::rent::Rent::get()?;
    let space = std::mem::size_of::<DaoState>();
    let rent_lamports = rent.minimum_balance(space);
    
    // Create account
    invoke(
        &system_instruction::create_account(
            initializer_info.key,
            dao_account_info.key,
            rent_lamports,
            space as u64,
            program_id,
        ),
        &[
            initializer_info.clone(),
            dao_account_info.clone(),
            system_program_info.clone(),
        ],
    )?;
    
    // Initialize DAO state
    let clock = Clock::get()?;
    let dao_state = DaoState {
        admin: *initializer_info.key,
        time_limit,
        base_fee,
        ai_moderation,
        deposit_share,
        last_activity_timestamp: clock.unix_timestamp as u64,
        total_deposit: 0,
        active_proposal_count: 0,
        content_count: 0,
        depositor_count: 0,
    };
    
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("DAO initialized with time limit: {}, base fee: {}", time_limit, base_fee);
    Ok(())
}

fn process_submit_content(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    content_hash: String,
    content_uri: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let submitter_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let content_account_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !submitter_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Load DAO state
    let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    
    // Check if base fee is paid
    let clock = Clock::get()?;
    
    // Create content account
    let rent = solana_program::sysvar::rent::Rent::get()?;
    let space = std::mem::size_of::<Content>() + content_hash.len() + content_uri.len();
    let rent_lamports = rent.minimum_balance(space);
    
    // Transfer base fee
    invoke(
        &system_instruction::transfer(
            submitter_info.key,
            dao_account_info.key,
            dao_state.base_fee,
        ),
        &[
            submitter_info.clone(),
            dao_account_info.clone(),
            system_program_info.clone(),
        ],
    )?;
    
    // Create account
    invoke(
        &system_instruction::create_account(
            submitter_info.key,
            content_account_info.key,
            rent_lamports,
            space as u64,
            program_id,
        ),
        &[
            submitter_info.clone(),
            content_account_info.clone(),
            system_program_info.clone(),
        ],
    )?;
    
    // Update content
    let content = Content {
        author: *submitter_info.key,
        content_hash,
        content_uri,
        timestamp: clock.unix_timestamp as u64,
        votes: 0,
    };
    
    content.serialize(&mut *content_account_info.data.borrow_mut())?;
    
    // Update DAO state (reset timer)
    dao_state.last_activity_timestamp = clock.unix_timestamp as u64;
    dao_state.content_count += 1;
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("Content submitted and timer reset");
    Ok(())
}

fn process_deposit(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let depositor_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let depositor_state_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !depositor_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Load DAO state
    let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    
    // Transfer deposit
    invoke(
        &system_instruction::transfer(
            depositor_info.key,
            dao_account_info.key,
            amount,
        ),
        &[
            depositor_info.clone(),
            dao_account_info.clone(),
            system_program_info.clone(),
        ],
    )?;
    
    // Update or create depositor state
    let clock = Clock::get()?;
    let lock_period = 7 * 24 * 60 * 60; // 1 week in seconds
    
    // Check if depositor already exists
    let mut found = false;
    if depositor_state_info.data_len() > 0 {
        let mut depositor_state = Depositor::try_from_slice(&depositor_state_info.data.borrow())?;
        
        if depositor_state.pubkey == *depositor_info.key {
            found = true;
            depositor_state.amount += amount;
            depositor_state.locked_until = (clock.unix_timestamp as u64) + lock_period;
            // Update voting power based on new deposit amount
            depositor_state.voting_power = depositor_state.amount;
            depositor_state.serialize(&mut *depositor_state_info.data.borrow_mut())?;
        }
    }
    
    // Create new depositor entry if not found
    if !found {
        // Create depositor account
        let rent = solana_program::sysvar::rent::Rent::get()?;
        let space = std::mem::size_of::<Depositor>();
        let rent_lamports = rent.minimum_balance(space);
        
        invoke(
            &system_instruction::create_account(
                depositor_info.key,
                depositor_state_info.key,
                rent_lamports,
                space as u64,
                program_id,
            ),
            &[
                depositor_info.clone(),
                depositor_state_info.clone(),
                system_program_info.clone(),
            ],
        )?;
        
        let depositor_state = Depositor {
            pubkey: *depositor_info.key,
            amount,
            locked_until: (clock.unix_timestamp as u64) + lock_period,
            voting_power: amount,
        };
        
        depositor_state.serialize(&mut *depositor_state_info.data.borrow_mut())?;
        dao_state.depositor_count += 1;
    }
    
    // Update DAO state
    dao_state.total_deposit += amount;
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("Deposited {} lamports to the DAO", amount);
    Ok(())
}

fn process_claim_reward(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let claimer_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let content_account_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !claimer_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Load DAO state
    let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    
    // Load content
    let content = Content::try_from_slice(&content_account_info.data.borrow())?;
    
    // Check if claimer is the author of the content
    if content.author != *claimer_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Check if time limit has passed since last activity
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;
    
    if current_time < dao_state.last_activity_timestamp + dao_state.time_limit {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Check if this content is the last one submitted
    if content.timestamp != dao_state.last_activity_timestamp {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Calculate reward amount (total deposit minus part reserved for quality rewards)
    let quality_share_amount = (dao_state.total_deposit * dao_state.deposit_share as u64) / 100;
    let reward_amount = dao_state.total_deposit - quality_share_amount;
    
    // Transfer reward to claimer
    **dao_account_info.try_borrow_mut_lamports()? -= reward_amount;
    **claimer_info.try_borrow_mut_lamports()? += reward_amount;
    
    // Update DAO state
    dao_state.total_deposit = quality_share_amount; // Keep the reserved amount for quality rewards
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("Claimed reward of {} lamports", reward_amount);
    Ok(())
}

fn process_create_vote(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    proposal_type: ProposalType,
    new_value: u64,
    voting_period: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let proposer_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let depositor_state_info = next_account_info(account_info_iter)?;
    let proposal_account_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !proposer_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify proposer is a depositor
    let depositor_state = Depositor::try_from_slice(&depositor_state_info.data.borrow())?;
    if depositor_state.pubkey != *proposer_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Check minimum voting period (1 week)
    let min_voting_period = 7 * 24 * 60 * 60; // 1 week in seconds
    if voting_period < min_voting_period {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Load DAO state
    let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    
    // Create proposal account
    let rent = solana_program::sysvar::rent::Rent::get()?;
    let space = std::mem::size_of::<Proposal>();
    let rent_lamports = rent.minimum_balance(space);
    
    invoke(
        &system_instruction::create_account(
            proposer_info.key,
            proposal_account_info.key,
            rent_lamports,
            space as u64,
            program_id,
        ),
        &[
            proposer_info.clone(),
            proposal_account_info.clone(),
            system_program_info.clone(),
        ],
    )?;
    
    // Create proposal
    let clock = Clock::get()?;
    let proposal = Proposal {
        id: dao_state.active_proposal_count,
        proposal_type,
        new_value,
        voting_end_time: (clock.unix_timestamp as u64) + voting_period,
        yes_votes: 0,
        no_votes: 0,
        is_executed: false,
    };
    
    proposal.serialize(&mut *proposal_account_info.data.borrow_mut())?;
    
    // Update DAO state
    dao_state.active_proposal_count += 1;
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("Created proposal id: {}", proposal.id);
    Ok(())
}

fn process_vote(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    proposal_id: u64,
    approve: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let voter_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    let depositor_state_info = next_account_info(account_info_iter)?;
    let proposal_account_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !voter_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify voter is a depositor
    let depositor_state = Depositor::try_from_slice(&depositor_state_info.data.borrow())?;
    if depositor_state.pubkey != *voter_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Load DAO state and proposal
    let dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    let mut proposal = Proposal::try_from_slice(&proposal_account_info.data.borrow())?;
    
    // Check if proposal exists
    if proposal.id != proposal_id {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Check if voting is still open
    let clock = Clock::get()?;
    if (clock.unix_timestamp as u64) > proposal.voting_end_time {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Record vote
    if approve {
        proposal.yes_votes += depositor_state.voting_power;
    } else {
        proposal.no_votes += depositor_state.voting_power;
    }
    
    // Check if voting has ended and proposal can be executed
    if (clock.unix_timestamp as u64) >= proposal.voting_end_time && !proposal.is_executed {
        if proposal.yes_votes > proposal.no_votes {
            // Execute proposal
            let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
            
            match proposal.proposal_type {
                ProposalType::TimeLimit => dao_state.time_limit = proposal.new_value,
                ProposalType::BaseFee => dao_state.base_fee = proposal.new_value,
                ProposalType::AiModeration => dao_state.ai_moderation = proposal.new_value != 0,
            }
            
            dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
            proposal.is_executed = true;
            msg!("Proposal executed");
        } else {
            msg!("Proposal rejected");
        }
    }
    
    proposal.serialize(&mut *proposal_account_info.data.borrow_mut())?;
    
    msg!("Vote recorded");
    Ok(())
}

fn process_distribute_quality_rewards(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    creator_pubkeys: Vec<Pubkey>,
    distribution_weights: Vec<u8>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let admin_info = next_account_info(account_info_iter)?;
    let dao_account_info = next_account_info(account_info_iter)?;
    
    // Validate accounts
    if !admin_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Load DAO state
    let mut dao_state = DaoState::try_from_slice(&dao_account_info.data.borrow())?;
    
    // Check if caller is admin
    if dao_state.admin != *admin_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Validate distribution weights sum to 100%
    let sum: u8 = distribution_weights.iter().sum();
    if sum != 100 {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Validate creator count matches weights count
    if creator_pubkeys.len() != distribution_weights.len() {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Calculate quality share amount from remaining total deposit
    let quality_share_amount = dao_state.total_deposit;
    
    // Distribute rewards according to weights
    for (i, creator_pubkey) in creator_pubkeys.iter().enumerate() {
        let weight = distribution_weights[i] as u64;
        let reward_amount = (quality_share_amount * weight) / 100;
        
        let creator_account_info = next_account_info(account_info_iter)?;
        
        // Verify the account is the expected creator
        if creator_account_info.key != creator_pubkey {
            return Err(ProgramError::InvalidArgument);
        }
        
        // Transfer reward
        **dao_account_info.try_borrow_mut_lamports()? -= reward_amount;
        **creator_account_info.try_borrow_mut_lamports()? += reward_amount;
        
        msg!("Distributed {} lamports to creator {}", reward_amount, creator_pubkey);
    }
    
    // Update DAO state
    dao_state.total_deposit = 0; // All funds distributed
    dao_state.serialize(&mut *dao_account_info.data.borrow_mut())?;
    
    msg!("Quality rewards distributed");
    Ok(())
}