import {
  SOLANA_CONNECTION,
  TOKEN_NAMES,
  TOTAL_ACCOUNTS_ALLOWED,
} from "../../constants";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  storeTokenAccount,
} from "../../utils/file";
import { createTokenAccountWithSOL } from "../../utils/token";

(async function () {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys Directory Not found. Please run yarn storeaddress to generate addresses"
      );
    }

    const whitelistCreator = await getKeyPair("whitelistCreator", "persons");

    if (!whitelistCreator) {
      throw new Error("Pool Creator Keypair not found");
    }

    if (
      (await SOLANA_CONNECTION.getBalance(whitelistCreator.publicKey)) === 0
    ) {
      throw new Error(
        "Insufficient funds for Pool Creator. Please run yarn fundaddress to fund all accounts"
      );
    }

    const wlstMintAccount = await getMintToken("wlst", whitelistCreator);

    if (!wlstMintAccount) {
      throw new Error(
        "Invalid Token B Mint account, please run yarn createmint to genereate mint accounts"
      );
    }

    console.log("CREATING TOKEN A ACCOUNT FOR THE WHITELIST CREATOR");
    const nativeSolAcc = await createTokenAccountWithSOL(whitelistCreator, 1);
    await storeTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wsol"],
      nativeSolAcc,
      true
    );
    console.log(
      "TOKEN A ACCOUNT CREATED SUCCESSFULLY",
      nativeSolAcc.toString()
    );

    console.log("CREATING TOKEN B ACCOUNT FOR THE WHITELIST CREATOR");
    const wlstTokenAccount = await wlstMintAccount.createAccount(
      whitelistCreator.publicKey
    );
    await storeTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wlst"],
      wlstTokenAccount,
      true
    );
    console.log(
      "TOKEN B ACCOUNT CREATED SUCCESSFULLY",
      wlstTokenAccount.toString()
    );

    console.log(`MINTING ${TOTAL_ACCOUNTS_ALLOWED} TOKEN B FOR THE ACCOUNT`);
    await wlstMintAccount.mintTo(
      wlstTokenAccount,
      whitelistCreator,
      [],
      TOTAL_ACCOUNTS_ALLOWED * 10 ** 2
    );

    console.log(`STOPPING FURTHER MINTING FOR TOKEN B`);
    await wlstMintAccount.setAuthority(
      wlstMintAccount.publicKey,
      null,
      "MintTokens",
      whitelistCreator,
      []
    );
  } catch (err) {
    console.error(err.message);
  }
})();
