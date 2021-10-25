import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { NATIVE_MINT as NM } from "@solana/spl-token";

export const WHITELIST_PROGRAM_ID = new PublicKey(
  "FSeLPB3DLwMfnQr6oG4YX9cdmGaZ2M99wCDt7TgGbzoF"
);
export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export const NATIVE_MINT = NM;

export const SOLANA_CONNECTION = new Connection("http://localhost:8899/");
