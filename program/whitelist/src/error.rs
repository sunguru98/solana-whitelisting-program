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
}

impl From<WhiteListError> for ProgramError {
    fn from(e: WhiteListError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
