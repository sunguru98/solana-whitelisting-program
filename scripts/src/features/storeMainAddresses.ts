import { storeKeypair } from "../utils/file";

(async function () {
  try {
    await storeKeypair("user", "persons", true, true);
    await storeKeypair("masterAccount", "persons", true, true);
    await storeKeypair("whitelistCreator", "persons", true, true);
    await storeKeypair("tokenCreator", "persons", true, true);
  } catch (err) {
    console.error(err);
  }
})();
