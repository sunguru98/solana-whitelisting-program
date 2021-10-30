import fs from "fs-extra";
import path from "path";
import { createMint } from "../../utils/mint";
import {
  NATIVE_MINT,
  SOLANA_CONNECTION,
  TOKEN_MINT_PATHS,
  TOKEN_NAMES,
} from "../../constants";
import { checkKeysDir, getKeyPair } from "../../utils/file";

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

    console.log("WRITING NATIVE MINT PUBKEY");
    await fs.writeJSON(
      path.resolve(TOKEN_MINT_PATHS.wsol, "publicKey.json"),
      NATIVE_MINT.toString()
    );

    console.log("CREATING TOKEN B MINT");
    await createMint(whitelistCreator, TOKEN_NAMES["wlst"]);
  } catch (err) {
    console.error(err.message);
  }
})();
