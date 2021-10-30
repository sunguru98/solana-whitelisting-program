import * as BufferLayout from "@solana/buffer-layout";
import { TokenSwapLayout } from "@solana/spl-token-swap";
import { PublicKey } from "@solana/web3.js";
import { SOLANA_CONNECTION } from "../constants";
import { WhiteListGlobalState } from "../types";

/**
 * Layout for a public key
 */
export const publicKey = (
  property: string = "publicKey"
): BufferLayout.Blob => {
  return BufferLayout.blob(32, property);
};

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = "uint64"): BufferLayout.Blob => {
  return BufferLayout.blob(8, property);
};

export const getInitIxLayout = () => {
  return BufferLayout.struct([
    BufferLayout.u8("tag"),
    BufferLayout.u8("bump"),
    uint64("pricePerTokenY"),
    publicKey("whitelistCreator"),
    publicKey("w1"),
    publicKey("w2"),
    publicKey("w3"),
    publicKey("w4"),
    publicKey("w5"),
  ]);
};

export const getWhitelistStateLayout = () => {
  return BufferLayout.struct([
    publicKey("whitelistCreator"),
    BufferLayout.u8("globalPDABump"),
    BufferLayout.struct(
      [
        publicKey("whitelistCreator"),
        publicKey("w1"),
        publicKey("w2"),
        publicKey("w3"),
        publicKey("w4"),
        publicKey("w5"),
      ],
      "authorizedAddresses"
    ),
    BufferLayout.u8("isInitialized"),
    publicKey("tokenSwapPoolState"),
    publicKey("yMintAccount"),
    publicKey("yTokenAccount"),
    publicKey("nativeSolTokenAccount"),
    uint64("pricePerTokenY"),
  ]);
};

export const formatWhitelistPDAData = (
  data?: Buffer
): WhiteListGlobalState | null => {
  if (data) {
    const decodedState = getWhitelistStateLayout().decode(data);
    return {
      whitelistCreator: new PublicKey(decodedState.whitelistCreator).toString(),
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
    };
  }
  return null;
};

export const formatTokenSwapState = async (
  tokenSwapStateAccount: PublicKey
) => {
  const accountInfo = await SOLANA_CONNECTION.getAccountInfo(
    tokenSwapStateAccount
  );

  if (accountInfo?.data) {
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
    } = TokenSwapLayout.decode(accountInfo.data);
    return {
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
    };
  }
  return null;
};
