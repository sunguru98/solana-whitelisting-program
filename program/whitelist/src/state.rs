use borsh::{self, BorshDeserialize, BorshSerialize};
use solana_program::{program_pack::IsInitialized, pubkey::Pubkey};

#[derive(Debug, BorshSerialize, BorshDeserialize)]
pub struct WhitelistPDAGlobalState {
    pub whitelist_creator: Pubkey,
    pub global_pda_bump: u8,
    pub whitelist_auth_addresses: [Pubkey; 6],
    pub is_initialized: bool,
    pub token_swap_pool_state: Pubkey,
    pub y_mint_account: Pubkey,
    pub y_token_account: Pubkey,
    pub native_sol_token_account: Pubkey,
    pub price_per_token_y: u64,
}

impl IsInitialized for WhitelistPDAGlobalState {
    fn is_initialized(&self) -> bool {
        return self.is_initialized;
    }
}

#[derive(Debug, BorshDeserialize, BorshSerialize)]
pub struct WhitelistUserState {
    pub is_initialized: bool,
    pub whitelisted_by_account: Pubkey,
    pub whitelisted_at: i64,
    pub user_transfer_authority_account: Pubkey,
}

impl IsInitialized for WhitelistUserState {
    fn is_initialized(&self) -> bool {
        return self.is_initialized;
    }
}
