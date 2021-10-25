import * as BufferLayout from "@solana/buffer-layout";
import { PublicKey } from "@solana/web3.js";
import { WhiteListGlobalState } from "src/types";

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
    publicKey("bump"),
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
    BufferLayout.struct(
      [
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
    publicKey("yTokenAccount"),
  ]);
};

export const formatWhitelistPDAData = (
  data?: Buffer
): WhiteListGlobalState | null => {
  if (data) {
    const decodedState = getWhitelistStateLayout().decode(data);
    return {
      whitelistCreator: new PublicKey(decodedState.whitelistCreator),
      authorizedAddresses: (
        Object.values(decodedState.authorizedAddresses) as Buffer[]
      ).map((address: Buffer) => new PublicKey(address)),
      isInitialized: decodedState.isInitialized === 1,
      tokenSwapPoolStateAccount: new PublicKey(decodedState.tokenSwapPoolState),
      yTokenAccount: new PublicKey(decodedState.yTokenAccount),
    };
  }
  return null;
};
