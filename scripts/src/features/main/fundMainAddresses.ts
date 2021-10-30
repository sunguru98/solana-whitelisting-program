import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_CONNECTION } from "../../constants";
import { checkKeysDir, getKeyPair } from "../../utils/file";

(async function () {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys directory is not present. Please generate keys using yarn storeaddress"
      );
    }

    (
      await Promise.all([
        getKeyPair("masterAccount", "persons"),
        getKeyPair("user", "persons"),
        getKeyPair("whitelistCreator", "persons"),
      ])
    ).forEach(async (keypair) => {
      if (!keypair) {
        return console.log("Invalid address fetched :(");
      }
      console.log(`Funding ${keypair.publicKey.toString()}`);
      await SOLANA_CONNECTION.requestAirdrop(
        keypair.publicKey,
        100 * LAMPORTS_PER_SOL
      );
    });
  } catch (err) {
    console.error(err);
  }
})();
