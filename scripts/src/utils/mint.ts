import { Token } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { SOLANA_CONNECTION, TOKEN_PROGRAM_ID } from "../constants";
import { storePublicKey } from "./file";

export async function createMint(
  creator: Keypair,
  mintName: string,
  payer?: Keypair
) {
  const res = await Token.createMint(
    SOLANA_CONNECTION,
    payer || creator,
    creator.publicKey,
    null,
    2,
    TOKEN_PROGRAM_ID
  );
  await storePublicKey(mintName, "mints", res.publicKey, true);
  return res;
}
