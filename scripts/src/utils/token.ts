import { AccountLayout, Token } from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { SOLANA_CONNECTION, TOKEN_PROGRAM_ID, NATIVE_MINT } from "../constants";

export async function createTokenAccountWithSOL(
  owner: Keypair,
  amount: number
) {
  const rentNeeded = await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const totalLamports = amount * LAMPORTS_PER_SOL + rentNeeded;

  const wSolTokenAccount = new Keypair();
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: owner.publicKey,
    lamports: totalLamports,
    newAccountPubkey: wSolTokenAccount.publicKey,
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
  });

  const initTokenAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
    wSolTokenAccount.publicKey,
    owner.publicKey
  );

  const tokenCreationTransaction = new Transaction().add(
    createAccountIx,
    initTokenAccountIx
  );

  await SOLANA_CONNECTION.sendTransaction(
    tokenCreationTransaction,
    [owner, wSolTokenAccount],
    {
      preflightCommitment: "confirmed",
      skipPreflight: false,
    }
  );

  return wSolTokenAccount.publicKey;
}

export const transferTokenOwner = async (
  mint: Token,
  tokenAccount: PublicKey,
  owner: Keypair,
  newOwner: PublicKey
) => {
  try {
    await mint.setAuthority(tokenAccount, newOwner, "AccountOwner", owner, []);
    return true;
  } catch (err) {
    console.error(err.message);
    return false;
  }
};
