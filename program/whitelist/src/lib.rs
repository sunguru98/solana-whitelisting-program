pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

#[cfg(not(feature = "no-entrypoint"))]
mod entrypoint;

solana_program::declare_id!("FSeLPB3DLwMfnQr6oG4YX9cdmGaZ2M99wCDt7TgGbzoF");
