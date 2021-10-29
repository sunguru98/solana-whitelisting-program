import { Token } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { SOLANA_CONNECTION, TOKEN_PROGRAM_ID } from "../constants";
import { storePublicKey } from "./file";

export async function createMint(creator: Keypair, mintName: string) {
  console.log(`CREATING ${mintName} MINT AS POOL CREATOR`);
  const res = await Token.createMint(
    SOLANA_CONNECTION,
    creator,
    creator.publicKey,
    creator.publicKey,
    0,
    TOKEN_PROGRAM_ID
  );

  await storePublicKey(mintName, "mints", res.publicKey, true);
}
