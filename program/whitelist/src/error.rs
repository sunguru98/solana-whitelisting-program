use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Clone, Debug, Error, FromPrimitive)]
pub enum WhiteListError {
    // Invalid Instruction
    #[error("Invalid Instruction data")]
    InvalidInstruction,

    // IncorrectPoolOwner
    #[error("Incorrect Pool owner")]
    IncorrectPoolOwner,

    // IncorrectTokenOwner
    #[error("Passed token account's owner is not the Swap Authority")]
    IncorrectTokenOwner,

    // PoolNotInitialized
    #[error("Passed Token Swap Account is not initialized")]
    PoolNotInitialized,
}

impl From<WhiteListError> for ProgramError {
    fn from(e: WhiteListError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
