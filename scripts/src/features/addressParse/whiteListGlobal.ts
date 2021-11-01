import { PublicKey } from "@solana/web3.js";
import { getWhitelistStateLayout } from "../../utils/layout";
import { SOLANA_CONNECTION } from "../../constants";
import { getPublicKey } from "../../utils/file";

(async function () {
  try {
    console.log("DECIPHERING WHITELIST GLOBAL STATE ACCOUNT");
    const whiteListGlobalAccount = await getPublicKey("whiteList", "state");
    if (!whiteListGlobalAccount) {
      throw new Error(
        "Token Swap Account does not exist. Please run yarn createpool"
      );
    }

    const whiteListGlobalState = await SOLANA_CONNECTION.getAccountInfo(
      whiteListGlobalAccount
    );

    if (whiteListGlobalState) {
      const decodedState = getWhitelistStateLayout().decode(
        whiteListGlobalState.data
      );

      console.log({
        whitelistCreator: new PublicKey(
          decodedState.whitelistCreator
        ).toString(),
        globalPDABump: decodedState.globalPDABump,
        authorizedAddresses: (
          Object.values(decodedState.authorizedAddresses) as Buffer[]
        ).map((address: Buffer) => new PublicKey(address).toString()),
        isInitialized: decodedState.isInitialized === 1,
        tokenSwapPoolStateAccount: new PublicKey(
          decodedState.tokenSwapPoolState
        ).toString(),
        yTokenMintAccount: new PublicKey(decodedState.yMintAccount).toString(),
        yTokenAccount: new PublicKey(decodedState.yTokenAccount).toString(),
        nativeSolTokenAccount: new PublicKey(
          decodedState.nativeSolTokenAccount
        ).toString(),
        pricePerTokenY: parseInt(
          Buffer.from(decodedState.pricePerTokenY).readUInt8().toString()
        ),
      });

      return;
    }

    console.log("SOMETHING WENT WRONG");
  } catch (err) {
    console.error(err.message);
  }
})();
