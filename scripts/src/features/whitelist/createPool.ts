import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { transferTokenOwner } from "../../utils/token";
import {
  PRICE_PER_TOKEN_B,
  SOLANA_CONNECTION,
  TOKEN_NAMES,
  TOKEN_PROGRAM_ID,
  TOKEN_SWAP_FEE_OWNER,
  TOKEN_SWAP_PROGRAM_ID,
} from "../../constants";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  getTokenAccount,
  sleep,
  storeKeypair,
  storePublicKey,
  storeTokenAccount,
} from "../../utils/file";
import { createMint } from "../../utils/mint";
import { CurveType } from "@solana/spl-token-swap";
import { createTokenSwap } from "../../utils/swap";

(async function () {
  try {
    const {
      nativeMint,
      wsolTokenAccount,
      wlstTokenAccount,
      whitelistCreator,
      tokenSwapStateAccount,
      wlstMint,
    } = await checkForPreRequisites();

    const [swapAuthority, _bump] = await PublicKey.findProgramAddress(
      [tokenSwapStateAccount.publicKey.toBuffer()],
      TOKEN_SWAP_PROGRAM_ID
    );

    console.log("SWAP AUTHORITY ADDRESS", swapAuthority.toString());

    console.log("TRANSFERRING TOKEN A OWNERSHIP TO SWAP AUTHORITY");
    await transferTokenOwner(
      nativeMint,
      wsolTokenAccount,
      whitelistCreator,
      swapAuthority
    );

    console.log("TRANSFERRING TOKEN B OWNERSHIP TO SWAP AUTHORITY");
    await transferTokenOwner(
      wlstMint,
      wlstTokenAccount,
      whitelistCreator,
      swapAuthority
    );

    console.log("CREATING MINT ACCOUNT UNDER SWAP AUTHORITY");
    const poolMintToken = await createMint(
      new Keypair({
        publicKey: swapAuthority.toBytes(),
        secretKey: Buffer.from(""),
      }),
      "pool",
      whitelistCreator
    );

    console.log(
      "CREATING POOL FEE TOKEN ACCOUNT AND POOL FEE RECIPIENT ACCOUNT TO FEE OWNER"
    );

    const poolRecipientTokenAccount = await poolMintToken.createAccount(
      TOKEN_SWAP_FEE_OWNER
    );

    await storeTokenAccount(
      "swapProgramOwner",
      "poolRecipient",
      poolRecipientTokenAccount,
      true
    );

    const poolFeeTokenAccount = await poolMintToken.createAccount(
      TOKEN_SWAP_FEE_OWNER
    );

    await storeTokenAccount(
      "swapProgramOwner",
      "poolFee",
      poolFeeTokenAccount,
      true
    );

    console.log("CREATING TOKEN SWAP POOL");
    await createTokenSwap(
      whitelistCreator,
      tokenSwapStateAccount,
      swapAuthority,
      wsolTokenAccount,
      wlstTokenAccount,
      poolMintToken.publicKey,
      poolFeeTokenAccount,
      poolRecipientTokenAccount,
      TOKEN_PROGRAM_ID,
      TOKEN_SWAP_PROGRAM_ID,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      CurveType.ConstantPrice,
      (PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL) / 10 ** 2
    );

    console.log("TOKEN POOL INIT SUCCESSFUL");
    await sleep(2000);
    await storePublicKey("swapAuthority", "persons", swapAuthority, true);
  } catch (err) {
    console.error(err.message);
  }
})();

export async function checkForPreRequisites() {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys Directory not found. Please run yarn storeaddress to create all the addresses."
      );
    }

    const whitelistCreator = await getKeyPair("whitelistCreator", "persons");
    const tokenSwapStateAccount = await storeKeypair(
      "tokenSwap",
      "state",
      true
    );
    if (!whitelistCreator) {
      throw new Error("Whitelist creator not found");
    }

    if (!tokenSwapStateAccount) {
      throw new Error("Token swap state account not found");
    }

    console.log(
      "TOKEN SWAP STATE ACCOUNT",
      tokenSwapStateAccount.publicKey.toString()
    );

    if (
      (await SOLANA_CONNECTION.getBalance(whitelistCreator.publicKey)) === 0
    ) {
      throw new Error(
        "Insufficient funds for Whitelist creator. Please run yarn fundaddress"
      );
    }

    const nativeMint = await getMintToken(
      TOKEN_NAMES["wsol"],
      whitelistCreator
    );

    const wlstMint = await getMintToken(TOKEN_NAMES["wlst"], whitelistCreator);

    if (!wlstMint || !nativeMint) {
      throw new Error(
        "Mint accounts cannot be found. Please run yarn createmint to create mint accounts"
      );
    }

    const wsolTokenAccount = await getTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wsol"]
    );

    const wlstTokenAccount = await getTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wlst"]
    );

    if (!wsolTokenAccount || !wlstTokenAccount) {
      throw new Error(
        "Token accounts cannot be found. Please run yarn createtoken to create token accounts"
      );
    }

    return {
      whitelistCreator,
      tokenSwapStateAccount,
      wlstMint,
      nativeMint,
      wlstTokenAccount,
      wsolTokenAccount,
    };
  } catch (err) {
    throw err;
  }
}
