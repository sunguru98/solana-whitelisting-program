import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { formatWhitelistPDAData } from "../utils/layout";
import {
  SOLANA_CONNECTION,
  SYSTEM_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../constants";
import { checkKeysDir, getKeyPair } from "../utils/file";

(async function () {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys directory is not present. Please generate keys using yarn storeaddress"
      );
    }

    const whitelistCreator = (await getKeyPair("whitelistCreator", "persons"))!;

    const [w1, w2, w3, w4, w5] = [1, 2, 3, 4, 5].map(() => {
      const pubkey = Keypair.generate().publicKey;
      console.log("", pubkey.toString());
      return pubkey.toBuffer();
    });

    const [whitelistProgramPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("whitelistpda"), whitelistCreator.publicKey.toBytes()],
      WHITELIST_PROGRAM_ID
    );

    const whitelistProgramAccount = await SOLANA_CONNECTION.getAccountInfo(
      whitelistProgramPDA
    );

    console.log(formatWhitelistPDAData(whitelistProgramAccount?.data));

    if (whitelistProgramAccount) {
      throw new Error("Account already exists");
    }

    console.log("GENERATED PDA", whitelistProgramPDA.toString());
    console.log(
      "WHITELIST CREATOR BALANCE",
      (await SOLANA_CONNECTION.getBalance(whitelistCreator.publicKey)) /
        LAMPORTS_PER_SOL
    );

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
          pubkey: SYSTEM_PROGRAM_ID,
        },
      ],
      data: Buffer.from([0, bump, ...w1, ...w2, ...w3, ...w4, ...w5]),
    });

    await SOLANA_CONNECTION.sendTransaction(
      new Transaction().add(initWhiteListIx),
      [whitelistCreator],
      { preflightCommitment: "confirmed", skipPreflight: false }
    );
  } catch (err) {
    console.error(err);
  }
})();
