import { AccountLayout } from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  SOLANA_CONNECTION,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../../constants";
import {
  checkKeysDir,
  getKeyPair,
  sleep,
  storeTokenAccount,
} from "../../utils/file";

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

    const balance = await SOLANA_CONNECTION.getBalance(user.publicKey);

    if (balance === 0) {
      throw new Error(
        "User's balance is 0 SOL. Please use yarn fundaddress to get funded"
      );
    }

    console.log("CREATING AND WRAPPING SOL STARTS ...");
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

    const totalAmountToBeSent =
      10 * LAMPORTS_PER_SOL +
      (await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        AccountLayout.span
      ));

    if (!assoicatedTokenAccountInfo) {
      console.log(
        `Creating wSOL associated account at ${(
          await associatedNativeSolTokenAddress
        ).toString()}`
      );

      await createAndWrapSOL(
        totalAmountToBeSent,
        user,
        associatedNativeSolTokenAddress
      );
    } else {
      console.log(
        "Since the associated token already exists, invoking whitelist WrapSOL"
      );
      await wrapSOL(
        10 * LAMPORTS_PER_SOL,
        user,
        associatedNativeSolTokenAddress
      );
    }
  } catch (err) {
    console.error(err.message);
  }
})();

async function createAndWrapSOL(
  amount: number,
  owner: Keypair,
  tokenAccount: PublicKey
) {
  const instructionData = Buffer.from(
    Uint8Array.of(1, ...new BN(amount).toArray("le", 8))
  );

  const createAndWrapSOLIx = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: true, pubkey: owner.publicKey },
      {
        isWritable: true,
        isSigner: false,
        pubkey: tokenAccount,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: NATIVE_MINT,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: SYSTEM_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: TOKEN_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      },
      {
        isWritable: false,
        isSigner: false,
        pubkey: SYSVAR_RENT_PUBKEY,
      },
    ],
    programId: WHITELIST_PROGRAM_ID,
    data: instructionData,
  });

  await SOLANA_CONNECTION.sendTransaction(
    new Transaction().add(createAndWrapSOLIx),
    [owner],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  console.log(
    `Create and Wrap of ${amount / LAMPORTS_PER_SOL} SOL successful :)`
  );

  await storeTokenAccount("user", "wsol", tokenAccount, true);
  console.log(`Sleeping for 5s`);
  await sleep(5000);

  const {
    value: { amount: tAmount },
  } = await SOLANA_CONNECTION.getTokenAccountBalance(tokenAccount);

  console.log(
    `Current token balance of ${tokenAccount.toString()}: ${
      parseInt(tAmount) / LAMPORTS_PER_SOL || 0
    }`
  );
}

async function wrapSOL(
  amount: number,
  owner: Keypair,
  tokenAccount: PublicKey
) {
  const instructionData = Buffer.from(
    Uint8Array.of(2, ...new BN(amount).toArray("le", 8))
  );

  const wrapSOLIx = new TransactionInstruction({
    keys: [
      { isSigner: true, isWritable: true, pubkey: owner.publicKey },
      { isWritable: true, isSigner: false, pubkey: tokenAccount },
      { isSigner: false, isWritable: false, pubkey: SYSTEM_PROGRAM_ID },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    ],
    programId: WHITELIST_PROGRAM_ID,
    data: instructionData,
  });

  await SOLANA_CONNECTION.sendTransaction(
    new Transaction().add(wrapSOLIx),
    [owner],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  console.log(`Wrap of ${amount / LAMPORTS_PER_SOL} SOL successful :)`);
  console.log(`Sleeping for 5s`);
  await sleep(5000);

  const {
    value: { amount: tAmount },
  } = await SOLANA_CONNECTION.getTokenAccountBalance(tokenAccount);

  console.log(
    `Current token balance of ${tokenAccount.toString()}: ${
      parseInt(tAmount) / LAMPORTS_PER_SOL || 0
    }`
  );
}
