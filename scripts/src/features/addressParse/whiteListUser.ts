import { PublicKey } from "@solana/web3.js";
import { getWhiteListUserStateLayout } from "../../utils/layout";
import { SOLANA_CONNECTION } from "../../constants";
import { getPublicKey } from "../../utils/file";

(async function () {
  try {
    console.log("DECIPHERING WHITELIST USER ACCOUNT");
    const whitelistUserAccount = await getPublicKey("whiteListUser", "state");
    if (!whitelistUserAccount) {
      throw new Error(
        "Token Swap Account does not exist. Please run yarn createpool"
      );
    }

    const whitelistUserState = await SOLANA_CONNECTION.getAccountInfo(
      whitelistUserAccount
    );

    if (whitelistUserState) {
      const decodedState = getWhiteListUserStateLayout().decode(
        whitelistUserState?.data
      );
      console.log({
        isInitialized: decodedState.isInitialized === 1,
        whitelistedByAccount: new PublicKey(
          decodedState.whiteListedByAccount
        ).toString(),
        whitelistedAt: Buffer.from(decodedState.whitelistedAt)
          .readBigUInt64LE()
          .toString(),
        userTransferAuthorityAccount: new PublicKey(
          decodedState.userTransferAuthorityAccount
        ).toString(),
      });

      return;
    }

    console.log("SOMETHING WENT WRONG");
  } catch (err) {
    console.error(err.message);
  }
})();
