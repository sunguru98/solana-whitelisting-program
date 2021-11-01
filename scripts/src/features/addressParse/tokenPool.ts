import { TokenSwapLayout } from "@solana/spl-token-swap";
import { PublicKey } from "@solana/web3.js";
import { SOLANA_CONNECTION } from "../../constants";
import { getPublicKey } from "../../utils/file";

(async function () {
  try {
    console.log("DECIPHERING TOKEN POOL ACCOUNT");
    const tokenSwapStateAccount = await getPublicKey("tokenSwap", "state");
    if (!tokenSwapStateAccount) {
      throw new Error(
        "Token Swap Account does not exist. Please run yarn createpool"
      );
    }

    const tokenSwapAccountInfo = await SOLANA_CONNECTION.getAccountInfo(
      tokenSwapStateAccount
    );
    const {
      version,
      isInitialized,
      nonce,
      tokenProgramId,
      tokenAccountA,
      tokenAccountB,
      tokenPool,
      mintA,
      mintB,
      feeAccount,
      tradeFeeNumerator,
      tradeFeeDenominator,
      ownerTradeFeeNumerator,
      ownerTradeFeeDenominator,
      ownerWithdrawFeeDenominator,
      ownerWithdrawFeeNumerator,
      hostFeeNumerator,
      hostFeeDenominator,
      curveType,
      curveParameters,
    } = TokenSwapLayout.decode(tokenSwapAccountInfo?.data);
    console.log({
      version,
      isInitialized,
      tokenSwapPDABump: nonce,
      tokenProgramId: new PublicKey(tokenProgramId).toString(),
      tokenAccountA: new PublicKey(tokenAccountA).toString(),
      tokenAccountB: new PublicKey(tokenAccountB).toString(),
      tokenPool: new PublicKey(tokenPool).toString(),
      mintA: new PublicKey(mintA).toString(),
      mintB: new PublicKey(mintB).toString(),
      feeAccount: new PublicKey(feeAccount).toString(),
      tradeFeeNumerator: Buffer.from(tradeFeeNumerator)
        .readBigUInt64LE()
        .toString(),
      tradeFeeDenominator: Buffer.from(tradeFeeDenominator)
        .readBigUInt64LE()
        .toString(),
      ownerTradeFeeNumerator: Buffer.from(ownerTradeFeeNumerator)
        .readBigUInt64LE()
        .toString(),
      ownerTradeFeeDenominator: Buffer.from(ownerTradeFeeDenominator)
        .readBigUInt64LE()
        .toString(),
      ownerWithdrawFeeNumerator: Buffer.from(ownerWithdrawFeeNumerator)
        .readBigUInt64LE()
        .toString(),
      ownerWithdrawFeeDenominator: Buffer.from(ownerWithdrawFeeDenominator)
        .readBigUInt64LE()
        .toString(),
      hostFeeNumerator: Buffer.from(hostFeeNumerator)
        .readBigUInt64LE()
        .toString(),
      hostFeeDenominator: Buffer.from(hostFeeDenominator)
        .readBigUInt64LE()
        .toString(),
      curveType,
      pricePerTokenB: Buffer.from(curveParameters).readBigUInt64LE().toString(),
    });
  } catch (err) {
    console.error(err.message);
  }
})();
