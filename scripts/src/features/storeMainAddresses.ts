import { storeKeypair } from "../utils/file";

(async function () {
  try {
    await storeKeypair("user", "persons");
    await storeKeypair("masterAccount", "persons");
    await storeKeypair("poolCreator", "persons");
    await storeKeypair("tokenCreator", "persons");
  } catch (err) {
    console.error(err);
  }
})();
