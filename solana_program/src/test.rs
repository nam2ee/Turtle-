#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        instruction::turtle_instruction,
        process_instruction, Content, DaoState, Depositor, ProposalType, Proposal,
    };
    use borsh::{BorshDeserialize, BorshSerialize};
    use solana_program::{
        account_info::AccountInfo, clock::Clock, entrypoint::ProgramResult, program_pack::Pack,
        pubkey::Pubkey, rent::Rent, sysvar::Sysvar,
    };
    use std::{collections::BTreeMap, mem};

    // Mock the Solana runtime environment
    pub struct SolanaRuntime {
        pub program_id: Pubkey,
        pub accounts: BTreeMap<Pubkey, Account>,
        pub clock: Clock,
        pub rent: Rent,
    }

    // Mock account structure
    pub struct Account {
        pub lamports: u64,
        pub data: Vec<u8>,
        pub owner: Pubkey,
        pub executable: bool,
        pub rent_epoch: u64,
    }

    impl SolanaRuntime {
        pub fn new(program_id: Pubkey) -> Self {
            let mut accounts = BTreeMap::new();
            let clock = Clock {
                slot: 0,
                epoch_start_timestamp: 0,
                epoch: 0,
                leader_schedule_epoch: 0,
                unix_timestamp: 0,
            };
            let rent = Rent {
                lamports_per_byte_year: 1,
                exemption_threshold: 2.0,
                burn_percent: 5,
            };

            Self {
                program_id,
                accounts,
                clock,
                rent,
            }
        }

        // Helper to create a new account
        pub fn create_account(&mut self, pubkey: &Pubkey, lamports: u64, space: usize, owner: &Pubkey) {
            let account = Account {
                lamports,
                data: vec![0; space],
                owner: *owner,
                executable: false,
                rent_epoch: 0,
            };
            self.accounts.insert(*pubkey, account);
        }

        // Helper to process an instruction
        pub fn process_instruction(&mut self, instruction: &Instruction) -> ProgramResult {
            let mut account_infos = Vec::new();
            
            for account_meta in &instruction.accounts {
                let account = self.accounts.get_mut(&account_meta.pubkey).unwrap();
                let is_signer = account_meta.is_signer;
                let is_writable = account_meta.is_writable;
                
                let account_info = AccountInfo::new(
                    &account_meta.pubkey,
                    is_signer,
                    is_writable,
                    &mut account.lamports,
                    &mut account.data,
                    &account.owner,
                    account.executable,
                    account.rent_epoch,
                );
                
                account_infos.push(account_info);
            }
            
            process_instruction(&self.program_id, &account_infos, &instruction.data)
        }
    }

    #[test]
    fn test_initialize_dao() {
        // Setup
        let program_id = Pubkey::new_unique();
        let mut runtime = SolanaRuntime::new(program_id);
        
        let payer = Pubkey::new_unique();
        let dao_account = Pubkey::new_unique();
        let system_program = Pubkey::new_unique();
        
        // Fund payer account
        runtime.create_account(&payer, 100000, 0, &system_program);
        
        // Create DAO account
        let dao_space = mem::size_of::<DaoState>();
        runtime.create_account(&dao_account, 0, dao_space, &program_id);
        
        // Create instruction
        let time_limit = 1800; // 30 minutes
        let base_fee = 10000000; // 0.01 SOL in lamports
        let ai_moderation = true;
        let deposit_share = 20; // 20% for quality content
        
        let instruction = turtle_instruction::initialize_dao(
            &program_id,
            &payer,
            &dao_account,
            time_limit,
            base_fee,
            ai_moderation,
            deposit_share,
        );
        
        // Process instruction
        runtime.process_instruction(&instruction).unwrap();
        
        // Verify DAO state
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        
        assert_eq!(dao_state.admin, payer);
        assert_eq!(dao_state.time_limit, time_limit);
        assert_eq!(dao_state.base_fee, base_fee);
        assert_eq!(dao_state.ai_moderation, ai_moderation);
        assert_eq!(dao_state.deposit_share, deposit_share);
        assert_eq!(dao_state.total_deposit, 0);
        assert_eq!(dao_state.content_count, 0);
        assert_eq!(dao_state.depositor_count, 0);
    }

    #[test]
    fn test_submit_content() {
        // Setup
        let program_id = Pubkey::new_unique();
        let mut runtime = SolanaRuntime::new(program_id);
        
        let submitter = Pubkey::new_unique();
        let dao_account = Pubkey::new_unique();
        let content_account = Pubkey::new_unique();
        let system_program = Pubkey::new_unique();
        
        // Fund submitter account
        runtime.create_account(&submitter, 1000000000, 0, &system_program);
        
        // Create DAO account with initial state
        let dao_space = mem::size_of::<DaoState>();
        runtime.create_account(&dao_account, 0, dao_space, &program_id);
        
        // Initialize DAO state
        let dao_state = DaoState {
            admin: submitter, // submitter is admin for simplicity
            time_limit: 1800,
            base_fee: 10000000,
            ai_moderation: true,
            deposit_share: 20,
            last_activity_timestamp: 0,
            total_deposit: 0,
            active_proposal_count: 0,
            content_count: 0,
            depositor_count: 0,
        };
        
        let mut dao_data = runtime.accounts.get_mut(&dao_account).unwrap().data.as_mut();
        dao_state.serialize(&mut dao_data).unwrap();
        
        // Create content account
        let content_hash = "content_hash".to_string();
        let content_uri = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco".to_string();
        let content_space = mem::size_of::<Content>() + content_hash.len() + content_uri.len();
        runtime.create_account(&content_account, 0, content_space, &program_id);
        
        // Create instruction
        let instruction = turtle_instruction::submit_content(
            &program_id,
            &submitter,
            &dao_account,
            &content_account,
            content_hash.clone(),
            content_uri.clone(),
        );
        
        // Set timestamp for testing
        runtime.clock.unix_timestamp = 1000;
        
        // Process instruction
        runtime.process_instruction(&instruction).unwrap();
        
        // Verify content state
        let content_data = &runtime.accounts.get(&content_account).unwrap().data;
        let content = Content::try_from_slice(content_data).unwrap();
        
        assert_eq!(content.author, submitter);
        assert_eq!(content.content_hash, content_hash);
        assert_eq!(content.content_uri, content_uri);
        assert_eq!(content.timestamp, 1000);
        
        // Verify DAO state updated (timer reset)
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        
        assert_eq!(dao_state.last_activity_timestamp, 1000);
        assert_eq!(dao_state.content_count, 1);
    }

    #[test]
    fn test_deposit_and_claim_reward() {
        // Setup
        let program_id = Pubkey::new_unique();
        let mut runtime = SolanaRuntime::new(program_id);
        
        let depositor = Pubkey::new_unique();
        let content_creator = Pubkey::new_unique();
        let dao_account = Pubkey::new_unique();
        let depositor_state_account = Pubkey::new_unique();
        let content_account = Pubkey::new_unique();
        let system_program = Pubkey::new_unique();
        
        // Fund accounts
        runtime.create_account(&depositor, 2000000000, 0, &system_program);
        runtime.create_account(&content_creator, 1000000000, 0, &system_program);
        
        // Create DAO account with initial state
        let dao_space = mem::size_of::<DaoState>();
        runtime.create_account(&dao_account, 0, dao_space, &program_id);
        
        // Initialize DAO state
        let dao_state = DaoState {
            admin: depositor, // depositor is admin for simplicity
            time_limit: 1800,
            base_fee: 10000000,
            ai_moderation: true,
            deposit_share: 20,
            last_activity_timestamp: 0,
            total_deposit: 0,
            active_proposal_count: 0,
            content_count: 0,
            depositor_count: 0,
        };
        
        let mut dao_data = runtime.accounts.get_mut(&dao_account).unwrap().data.as_mut();
        dao_state.serialize(&mut dao_data).unwrap();
        
        // Create depositor state account
        let depositor_space = mem::size_of::<Depositor>();
        runtime.create_account(&depositor_state_account, 0, depositor_space, &program_id);
        
        // Create deposit instruction
        let deposit_amount = 1000000000; // 1 SOL
        let deposit_instruction = turtle_instruction::deposit(
            &program_id,
            &depositor,
            &dao_account,
            &depositor_state_account,
            deposit_amount,
        );
        
        // Set initial timestamp
        runtime.clock.unix_timestamp = 1000;
        
        // Process deposit instruction
        runtime.process_instruction(&deposit_instruction).unwrap();
        
        // Verify depositor state
        let depositor_data = &runtime.accounts.get(&depositor_state_account).unwrap().data;
        let depositor_state = Depositor::try_from_slice(depositor_data).unwrap();
        
        assert_eq!(depositor_state.pubkey, depositor);
        assert_eq!(depositor_state.amount, deposit_amount);
        assert_eq!(depositor_state.voting_power, deposit_amount);
        
        // Verify DAO state updated
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        
        assert_eq!(dao_state.total_deposit, deposit_amount);
        assert_eq!(dao_state.depositor_count, 1);
        
        // Now submit content from creator
        let content_hash = "content_hash".to_string();
        let content_uri = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco".to_string();
        let content_space = mem::size_of::<Content>() + content_hash.len() + content_uri.len();
        runtime.create_account(&content_account, 0, content_space, &program_id);
        
        // Create content submission instruction
        let submit_instruction = turtle_instruction::submit_content(
            &program_id,
            &content_creator,
            &dao_account,
            &content_account,
            content_hash.clone(),
            content_uri.clone(),
        );
        
        // Set timestamp for content submission
        runtime.clock.unix_timestamp = 1100;
        
        // Process content submission
        runtime.process_instruction(&submit_instruction).unwrap();
        
        // Verify content state
        let content_data = &runtime.accounts.get(&content_account).unwrap().data;
        let content = Content::try_from_slice(content_data).unwrap();
        
        assert_eq!(content.author, content_creator);
        assert_eq!(content.timestamp, 1100);
        
        // Verify DAO state updated (timer reset)
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        
        assert_eq!(dao_state.last_activity_timestamp, 1100);
        
        // Now claim reward after time limit
        let claim_instruction = turtle_instruction::claim_reward(
            &program_id,
            &content_creator,
            &dao_account,
            &content_account,
        );
        
        // Set timestamp after time limit
        runtime.clock.unix_timestamp = 3000; // 1100 + 1800 (time limit) + buffer
        
        // Process claim instruction
        runtime.process_instruction(&claim_instruction).unwrap();
        
        // Verify creator received reward
        let creator_account = runtime.accounts.get(&content_creator).unwrap();
        // Should receive 80% of deposit (as deposit_share is 20%)
        let expected_reward = (deposit_amount * 80) / 100;
        
        // Initial balance + reward - base fee
        let expected_balance = 1000000000 + expected_reward - dao_state.base_fee;
        assert_eq!(creator_account.lamports, expected_balance);
        
        // Verify DAO state updated
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        
        // DAO should retain 20% for quality rewards
        let expected_dao_balance = (deposit_amount * 20) / 100 + dao_state.base_fee;
        assert_eq!(dao_state.total_deposit, (deposit_amount * 20) / 100);
    }

    #[test]
    fn test_governance() {
        // Setup
        let program_id = Pubkey::new_unique();
        let mut runtime = SolanaRuntime::new(program_id);
        
        let admin = Pubkey::new_unique();
        let depositor1 = Pubkey::new_unique();
        let depositor2 = Pubkey::new_unique();
        let dao_account = Pubkey::new_unique();
        let admin_state_account = Pubkey::new_unique();
        let depositor1_state_account = Pubkey::new_unique();
        let depositor2_state_account = Pubkey::new_unique();
        let proposal_account = Pubkey::new_unique();
        let system_program = Pubkey::new_unique();
        
        // Fund accounts
        runtime.create_account(&admin, 2000000000, 0, &system_program);
        runtime.create_account(&depositor1, 2000000000, 0, &system_program);
        runtime.create_account(&depositor2, 2000000000, 0, &system_program);
        
        // Create DAO account with initial state
        let dao_space = mem::size_of::<DaoState>();
        runtime.create_account(&dao_account, 0, dao_space, &program_id);
        
        // Initialize DAO state
        let initial_time_limit = 1800;
        let dao_state = DaoState {
            admin: admin,
            time_limit: initial_time_limit,
            base_fee: 10000000,
            ai_moderation: true,
            deposit_share: 20,
            last_activity_timestamp: 0,
            total_deposit: 0,
            active_proposal_count: 0,
            content_count: 0,
            depositor_count: 0,
        };
        
        let mut dao_data = runtime.accounts.get_mut(&dao_account).unwrap().data.as_mut();
        dao_state.serialize(&mut dao_data).unwrap();
        
        // Create depositor state accounts
        let depositor_space = mem::size_of::<Depositor>();
        runtime.create_account(&admin_state_account, 0, depositor_space, &program_id);
        runtime.create_account(&depositor1_state_account, 0, depositor_space, &program_id);
        runtime.create_account(&depositor2_state_account, 0, depositor_space, &program_id);
        
        // Set initial timestamp
        runtime.clock.unix_timestamp = 1000;
        
        // Admin makes deposit
        let admin_deposit = 500000000; // 0.5 SOL
        let admin_deposit_instruction = turtle_instruction::deposit(
            &program_id,
            &admin,
            &dao_account,
            &admin_state_account,
            admin_deposit,
        );
        runtime.process_instruction(&admin_deposit_instruction).unwrap();
        
        // Depositor1 makes deposit
        let depositor1_deposit = 300000000; // 0.3 SOL
        let depositor1_deposit_instruction = turtle_instruction::deposit(
            &program_id,
            &depositor1,
            &dao_account,
            &depositor1_state_account,
            depositor1_deposit,
        );
        runtime.process_instruction(&depositor1_deposit_instruction).unwrap();
        
        // Depositor2 makes deposit
        let depositor2_deposit = 200000000; // 0.2 SOL
        let depositor2_deposit_instruction = turtle_instruction::deposit(
            &program_id,
            &depositor2,
            &dao_account,
            &depositor2_state_account,
            depositor2_deposit,
        );
        runtime.process_instruction(&depositor2_deposit_instruction).unwrap();
        
        // Verify DAO state
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        assert_eq!(dao_state.total_deposit, admin_deposit + depositor1_deposit + depositor2_deposit);
        assert_eq!(dao_state.depositor_count, 3);
        
        // Create proposal account
        let proposal_space = mem::size_of::<Proposal>();
        runtime.create_account(&proposal_account, 0, proposal_space, &program_id);
        
        // Admin creates proposal to change time limit
        let new_time_limit = 3600; // 1 hour
        let min_voting_period = 7 * 24 * 60 * 60; // 1 week in seconds
        let create_vote_instruction = turtle_instruction::create_vote(
            &program_id,
            &admin,
            &dao_account,
            &admin_state_account,
            &proposal_account,
            ProposalType::TimeLimit,
            new_time_limit,
            min_voting_period,
        );
        
        runtime.process_instruction(&create_vote_instruction).unwrap();
        
        // Verify proposal created
        let proposal_data = &runtime.accounts.get(&proposal_account).unwrap().data;
        let proposal = Proposal::try_from_slice(proposal_data).unwrap();
        assert_eq!(proposal.proposal_type, ProposalType::TimeLimit);
        assert_eq!(proposal.new_value, new_time_limit);
        assert_eq!(proposal.yes_votes, 0);
        assert_eq!(proposal.no_votes, 0);
        
        // Depositors vote on proposal
        let admin_vote_instruction = turtle_instruction::vote(
            &program_id,
            &admin,
            &dao_account,
            &admin_state_account,
            &proposal_account,
            0, // proposal id
            true, // approve
        );
        runtime.process_instruction(&admin_vote_instruction).unwrap();
        
        let depositor1_vote_instruction = turtle_instruction::vote(
            &program_id,
            &depositor1,
            &dao_account,
            &depositor1_state_account,
            &proposal_account,
            0, // proposal id
            true, // approve
        );
        runtime.process_instruction(&depositor1_vote_instruction).unwrap();
        
        let depositor2_vote_instruction = turtle_instruction::vote(
            &program_id,
            &depositor2,
            &dao_account,
            &depositor2_state_account,
            &proposal_account,
            0, // proposal id
            false, // reject
        );
        runtime.process_instruction(&depositor2_vote_instruction).unwrap();
        
        // Verify votes recorded
        let proposal_data = &runtime.accounts.get(&proposal_account).unwrap().data;
        let proposal = Proposal::try_from_slice(proposal_data).unwrap();
        assert_eq!(proposal.yes_votes, admin_deposit + depositor1_deposit);
        assert_eq!(proposal.no_votes, depositor2_deposit);
        
        // Move time forward to end of voting period
        runtime.clock.unix_timestamp = 1000 + min_voting_period + 1;
        
        // One more vote to trigger execution
        let final_vote_instruction = turtle_instruction::vote(
            &program_id,
            &admin,
            &dao_account,
            &admin_state_account,
            &proposal_account,
            0, // proposal id
            true, // approve
        );
        runtime.process_instruction(&final_vote_instruction).unwrap();
        
        // Verify proposal executed
        let proposal_data = &runtime.accounts.get(&proposal_account).unwrap().data;
        let proposal = Proposal::try_from_slice(proposal_data).unwrap();
        assert_eq!(proposal.is_executed, true);
        
        // Verify DAO state updated
        let dao_data = &runtime.accounts.get(&dao_account).unwrap().data;
        let dao_state = DaoState::try_from_slice(dao_data).unwrap();
        assert_eq!(dao_state.time_limit, new_time_limit);
    }
}