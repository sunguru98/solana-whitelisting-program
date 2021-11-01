import path from "path";

import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  NATIVE_MINT as NM,
  TOKEN_PROGRAM_ID as TPID,
  ASSOCIATED_TOKEN_PROGRAM_ID as ATPID,
} from "@solana/spl-token";
import { TOKEN_SWAP_PROGRAM_ID as TSPID } from "@solana/spl-token-swap";
import { KEYS_FOLDER } from "./utils/file";

export const WHITELIST_PROGRAM_ID = new PublicKey(
  "FSeLPB3DLwMfnQr6oG4YX9cdmGaZ2M99wCDt7TgGbzoF"
);

export const TOKEN_SWAP_PROGRAM_ID = TSPID;
export const TOKEN_SWAP_FEE_OWNER = new PublicKey(
  "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
);

export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export const TOKEN_PROGRAM_ID = TPID;
export const ASSOCIATED_TOKEN_PROGRAM_ID = ATPID;
export const NATIVE_MINT = NM;

export const TOKEN_NAMES: Record<string, string> = {
  wsol: "wsol",
  wlst: "wlst",
  pool: "pool",
  poolRecipient: "poolRecipient",
  poolFee: "poolFee",
};

export const TOKEN_STATE_PATHS: Record<string, string> = {
  tokenSwap: path.resolve(KEYS_FOLDER, "state", "tokenSwap"),
  whiteList: path.resolve(KEYS_FOLDER, "state", "whiteList"),
  whiteListUser: path.resolve(KEYS_FOLDER, "state", "whiteListUser"),
};

export const TOKEN_MINT_PATHS: Record<string, string> = {
  wsol: path.resolve(KEYS_FOLDER, "mints", TOKEN_NAMES.wsol),
  wlst: path.resolve(KEYS_FOLDER, "mints", TOKEN_NAMES.wlst),
  pool: path.resolve(KEYS_FOLDER, "mints", TOKEN_NAMES.pool),
};

export const TOKEN_ACCOUNT_PATHS: Record<string, string> = {
  wsol: path.resolve(KEYS_FOLDER, "tokens", TOKEN_NAMES.wsol),
  wlst: path.resolve(KEYS_FOLDER, "tokens", TOKEN_NAMES.wlst),
  poolRecipient: path.resolve(KEYS_FOLDER, "tokens", TOKEN_NAMES.poolRecipient),
  poolFee: path.resolve(KEYS_FOLDER, "tokens", TOKEN_NAMES.poolFee),
};

export const TOTAL_ACCOUNTS_ALLOWED = 5;
export const PRICE_PER_TOKEN_B = 2;

export const SOLANA_CONNECTION = new Connection("http://localhost:8899/");
