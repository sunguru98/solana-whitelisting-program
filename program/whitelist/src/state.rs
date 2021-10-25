use borsh::{self, BorshDeserialize, BorshSerialize};
use solana_program::{program_pack::IsInitialized, pubkey::Pubkey};

#[derive(Debug, BorshSerialize, BorshDeserialize)]
pub struct WhitelistPDAGlobalState {
    pub whitelist_creator: Pubkey,
    pub whitelist_auth_addresses: [Pubkey; 5],
    pub is_initialized: bool,
    pub token_swap_pool_state: Pubkey,
    pub y_token_account: Pubkey,
}

impl IsInitialized for WhitelistPDAGlobalState {
    fn is_initialized(&self) -> bool {
        return self.is_initialized;
    }
}
