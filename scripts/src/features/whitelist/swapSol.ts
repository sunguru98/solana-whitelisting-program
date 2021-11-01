import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getWhiteListUserStateLayout } from "../../utils/layout";
import {
  PRICE_PER_TOKEN_B,
  SOLANA_CONNECTION,
  TOKEN_PROGRAM_ID,
  TOKEN_SWAP_FEE_OWNER,
  TOKEN_SWAP_PROGRAM_ID,
  WHITELIST_PROGRAM_ID,
} from "../../constants";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  getPublicKey,
  getTokenAccount,
  sleep,
  storeKeypair,
  storeTokenAccount,
} from "../../utils/file";

(async function () {
  try {
    const {
      user,
      wlstMintAccount,
      wsolMintAccount,
      tokenSwapStateAccount,
      userNativeSolTokenAccount,
      swapAuthorityPDA,
      whitelistUserStateAccount,
      whitelistGlobalStateAccount,
      poolWlstTokenAccount,
      poolWsolTokenAccount,
      poolMintToken,
      poolFeeTokenAccount,
    } = await checkForPreRequisites();

    console.log(
      "WHITELIST USER STATE ACCOUNT",
      whitelistUserStateAccount.publicKey.toString()
    );

    // Fetching or Creating Token
    console.log("FETCHING/CREATING TOKEN Y ACCOUNT FOR USER");
    const userWlstTokenAccount =
      await wlstMintAccount.getOrCreateAssociatedAccountInfo(user.publicKey);
    await storeTokenAccount("user", "wlst", userWlstTokenAccount.address, true);

    // Approving SOL Token
    console.log("APPROVING NATIVE SOL FOR A TEMP AUTH KEYPAIR");
    const tempAuthTokenAccount = new Keypair();
    await wsolMintAccount.approve(
      userNativeSolTokenAccount,
      tempAuthTokenAccount.publicKey,
      user,
      [],
      PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL
    );

    // Instruction phase
    const WHITELIST_USER_STATE_LAYOUT = getWhiteListUserStateLayout();

    const initWhitelistUserStateIx = SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      lamports: await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        WHITELIST_USER_STATE_LAYOUT.span
      ),
      newAccountPubkey: whitelistUserStateAccount.publicKey,
      programId: WHITELIST_PROGRAM_ID,
      space: WHITELIST_USER_STATE_LAYOUT.span,
    });

    const swapSOLForSPLIx = new TransactionInstruction({
      keys: [
        {
          isSigner: true,
          isWritable: false,
          pubkey: user.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: whitelistUserStateAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: whitelistGlobalStateAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: tokenSwapStateAccount,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: swapAuthorityPDA,
        },
        {
          isSigner: true,
          isWritable: false,
          pubkey: tempAuthTokenAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: userNativeSolTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: userWlstTokenAccount.address,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolWsolTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolWlstTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolMintToken.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: poolFeeTokenAccount,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: TOKEN_SWAP_FEE_OWNER,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: TOKEN_PROGRAM_ID,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: TOKEN_SWAP_PROGRAM_ID,
        },
      ],
      programId: WHITELIST_PROGRAM_ID,
      data: Buffer.from([
        4,
        ...new BN(PRICE_PER_TOKEN_B * LAMPORTS_PER_SOL).toArray("le", 8),
        ...new BN(1 * 10 ** 2).toArray("le", 8),
      ]),
    });

    const swapTransaction = new Transaction().add(
      initWhitelistUserStateIx,
      swapSOLForSPLIx
    );

    console.log(`SWAPPING ${PRICE_PER_TOKEN_B} SOL FOR 1 WLST`);
    await SOLANA_CONNECTION.sendTransaction(
      swapTransaction,
      [user, whitelistUserStateAccount, tempAuthTokenAccount],
      {
        preflightCommitment: "confirmed",
        skipPreflight: false,
      }
    );

    console.log("TOKEN SWAP DONE SUCCESSFULLY. CHECKING TOKEN BALANCES");
    await sleep(5000);
    const userNativeSolBalance = await SOLANA_CONNECTION.getTokenAccountBalance(
      userNativeSolTokenAccount
    );
    const userWlstTokenBalance = await SOLANA_CONNECTION.getTokenAccountBalance(
      userWlstTokenAccount.address
    );

    console.log(`
      SOL: ${userNativeSolBalance.value.amount}
      WLST: ${userWlstTokenBalance.value.amount}
    `);
  } catch (err) {
    console.error(err);
  }
})();

async function checkForPreRequisites() {
  if (!(await checkKeysDir())) {
    throw new Error(
      "Keys directory does not exist. Please run yarn storeaddress to generate all addresses"
    );
  }

  const user = await getKeyPair("user", "persons");
  const whitelistCreator = await getKeyPair("whitelistCreator", "persons");
  let whitelistUserStateAccount = await getKeyPair("whiteListUser", "state");

  if (!user || !whitelistCreator || !whitelistUserStateAccount) {
    throw new Error("Required person/state accounts doesn't exist");
  }

  if (
    await SOLANA_CONNECTION.getAccountInfo(whitelistUserStateAccount.publicKey)
  ) {
    whitelistUserStateAccount = await storeKeypair(
      "whiteListUser",
      "state",
      true
    );
  }

  if (!whitelistUserStateAccount) {
    throw new Error("Whitelist User state account not found");
  }

  if (!(await SOLANA_CONNECTION.getBalance(user.publicKey))) {
    throw new Error(
      "User does not have enough funds. Please run yarn fundaddress to fund all addresses"
    );
  }

  const wlstMintAccount = await getMintToken("wlst", whitelistCreator);
  const wsolMintAccount = await getMintToken("wsol", whitelistCreator);

  if (!wlstMintAccount || !wsolMintAccount) {
    throw new Error("SPL Token Mint missing. Please run yarn createmint");
  }

  const poolWsolTokenAccount = await getTokenAccount(
    "whitelistCreator",
    "wsol"
  );
  const poolWlstTokenAccount = await getTokenAccount(
    "whitelistCreator",
    "wlst"
  );

  if (!poolWsolTokenAccount || !poolWlstTokenAccount) {
    throw new Error(
      "Whitelist Token X and Y accounts doesn't exist. Please run yarn createtoken to create token accounts"
    );
  }

  const tokenSwapStateAccount = await getPublicKey("tokenSwap", "state");

  if (!tokenSwapStateAccount) {
    throw new Error(
      "Token Swap State Account missing. Please run yarn createpool"
    );
  }

  let swapAuthorityPDA = await getPublicKey("swapAuthority");
  const poolFeeTokenAccount = await getTokenAccount(
    "swapProgramOwner",
    "poolFee"
  );

  if (!swapAuthorityPDA) {
    [swapAuthorityPDA] = await PublicKey.findProgramAddress(
      [tokenSwapStateAccount.toBytes()],
      TOKEN_SWAP_PROGRAM_ID
    );
  }

  if (!poolFeeTokenAccount) {
    throw new Error(
      "Pool Fee Token Account missing. Please run yarn createpool to generate PDA"
    );
  }

  const poolMintToken = await getMintToken(
    "pool",
    new Keypair({
      publicKey: swapAuthorityPDA.toBytes(),
      secretKey: Buffer.from(""),
    })
  );

  if (!poolMintToken) {
    throw new Error(
      "Pool Mint Token doesn't exist. Please run yarn createpool"
    );
  }

  const whitelistGlobalStateAccount = await getPublicKey("whiteList", "state");

  if (!whitelistGlobalStateAccount) {
    throw new Error(
      "Whitelist Global State Account missing. Please run yarn initpda"
    );
  }

  const userNativeSolTokenAccount = await getTokenAccount("user", "wsol");

  if (!userNativeSolTokenAccount) {
    throw new Error(
      "User doesn't have a native SOL associated Token account. Please run yarn wrapsol"
    );
  }

  return {
    user,
    userNativeSolTokenAccount,
    whitelistCreator,
    wlstMintAccount,
    wsolMintAccount,
    poolWsolTokenAccount,
    poolWlstTokenAccount,
    swapAuthorityPDA,
    poolFeeTokenAccount,
    poolMintToken,
    tokenSwapStateAccount,
    whitelistGlobalStateAccount,
    whitelistUserStateAccount,
  };
}
