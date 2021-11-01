import * as BufferLayout from "@solana/buffer-layout";

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

export const getWhiteListUserStateLayout = () => {
  return BufferLayout.struct([
    BufferLayout.u8("isInitialized"),
    publicKey("whiteListedByAccount"),
    uint64("whitelistedAt"),
    publicKey("userTransferAuthorityAccount"),
  ]);
};
