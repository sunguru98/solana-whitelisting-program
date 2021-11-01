use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program::id as system_program_id,
    sysvar::Sysvar,
};
use spl_associated_token_account::{
    create_associated_token_account, get_associated_token_address,
    id as associated_token_program_id,
};
use spl_token::{
    id as token_program_id,
    instruction::{close_account, sync_native},
    native_mint::id as native_mint_account,
    state::Account as TokenState,
};
use spl_token_swap::{
    id as token_swap_program_id,
    instruction::{swap, Swap},
    state::SwapVersion,
};

use std::convert::TryInto;

use crate::instruction::WhiteListInstruction;
use crate::state::WhitelistPDAGlobalState;
use crate::{
    error::WhiteListError::{
        AccountAlreadyRedeemed, AccountNotWhitelisted, IncorrectPoolOwner, IncorrectStateAccount,
        IncorrectTokenOwner,
    },
    state::WhitelistUserState,
};

// UTIL FUNCTIONS
fn check_for_wrapping(
    instruction: &str,
    amount_to_be_wrapped: u64,
    associated_account_address: &Pubkey,
    funding_account: &AccountInfo,
    associated_token_pda_account: &AccountInfo,
    spl_token_program_account: &AccountInfo,
    system_program_account: &AccountInfo,
) -> ProgramResult {
    // Checking if the funding account has signed this transaction
    if !funding_account.is_signer {
        msg!("WhiteList {}: Funding account has not signed", instruction);
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Checking if the funding account has enough lamports
    let funding_account_balance = funding_account.try_lamports()?;
    let rent_storage_fees = match instruction {
        "CreateAndWrapSOLToken" => Rent::get()?.minimum_balance(165),
        "WrapSOLToken" => 0u64,
        _ => 0u64,
    };

    let required_balance = amount_to_be_wrapped + rent_storage_fees;

    if funding_account_balance.lt(&required_balance) {
        msg!("WhiteList CreateAndWrapSOLToken: Funding account has insufficient funds");
        return Err(ProgramError::InsufficientFunds);
    }

    // Checking if the right PDA account has been passed
    if !associated_token_pda_account
        .key
        .eq(&associated_account_address)
    {
        msg!(
            "WhiteList CreateAndWrapSOLToken: Associated Token Account mismatch with given address"
        );
        return Err(ProgramError::InvalidAccountData);
    }

    // Checking if the right spl token program account has been passed
    if !spl_token_program_account.key.eq(&token_program_id()) {
        msg!("WhiteList CreateAndWrapSOLToken: Passed Token Program key mismatches with original Token Program key");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Checking if the right system program account has been passed
    if !system_program_account.key.eq(&system_program_id()) {
        msg!("WhiteList CreateAndWrapSOLToken: Passed System Program key mismatches with original System Program key");
        return Err(ProgramError::IncorrectProgramId);
    }

    Ok(())
}

pub struct WhiteListProcessor;

impl WhiteListProcessor {
    // INITIALIZE
    fn process_whitelist_initialize(
        authorized_addresses: Vec<Pubkey>,
        whitelist_pda_bump: u8,
        price_per_token_y: u64,
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        msg!("DONE PDA BUMP PARSE :) {}", whitelist_pda_bump.to_string());
        msg!(
            "DONE PRICE PER TOKEN Y PARSE :) {}",
            price_per_token_y.to_string()
        );
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
        msg!(
            "DONE AUTHORIZED ADDRESS 6 PARSE :) {}",
            authorized_addresses[5].to_string()
        );

        // All accounts
        let accounts_iterable = &mut accounts.iter();
        let whitelist_creator = next_account_info(accounts_iterable)?;
        let whitelist_pda_account = next_account_info(accounts_iterable)?;
        let token_swap_pool_state_account = next_account_info(accounts_iterable)?;
        let y_token_mint_account = next_account_info(accounts_iterable)?;
        let y_token_account = next_account_info(accounts_iterable)?;
        let native_sol_token_account = next_account_info(accounts_iterable)?;
        let system_program_account = next_account_info(accounts_iterable)?;

        let rent = Rent::get()?;

        let pda_seeds_bump: &[&[u8]] = &[
            b"whitelistpda",
            &whitelist_creator.key.to_bytes(),
            &y_token_account.key.to_bytes(),
            &[whitelist_pda_bump],
        ];

        let whitelist_program_address = Pubkey::create_program_address(pda_seeds_bump, program_id)?;

        const PDA_ACCOUNT_SPAN: u64 = 362;
        let lamports_required = rent.minimum_balance(PDA_ACCOUNT_SPAN.try_into().unwrap());

        // Checking if the pool state account passed is the correct account
        if !token_swap_pool_state_account
            .owner
            .eq(&token_swap_program_id())
        {
            msg!("Whitelist Initialize: Passed Token Swap State Account's owner is not the Token Swap Program");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking if the pool state account is initialized
        let pool_state_account_decoded =
            SwapVersion::unpack(&token_swap_pool_state_account.data.borrow())?;

        if !pool_state_account_decoded.is_initialized() {
            msg!("Whitelist Initialize: Token Swap State Account not intialized");
            return Err(IncorrectPoolOwner.into());
        }

        // Checking if the token accounts's owner is the token program
        if !y_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist Initialize: Y Token account passed is not a Token Program Account");
            return Err(ProgramError::InvalidAccountData);
        }

        if !native_sol_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist Initialize: Y Token account passed is not a Token Program Account");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking if the token accounts owner is the swap authority
        let swap_authority = Pubkey::create_program_address(
            &[
                &token_swap_pool_state_account.key.to_bytes(),
                &[pool_state_account_decoded.bump_seed()],
            ],
            &token_swap_program_id(),
        )?;

        let y_token_account_decoded = TokenState::unpack(&y_token_account.data.borrow())?;
        let native_token_account_decoded =
            TokenState::unpack(&native_sol_token_account.data.borrow())?;

        if !y_token_account_decoded.owner.eq(&swap_authority) {
            msg!("Whitelist Initialize: Y Token Account's owner is not the Swap Authority");
            return Err(IncorrectTokenOwner.into());
        }

        if !native_token_account_decoded.owner.eq(&swap_authority) {
            msg!(
                "Whitelist Initialize: Native SOL Token Account's owner is not the Swap Authority"
            );
            return Err(IncorrectTokenOwner.into());
        }

        // Checking about the value of price per token B
        if price_per_token_y == 0 {
            msg!("Whitelist Initialize: Price per Token B should be greater than 0");
            return Err(ProgramError::InvalidInstructionData);
        }

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

        // Checking if the system program id is the one expected
        if !system_program_account.key.eq(&system_program_id()) {
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
        whitelist_pda_state.global_pda_bump = whitelist_pda_bump;
        whitelist_pda_state.whitelist_auth_addresses = [
            authorized_addresses[0],
            authorized_addresses[1],
            authorized_addresses[2],
            authorized_addresses[3],
            authorized_addresses[4],
            authorized_addresses[5],
        ];
        whitelist_pda_state.native_sol_token_account = *native_sol_token_account.key;
        whitelist_pda_state.token_swap_pool_state = *token_swap_pool_state_account.key;
        whitelist_pda_state.y_mint_account = *y_token_mint_account.key;
        whitelist_pda_state.y_token_account = *y_token_account.key;
        whitelist_pda_state.price_per_token_y = price_per_token_y;

        whitelist_pda_state.serialize(&mut &mut whitelist_pda_account.data.borrow_mut()[..])?;

        msg!("Creation of Whitelist PDA complete successfully");

        Ok(())
    }

    // PLAIN ASSOC WRAP SOL
    fn process_whitelist_wrap_sol(
        amount_to_be_wrapped: u64,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let accounts_iterable = &mut accounts.iter();
        // All accounts
        let funding_account = next_account_info(accounts_iterable)?;
        let associated_token_pda_account = next_account_info(accounts_iterable)?;
        let system_program_account = next_account_info(accounts_iterable)?;
        let spl_token_program_account = next_account_info(accounts_iterable)?;

        let associated_account_address =
            get_associated_token_address(&funding_account.key, &native_mint_account());

        // Processes a bunch of checks which are common for both create-wrap and wrap SOL

        check_for_wrapping(
            "WrapSOLToken",
            amount_to_be_wrapped,
            &associated_account_address,
            funding_account,
            associated_token_pda_account,
            spl_token_program_account,
            system_program_account,
        )?;

        // Checking if the associated account already exists
        if !associated_token_pda_account.owner.eq(&token_program_id()) {
            msg!("Whitelist WrapSOLToken: Associated token account does not exist");
            return Err(ProgramError::UninitializedAccount);
        }

        // Business logic starts

        // Transferring the required lamports to be wrapped to the PDA
        msg!("Transferring SOL to Associated account");
        let transfer_lamports_to_assoc_account_ix = system_instruction::transfer(
            &funding_account.key,
            &associated_account_address,
            amount_to_be_wrapped,
        );

        invoke(
            &transfer_lamports_to_assoc_account_ix,
            &[
                funding_account.clone(),
                associated_token_pda_account.clone(),
                system_program_account.clone(),
            ],
        )?;

        // Sync Nativeing the associated account to update the wSOL balance
        msg!("Sync Nativeing the associated account to update the wSOL balance");
        let sync_native_sol_ix =
            sync_native(&token_program_id(), &associated_token_pda_account.key)?;

        invoke(
            &sync_native_sol_ix,
            &[
                associated_token_pda_account.clone(),
                spl_token_program_account.clone(),
            ],
        )?;

        Ok(())
    }

    // CREATE AND WRAP SOL
    fn process_whitelist_create_and_wrap_sol(
        amount_to_be_wrapped: u64,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let accounts_iterable = &mut accounts.iter();
        // All accounts
        let funding_account = next_account_info(accounts_iterable)?;
        let associated_token_pda_account = next_account_info(accounts_iterable)?;
        let native_token_mint_account = next_account_info(accounts_iterable)?;
        let system_program_account = next_account_info(accounts_iterable)?;
        let spl_token_program_account = next_account_info(accounts_iterable)?;
        let associated_token_program_account = next_account_info(accounts_iterable)?;
        let rent_sysvar_account = next_account_info(accounts_iterable)?;

        let associated_account_address =
            get_associated_token_address(&funding_account.key, &native_mint_account());

        // Processes a bunch of checks which are common for both create-wrap and wrap SOL

        check_for_wrapping(
            "CreateAndWrapSOLTokenToken",
            amount_to_be_wrapped,
            &associated_account_address,
            funding_account,
            associated_token_pda_account,
            spl_token_program_account,
            system_program_account,
        )?;

        // Checking if the right spl associated token program account has been passed
        if !associated_token_program_account
            .key
            .eq(&associated_token_program_id())
        {
            msg!("WhiteList CreateAndWrapSOLToken: Passed Associated Token Program key mismatches with original Token Program key");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Checking if the corrent native mint account has been passed
        if !native_token_mint_account.key.eq(&native_mint_account()) {
            msg!("WhiteList CreateAndWrapSOLToken: Passed Native Mint account mismatch with original native mint account");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Checking if the pda account is not initialized
        if !associated_token_pda_account.owner.eq(&system_program_id()) {
            msg!("WhiteList CreateAndWrapSOLToken: Associated account already exists");
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        // Business logic starts

        // Transferring the required lamports to be wrapped to the PDA
        msg!("Transferring SOL to Associated account");
        let transfer_lamports_to_assoc_account_ix = system_instruction::transfer(
            &funding_account.key,
            &associated_account_address,
            amount_to_be_wrapped,
        );

        invoke(
            &transfer_lamports_to_assoc_account_ix,
            &[
                funding_account.clone(),
                associated_token_pda_account.clone(),
                system_program_account.clone(),
            ],
        )?;

        // Creating a Associated token account for the funded account
        msg!("Creating an Associated Token Account for the funded account");
        let create_associated_token_for_funded_account_ix = create_associated_token_account(
            &funding_account.key,
            &funding_account.key,
            &native_mint_account(),
        );

        invoke(
            &create_associated_token_for_funded_account_ix,
            &[
                funding_account.clone(),
                associated_token_pda_account.clone(),
                funding_account.clone(),
                native_token_mint_account.clone(),
                system_program_account.clone(),
                spl_token_program_account.clone(),
                rent_sysvar_account.clone(),
                associated_token_program_account.clone(),
            ],
        )?;

        msg!("DONE :)");

        Ok(())
    }

    // UNWRAP SOL
    fn process_whitelist_unwrap_sol(accounts: &[AccountInfo]) -> ProgramResult {
        let accounts_iterable = &mut accounts.iter();
        // All accounts
        let owner_account = next_account_info(accounts_iterable)?;
        let native_assoc_pda_account = next_account_info(accounts_iterable)?;
        let spl_token_program_account = next_account_info(accounts_iterable)?;

        let associated_account_address =
            get_associated_token_address(&owner_account.key, &native_mint_account());

        // Checking if the owner account has signed
        if !owner_account.is_signer {
            msg!("Whitelist UnwrapSOLToken: Owner account has not signed");
            return Err(ProgramError::MissingRequiredSignature);
        }

        // Checking if the spl program matches
        if !spl_token_program_account.key.eq(&token_program_id()) {
            msg!("Whitelist UnwrapSOLToken: SPL Program Id mismatch with original program id");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Checking if the token account is a "token" account
        if !native_assoc_pda_account.owner.eq(&token_program_id()) {
            msg!("Whitelist UnwrapSOLToken: Passed account is not a token account");
            return Err(ProgramError::IllegalOwner);
        }

        // Checking if the token account is an associated account
        if !native_assoc_pda_account.key.eq(&associated_account_address) {
            msg!("Whitelist UnwrapSOLToken: Passed token account is not an associated account");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking if the associated token account had any balance
        if native_assoc_pda_account.lamports().eq(&0u64) {
            msg!("Whitelist UnwrapSOLToken: Associated Token account contains 0 SOL to unwrap");
            return Err(ProgramError::InsufficientFunds);
        }

        // Business logic starts

        // Closing the entire associated account such that we can return back the SOL balance to the funded account
        msg!("Closing the associated account");
        let associated_account_close_ix = close_account(
            &token_program_id(),
            &native_assoc_pda_account.key,
            &owner_account.key,
            &owner_account.key,
            &[&owner_account.key],
        )?;

        invoke(
            &associated_account_close_ix,
            &[
                native_assoc_pda_account.clone(),
                owner_account.clone(),
                owner_account.clone(),
            ],
        )?;

        msg!("Done :)");

        Ok(())
    }

    // SWAP SOL FOR SPL TOKEN
    fn process_whitelist_swap_sol(
        input_sol_amount: u64,
        expected_spl_token_amount: u64,
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        let accounts_iterable = &mut accounts.iter();
        // Whitelist program related accounts
        let user_account = next_account_info(accounts_iterable)?;
        let whitelist_user_state_account = next_account_info(accounts_iterable)?;
        let whitelist_global_state_account = next_account_info(accounts_iterable)?;

        // Token swap related accounts
        let token_swap_state_account = next_account_info(accounts_iterable)?;
        let swap_authority_pda_account = next_account_info(accounts_iterable)?;
        let user_temporary_auth_token_account = next_account_info(accounts_iterable)?;
        let user_native_sol_token_account = next_account_info(accounts_iterable)?;
        let user_wlst_token_account = next_account_info(accounts_iterable)?;
        let token_swap_native_sol_token_account = next_account_info(accounts_iterable)?;
        let token_swap_wlst_token_account = next_account_info(accounts_iterable)?;
        let pool_mint_token_account = next_account_info(accounts_iterable)?;
        let pool_token_fee_account = next_account_info(accounts_iterable)?;
        let pool_owner_account = next_account_info(accounts_iterable)?;

        // Program IDs
        let token_program_account = next_account_info(accounts_iterable)?;
        let token_swap_program_account = next_account_info(accounts_iterable)?;

        let current_network_time = Clock::get()?.unix_timestamp;

        // Checking if the user has signed
        if !user_account.is_signer {
            msg!("Whitelist SwapSOL: User not signer");
            return Err(ProgramError::MissingRequiredSignature);
        }

        // Checking the program id equality (token swap and token programs)
        if !token_swap_program_account.key.eq(&token_swap_program_id()) {
            msg!("Whitelist SwapSOL: Incorrect Token Swap Program ID");
            return Err(ProgramError::IncorrectProgramId);
        }

        if !token_program_account.key.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Incorrect Token Program ID");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Checking if the whitelist accouts are all part of this program
        if !whitelist_global_state_account.owner.eq(program_id) {
            msg!("Whitelist SwapSOL: Passed Whitelist global state aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !whitelist_user_state_account.owner.eq(program_id) {
            msg!("Whitelist SwapSOL: Passed Whitelist user state aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        // Checking the same as above, but for token and token swap accounts
        if !token_swap_state_account.owner.eq(&token_swap_program_id()) {
            msg!("Whitelist SwapSOL: Passed TokenSwap state aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !user_native_sol_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Passed Native SOL Token aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !user_wlst_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Passed Token Y aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !token_swap_native_sol_token_account
            .owner
            .eq(&token_program_id())
        {
            msg!("Whitelist SwapSOL: Passed TokenSwap Native SOL Token aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !token_swap_wlst_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Passed TokenSwap Token Y aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !pool_mint_token_account.owner.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Passed TokenSwap pool mint aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        if !pool_token_fee_account.owner.eq(&token_program_id()) {
            msg!("Whitelist SwapSOL: Passed TokenSwap Pool Fee Token aaccount is invalid");
            return Err(IncorrectStateAccount.into());
        }

        // All account states
        let whitelist_global_state =
            WhitelistPDAGlobalState::try_from_slice(&whitelist_global_state_account.data.borrow())?;

        let mut whitelist_user_state =
            WhitelistUserState::try_from_slice(&whitelist_user_state_account.data.borrow())?;

        let user_native_token_state =
            TokenState::unpack(&user_native_sol_token_account.data.borrow())?;

        let user_wlst_token_state = TokenState::unpack(&user_wlst_token_account.data.borrow())?;

        // Checking if both NativeSOL and Y token accounts' owner is the user
        if !user_native_token_state.owner.eq(&user_account.key) {
            msg!("Whitelist SwapSOL: Native Token's owner is not the passed user");

            return Err(ProgramError::IllegalOwner);
        }

        if !user_wlst_token_state.owner.eq(&user_account.key) {
            msg!("Whitelist SwapSOL: Native Token's owner is not the passed user");

            return Err(ProgramError::IllegalOwner);
        }

        // Checking if the Native SOL Token account has the right mint
        if !user_native_token_state.mint.eq(&native_mint_account()) {
            msg!("Whitelist SwapSOL: Passed token account's mint is not native_sol");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking if the Y Token account has the right mint
        if !user_wlst_token_state
            .mint
            .eq(&whitelist_global_state.y_mint_account)
        {
            msg!("Whitelist SwapSOL: User Token Y Mint mismatch");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking if the Whitelist global state account has been initialized
        if !whitelist_global_state.is_initialized() {
            msg!("Whitelist SwapSOL: Global state not initialized yet");
            return Err(ProgramError::UninitializedAccount);
        }

        // Checking if the Whitelist User state is not initialized
        if whitelist_user_state.is_initialized() {
            msg!("Whitelist SwapSOL: User State already initialized");
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        let is_allowed = whitelist_global_state
            .whitelist_auth_addresses
            .iter()
            .find(|&&address| address.eq(user_account.key))
            .is_some();

        // Checking if the user account is whitelisted
        if !is_allowed {
            msg!("Whitelist SwapSOL: Passed user account is not allowed for swapping");
            return Err(AccountNotWhitelisted.into());
        }

        // Checking if the user's native sol token account has enough balance
        if user_native_token_state
            .amount
            .lt(&whitelist_global_state.price_per_token_y)
        {
            msg!("Whitelist SwapSOL: Insufficient SOL recognized");
            return Err(ProgramError::InsufficientFunds);
        }

        // Checking if the Whitelist Global state's token swap state account matches with the passed account

        if !token_swap_state_account
            .key
            .eq(&whitelist_global_state.token_swap_pool_state)
        {
            msg!("Whitelist SwapSOL: Token Swap State Account mismatch");
            return Err(ProgramError::InvalidAccountData);
        }

        // Checking that the user's y token account should be empty
        if user_wlst_token_state.amount.gt(&0u64) {
            msg!("Whitelist SwapSOL: User already redeemed SPL");
            return Err(AccountAlreadyRedeemed.into());
        }

        msg!("Starting the Swap procedure");
        let native_sol_to_spl_swap_ix = swap(
            &token_swap_program_id(),
            &token_program_id(),
            &token_swap_state_account.key,
            &swap_authority_pda_account.key,
            &user_temporary_auth_token_account.key,
            &user_native_sol_token_account.key,
            &token_swap_native_sol_token_account.key,
            &token_swap_wlst_token_account.key,
            &user_wlst_token_account.key,
            &pool_mint_token_account.key,
            &pool_token_fee_account.key,
            Some(&pool_owner_account.key),
            Swap {
                amount_in: input_sol_amount,
                minimum_amount_out: expected_spl_token_amount,
            },
        )?;

        invoke(
            &native_sol_to_spl_swap_ix,
            &[
                token_swap_state_account.clone(),
                swap_authority_pda_account.clone(),
                user_temporary_auth_token_account.clone(),
                user_native_sol_token_account.clone(),
                token_swap_native_sol_token_account.clone(),
                token_swap_wlst_token_account.clone(),
                user_wlst_token_account.clone(),
                pool_mint_token_account.clone(),
                pool_token_fee_account.clone(),
                token_program_account.clone(),
                pool_owner_account.clone(),
                token_swap_program_account.clone(),
            ],
        )?;

        msg!("Assigning state for the whitelist user");
        whitelist_user_state.is_initialized = true;
        whitelist_user_state.whitelisted_by_account = *user_account.key;
        whitelist_user_state.whitelisted_at = current_network_time;
        whitelist_user_state.user_transfer_authority_account =
            *user_temporary_auth_token_account.key;

        whitelist_user_state
            .serialize(&mut &mut whitelist_user_state_account.data.borrow_mut()[..])?;

        Ok(())
    }

    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let whitelist_instrution = WhiteListInstruction::parse_instruction(instruction_data)?;

        match whitelist_instrution {
            WhiteListInstruction::InitWhiteList {
                authorized_addresses,
                price_per_token_y,
                whitelist_pda_bump,
            } => {
                msg!("Instruction: Whitelist Initialize");
                Self::process_whitelist_initialize(
                    authorized_addresses,
                    whitelist_pda_bump,
                    price_per_token_y,
                    program_id,
                    accounts,
                )
            }

            WhiteListInstruction::CreateAndWrapSOLToken {
                amount_to_be_wrapped,
            } => {
                msg!("Instruction: Whitelist Create and Wrap SOL");
                Self::process_whitelist_create_and_wrap_sol(amount_to_be_wrapped, accounts)
            }

            WhiteListInstruction::WrapSOLToken {
                amount_to_be_wrapped,
            } => {
                msg!("Instruction: Whitelist Wrap SOL");
                Self::process_whitelist_wrap_sol(amount_to_be_wrapped, accounts)
            }

            WhiteListInstruction::UnwrapSOLToken => {
                msg!("Instruction: Whitelist Unwrap SOL");
                Self::process_whitelist_unwrap_sol(accounts)
            }

            WhiteListInstruction::SwapSOLToken {
                expected_spl_token_amount,
                input_sol_amount,
            } => {
                msg!("Instruction: Whitelist Swap SOL");
                Self::process_whitelist_swap_sol(
                    input_sol_amount,
                    expected_spl_token_amount,
                    accounts,
                    program_id,
                )
            }
        }
    }
}
