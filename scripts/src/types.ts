export type WhiteListKeyType = "persons" | "tokens" | "mints" | "state";
export type WhiteListGlobalState = {
  whitelistCreator: string;
  globalPDABump: number;
  authorizedAddresses: string[];
  isInitialized: boolean;
  tokenSwapPoolStateAccount: string;
  yTokenMintAccount: string;
  yTokenAccount: string;
  nativeSolTokenAccount: string;
  pricePerTokenY: number;
};
