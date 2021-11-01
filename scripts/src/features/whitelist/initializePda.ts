import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  PRICE_PER_TOKEN_B,
  SOLANA_CONNECTION,
  SYSTEM_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../../constants";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  getTokenAccount,
  sleep,
  storePublicKey,
} from "../../utils/file";
import BN from "bn.js";

(async function () {
  try {
    const {
      tokenSwapStateAccount,
      wlstTokenAccount,
      wsolTokenAccount,
      whitelistCreator,
      user,
      wlstMint,
    } = await checkForPreRequisites();

    const [whitelistCreatorBuf, w1, w2, w3, w4, w5] = [
      whitelistCreator.publicKey.toBuffer(),
      user.publicKey.toBuffer(),
      ...[1, 2, 3, 4].map(() => {
        const pubkey = Keypair.generate().publicKey;
        return pubkey.toBuffer();
      }),
    ];

    const [whitelistProgramPDA, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("whitelistpda"),
        whitelistCreator.publicKey.toBytes(),
        wlstTokenAccount.toBytes(),
      ],
      WHITELIST_PROGRAM_ID
    );

    const whitelistProgramAccount = await SOLANA_CONNECTION.getAccountInfo(
      whitelistProgramPDA
    );

    if (whitelistProgramAccount) {
      throw new Error("Account already exists");
    }

    console.log("GENERATED PDA", whitelistProgramPDA.toString());

    const initWhiteListIx = new TransactionInstruction({
      programId: WHITELIST_PROGRAM_ID,
      keys: [
        {
          isSigner: true,
          isWritable: false,
          pubkey: whitelistCreator.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: whitelistProgramPDA,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: tokenSwapStateAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: wlstMint.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: wlstTokenAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: wsolTokenAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: SYSTEM_PROGRAM_ID,
        },
      ],
      data: Buffer.from([
        0,
        bump,
        ...new BN((PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL) / 10 ** 2).toArray(
          "le",
          8
        ),
        ...whitelistCreatorBuf,
        ...w1,
        ...w2,
        ...w3,
        ...w4,
        ...w5,
      ]),
    });

    await SOLANA_CONNECTION.sendTransaction(
      new Transaction().add(initWhiteListIx),
      [whitelistCreator],
      { preflightCommitment: "confirmed", skipPreflight: false }
    );

    console.log("INITIALIZED WHITELIST PDA SUCCESSFULLY");
    await sleep(2000);
    await storePublicKey("whiteList", "state", whitelistProgramPDA, true);
  } catch (err) {
    console.error(err);
  }
})();

async function checkForPreRequisites() {
  if (!(await checkKeysDir())) {
    throw new Error(
      "Keys directory is not present. Please generate keys using yarn storeaddress"
    );
  }

  const whitelistCreator = await getKeyPair("whitelistCreator", "persons");
  const user = await getKeyPair("user", "persons");

  if (!whitelistCreator || !user) {
    throw new Error("Person accounts not found");
  }

  if (!(await SOLANA_CONNECTION.getBalance(whitelistCreator.publicKey))) {
    throw new Error(
      "Whitelist Creator has insufficient funds. Please run yarn fundaddress to fund all the accounts"
    );
  }

  const tokenSwapStateAccount = await getKeyPair("tokenSwap", "state");

  if (!tokenSwapStateAccount) {
    throw new Error("Token Swap State Account not found");
  }

  const tokenSwapData = await SOLANA_CONNECTION.getAccountInfo(
    tokenSwapStateAccount.publicKey
  );

  if (!tokenSwapData) {
    throw new Error(
      "Token Swap Account not Initialized. Please run yarn createpool"
    );
  }

  const wlstMint = await getMintToken("wlst", whitelistCreator);
  const wlstTokenAccount = await getTokenAccount("whitelistCreator", "wlst");
  const wsolTokenAccount = await getTokenAccount("whitelistCreator", "wsol");

  if (!wlstMint || !wlstTokenAccount || !wsolTokenAccount) {
    throw new Error("Required token accounts not found");
  }

  return {
    whitelistCreator,
    user,
    tokenSwapStateAccount,
    wlstMint,
    wlstTokenAccount,
    wsolTokenAccount,
  };
}
