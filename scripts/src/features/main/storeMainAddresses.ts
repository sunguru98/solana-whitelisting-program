import { storeKeypair } from "../../utils/file";

(async function () {
  try {
    await storeKeypair("user", "persons", true);
    await storeKeypair("masterAccount", "persons", true);
    await storeKeypair("whitelistCreator", "persons", true);
  } catch (err) {
    console.error(err);
  }
})();
