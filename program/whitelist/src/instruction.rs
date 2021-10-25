use crate::error::WhiteListError::InvalidInstruction;
use solana_program::{program_error::ProgramError, pubkey::Pubkey};

pub enum WhiteListInstruction {
    /// Initializes the PDA with an array of allowed accounts
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` Whitelist program creator to create the pda account storage
    /// 1. `[writable]` Whitelist PDA account
    /// 2. [] System program
    InitWhiteList {
        whitelist_pda_bump: u8,
        authorized_addresses: Vec<Pubkey>,
    },
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
            0 => {
                return Ok(WhiteListInstruction::InitWhiteList {
                    whitelist_pda_bump: *rest.split_first().unwrap().0,
                    authorized_addresses: Self::parse_authorized_addresses(rest.get(1..).unwrap())?,
                });
            }
            _ => return Err(InvalidInstruction.into()),
        }
    }
}
