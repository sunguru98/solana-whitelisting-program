use crate::error::WhiteListError::InvalidInstruction;
use solana_program::{program_error::ProgramError, pubkey::Pubkey};
use std::convert::TryInto;

pub enum WhiteListInstruction {
    /// Initializes the PDA with an array of allowed accounts
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[signer]` Whitelist program creator to create the pda account storage
    /// 1. `[writable]` Whitelist PDA account
    /// 2. [] System program
    InitWhiteList {
        whitelist_pda_bump: u8,
        authorized_addresses: Vec<Pubkey>,
    },

    /// Creates an Associated token for the user and wraps a user's SOL token
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writeable,signer]` Account who needs to wrap SOL (must be a system account)
    /// 1. `[writeable]` Associated token account address (PDA) to be created
    /// 2. `[]` The token mint for the new associated token account
    /// 3. `[]` System program
    /// 4. `[]` SPL Token program
    /// 5. `[]` SPL Associated Token program
    /// 6. [] Rent sysvar
    CreateAndWrapSOLToken { amount_to_be_wrapped: u64 },

    // Just Wraps SOL Token for the user
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writeable,signer]` Account who needs to wrap SOL (must be a system account)
    /// 1. `[writeable]` Associated Native SOL token account
    /// 2. [] System Program
    /// 3. [] SPL Token Program
    WrapSOLToken { amount_to_be_wrapped: u64 },

    /// Unwraps a native mint token account by transferring all its SOL to the destination account.
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[signer]` The account's owner.
    /// 1. `[writable]` The account to close.
    /// 2. [] SPL Token Program
    UnwrapSOLToken,
}

impl WhiteListInstruction {
    fn unpack_pubkey(input: &[u8]) -> Result<(Pubkey, &[u8]), ProgramError> {
        if input.len() >= 32 {
            let (key, rest) = input.split_at(32);
            let pk = Pubkey::new(key);
            Ok((pk, rest))
        } else {
            Err(InvalidInstruction.into())
        }
    }

    fn parse_amount(amount_u8_data: &[u8]) -> Result<u64, ProgramError> {
        let amount = amount_u8_data
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(ProgramError::InvalidAccountData)?;

        Ok(amount)
    }

    fn parse_authorized_addresses(
        addresses_byte_data_array: &[u8],
    ) -> Result<Vec<Pubkey>, ProgramError> {
        let mut pub_keys: Vec<Pubkey> = vec![];
        let mut rest_data: &[u8] = addresses_byte_data_array;

        for _ in [0, 1, 2, 3, 4].iter() {
            let (address, rest) = Self::unpack_pubkey(rest_data)?;
            pub_keys.push(address);
            rest_data = rest;
        }

        Ok(pub_keys)
    }

    pub fn parse_instruction(instruction_data: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = instruction_data.split_first().ok_or(InvalidInstruction)?;

        match tag {
            0 => Ok(WhiteListInstruction::InitWhiteList {
                whitelist_pda_bump: *rest.split_first().unwrap().0,
                authorized_addresses: Self::parse_authorized_addresses(rest.get(1..).unwrap())?,
            }),

            1 => Ok(WhiteListInstruction::CreateAndWrapSOLToken {
                amount_to_be_wrapped: Self::parse_amount(rest)?,
            }),

            2 => Ok(WhiteListInstruction::WrapSOLToken {
                amount_to_be_wrapped: Self::parse_amount(rest)?,
            }),

            3 => Ok(WhiteListInstruction::UnwrapSOLToken),

            _ => return Err(InvalidInstruction.into()),
        }
    }
}
