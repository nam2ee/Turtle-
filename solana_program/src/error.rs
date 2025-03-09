use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum TurtleError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    
    #[error("Not Rent Exempt")]
    NotRentExempt,
    
    #[error("Expected Amount Mismatch")]
    ExpectedAmountMismatch,
    
    #[error("Amount Overflow")]
    AmountOverflow,
    
    #[error("Invalid Parameter")]
    InvalidParameter,
    
    #[error("Not Admin")]
    NotAdmin,
    
    #[error("Not Authorized")]
    NotAuthorized,
    
    #[error("Time Limit Not Reached")]
    TimeLimitNotReached,
    
    #[error("Invalid Content")]
    InvalidContent,
    
    #[error("Invalid Proposal")]
    InvalidProposal,
    
    #[error("Voting Period Not Ended")]
    VotingPeriodNotEnded,
    
    #[error("Invalid Distribution")]
    InvalidDistribution,
}

impl From<TurtleError> for ProgramError {
    fn from(e: TurtleError) -> Self {
        ProgramError::Custom(e as u32)
    }
}