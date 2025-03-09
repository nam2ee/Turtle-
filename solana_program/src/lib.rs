use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::IsInitialized,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
    system_instruction,
};
use std::convert::TryInto;

// Define instruction types
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq)]
pub enum TurtleInstruction {
    /// Initialize a new DAO
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Initializer account
    /// 1. `[writable]` DAO account to be created
    /// 2. `[]` System program
    InitializeDao {
        dao_name: String,
        time_limit: u64,
        base_fee: u64,
        ai_moderation: bool,
        deposit_share: u8,
    },

    /// Deposit funds to DAO
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Depositor account
    /// 1. `[writable]` DAO account
    /// 2. `[]` System program
    Deposit {
        amount: u64,
    },

    /// Submit content to the DAO
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Author account
    /// 1. `[writable]` DAO account
    SubmitContent {
        text: String,
        image_uri: String,
    },

    /// Create a governance vote
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Proposer account (must be a depositor)
    /// 1. `[writable]` DAO account
    CreateVote {
        title: String,
        description: String,
        vote_type: VoteType,
        options: Vec<String>,
        voting_period: u64,
    },

    /// Cast vote in governance
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Voter account (must be a depositor)
    /// 1. `[writable]` DAO account
    CastVote {
        proposal_id: u64,
        option_index: u8,
    },

    /// Process timeout and distribute rewards
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Any account to trigger the timeout
    /// 1. `[writable]` DAO account
    ProcessTimeout {},
}

// Vote type enum
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum VoteType {
    ChangeTimeLimit,
    ChangeBaseFee,
    ChangeAiModeration,
    ContentQualityRating,
}

// Vote status enum
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq, Eq)]
pub enum VoteStatus {
    Active,
    Completed,
    Executed,
}

// Depositor information
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct DepositorInfo {
    pub depositor: Pubkey,
    pub amount: u64,
    pub timestamp: u64,
    pub locked_until: u64,
}

// Content structure
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Content {
    pub author: Pubkey,
    pub text: String,
    pub image_uri: String,
    pub timestamp: u64,
    pub vote_count: u64,
}

// Vote information
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct VoteInfo {
    pub voter: Pubkey,
    pub option_index: u8,
    pub voting_power: u64,
}

// Vote proposal
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct VoteProposal {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub vote_type: VoteType,
    pub options: Vec<String>,
    pub start_time: u64,
    pub end_time: u64,
    pub votes: Vec<VoteInfo>,
    pub status: VoteStatus,
}

// DAO state structure
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct DaoState {
    pub is_initialized: bool,
    pub dao_name: String,
    pub initializer: Pubkey,
    pub time_limit: u64,
    pub base_fee: u64,
    pub ai_moderation: bool,
    pub deposit_share: u8,
    pub timeout_timestamp: u64,
    pub total_deposit: u64,
    pub depositors: Vec<DepositorInfo>,
    pub contents: Vec<Content>,
    pub vote_proposals: Vec<VoteProposal>,
    pub next_proposal_id: u64,
}

impl IsInitialized for DaoState {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

// Program entrypoint
entrypoint!(process_instruction);

// Program logic
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = TurtleInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        TurtleInstruction::InitializeDao {
            dao_name,
            time_limit,
            base_fee,
            ai_moderation,
            deposit_share,
        } => process_initialize_dao(
            program_id,
            accounts,
            dao_name,
            time_limit,
            base_fee,
            ai_moderation,
            deposit_share,
        ),
        TurtleInstruction::Deposit { amount } => process_deposit(program_id, accounts, amount),
        TurtleInstruction::SubmitContent { text, image_uri } => {
            process_submit_content(program_id, accounts, text, image_uri)
        }
        TurtleInstruction::CreateVote {
            title,
            description,
            vote_type,
            options,
            voting_period,
        } => process_create_vote(
            program_id,
            accounts,
            title,
            description,
            vote_type,
            options,
            voting_period,
        ),
        TurtleInstruction::CastVote {
            proposal_id,
            option_index,
        } => process_cast_vote(program_id, accounts, proposal_id, option_index),
        TurtleInstruction::ProcessTimeout {} => process_timeout(program_id, accounts),
    }
}

// Initialize DAO function
pub fn process_initialize_dao(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    dao_name: String,
    time_limit: u64,
    base_fee: u64,
    ai_moderation: bool,
    deposit_share: u8,
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let initializer = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;

    // Check if initializer is the signer
    if !initializer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Validate deposit share is within reasonable limits (0-100%)
    if deposit_share > 100 {
        return Err(ProgramError::InvalidArgument);
    }

    // Create DAO account with PDA
    let (dao_pda, bump_seed) = Pubkey::find_program_address(
        &[
            b"dao",
            initializer.key.as_ref(),
            dao_name.as_bytes(),
        ],
        program_id,
    );

    // Verify the derived address
    if dao_pda != *dao_account.key {
        return Err(ProgramError::InvalidArgument);
    }

    // Calculate size needed for the account
    let rent = Rent::get()?;
    let space = 8000; // Allocate sufficient space for the DAO data
    let rent_lamports = rent.minimum_balance(space);

    // Create the account
    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            dao_account.key,
            rent_lamports,
            space as u64,
            program_id,
        ),
        &[initializer.clone(), dao_account.clone(), system_program.clone()],
        &[&[b"dao", initializer.key.as_ref(), dao_name.as_bytes(), &[bump_seed]]],
    )?;

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Initialize DAO state
    let dao_state = DaoState {
        is_initialized: true,
        dao_name,
        initializer: *initializer.key,
        time_limit,
        base_fee,
        ai_moderation,
        deposit_share,
        timeout_timestamp: current_time + time_limit,
        total_deposit: 0,
        depositors: Vec::new(),
        contents: Vec::new(),
        vote_proposals: Vec::new(),
        next_proposal_id: 0,
    };

    // Serialize and store the state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    msg!("DAO initialized: {}", dao_state.dao_name);
    Ok(())
}

// Process deposit function
pub fn process_deposit(
    program_id: &Pubkey, 
    accounts: &[AccountInfo], 
    amount: u64
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let depositor = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;

    // Check if depositor is the signer
    if !depositor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Check if amount is valid
    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    // Verify the DAO account belongs to the program
    if dao_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Get DAO state
    let mut dao_state = try_from_slice_unchecked::<DaoState>(&dao_account.data.borrow())?;
    if !dao_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Transfer SOL from depositor to DAO account
    invoke(
        &system_instruction::transfer(
            depositor.key,
            dao_account.key,
            amount,
        ),
        &[
            depositor.clone(),
            dao_account.clone(),
            system_program.clone(),
        ],
    )?;

    // Check if depositor already exists
    let mut found = false;
    for depositor_info in dao_state.depositors.iter_mut() {
        if depositor_info.depositor == *depositor.key {
            // Update existing depositor
            depositor_info.amount += amount;
            depositor_info.timestamp = current_time;
            // Lock for at least time_limit period
            depositor_info.locked_until = current_time + dao_state.time_limit;
            found = true;
            break;
        }
    }

    // Add new depositor if not found
    if !found {
        dao_state.depositors.push(DepositorInfo {
            depositor: *depositor.key,
            amount,
            timestamp: current_time,
            locked_until: current_time + dao_state.time_limit,
        });
    }

    // Update total deposit
    dao_state.total_deposit += amount;

    // Save updated state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    msg!("Deposit of {} lamports processed", amount);
    Ok(())
}

// Submit content function
pub fn process_submit_content(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    text: String,
    image_uri: String,
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let author = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;

    // Check if author is the signer
    if !author.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify the DAO account belongs to the program
    if dao_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Get DAO state
    let mut dao_state = try_from_slice_unchecked::<DaoState>(&dao_account.data.borrow())?;
    if !dao_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Verify author is a depositor
    let mut is_depositor = false;
    for depositor in &dao_state.depositors {
        if depositor.depositor == *author.key {
            is_depositor = true;
            break;
        }
    }

    if !is_depositor {
        return Err(ProgramError::InvalidAccountData);
    }

    // Create new content
    let content = Content {
        author: *author.key,
        text,
        image_uri,
        timestamp: current_time,
        vote_count: 0,
    };

    // Add content to DAO
    dao_state.contents.push(content);

    // Reset timeout when content is submitted
    dao_state.timeout_timestamp = current_time + dao_state.time_limit;

    // Save updated state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    msg!("Content submitted, timeout reset");
    Ok(())
}

// Create vote function
pub fn process_create_vote(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String,
    description: String,
    vote_type: VoteType,
    options: Vec<String>,
    voting_period: u64,
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let proposer = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;

    // Check if proposer is the signer
    if !proposer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify the DAO account belongs to the program
    if dao_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Get DAO state
    let mut dao_state = try_from_slice_unchecked::<DaoState>(&dao_account.data.borrow())?;
    if !dao_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Verify proposer is a depositor
    let mut is_depositor = false;
    for depositor in &dao_state.depositors {
        if depositor.depositor == *proposer.key {
            is_depositor = true;
            break;
        }
    }

    if !is_depositor {
        return Err(ProgramError::InvalidAccountData);
    }

    // Validate voting period (at least one week)
    const ONE_WEEK_SECONDS: u64 = 7 * 24 * 60 * 60;
    if voting_period < ONE_WEEK_SECONDS {
        return Err(ProgramError::InvalidArgument);
    }

    // Create new vote proposal
    let proposal = VoteProposal {
        proposal_id: dao_state.next_proposal_id,
        proposer: *proposer.key,
        title,
        description,
        vote_type,
        options,
        start_time: current_time,
        end_time: current_time + voting_period,
        votes: Vec::new(),
        status: VoteStatus::Active,
    };

    // Add proposal and increment ID counter
    dao_state.vote_proposals.push(proposal);
    dao_state.next_proposal_id += 1;

    // Save updated state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    msg!("Vote proposal created: ID {}", dao_state.next_proposal_id - 1);
    Ok(())
}

// Cast vote function
pub fn process_cast_vote(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    proposal_id: u64,
    option_index: u8,
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let voter = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;

    // Check if voter is the signer
    if !voter.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify the DAO account belongs to the program
    if dao_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Get DAO state
    let mut dao_state = try_from_slice_unchecked::<DaoState>(&dao_account.data.borrow())?;
    if !dao_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Find voter's deposit amount for voting power
    let mut voting_power: u64 = 0;
    for depositor in &dao_state.depositors {
        if depositor.depositor == *voter.key {
            voting_power = depositor.amount;
            break;
        }
    }

    if voting_power == 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    // Find the proposal
    let mut proposal_found = false;
    for proposal in dao_state.vote_proposals.iter_mut() {
        if proposal.proposal_id == proposal_id {
            // Check if proposal is active
            if proposal.status != VoteStatus::Active {
                return Err(ProgramError::InvalidAccountData);
            }

            // Check if voting period is still open
            if current_time > proposal.end_time {
                return Err(ProgramError::InvalidAccountData);
            }

            // Check if option index is valid
            if option_index as usize >= proposal.options.len() {
                return Err(ProgramError::InvalidArgument);
            }

            // Check if voter already voted
            for vote in &proposal.votes {
                if vote.voter == *voter.key {
                    return Err(ProgramError::InvalidAccountData);
                }
            }

            // Add the vote
            proposal.votes.push(VoteInfo {
                voter: *voter.key,
                option_index,
                voting_power,
            });

            proposal_found = true;
            break;
        }
    }

    if !proposal_found {
        return Err(ProgramError::InvalidArgument);
    }

    // Save updated state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    msg!("Vote cast for proposal {}", proposal_id);
    Ok(())
}

// Process timeout function
// 스택 사용량을 줄이기 위해 process_timeout 함수 최적화
pub fn process_timeout(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    // Get accounts
    let account_iter = &mut accounts.iter();
    let caller = next_account_info(account_iter)?;
    let dao_account = next_account_info(account_iter)?;

    // Check if caller is the signer
    if !caller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify the DAO account belongs to the program
    if dao_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Get current timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;

    // Get DAO state
    let mut dao_state = try_from_slice_unchecked::<DaoState>(&dao_account.data.borrow())?;
    if !dao_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Check if timeout has occurred
    if current_time < dao_state.timeout_timestamp {
        return Err(ProgramError::InvalidAccountData);
    }

    // 스택 사용량을 줄이기 위해 별도의 함수로 분리
    process_timeout_internal(&mut dao_state, current_time)?;

    // Save updated state
    dao_state.serialize(&mut *dao_account.data.borrow_mut())?;

    Ok(())
}

// 스택 사용량을 줄이기 위해 타임아웃 처리 로직을 분리
fn process_timeout_internal(
    dao_state: &mut DaoState,
    current_time: u64,
) -> ProgramResult {
    // Process any completed votes first
    process_completed_votes(dao_state, current_time);

    // 최적화: 변수 스코프 제한하기
    let best_content_info = {
        // Find the best content by vote count
        let mut best_index: Option<usize> = None;
        let mut highest_votes: u64 = 0;

        for (i, content) in dao_state.contents.iter().enumerate() {
            if content.vote_count > highest_votes {
                highest_votes = content.vote_count;
                best_index = Some(i);
            }
        }
        
        best_index.map(|idx| (dao_state.contents[idx].author, highest_votes))
    };

    // If there's a winner, distribute rewards
    if let Some((winner_pubkey, _)) = best_content_info {
        // Calculate base fee amount from total deposit
        let base_fee_amount = dao_state.total_deposit * (dao_state.base_fee as u64) / 100;
        
        // Calculate quality content producer share
        let quality_share = base_fee_amount * (dao_state.deposit_share as u64) / 100;
        
        // Remaining amount to distribute proportionally
        let remaining_amount = dao_state.total_deposit - base_fee_amount + (base_fee_amount - quality_share);

        // Reset DAO state for next round
        dao_state.timeout_timestamp = current_time + dao_state.time_limit;
        dao_state.total_deposit = 0;
        dao_state.contents.clear();
        
        // Keep depositors info but reset amounts
        for depositor in dao_state.depositors.iter_mut() {
            depositor.amount = 0;
        }
        
        msg!("Timeout processed, rewards distributed to winner {}", winner_pubkey);
    } else {
        // Reset timeout without distributing if no content was submitted
        dao_state.timeout_timestamp = current_time + dao_state.time_limit;
        msg!("Timeout processed, no content submissions found");
    }

    Ok(())
}


// Helper function to process completed votes
// Helper function to process completed votes
fn process_completed_votes(dao_state: &mut DaoState, current_time: u64) {
    for proposal in dao_state.vote_proposals.iter_mut() {
        // Skip already completed votes
        if proposal.status != VoteStatus::Active {
            continue;
        }
        
        // Check if voting period has ended
        if current_time > proposal.end_time {
            proposal.status = VoteStatus::Completed;
            
            // Count votes for each option
            let mut option_votes: Vec<u64> = vec![0; proposal.options.len()];
            let mut total_votes: u64 = 0;
            
            for vote in &proposal.votes {
                option_votes[vote.option_index as usize] += vote.voting_power;
                total_votes += vote.voting_power;
            }
            
            // If no votes, mark as completed but don't execute
            if total_votes == 0 {
                continue;
            }
            
            // Find winning option
            let mut winning_index = 0;
            let mut highest_votes = 0;
            
            for (i, &votes) in option_votes.iter().enumerate() {
                if votes > highest_votes {
                    highest_votes = votes;
                    winning_index = i;
                }
            }
            
            // Apply changes based on vote type
            match proposal.vote_type {
                VoteType::ChangeTimeLimit => {
                    // Extract time limit from option string (assuming format: "X seconds")
                    if let Ok(new_time) = proposal.options[winning_index].split_whitespace().next().unwrap_or("0").parse::<u64>() {
                        dao_state.time_limit = new_time;
                        proposal.status = VoteStatus::Executed;
                    }
                },
                VoteType::ChangeBaseFee => {
                    // Extract fee percentage from option string (assuming format: "X%")
                    if let Ok(new_fee) = proposal.options[winning_index].trim_end_matches('%').parse::<u64>() {
                        if new_fee <= 100 {
                            dao_state.base_fee = new_fee;
                            proposal.status = VoteStatus::Executed;
                        }
                    }
                },
                VoteType::ChangeAiModeration => {
                    // Set AI moderation based on option (assuming "On"/"Off" options)
                    dao_state.ai_moderation = proposal.options[winning_index].to_lowercase() == "on";
                    proposal.status = VoteStatus::Executed;
                },
                VoteType::ContentQualityRating => {
                    // For content quality rating, simply mark as executed
                    // The actual ratings are stored in the votes themselves and can be used
                    // when determining rewards distribution
                    proposal.status = VoteStatus::Executed;
                },
            }
        }
    }
}



// Calculate the space needed for the DAO account
impl DaoState {
pub fn get_space_needed(
    dao_name_len: usize, 
    max_depositors: usize,
    max_contents: usize,
    max_votes: usize,
) -> usize {
    // Base structure size
    let mut size = 1 + // is_initialized: bool
                  4 + dao_name_len + // dao_name: String (4 bytes length + content)
                  32 + // initializer: Pubkey
                  8 + // time_limit: u64
                  8 + // base_fee: u64
                  1 + // ai_moderation: bool
                  1 + // deposit_share: u8
                  8 + // timeout_timestamp: u64
                  8 + // total_deposit: u64
                  4 + // Vec<DepositorInfo> length
                  4 + // Vec<Content> length
                  4 + // Vec<VoteProposal> length
                  8;  // next_proposal_id: u64

    // Add space for depositors
    size += max_depositors * (
        32 + // depositor: Pubkey
        8 +  // amount: u64
        8 +  // timestamp: u64
        8    // locked_until: u64
    );

    // Add space for contents (assuming average text and image URI sizes)
    size += max_contents * (
        32 +  // author: Pubkey
        100 + // text: String (approximate)
        100 + // image_uri: String (approximate)
        8 +   // timestamp: u64
        8     // vote_count: u64
    );

    // Add space for votes (assuming average sizes)
    size += max_votes * (
        8 +   // proposal_id: u64
        32 +  // proposer: Pubkey
        50 +  // title: String (approximate)
        200 + // description: String (approximate)
        1 +   // vote_type: VoteType (enum)
        50 +  // options: Vec<String> (approximate for a few options)
        8 +   // start_time: u64
        8 +   // end_time: u64
        100 + // votes: Vec<VoteInfo> (approximate for several votes)
        1     // status: VoteStatus (enum)
    );

    size
}
}

// Function to check if a depositor exists
pub fn find_depositor_index(
depositors: &[DepositorInfo], 
depositor_key: &Pubkey
) -> Option<usize> {
depositors
    .iter()
    .position(|info| info.depositor == *depositor_key)
}

// Helper function to find best content author by votes
pub fn find_best_content_author(contents: &[Content]) -> Option<(Pubkey, u64)> {
if contents.is_empty() {
    return None;
}

let mut best_author = contents[0].author;
let mut highest_votes = contents[0].vote_count;

for content in contents {
    if content.vote_count > highest_votes {
        highest_votes = content.vote_count;
        best_author = content.author;
    }
}

Some((best_author, highest_votes))
}

// Helper function to tally votes for a proposal
pub fn tally_proposal_votes(proposal: &VoteProposal) -> Vec<u64> {
let mut option_votes = vec![0; proposal.options.len()];

for vote in &proposal.votes {
    if (vote.option_index as usize) < option_votes.len() {
        option_votes[vote.option_index as usize] += vote.voting_power;
    }
}

option_votes
}

// Helper function to calculate voting power based on deposit amount
pub fn calculate_voting_power(
depositor_key: &Pubkey, 
depositors: &[DepositorInfo]
) -> u64 {
for depositor in depositors {
    if depositor.depositor == *depositor_key {
        return depositor.amount;
    }
}
0
}

// Function to check if time limit has expired
pub fn is_timeout_expired(
dao_state: &DaoState, 
current_time: u64
) -> bool {
current_time >= dao_state.timeout_timestamp
}

// Helper function to distribute rewards to winner and depositors
// Note: This would be implemented with actual token transfers in production
pub fn distribute_rewards(
dao_state: &DaoState,
winner: &Pubkey,
winner_amount: u64,
dao_account: &AccountInfo,
program_id: &Pubkey
) -> ProgramResult {
// In a real implementation, this would:
// 1. Calculate each depositor's share
// 2. Transfer SOL to the winner
// 3. Return remaining funds to depositors proportionally

// This would require CPIs to the System Program or Token Program

// For now, just log the distribution
msg!("Would distribute {} lamports to winner {}", winner_amount, winner);
msg!("Remaining {} lamports would be distributed to depositors", 
     dao_state.total_deposit - winner_amount);
     
Ok(())
}

// Helper function to update DAO parameters after governance vote
pub fn update_dao_parameters(
dao_state: &mut DaoState, 
proposal: &VoteProposal,
winning_option: usize
) -> ProgramResult {
match proposal.vote_type {
    VoteType::ChangeTimeLimit => {
        // Parse time limit from option (e.g., "3600" for 3600 seconds)
        if let Ok(new_time) = proposal.options[winning_option].parse::<u64>() {
            dao_state.time_limit = new_time;
            msg!("Time limit updated to {} seconds", new_time);
        } else {
            return Err(ProgramError::InvalidInstructionData);
        }
    },
    VoteType::ChangeBaseFee => {
        // Parse fee from option (e.g., "5" for 5%)
        if let Ok(new_fee) = proposal.options[winning_option].parse::<u64>() {
            if new_fee <= 100 {
                dao_state.base_fee = new_fee;
                msg!("Base fee updated to {}%", new_fee);
            } else {
                return Err(ProgramError::InvalidInstructionData);
            }
        } else {
            return Err(ProgramError::InvalidInstructionData);
        }
    },
    VoteType::ChangeAiModeration => {
        // Parse boolean from option (e.g., "true" or "false")
        let option_str = proposal.options[winning_option].to_lowercase();
        if option_str == "true" || option_str == "on" {
            dao_state.ai_moderation = true;
            msg!("AI moderation turned ON");
        } else if option_str == "false" || option_str == "off" {
            dao_state.ai_moderation = false;
            msg!("AI moderation turned OFF");
        } else {
            return Err(ProgramError::InvalidInstructionData);
        }
    },
    VoteType::ContentQualityRating => {
        // Nothing to update for content ratings
        msg!("Content quality rating processed");
    },
}

Ok(())
}

// Function to execute the results of completed votes
// Function to execute the results of completed votes
pub fn execute_vote_results(
    dao_state: &mut DaoState, 
    current_time: u64
) -> ProgramResult {
    // 첫 번째 단계: 처리해야 할 제안과 정보를 수집
    // (제안 인덱스, 승리한 옵션 인덱스, 투표 유형 복사본)
    let mut updates_needed = Vec::new();
    
    // 모든 제안 검사 - 복사본을 만들어 원본 데이터를 안전하게 유지
    for i in 0..dao_state.vote_proposals.len() {
        // 이미 완료된 제안이나 실행된 제안은 건너뛰기
        if dao_state.vote_proposals[i].status != VoteStatus::Completed {
            continue;
        }
        
        // 투표 집계
        let votes = tally_proposal_votes(&dao_state.vote_proposals[i]);
        
        // 승리한 옵션 찾기
        let mut winning_option = 0;
        let mut highest_votes = 0;
        
        for (j, &vote_count) in votes.iter().enumerate() {
            if vote_count > highest_votes {
                highest_votes = vote_count;
                winning_option = j;
            }
        }
        
        // 투표 유형 복제 - 이는 나중에 사용하기 위한 것
        let vote_type = dao_state.vote_proposals[i].vote_type.clone();
        
        // 승자 옵션의 텍스트도 복제
        let winning_text = if dao_state.vote_proposals[i].options.len() > winning_option {
            dao_state.vote_proposals[i].options[winning_option].clone()
        } else {
            String::new()
        };
        
        // 업데이트 필요 목록에 추가
        if highest_votes > 0 {
            updates_needed.push((i, vote_type, winning_text));
        } else {
            // 투표가 없는 경우 상태만 업데이트
            dao_state.vote_proposals[i].status = VoteStatus::Executed;
        }
    }
    
    // 두 번째 단계: 수집된 정보를 바탕으로 업데이트 수행
    for (prop_idx, vote_type, winning_text) in updates_needed {
        // 투표 유형에 따라 DAO 매개변수 업데이트
        match vote_type {
            VoteType::ChangeTimeLimit => {
                if let Ok(new_time) = winning_text.parse::<u64>() {
                    dao_state.time_limit = new_time;
                    msg!("Time limit updated to {} seconds", new_time);
                }
            },
            VoteType::ChangeBaseFee => {
                if let Ok(new_fee) = winning_text.parse::<u64>() {
                    if new_fee <= 100 {
                        dao_state.base_fee = new_fee;
                        msg!("Base fee updated to {}%", new_fee);
                    }
                }
            },
            VoteType::ChangeAiModeration => {
                let option_str = winning_text.to_lowercase();
                if option_str == "true" || option_str == "on" {
                    dao_state.ai_moderation = true;
                    msg!("AI moderation turned ON");
                } else if option_str == "false" || option_str == "off" {
                    dao_state.ai_moderation = false;
                    msg!("AI moderation turned OFF");
                }
            },
            VoteType::ContentQualityRating => {
                msg!("Content quality rating processed");
            },
        }
        
        // 제안 상태 업데이트
        dao_state.vote_proposals[prop_idx].status = VoteStatus::Executed;
    }
    
    Ok(())
}

// Calculate deposit lock period expiry
pub fn is_deposit_unlocked(
depositor_info: &DepositorInfo, 
current_time: u64
) -> bool {
current_time >= depositor_info.locked_until
}

