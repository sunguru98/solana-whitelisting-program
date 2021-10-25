use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};
use std::{convert::TryInto, str::FromStr};

use crate::instruction::WhiteListInstruction;
use crate::{error::WhiteListError, state::WhitelistPDAGlobalState};

pub struct WhiteListProcessor;

impl WhiteListProcessor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let whitelist_instrution = WhiteListInstruction::parse_instruction(instruction_data)?;

        match whitelist_instrution {
            WhiteListInstruction::InitWhiteList {
                authorized_addresses,
                whitelist_pda_bump,
            } => {
                msg!("Instruction: Whitelist Initialize");

                let checking_whitelist_creator_account =
                    match Pubkey::from_str("9YuyqXdEibzx2oQZfPV1KNDioe8875F8GkTisYoZNpid") {
                        Ok(pub_key) => pub_key,
                        Err(_) => {
                            msg!("Whitelist Initialize: Public key parsing error");
                            return Err(ProgramError::InvalidArgument);
                        }
                    };

                msg!("DONE PDA BUMP PARSE :) {}", whitelist_pda_bump.to_string());
                msg!(
                    "DONE AUTHORIZED ADDRESS 1 PARSE :) {}",
                    authorized_addresses[0].to_string()
                );
                msg!(
                    "DONE AUTHORIZED ADDRESS 2 PARSE :) {}",
                    authorized_addresses[1].to_string()
                );
                msg!(
                    "DONE AUTHORIZED ADDRESS 3 PARSE :) {}",
                    authorized_addresses[2].to_string()
                );
                msg!(
                    "DONE AUTHORIZED ADDRESS 4 PARSE :) {}",
                    authorized_addresses[3].to_string()
                );
                msg!(
                    "DONE AUTHORIZED ADDRESS 5 PARSE :) {}",
                    authorized_addresses[4].to_string()
                );

                // All accounts
                let accounts_iterable = &mut accounts.iter();
                let whitelist_creator = next_account_info(accounts_iterable)?;
                let whitelist_pda_account = next_account_info(accounts_iterable)?;
                let system_program_account = next_account_info(accounts_iterable)?;
                let rent = Rent::get()?;

                let pda_seeds_bump: &[&[u8]] = &[
                    b"whitelistpda",
                    &whitelist_creator.key.to_bytes(),
                    &[whitelist_pda_bump],
                ];

                let whitelist_program_address =
                    Pubkey::create_program_address(pda_seeds_bump, program_id)?;

                const PDA_ACCOUNT_SPAN: u64 = 257;
                let lamports_required = rent.minimum_balance(PDA_ACCOUNT_SPAN.try_into().unwrap());

                // Checking if the resultant PDA address matches
                if !whitelist_pda_account.key.eq(&whitelist_program_address) {
                    msg!("Whitelist Initialize: PDA accounts mismatch");
                    return Err(ProgramError::InvalidAccountData);
                }

                // Checking if the pool owner has signed
                if !whitelist_creator.is_signer {
                    msg!("Whitelist Initialize: Pool creator has not signed");
                    return Err(ProgramError::MissingRequiredSignature);
                }

                // Checking if the pool owner is the one who passed their account
                if !whitelist_creator
                    .key
                    .eq(&checking_whitelist_creator_account)
                {
                    msg!("Whitelist Initialize: Account passed is not the pool creator");
                    return Err(WhiteListError::IncorrectPoolOwner.into());
                }

                // Checking if the system program id is the one expected
                if !system_program_account.key.eq(&system_program::id()) {
                    msg!("Whitelist Initialize: System Program accounts mismatch");
                    return Err(ProgramError::InvalidAccountData);
                }

                // CPI Part 1 -> Allocating space for PDA
                msg!(
                    "Allocating space for PDA account {}",
                    whitelist_pda_account.key.to_string()
                );
                let allocate_space_pda_ix =
                    system_instruction::allocate(&whitelist_pda_account.key, PDA_ACCOUNT_SPAN);

                invoke_signed(
                    &allocate_space_pda_ix,
                    &[
                        whitelist_pda_account.clone(),
                        system_program_account.clone(),
                    ],
                    &[pda_seeds_bump],
                )?;

                // CPI Part 2 -> Assigning the owner for the PDA
                msg!("Assigning the program owner for the newly created PDA");
                let assign_owner_to_pda_ix =
                    system_instruction::assign(&whitelist_pda_account.key, &program_id);

                invoke_signed(
                    &assign_owner_to_pda_ix,
                    &[
                        whitelist_pda_account.clone(),
                        system_program_account.clone(),
                    ],
                    &[pda_seeds_bump],
                )?;

                // CPI Part 3 -> Transfer Lamports to the newly created PDA
                msg!("Transferring lamports to PDA account to make rent exempt");
                let transfer_lamports_to_pda_ix = system_instruction::transfer(
                    &whitelist_creator.key,
                    &whitelist_pda_account.key,
                    lamports_required,
                );

                invoke(
                    &transfer_lamports_to_pda_ix,
                    &[
                        whitelist_creator.clone(),
                        whitelist_pda_account.clone(),
                        system_program_account.clone(),
                    ],
                )?;

                // Assigning basic state now
                let mut whitelist_pda_state =
                    WhitelistPDAGlobalState::try_from_slice(&whitelist_pda_account.data.borrow())?;

                // Checking if the PDA has already been initialized
                if whitelist_pda_state.is_initialized {
                    msg!("Whitelist Initialize: PDA account has already been initialized");

                    return Err(ProgramError::AccountAlreadyInitialized);
                }

                msg!(
                    "Initializing the PDA Account of address {}",
                    whitelist_program_address
                );

                whitelist_pda_state.is_initialized = true;
                whitelist_pda_state.whitelist_creator = *whitelist_creator.key;
                whitelist_pda_state.whitelist_auth_addresses = [
                    authorized_addresses[0],
                    authorized_addresses[1],
                    authorized_addresses[2],
                    authorized_addresses[3],
                    authorized_addresses[4],
                ];

                whitelist_pda_state
                    .serialize(&mut &mut whitelist_pda_account.data.borrow_mut()[..])?;

                msg!("Creation of Whitelist PDA complete successfully");

                Ok(())
            }
        }
    }
}
