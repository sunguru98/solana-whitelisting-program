import { storeKeypair } from "../../utils/file";
import fs from "fs-extra";
import {
  TOKEN_ACCOUNT_PATHS,
  TOKEN_MINT_PATHS,
  TOKEN_STATE_PATHS,
} from "../../constants";

(async function () {
  try {
    console.log("CREATING TOKEN ACCOUNT DIRECTORIES");
    await fs.mkdirp(TOKEN_ACCOUNT_PATHS.wsol);
    await fs.mkdirp(TOKEN_ACCOUNT_PATHS.wlst);
    await fs.mkdirp(TOKEN_ACCOUNT_PATHS.poolRecipient);
    await fs.mkdirp(TOKEN_ACCOUNT_PATHS.poolFee);

    console.log("CREATING TOKEN MINT DIRECTORIES");
    await fs.mkdirp(TOKEN_MINT_PATHS.wsol);
    await fs.mkdirp(TOKEN_MINT_PATHS.wlst);
    await fs.mkdirp(TOKEN_MINT_PATHS.pool);

    console.log("CREATING STATE ACCOUNT DIRECTORIES");
    await fs.mkdirp(TOKEN_STATE_PATHS.tokenSwap);
    await fs.mkdirp(TOKEN_STATE_PATHS.whiteList);
    await fs.mkdirp(TOKEN_STATE_PATHS.whiteListUser);

    await storeKeypair("user", "persons", true);
    await storeKeypair("masterAccount", "persons", true);
    await storeKeypair("whitelistCreator", "persons", true);
    await storeKeypair("tokenSwap", "state", true);
    await storeKeypair("whiteListUser", "state", true);
  } catch (err) {
    console.error(err);
  }
})();
