import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  SOLANA_CONNECTION,
  TOKEN_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../../constants";
import { checkKeysDir, getKeyPair, sleep } from "../../utils/file";

(async function () {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys directory is missing. Please use yarn storeaddress to store"
      );
    }

    const user = await getKeyPair("user", "persons");
    if (!user) {
      throw new Error(
        "User keypair does not exist. Please try using yarn storeaddress to generate"
      );
    }

    console.log("UNWRAPPING SOL STARTS ...");
    const [associatedNativeSolTokenAddress] =
      await PublicKey.findProgramAddress(
        [
          user.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBytes(),
          NATIVE_MINT.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

    const assoicatedTokenAccountInfo = await SOLANA_CONNECTION.getAccountInfo(
      associatedNativeSolTokenAddress
    );

    if (!assoicatedTokenAccountInfo) {
      throw new Error("Invalid Associated Token Account");
    }

    console.log(
      `User Balance before unwrapping: `,
      (await SOLANA_CONNECTION.getBalance(user.publicKey)) / LAMPORTS_PER_SOL
    );

    await unwrapSOL(user, associatedNativeSolTokenAddress);
  } catch (err) {
    console.error(err.message);
  }
})();

async function unwrapSOL(owner: Keypair, tokenAccount: PublicKey) {
  const instructionData = Buffer.from(Uint8Array.of(3));

  const unwrapSOLIx = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: false, pubkey: owner.publicKey },
      { isSigner: false, isWritable: true, pubkey: tokenAccount },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    ],
    programId: WHITELIST_PROGRAM_ID,
    data: instructionData,
  });

  console.log("INSTRUCTION DATA: ", instructionData);

  await SOLANA_CONNECTION.sendTransaction(
    new Transaction().add(unwrapSOLIx),
    [owner],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  console.log(`Unwrapping SOL Token account successfully processed`);
  console.log(`Sleeping for 2s`);
  await sleep(2000);

  console.log(
    `User Balance after unwrapping: `,
    (await SOLANA_CONNECTION.getBalance(owner.publicKey)) / LAMPORTS_PER_SOL
  );

  if (await SOLANA_CONNECTION.getAccountInfo(tokenAccount)) {
    console.log("Associated Token Account closed successfully");
  }
}
