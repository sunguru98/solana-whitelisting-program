import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  NATIVE_MINT as NM,
  TOKEN_PROGRAM_ID as TPID,
  ASSOCIATED_TOKEN_PROGRAM_ID as ATPID,
} from "@solana/spl-token";

export const WHITELIST_PROGRAM_ID = new PublicKey(
  "FSeLPB3DLwMfnQr6oG4YX9cdmGaZ2M99wCDt7TgGbzoF"
);
export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export const TOKEN_PROGRAM_ID = TPID;
export const ASSOCIATED_TOKEN_PROGRAM_ID = ATPID;
export const NATIVE_MINT = NM;

export const SOLANA_CONNECTION = new Connection("http://localhost:8899/");
