import { Connection } from "@solana/web3.js";
import { NATIVE_MINT as NM } from "@solana/spl-token";

export const WHITELIST_PROGRAM_ID = "";
export const SYSTEM_PROGRAM_ID = "";
export const NATIVE_MINT = NM;

export const SOLANA_CONNECTION = new Connection("http://localhost:8899/");
